/**
 * Parser dedicado — Mercado Pago (com.mercadopago.wallet).
 */
import { BankParser, ParsedTransaction } from '../../../models/types';
import { parseNotificationAmount } from '../../../utils/notificationAmount';

const BANK = 'Mercado Pago';

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
  const m = /(?:em|na|no|loja)\s+([A-Za-zÀ-ú0-9 &.']{2,40}?)(?:\s*r\$|\s*no valor|\s*[-–]|\.|$)/i.exec(text);
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

export const MercadoPagoParser: BankParser = {
  parse(title: string, body: string, _packageName: string): ParsedTransaction | null {
    const full = `${title} ${body}`.toLowerCase();
    const raw = `${title} ${body}`;
    const amt = parseNotificationAmount(raw);
    if (amt == null) return null;

    // Pix
    if (includesAny(full, 'pix')) {
      if (includesAny(full, 'recebido', 'recebeu', 'você recebeu', 'voce recebeu', 'entrada', 'acreditado', 'creditado')) {
        return make('income', 'Pix', amt, `Pix recebido${extractName(raw, 'de')}`, title, body);
      }
      if (includesAny(full, 'enviado', 'enviou', 'realizado', 'pagaste', 'pagou', 'saída', 'saida', 'débito', 'debito')) {
        return make('expense', 'Pix', -amt, `Pix enviado${extractName(raw, 'para')}`, title, body);
      }
      return make('expense', 'Pix', -amt, 'Pix Mercado Pago', title, body);
    }

    // Pagamento / compra Mercado Livre / Mercado Pago
    if (includesAny(full,
      'compra aprovada', 'pagamento aprovado', 'pagaste', 'você pagou', 'voce pagou',
      'compra realizada', 'pago realizado',
    )) {
      const merchant = extractMerchant(raw);
      return make('expense', 'Compra Crédito', -amt,
        merchant ? `Compra: ${merchant}` : 'Pagamento Mercado Pago', title, body);
    }

    // Dinheiro recebido / venda
    if (includesAny(full, 'recebeu um pagamento', 'você recebeu', 'voce recebeu', 'dinheiro disponível', 'dinheiro disponivel', 'venda')) {
      return make('income', 'Transferência', amt,
        `Recebimento Mercado Pago${extractName(raw, 'de')}`, title, body);
    }

    // Transferência
    if (includesAny(full, 'transferência', 'transferencia', 'transferiste', 'transferiu')) {
      if (includesAny(full, 'receb', 'entrada', 'acredit')) {
        return make('income', 'Transferência', amt, 'Transferência recebida', title, body);
      }
      return make('expense', 'Transferência', -amt, 'Transferência enviada', title, body);
    }

    // Cartão
    if (includesAny(full, 'cartão', 'cartao', 'débito', 'debito', 'crédito', 'credito')) {
      if (includesAny(full, 'compra', 'pago', 'pagamento')) {
        const merchant = extractMerchant(raw);
        const isDebit = includesAny(full, 'débito', 'debito');
        return make('expense', isDebit ? 'Compra Débito' : 'Compra Crédito', -amt,
          merchant ? `Compra: ${merchant}` : 'Compra Mercado Pago', title, body);
      }
    }

    if (includesAny(full, 'boleto', 'conta paga')) {
      return make('expense', 'Boleto', -amt, 'Boleto Mercado Pago', title, body);
    }

    if (includesAny(full, 'estorno', 'reembolso', 'devolução', 'devolucao')) {
      return make('income', 'Estorno', amt, 'Estorno Mercado Pago', title, body);
    }

    if (includesAny(full, 'saque', 'retirada')) {
      return make('expense', 'Saque', -amt, 'Saque Mercado Pago', title, body);
    }

    return null;
  },
};
