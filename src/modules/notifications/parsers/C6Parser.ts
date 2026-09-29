/**
 * Parser dedicado — C6 Bank (br.com.c6bank.app / com.c6bank.app).
 */
import { BankParser, ParsedTransaction } from '../../../models/types';
import { parseNotificationAmount } from '../../../utils/notificationAmount';

const BANK = 'C6 Bank';

function includesAny(text: string, ...terms: string[]): boolean {
  return terms.some(t => text.includes(t));
}

function extractName(text: string, prep: string): string {
  const re = new RegExp(
    `\\b${prep}\\s+([A-Za-zÀ-ú][A-Za-zÀ-ú .']{1,40}?)(?:\\s*[-|,]|\\s*r\\$|\\s*\\(|$)`,
    'i',
  );
  const m = re.exec(text);
  return m ? ` · ${m[1].trim()}` : '';
}

function extractMerchant(text: string): string | null {
  const m = /(?:em|na|no|@)\s+([A-Za-zÀ-ú0-9 &.']{2,40}?)(?:\s*r\$|\s*no valor|\s*[-–]|\.|$)/i.exec(text);
  return m ? m[1].trim() : null;
}

function make(
  type: 'income' | 'expense',
  category: string,
  amount: number,
  description: string,
  title: string,
  body: string,
): ParsedTransaction {
  return { type, category, amount, description, bankName: BANK, rawTitle: title, rawBody: body };
}

export const C6Parser: BankParser = {
  parse(title: string, body: string, _packageName: string): ParsedTransaction | null {
    const full = `${title} ${body}`.toLowerCase();
    const raw = `${title} ${body}`;
    const amt = parseNotificationAmount(raw);
    if (amt == null) return null;

    if (includesAny(full, 'pix')) {
      if (includesAny(full, 'recebido', 'recebeu', 'você recebeu', 'voce recebeu', 'entrada', 'creditado')) {
        return make('income', 'Pix', amt, `Pix recebido${extractName(raw, 'de')}`, title, body);
      }
      if (includesAny(full, 'enviado', 'enviou', 'realizado', 'pago', 'debitado', 'saída', 'saida', 'transferiu')) {
        return make('expense', 'Pix', -amt, `Pix enviado${extractName(raw, 'para')}`, title, body);
      }
      // C6 costuma: "Pix C6 Bank · R$ X,XX"
      return make('expense', 'Pix', -amt, `Pix C6${extractName(raw, 'para')}`, title, body);
    }

    if (includesAny(full,
      'compra aprovada', 'compra no crédito', 'compra credito',
      'compra no cartão', 'compra no cartao', 'compra atlas', 'cartão atlas',
    )) {
      const merchant = extractMerchant(raw);
      return make('expense', 'Compra Crédito', -amt,
        merchant ? `Compra: ${merchant}` : 'Compra no cartão C6', title, body);
    }

    if (includesAny(full, 'débito', 'debito', 'compra no débito', 'compra no debito')) {
      const merchant = extractMerchant(raw);
      return make('expense', 'Compra Débito', -amt,
        merchant ? `Débito: ${merchant}` : 'Compra no débito C6', title, body);
    }

    if (includesAny(full, 'transferência', 'transferencia', 'ted', 'doc')) {
      if (includesAny(full, 'receb', 'entrada', 'creditado')) {
        return make('income', 'Transferência', amt, 'Transferência recebida', title, body);
      }
      return make('expense', 'Transferência', -amt, 'Transferência enviada', title, body);
    }

    if (includesAny(full, 'boleto', 'conta paga', 'pagamento de conta', 'fatura')) {
      return make('expense', 'Boleto', -amt,
        includesAny(full, 'fatura') ? 'Pagamento de fatura C6' : 'Boleto C6',
        title, body);
    }

    if (includesAny(full, 'saque')) {
      return make('expense', 'Saque', -amt, 'Saque C6', title, body);
    }
    if (includesAny(full, 'depósito', 'deposito')) {
      return make('income', 'Depósito', amt, 'Depósito C6', title, body);
    }
    if (includesAny(full, 'estorno', 'reembolso', 'cashback')) {
      return make('income', includesAny(full, 'cashback') ? 'Outros' : 'Estorno', amt,
        includesAny(full, 'cashback') ? 'Cashback C6' : 'Estorno C6', title, body);
    }

    return null;
  },
};
