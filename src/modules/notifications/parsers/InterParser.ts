import { BankParser, ParsedTransaction } from '../../../models/types';
import { parseNotificationAmount } from '../../../utils/notificationAmount';

function findAmount(title: string, body: string): number | null {
  return parseNotificationAmount(`${title} ${body}`);
}

function includesAny(text: string, ...terms: string[]): boolean {
  return terms.some(t => text.includes(t));
}

export const InterParser: BankParser = {
  parse(title: string, body: string): ParsedTransaction | null {
    const full = `${title} ${body}`.toLowerCase();
    const raw  = `${title} ${body}`;
    const amt  = findAmount(title, body);

    if (includesAny(full,
      'pix recebid', 'recebeu um pix', 'você recebeu', 'voce recebeu',
      'pix in', 'entrada de pix', 'creditado', 'recebeu r$',
    ) || (full.includes('pix') && includesAny(full, 'receb', 'entrada', 'credit'))) {
      if (amt) {
        return {
          type: 'income', category: 'Pix',
          amount: amt,
          description: `Pix recebido${extractAfter(raw, 'de')}`,
          bankName: 'Inter', rawTitle: title, rawBody: body,
        };
      }
    }

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

    if (full.includes('pix') && amt) {
      const isIn = includesAny(full, 'receb', 'entrada', 'credit', 'você recebeu', 'voce recebeu');
      const isOut = includesAny(full, 'envi', 'pagou', 'debit', 'saída', 'saida', 'realizad', 'efetuad');
      if (isOut && !isIn) {
        return {
          type: 'expense', category: 'Pix', amount: -amt,
          description: 'Pix enviado', bankName: 'Inter', rawTitle: title, rawBody: body,
        };
      }
      return {
        type: 'income', category: 'Pix', amount: amt,
        description: 'Pix recebido', bankName: 'Inter', rawTitle: title, rawBody: body,
      };
    }

    if (includesAny(full, 'compra aprovada', 'compra realizada', 'compra no cartão') && amt) {
      return {
        type: 'expense', category: 'Compra Crédito',
        amount: -amt,
        description: extractMerchantInter(raw) ?? 'Compra aprovada',
        bankName: 'Inter', rawTitle: title, rawBody: body,
      };
    }

    if (includesAny(full, 'débito', 'debito') && amt) {
      return {
        type: 'expense', category: 'Compra Débito',
        amount: -amt,
        description: 'Débito em conta',
        bankName: 'Inter', rawTitle: title, rawBody: body,
      };
    }

    if (includesAny(full, 'transferência recebid', 'ted recebid', 'doc recebid') && amt) {
      return {
        type: 'income', category: 'Transferência',
        amount: amt,
        description: 'Transferência recebida',
        bankName: 'Inter', rawTitle: title, rawBody: body,
      };
    }

    if (includesAny(full, 'transferência enviad', 'transferência realizad', 'ted enviad', 'doc enviad') && amt) {
      return {
        type: 'expense', category: 'Transferência',
        amount: -amt,
        description: 'Transferência enviada',
        bankName: 'Inter', rawTitle: title, rawBody: body,
      };
    }

    return null;
  },
};

function extractAfter(text: string, word: string): string {
  const re = new RegExp(`\\b${word}\\s+([A-Za-zÀ-ú][A-Za-zÀ-ú ]{1,30})`, 'i');
  const m = re.exec(text);
  return m ? ` - ${m[1].trim()}` : '';
}

function extractMerchantInter(text: string): string | null {
  const m = /(?:em|no|na)\s+([A-Za-zÀ-ú0-9 &.']{2,40}?)(?:\s*r\$|\.|$)/i.exec(text);
  return m ? m[1].trim() : null;
}
