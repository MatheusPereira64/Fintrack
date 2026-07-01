import { BankParser, ParsedTransaction } from '../../../models/types';
import { parseBRL } from '../../../utils/currency';

const BRL_RE = /r\$\s?([\d.]*\d*,\d{2})/i;

function findAmount(title: string, body: string): number | null {
  const m = BRL_RE.exec(`${title} ${body}`);
  return m ? parseBRL(m[1]) : null;
}

function includesAny(text: string, ...terms: string[]): boolean {
  return terms.some(t => text.includes(t));
}

export const InterParser: BankParser = {
  parse(title: string, body: string): ParsedTransaction | null {
    const full = `${title} ${body}`.toLowerCase();
    const raw  = `${title} ${body}`;
    const amt  = findAmount(title, body);

    // Pix recebido
    if (includesAny(full, 'pix recebid', 'recebeu', 'pix in', 'entrada de pix', 'creditado')) {
      if (amt) {
        return {
          type: 'income', category: 'Pix',
          amount: amt,
          description: `Pix recebido${extractAfter(raw, 'de')}`,
          bankName: 'Inter', rawTitle: title, rawBody: body,
        };
      }
    }

    // Pix enviado — inclui formas femininas (enviada, realizada, efetuada, concluída)
    if (includesAny(full,
      'pix enviad', 'pix realizad', 'pix efetuad', 'pix conclu',
      'você enviou', 'voce enviou', 'transferiu', 'pagamento pix',
      'pix out', 'debitado', 'transferência pix',
    )) {
      if (amt) {
        return {
          type: 'expense', category: 'Pix',
          amount: -amt,
          description: `Pix enviado${extractAfter(raw, 'para')}`,
          bankName: 'Inter', rawTitle: title, rawBody: body,
        };
      }
    }

    // Fallback: qualquer menção a pix com valor
    if (full.includes('pix') && amt) {
      const isIn = includesAny(full, 'receb', 'entrada', 'credit');
      return {
        type: isIn ? 'income' : 'expense',
        category: 'Pix',
        amount: isIn ? amt : -amt,
        description: isIn ? 'Pix recebido' : 'Pix enviado',
        bankName: 'Inter', rawTitle: title, rawBody: body,
      };
    }

    // Compra aprovada
    if (includesAny(full, 'compra aprovada', 'compra realizada', 'compra no cartão')) {
      if (amt) {
        return {
          type: 'expense', category: 'Compra Crédito',
          amount: -amt,
          description: extractMerchantInter(raw) ?? 'Compra aprovada',
          bankName: 'Inter', rawTitle: title, rawBody: body,
        };
      }
    }

    // Débito em conta
    if (includesAny(full, 'débito', 'debito')) {
      if (amt) {
        return {
          type: 'expense', category: 'Compra Débito',
          amount: -amt,
          description: 'Débito em conta',
          bankName: 'Inter', rawTitle: title, rawBody: body,
        };
      }
    }

    // Transferência recebida
    if (includesAny(full, 'transferência recebid', 'ted recebid', 'doc recebid')) {
      if (amt) {
        return {
          type: 'income', category: 'Transferência',
          amount: amt,
          description: 'Transferência recebida',
          bankName: 'Inter', rawTitle: title, rawBody: body,
        };
      }
    }

    // Transferência enviada
    if (includesAny(full, 'transferência enviad', 'transferência realizad', 'ted enviad', 'doc enviad')) {
      if (amt) {
        return {
          type: 'expense', category: 'Transferência',
          amount: -amt,
          description: `Transferência enviada${extractAfter(raw, 'para')}`,
          bankName: 'Inter', rawTitle: title, rawBody: body,
        };
      }
    }

    // Boleto
    if (full.includes('boleto') && amt) {
      return {
        type: 'expense', category: 'Boleto',
        amount: -amt,
        description: 'Pagamento de boleto',
        bankName: 'Inter', rawTitle: title, rawBody: body,
      };
    }

    return null;
  },
};

function extractAfter(text: string, prep: string): string {
  const re = new RegExp(`\\b${prep}\\s+([\\w\\sÀ-ú]{2,30})(?:\\s+-|\\s+r\\$|$)`, 'i');
  const m  = re.exec(text);
  return m ? ` - ${m[1].trim()}` : '';
}

function extractMerchantInter(body: string): string | null {
  const m = /(?:em|na loja|no estabelecimento)\s+([A-Za-zÀ-ú\s&0-9]+?)(?:\s+r\$|\s+no valor|\.|$)/i.exec(body);
  return m ? m[1].trim() : null;
}
