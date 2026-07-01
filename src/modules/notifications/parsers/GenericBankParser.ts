/**
 * Parser genérico — fallback para bancos não mapeados ou padrões comuns.
 * Detecta: Pix, compra crédito/débito, transferência, boleto, saque,
 * depósito, estorno, salário, cashback, tarifa, IOF, fatura, cobrança.
 */
import { BankParser, ParsedTransaction } from '../../../models/types';
import { parseBRL } from '../../../utils/currency';

// ── Helpers ────────────────────────────────────────────────────────────────
const BRL_RE    = /r\$\s?([\d.]*\d+,\d{2})/i;
const BRL_RE_G  = /r\$\s?([\d.]*\d+,\d{2})/gi;

function firstBRL(text: string): number | null {
  const m = BRL_RE.exec(text);
  return m ? parseBRL(m[1]) : null;
}

function includes(text: string, ...terms: string[]): boolean {
  return terms.some(t => text.includes(t));
}

function extractName(text: string, after: string): string {
  const re = new RegExp(
    `\\b${after}:?\\s+([A-Za-zÀ-ú][A-Za-zÀ-ú ]{1,40})(?:\\s*[-|,]|\\s*r\\$|\\s*\\(|$)`,
    'i',
  );
  const m = re.exec(text);
  return m ? ` · ${m[1].trim()}` : '';
}

function extractMerchant(text: string): string | null {
  const m = /(?:em|na loja|no estabelecimento|@)\s*([A-Za-zÀ-ú0-9 &.']{2,40}?)(?:\s*r\$|\s*no valor|\s*[-–]|\s*\*|\.|$)/i.exec(text);
  return m ? m[1].trim() : null;
}

// ── Parser ────────────────────────────────────────────────────────────────
export const GenericBankParser: BankParser = {
  parse(title: string, body: string, packageName: string): ParsedTransaction | null {
    const t    = title.toLowerCase();
    const b    = body.toLowerCase();
    const full = `${t} ${b}`;
    const raw  = `${title} ${body}`;

    const value = firstBRL(raw);
    if (!value && !includes(full, 'salário', 'salary', 'cashback')) return null;

    const v = value ?? 0;
    const bankName = deriveBankName(packageName, raw);

    // ── 1. Salário ─────────────────────────────────────────────────────────
    if (includes(full, 'salário', 'salary', 'folha de pagamento', 'holerite', 'pagamento de salário')) {
      return make('income', 'Salário', v, `Salário recebido${extractName(raw, 'de')}`, bankName, title, body);
    }

    // ── 2. Pix ─────────────────────────────────────────────────────────────
    if (includes(full, 'pix')) {
      const isIn = includes(full, 'recebido', 'recebeu', 'recebida', 'entrada', 'pix in', 'creditado');
      const isOut = includes(full, 'enviado', 'enviada', 'enviou', 'realizado', 'realizada',
        'efetuado', 'efetuada', 'concluído', 'concluida', 'pix out', 'debitado', 'transferi');
      if (isIn) return make('income',  'Pix', v,  `Pix recebido${extractName(raw,  'de')}`,   bankName, title, body);
      if (isOut) return make('expense','Pix', -v, `Pix enviado${extractName(raw,  'para')}`,  bankName, title, body);
      // ambíguo — valor: se negativo = saída
      return make(v < 0 ? 'expense' : 'income', 'Pix', v, 'Pix', bankName, title, body);
    }

    // ── 3. Compra no crédito ───────────────────────────────────────────────
    if (includes(full, 'compra aprovada', 'compra realizada', 'compra no crédito', 'purchase approved',
                       'compra no cartão', 'compra efetuada', 'crédito aprovado', 'transação aprovada')) {
      const merchant = extractMerchant(raw);
      return make('expense', 'Compra Crédito', -v,
        merchant ? `Compra: ${merchant}` : 'Compra no cartão crédito', bankName, title, body);
    }

    // ── 4. Compra no débito ────────────────────────────────────────────────
    if (includes(full, 'compra débito', 'débito automático', 'compra no débito', 'debit purchase',
                       'debitado', 'débito em conta', 'débito aprovado')) {
      const merchant = extractMerchant(raw);
      return make('expense', 'Compra Débito', -v,
        merchant ? `Débito: ${merchant}` : 'Compra no débito', bankName, title, body);
    }

    // ── 5. Transferência recebida ─────────────────────────────────────────
    if (includes(full, 'transferência recebida', 'ted recebido', 'doc recebido', 'crédito em conta',
                       'depósito recebido', 'transfer received')) {
      return make('income', 'Transferência', v,
        `Transferência recebida${extractName(raw, 'de')}`, bankName, title, body);
    }

    // ── 6. Transferência enviada ──────────────────────────────────────────
    if (includes(full, 'transferência enviada', 'transferência realizada', 'ted enviado',
                       'doc enviado', 'transfer sent')) {
      return make('expense', 'Transferência', -v,
        `Transferência${extractName(raw, 'para')}`, bankName, title, body);
    }

    // ── 7. TED/DOC genérico ────────────────────────────────────────────────
    if (includes(full, 'ted', 'doc')) {
      const isIn = includes(full, 'receb', 'entrada', 'crédito');
      return make(isIn ? 'income' : 'expense', 'Transferência',
        isIn ? v : -v, isIn ? 'TED/DOC recebido' : 'TED/DOC enviado', bankName, title, body);
    }

    // ── 8. Boleto ─────────────────────────────────────────────────────────
    if (includes(full, 'boleto', 'pagamento de conta', 'conta paga', 'bill payment')) {
      return make('expense', 'Boleto', -v, `Boleto${extractName(raw, 'para')}`, bankName, title, body);
    }

    // ── 9. Fatura do cartão ───────────────────────────────────────────────
    if (includes(full, 'fatura', 'pagamento de fatura', 'invoice')) {
      return make('expense', 'Boleto', -v, 'Pagamento de fatura', bankName, title, body);
    }

    // ── 10. Saque ─────────────────────────────────────────────────────────
    if (includes(full, 'saque', 'cash withdrawal', 'retirada')) {
      return make('expense', 'Saque', -v, 'Saque', bankName, title, body);
    }

    // ── 11. Depósito / Crédito genérico ───────────────────────────────────
    if (includes(full, 'depósito', 'creditado', 'crédito recebido', 'deposit')) {
      return make('income', 'Depósito', v, 'Depósito recebido', bankName, title, body);
    }

    // ── 12. Estorno / Reembolso ───────────────────────────────────────────
    if (includes(full, 'estorno', 'reembolso', 'chargeback', 'refund', 'cancelamento')) {
      return make('income', 'Estorno', v, 'Estorno/reembolso', bankName, title, body);
    }

    // ── 13. Cashback ──────────────────────────────────────────────────────
    if (includes(full, 'cashback', 'cash back')) {
      if (!v) return null;
      return make('income', 'Cashback', v, `Cashback de ${formatBRL(v)}`, bankName, title, body);
    }

    // ── 14. Tarifa / IOF ──────────────────────────────────────────────────
    if (includes(full, 'tarifa', 'iof', 'taxa', 'fee', 'juros', 'multa')) {
      return make('expense', 'Tarifas', -v, 'Tarifa/Encargo', bankName, title, body);
    }

    // ── 15. Cobrança genérica ─────────────────────────────────────────────
    if (includes(full, 'cobrança', 'pagamento', 'debitado')) {
      return make('expense', 'Outros', -v, 'Cobrança', bankName, title, body);
    }

    return null;
  },
};

// ── Utils internos ─────────────────────────────────────────────────────────
function make(
  type: 'income' | 'expense',
  category: string,
  amount: number,
  description: string,
  bankName: string,
  rawTitle: string,
  rawBody: string,
): ParsedTransaction {
  return { type, category, amount, description, bankName, rawTitle, rawBody };
}

function deriveBankName(packageName: string, raw: string): string {
  const knownNames = [
    'Nubank', 'Inter', 'Itaú', 'Bradesco', 'Banco do Brasil', 'Santander',
    'C6 Bank', 'Caixa', 'Mercado Pago', 'PicPay', 'Next', 'Neon',
    'PagBank', 'Banco Original', 'Sicoob', 'Sicredi', 'BTG', 'XP',
    'Safra', 'Pine', 'Modal',
  ];
  for (const n of knownNames) {
    if (raw.toLowerCase().includes(n.toLowerCase())) return n;
  }
  const parts = packageName.split('.');
  return parts[parts.length - 1] ?? 'Banco';
}

function formatBRL(v: number): string {
  return `R$ ${v.toFixed(2).replace('.', ',')}`;
}
