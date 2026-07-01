/**
 * ImportService — Importação de extratos bancários OFX e CSV.
 *
 * OFX: padrão bancário aberto (Open Financial Exchange) — Nubank, Itaú,
 *      Bradesco, BB, Inter, Santander, C6, Caixa todos exportam .ofx
 * CSV: formato simples tabular (Nubank, Inter, C6 também exportam .csv)
 *
 * Retorna uma lista de transações candidatas para o usuário confirmar.
 */
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { InsertTransaction, TransactionType } from '../models/types';
import { Logger } from './LoggerService';

export interface ImportCandidate extends Partial<InsertTransaction> {
  description:  string;
  amount:       number;
  type:         TransactionType;
  date:         string;
  bankName?:    string;
  rawLine?:     string;
}

export interface ImportResult {
  success:      boolean;
  candidates:   ImportCandidate[];
  total:        number;
  errors:       string[];
  fileType?:    'ofx' | 'csv' | 'unknown';
}

// ── Document Picker ────────────────────────────────────────────────────────
export async function pickImportFile(): Promise<DocumentPickerResponse | null> {
  try {
    const [file] = await DocumentPicker.pick({
      type: [
        DocumentPicker.types.allFiles,
      ],
      allowMultiSelection: false,
      copyTo: 'cachesDirectory',
    });
    return file;
  } catch (e: any) {
    if (DocumentPicker.isCancel(e)) return null;
    throw e;
  }
}

// ── Parser principal ───────────────────────────────────────────────────────
export async function parseImportFile(file: DocumentPickerResponse): Promise<ImportResult> {
  try {
    const filePath = file.fileCopyUri ?? file.uri;
    const content = await RNFS.readFile(filePath, 'utf8');
    const name    = (file.name ?? '').toLowerCase();

    if (name.endsWith('.ofx') || content.includes('<OFX>') || content.includes('<ofx>')) {
      return parseOFX(content);
    }
    if (name.endsWith('.csv') || content.includes(',')) {
      return parseCSV(content, name);
    }
    return { success: false, candidates: [], total: 0, errors: ['Formato não reconhecido. Use .ofx ou .csv'], fileType: 'unknown' };
  } catch (e: any) {
    Logger.error('ImportService', 'Erro ao parsear arquivo', e);
    return { success: false, candidates: [], total: 0, errors: [e.message ?? 'Erro ao ler arquivo'] };
  }
}

// ── OFX Parser ─────────────────────────────────────────────────────────────
function parseOFX(content: string): ImportResult {
  const candidates: ImportCandidate[] = [];
  const errors: string[] = [];

  // Normaliza: tira espaços, suporta SGML e XML
  const text = content.replace(/\r\n?/g, '\n');

  // Extrai todas as transações entre <STMTTRN> e </STMTTRN>
  const txBlocks = [...text.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)];

  if (txBlocks.length === 0) {
    // Tenta SGML format (sem tags de fechamento)
    return parseOFXSGML(text);
  }

  for (const block of txBlocks) {
    try {
      const b = block[1];
      const type      = tag(b, 'TRNTYPE');
      const dtPosted  = tag(b, 'DTPOSTED');
      const amount    = tag(b, 'TRNAMT') ?? tag(b, 'AMT');
      const name      = tag(b, 'NAME') ?? tag(b, 'MEMO') ?? tag(b, 'FITID') ?? '';
      const memo      = tag(b, 'MEMO') ?? '';

      if (!amount || !dtPosted) continue;

      const value = parseFloat(amount.replace(',', '.'));
      const date  = ofxDateToISO(dtPosted);
      const txType: TransactionType = value < 0 ? 'expense' : 'income';

      candidates.push({
        description: sanitize(memo || name),
        amount:      value,
        type:        txType,
        date,
        bankName:    detectBankFromOFX(content),
        rawLine:     b.trim(),
      });
    } catch (e: any) {
      errors.push(e.message);
    }
  }

  return { success: true, candidates, total: candidates.length, errors, fileType: 'ofx' };
}

function parseOFXSGML(text: string): ImportResult {
  const candidates: ImportCandidate[] = [];
  const errors: string[] = [];
  const lines = text.split('\n');
  let current: Partial<Record<string, string>> = {};
  let inTx = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/<STMTTRN/i.test(line)) { inTx = true; current = {}; continue; }
    if (/<\/STMTTRN/i.test(line)) {
      if (inTx && current.TRNAMT) {
        const value = parseFloat((current.TRNAMT ?? '0').replace(',', '.'));
        candidates.push({
          description: sanitize(current.MEMO ?? current.NAME ?? 'Importado'),
          amount:      value,
          type:        value < 0 ? 'expense' : 'income',
          date:        ofxDateToISO(current.DTPOSTED ?? ''),
          bankName:    detectBankFromOFX(text),
          rawLine:     JSON.stringify(current),
        });
      }
      inTx = false; current = {};
      continue;
    }
    if (!inTx) continue;

    const m = /^<([A-Z]+)>(.*)$/i.exec(line);
    if (m) current[m[1].toUpperCase()] = m[2].trim();
  }

  return { success: true, candidates, total: candidates.length, errors, fileType: 'ofx' };
}

// ── CSV Parser ─────────────────────────────────────────────────────────────
function parseCSV(content: string, filename: string): ImportResult {
  const candidates: ImportCandidate[] = [];
  const errors: string[] = [];
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { success: false, candidates: [], total: 0, errors: ['CSV vazio ou com apenas cabeçalho'], fileType: 'csv' };

  const headers = splitCSV(lines[0]).map(h => h.toLowerCase().trim().replace(/['"]/g, ''));
  const bank    = detectBankFromCSV(headers, filename);

  for (let i = 1; i < lines.length; i++) {
    try {
      const cols = splitCSV(lines[i]).map(c => c.replace(/^["']|["']$/g, '').trim());
      if (cols.length < 2) continue;

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = cols[idx] ?? ''; });

      const candidate = parseCSVRow(row, bank);
      if (candidate) candidates.push(candidate);
    } catch (e: any) {
      errors.push(`Linha ${i + 1}: ${e.message}`);
    }
  }

  return { success: true, candidates, total: candidates.length, errors, fileType: 'csv' };
}

function parseCSVRow(row: Record<string, string>, bankName: string): ImportCandidate | null {
  // Tenta encontrar campos padrão
  const desc = row['description'] ?? row['descrição'] ?? row['descricao'] ??
               row['title'] ?? row['memo'] ?? row['estabelecimento'] ??
               row['nome'] ?? row['historico'] ?? 'Importado';

  const amtRaw = row['amount'] ?? row['valor'] ?? row['value'] ??
                 row['debit'] ?? row['credit'] ?? row['débito'] ??
                 row['crédito'] ?? '';

  const dateRaw = row['date'] ?? row['data'] ?? row['dt'] ?? row['transaction date'] ?? '';

  if (!amtRaw || !dateRaw) return null;

  const amount = parseMoney(amtRaw);
  if (isNaN(amount)) return null;

  const date = parseDate(dateRaw);
  if (!date) return null;

  return {
    description: sanitize(desc),
    amount,
    type:     amount < 0 ? 'expense' : 'income',
    date,
    bankName,
  };
}

// ── Utils ──────────────────────────────────────────────────────────────────
function tag(block: string, name: string): string | null {
  const m = new RegExp(`<${name}>([^<\n]+)`, 'i').exec(block);
  return m ? m[1].trim() : null;
}

function ofxDateToISO(dt: string): string {
  const clean = dt.replace(/\[.*\]/, '').trim();
  const year  = clean.slice(0, 4);
  const month = clean.slice(4, 6);
  const day   = clean.slice(6, 8);
  return `${year}-${month}-${day}`;
}

function parseMoney(s: string): number {
  const clean = s.replace(/[R$\s]/g, '').replace('.', '').replace(',', '.');
  return parseFloat(clean);
}

function parseDate(s: string): string | null {
  s = s.trim();
  // ISO: 2024-01-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // BR: 15/01/2024 ou 15-01-2024
  const br = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/.exec(s);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  // US: 01/15/2024
  const us = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (us) return `${us[3]}-${us[1]}-${us[2]}`;
  return null;
}

function splitCSV(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === ',' && !inQuote) { result.push(cur); cur = ''; continue; }
    if (ch === ';' && !inQuote) { result.push(cur); cur = ''; continue; }
    cur += ch;
  }
  result.push(cur);
  return result;
}

function sanitize(s: string): string {
  return s.replace(/[<>]/g, '').trim().slice(0, 80);
}

function detectBankFromOFX(content: string): string {
  if (/nubank/i.test(content))   return 'Nubank';
  if (/bradesco/i.test(content)) return 'Bradesco';
  if (/itau/i.test(content))     return 'Itaú';
  if (/inter/i.test(content))    return 'Banco Inter';
  if (/bb\b|brasil/i.test(content)) return 'Banco do Brasil';
  if (/santander/i.test(content)) return 'Santander';
  if (/caixa/i.test(content))    return 'Caixa';
  if (/c6/i.test(content))       return 'C6 Bank';
  return 'Banco';
}

function detectBankFromCSV(headers: string[], filename: string): string {
  const all = [...headers, filename].join(' ').toLowerCase();
  if (all.includes('nubank'))    return 'Nubank';
  if (all.includes('inter'))     return 'Banco Inter';
  if (all.includes('itau'))      return 'Itaú';
  if (all.includes('bradesco'))  return 'Bradesco';
  if (all.includes('c6'))        return 'C6 Bank';
  if (all.includes('bb') || all.includes('brasil')) return 'Banco do Brasil';
  return 'Banco';
}
