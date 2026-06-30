import { BankParser, ParsedTransaction } from '../../../models/types';
import { parseBRL } from '../../../utils/currency';

export const ItauParser: BankParser = {
  parse(title: string, body: string): ParsedTransaction | null {
    const t = title.toLowerCase();
    const b = body.toLowerCase();

    // Pix - Itaú usa "Pix enviado" e "Pix recebido" nos títulos
    if (t.includes('pix')) {
      const amt = /r\$\s?([\d.]+,\d{2})/i.exec(body) ?? /r\$\s?([\d.]+,\d{2})/i.exec(title);
      if (amt) {
        const isIncome = t.includes('receb') || b.includes('recebeu') || b.includes('recebido');
        return {
          type: isIncome ? 'income' : 'expense',
          category: 'Pix',
          amount: isIncome ? parseBRL(amt[1]) : -parseBRL(amt[1]),
          description: isIncome ? 'Pix recebido' : 'Pix enviado',
          bankName: 'Itaú', rawTitle: title, rawBody: body,
        };
      }
    }

    // "Compra aprovada" ou "Compra no crédito/débito"
    if (t.includes('compra') || b.includes('compra aprovada')) {
      const amt = /r\$\s?([\d.]+,\d{2})/i.exec(body) ?? /r\$\s?([\d.]+,\d{2})/i.exec(title);
      if (amt) {
        const isDebit = t.includes('débit') || b.includes('débit') || t.includes('débito');
        return {
          type: 'expense',
          category: isDebit ? 'Compra Débito' : 'Compra Crédito',
          amount: -parseBRL(amt[1]),
          description: extractMerchant(body) ?? (isDebit ? 'Compra débito' : 'Compra crédito'),
          bankName: 'Itaú', rawTitle: title, rawBody: body,
        };
      }
    }

    // TED enviada/recebida
    if (t.includes('ted')) {
      const amt = /r\$\s?([\d.]+,\d{2})/i.exec(body);
      if (amt) {
        const isIncome = b.includes('receb') || t.includes('receb');
        return {
          type: isIncome ? 'income' : 'expense',
          category: 'TED/DOC',
          amount: isIncome ? parseBRL(amt[1]) : -parseBRL(amt[1]),
          description: isIncome ? 'TED recebida' : 'TED enviada',
          bankName: 'Itaú', rawTitle: title, rawBody: body,
        };
      }
    }

    // Débito automático / pagamento
    if (t.includes('pagamento') || b.includes('pagamento efetuado')) {
      const amt = /r\$\s?([\d.]+,\d{2})/i.exec(body);
      if (amt) {
        return {
          type: 'expense', category: 'Boleto',
          amount: -parseBRL(amt[1]),
          description: 'Pagamento realizado',
          bankName: 'Itaú', rawTitle: title, rawBody: body,
        };
      }
    }

    // Saque
    if (t.includes('saque') || b.includes('saque')) {
      const amt = /r\$\s?([\d.]+,\d{2})/i.exec(body);
      if (amt) {
        return {
          type: 'expense', category: 'Saque',
          amount: -parseBRL(amt[1]),
          description: 'Saque realizado',
          bankName: 'Itaú', rawTitle: title, rawBody: body,
        };
      }
    }

    return null;
  },
};

function extractMerchant(body: string): string | null {
  const m = /(?:no|na|em)\s+([A-Za-zÀ-ú\s&0-9*]+?)(?:\s+r\$|\s+no dia|\s+valor|\.|$)/i.exec(body);
  return m ? m[1].trim() : null;
}
