import { BankParser, ParsedTransaction } from '../../../models/types';
import { parseBRL } from '../../../utils/currency';

export const BBParser: BankParser = {
  parse(title: string, body: string): ParsedTransaction | null {
    const t = title.toLowerCase();
    const b = body.toLowerCase();
    const amtRe = /r\$\s?([\d.]+,\d{2})/i;

    if (t.includes('pix') || b.includes('pix')) {
      const amt = amtRe.exec(body) ?? amtRe.exec(title);
      if (amt) {
        const isIncome = t.includes('receb') || b.includes('recebido') || b.includes('entrada');
        return {
          type: isIncome ? 'income' : 'expense',
          category: 'Pix',
          amount: isIncome ? parseBRL(amt[1]) : -parseBRL(amt[1]),
          description: isIncome ? 'Pix recebido' : 'Pix enviado',
          bankName: 'Banco do Brasil', rawTitle: title, rawBody: body,
        };
      }
    }

    if (t.includes('compra') || b.includes('compra')) {
      const amt = amtRe.exec(body) ?? amtRe.exec(title);
      if (amt) {
        return {
          type: 'expense', category: 'Compra Débito',
          amount: -parseBRL(amt[1]),
          description: 'Compra realizada',
          bankName: 'Banco do Brasil', rawTitle: title, rawBody: body,
        };
      }
    }

    if (t.includes('saque')) {
      const amt = amtRe.exec(body);
      if (amt) {
        return {
          type: 'expense', category: 'Saque',
          amount: -parseBRL(amt[1]),
          description: 'Saque no caixa',
          bankName: 'Banco do Brasil', rawTitle: title, rawBody: body,
        };
      }
    }

    return null;
  },
};
