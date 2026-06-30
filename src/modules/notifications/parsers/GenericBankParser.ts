/**
 * Parser genérico — usado como fallback para bancos não mapeados
 * ou como base para detectar transações comuns.
 */
import { BankParser, ParsedTransaction } from '../../../models/types';
import { parseBRL } from '../../../utils/currency';

export const GenericBankParser: BankParser = {
  parse(title: string, body: string, packageName: string): ParsedTransaction | null {
    const t = title.toLowerCase();
    const b = body.toLowerCase();
    const amtRe = /r\$\s?([\d.]+,\d{2})/i;
    const amt = amtRe.exec(body) ?? amtRe.exec(title);

    if (!amt) return null;

    const value = parseBRL(amt[1]);
    const bankName = packageName.split('.').slice(-2).join('.'); // fallback name

    // Pix
    if (t.includes('pix') || b.includes('pix')) {
      const isIncome = t.includes('receb') || b.includes('recebido') || b.includes('entrada');
      return {
        type: isIncome ? 'income' : 'expense',
        category: 'Pix',
        amount: isIncome ? value : -value,
        description: isIncome ? 'Pix recebido' : 'Pix enviado',
        bankName, rawTitle: title, rawBody: body,
      };
    }

    // Compra
    if (t.includes('compra') || b.includes('compra aprovada') || b.includes('purchase')) {
      return {
        type: 'expense', category: 'Compra Crédito',
        amount: -value,
        description: 'Compra no cartão',
        bankName, rawTitle: title, rawBody: body,
      };
    }

    // Débito
    if (b.includes('débito') || b.includes('debitado')) {
      return {
        type: 'expense', category: 'Compra Débito',
        amount: -value,
        description: 'Débito em conta',
        bankName, rawTitle: title, rawBody: body,
      };
    }

    // Transferência
    if (t.includes('transferência') || b.includes('transferência') || t.includes('ted') || t.includes('doc')) {
      const isIncome = b.includes('receb') || t.includes('receb');
      return {
        type: isIncome ? 'income' : 'expense',
        category: 'Transferência',
        amount: isIncome ? value : -value,
        description: isIncome ? 'Transferência recebida' : 'Transferência enviada',
        bankName, rawTitle: title, rawBody: body,
      };
    }

    // Boleto
    if (t.includes('boleto') || b.includes('boleto')) {
      return {
        type: 'expense', category: 'Boleto',
        amount: -value,
        description: 'Pagamento de boleto',
        bankName, rawTitle: title, rawBody: body,
      };
    }

    // Saque
    if (t.includes('saque') || b.includes('saque')) {
      return {
        type: 'expense', category: 'Saque',
        amount: -value,
        description: 'Saque',
        bankName, rawTitle: title, rawBody: body,
      };
    }

    // Depósito / crédito genérico
    if (t.includes('depósito') || t.includes('crédito') || b.includes('depósito')) {
      return {
        type: 'income', category: 'Depósito',
        amount: value,
        description: 'Depósito recebido',
        bankName, rawTitle: title, rawBody: body,
      };
    }

    // Estorno
    if (t.includes('estorno') || b.includes('estorno') || t.includes('reembolso')) {
      return {
        type: 'income', category: 'Estorno',
        amount: value,
        description: 'Estorno/reembolso',
        bankName, rawTitle: title, rawBody: body,
      };
    }

    return null;
  },
};
