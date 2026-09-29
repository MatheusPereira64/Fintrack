/**
 * Parser dedicado — Santander (com.santander.app / com.santander.way).
 */
import { BankParser, ParsedTransaction } from '../../../models/types';
import { parseNotificationAmount } from '../../../utils/notificationAmount';

const BANK = 'Santander';

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
  const m = /(?:em|na|no|estabelecimento)\s+([A-Za-zÀ-ú0-9 &.']{2,40}?)(?:\s*r\$|\s*no valor|\s*[-–]|\.|$)/i.exec(text);
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

export const SantanderParser: BankParser = {
  parse(title: string, body: string, _packageName: string): ParsedTransaction | null {
    const full = `${title} ${body}`.toLowerCase();
    const raw = `${title} ${body}`;
    const amt = parseNotificationAmount(raw);
    if (amt == null) return null;

    // Pix
    if (includesAny(full, 'pix')) {
      if (includesAny(full, 'recebido', 'recebeu', 'você recebeu', 'voce recebeu', 'entrada', 'creditado')) {
        return make('income', 'Pix', amt, `Pix recebido${extractName(raw, 'de')}`, title, body);
      }
      if (includesAny(full, 'enviado', 'enviou', 'realizado', 'pago', 'débito', 'debitado', 'saída', 'saida')) {
        return make('expense', 'Pix', -amt, `Pix enviado${extractName(raw, 'para')}`, title, body);
      }
      // "Pix Santander R$ X" sem direção clara → entrada conservadora só se "receb"
      if (includesAny(full, 'receb')) {
        return make('income', 'Pix', amt, `Pix recebido${extractName(raw, 'de')}`, title, body);
      }
      return make('expense', 'Pix', -amt, `Pix Santander${extractName(raw, 'para')}`, title, body);
    }

    // Cartão crédito
    if (includesAny(full,
      'compra aprovada', 'compra no crédito', 'compra credito',
      'compra no cartão', 'compra no cartao', 'transação aprovada', 'transacao aprovada',
      'compra realizada',
    )) {
      const merchant = extractMerchant(raw);
      return make('expense', 'Compra Crédito', -amt,
        merchant ? `Compra: ${merchant}` : 'Compra no cartão Santander', title, body);
    }

    // Débito
    if (includesAny(full, 'compra no débito', 'compra no debito', 'débito em conta', 'debito em conta', 'compra débito')) {
      const merchant = extractMerchant(raw);
      return make('expense', 'Compra Débito', -amt,
        merchant ? `Débito: ${merchant}` : 'Compra no débito Santander', title, body);
    }

    // TED / DOC / transferência
    if (includesAny(full, 'ted', 'doc', 'transferência', 'transferencia')) {
      if (includesAny(full, 'receb', 'entrada', 'creditado')) {
        return make('income', 'Transferência', amt, 'Transferência recebida', title, body);
      }
      return make('expense', 'Transferência', -amt, 'Transferência enviada', title, body);
    }

    // Boleto / fatura
    if (includesAny(full, 'boleto', 'pagamento de conta', 'fatura')) {
      return make('expense', 'Boleto', -amt,
        includesAny(full, 'fatura') ? 'Pagamento de fatura Santander' : 'Boleto Santander',
        title, body);
    }

    // Saque / depósito / estorno
    if (includesAny(full, 'saque')) {
      return make('expense', 'Saque', -amt, 'Saque Santander', title, body);
    }
    if (includesAny(full, 'depósito', 'deposito', 'creditado')) {
      return make('income', 'Depósito', amt, 'Depósito Santander', title, body);
    }
    if (includesAny(full, 'estorno', 'reembolso')) {
      return make('income', 'Estorno', amt, 'Estorno Santander', title, body);
    }

    return null;
  },
};
