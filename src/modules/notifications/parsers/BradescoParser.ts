import { BankParser, ParsedTransaction } from '../../../models/types';
import { parseBRL } from '../../../utils/currency';

export const BradescoParser: BankParser = {
  parse(title: string, body: string): ParsedTransaction | null {
    const t = title.toLowerCase();
    const b = body.toLowerCase();
    const amtAny = /r\$\s?([\d.]+,\d{2})/i;

    if (t.includes('pix')) {
      const amt = amtAny.exec(body) ?? amtAny.exec(title);
      if (amt) {
        const isIncome = t.includes('receb') || b.includes('receb');
        return {
          type: isIncome ? 'income' : 'expense',
          category: 'Pix',
          amount: isIncome ? parseBRL(amt[1]) : -parseBRL(amt[1]),
          description: isIncome ? 'Pix recebido' : 'Pix enviado',
          bankName: 'Bradesco', rawTitle: title, rawBody: body,
        };
      }
    }

    if (t.includes('compra') || b.includes('compra aprovada') || b.includes('compra realizada')) {
      const amt = amtAny.exec(body) ?? amtAny.exec(title);
      if (amt) {
        const isDebit = b.includes('débit') || t.includes('débit');
        return {
          type: 'expense',
          category: isDebit ? 'Compra Débito' : 'Compra Crédito',
          amount: -parseBRL(amt[1]),
          description: 'Compra aprovada',
          bankName: 'Bradesco', rawTitle: title, rawBody: body,
        };
      }
    }

    if (t.includes('ted') || t.includes('doc')) {
      const amt = amtAny.exec(body);
      if (amt) {
        const isIncome = b.includes('receb') || t.includes('receb');
        return {
          type: isIncome ? 'income' : 'expense',
          category: 'TED/DOC',
          amount: isIncome ? parseBRL(amt[1]) : -parseBRL(amt[1]),
          description: t.includes('ted') ? (isIncome ? 'TED recebida' : 'TED enviada') : (isIncome ? 'DOC recebido' : 'DOC enviado'),
          bankName: 'Bradesco', rawTitle: title, rawBody: body,
        };
      }
    }

    if (t.includes('boleto') || b.includes('boleto pago')) {
      const amt = amtAny.exec(body);
      if (amt) {
        return {
          type: 'expense', category: 'Boleto',
          amount: -parseBRL(amt[1]),
          description: 'Boleto pago',
          bankName: 'Bradesco', rawTitle: title, rawBody: body,
        };
      }
    }

    return null;
  },
};
