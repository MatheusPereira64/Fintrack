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

export const NubankParser: BankParser = {
  parse(title: string, body: string, _packageName: string): ParsedTransaction | null {
    const full = `${title} ${body}`.toLowerCase();
    const raw  = `${title} ${body}`;
    const amt  = findAmount(title, body);

    // Transferência recebida: "Transferência recebida" / "Recebemos sua transferência de R$ 1,00."
    if (includesAny(full,
      'transferência recebid', 'transferencia recebid',
      'recebemos sua transferência', 'recebemos sua transferencia',
      'ted recebid', 'doc recebid',
    )) {
      if (amt) {
        return {
          type: 'income', category: 'Transferência',
          amount: amt,
          description: 'Transferência recebida',
          bankName: 'Nubank', rawTitle: title, rawBody: body,
        };
      }
    }

    // Transferência enviada: "Transferência enviada" / "Enviamos sua transferência de R$ X"
    if (includesAny(full,
      'transferência enviad', 'transferencia enviad',
      'enviamos sua transferência', 'enviamos sua transferencia',
      'ted enviad', 'doc enviad',
    )) {
      if (amt) {
        return {
          type: 'expense', category: 'Transferência',
          amount: -amt,
          description: `Transferência enviada${extractName(raw, 'para')}`,
          bankName: 'Nubank', rawTitle: title, rawBody: body,
        };
      }
    }

    // Pix enviado: "Você enviou R$ 53,90 para João"
    if (includesAny(full, 'pix enviad', 'você enviou', 'voce enviou', 'enviou r$') ||
        (full.includes('pix') && includesAny(full, 'enviou', 'transferi'))) {
      if (amt) {
        return {
          type: 'expense', category: 'Pix',
          amount: -amt,
          description: `Pix enviado${extractName(raw, 'para')}`,
          bankName: 'Nubank', rawTitle: title, rawBody: body,
        };
      }
    }

    // Pix recebido: "Você recebeu R$ 200,00 de Maria" / "Pix recebido"
    if (includesAny(full, 'pix recebid', 'você recebeu', 'voce recebeu', 'recebeu r$') ||
        (full.includes('pix') && full.includes('receb'))) {
      if (amt) {
        return {
          type: 'income', category: 'Pix',
          amount: amt,
          description: `Pix recebido${extractName(raw, 'de')}`,
          bankName: 'Nubank', rawTitle: title, rawBody: body,
        };
      }
    }

    // Compra aprovada
    if (includesAny(full, 'compra aprovada', 'compra no', 'compra na', 'compra de r$')) {
      if (amt) {
        const merchant = extractMerchant(raw);
        return {
          type: 'expense', category: 'Compra Crédito',
          amount: -amt,
          description: merchant ? `Compra: ${merchant}` : 'Compra no cartão',
          bankName: 'Nubank', rawTitle: title, rawBody: body,
        };
      }
    }

    // Débito: "R$ 45,00 debitado"
    if (full.includes('debitado') && amt) {
      return {
        type: 'expense', category: 'Compra Débito',
        amount: -amt,
        description: 'Débito no cartão',
        bankName: 'Nubank', rawTitle: title, rawBody: body,
      };
    }

    // Pagamento de fatura
    if (full.includes('fatura') && full.includes('pagamento') && amt) {
      return {
        type: 'expense', category: 'Boleto',
        amount: -amt,
        description: 'Pagamento de fatura Nubank',
        bankName: 'Nubank', rawTitle: title, rawBody: body,
      };
    }

    // Estorno
    if (full.includes('estorno') && amt) {
      return {
        type: 'income', category: 'Estorno',
        amount: amt,
        description: 'Estorno Nubank',
        bankName: 'Nubank', rawTitle: title, rawBody: body,
      };
    }

    // Fallback: qualquer notificação Nubank com valor monetário
    if (amt && includesAny(full, 'receb', 'enviad', 'compra', 'pagamento', 'transfer', 'pix', 'debit')) {
      const isIn = includesAny(full, 'receb', 'recebemos', 'credit', 'estorno');
      return {
        type: isIn ? 'income' : 'expense',
        category: full.includes('pix') ? 'Pix' : 'Transferência',
        amount: isIn ? amt : -amt,
        description: title || 'Transação Nubank',
        bankName: 'Nubank', rawTitle: title, rawBody: body,
      };
    }

    return null;
  },
};

function extractName(text: string, preposition: string): string {
  const regex = new RegExp(`\\b${preposition}\\s+([A-ZÀ-Ú][a-zà-ú]+(?:\\s+[A-ZÀ-Ú][a-zà-ú]+)?)`, 'i');
  const match = regex.exec(text);
  return match ? ` - ${match[1]}` : '';
}

function extractMerchant(text: string): string | null {
  const match = /(?:no|na|em|@)\s+([A-Za-zÀ-ú\s&]+?)(?:\s+r\$|\s+no dia|\s+em|\.|$)/i.exec(text);
  return match ? match[1].trim() : null;
}
