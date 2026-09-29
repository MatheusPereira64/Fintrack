/**
 * Parser dedicado — PicPay (com.picpay).
 */
import { BankParser, ParsedTransaction } from '../../../models/types';
import { parseNotificationAmount } from '../../../utils/notificationAmount';

const BANK = 'PicPay';

function includesAny(text: string, ...terms: string[]): boolean {
  return terms.some(t => text.includes(t));
}

function extractName(text: string, prep: string): string {
  const re = new RegExp(
    `\\b${prep}\\s+([A-Za-zÀ-ú][A-Za-zÀ-ú .'@]{1,40}?)(?:\\s*[-|,]|\\s*r\\$|\\s*\\(|$)`,
    'i',
  );
  const m = re.exec(text);
  return m ? ` · ${m[1].trim()}` : '';
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

export const PicPayParser: BankParser = {
  parse(title: string, body: string, _packageName: string): ParsedTransaction | null {
    const full = `${title} ${body}`.toLowerCase();
    const raw = `${title} ${body}`;
    const amt = parseNotificationAmount(raw);
    if (amt == null) return null;

    // Pagamento / transferência PicPay entre usuários
    if (includesAny(full, 'pagou', 'você pagou', 'voce pagou', 'pagamento enviado', 'enviou')) {
      return make('expense', 'Pix', -amt,
        `Pagamento PicPay${extractName(raw, 'para')}`, title, body);
    }

    if (includesAny(full, 'recebeu', 'você recebeu', 'voce recebeu', 'pagamento recebido', 'recebeu um pagamento')) {
      return make('income', 'Pix', amt,
        `Pagamento PicPay${extractName(raw, 'de')}`, title, body);
    }

    // Pix via PicPay
    if (includesAny(full, 'pix')) {
      if (includesAny(full, 'recebido', 'recebeu', 'entrada', 'creditado')) {
        return make('income', 'Pix', amt, `Pix recebido${extractName(raw, 'de')}`, title, body);
      }
      if (includesAny(full, 'enviado', 'enviou', 'realizado', 'pago', 'saída', 'saida')) {
        return make('expense', 'Pix', -amt, `Pix enviado${extractName(raw, 'para')}`, title, body);
      }
      return make('expense', 'Pix', -amt, 'Pix PicPay', title, body);
    }

    // Cartão PicPay
    if (includesAny(full, 'compra aprovada', 'compra no cartão', 'compra no cartao', 'compra realizada')) {
      return make('expense', 'Compra Crédito', -amt, 'Compra no cartão PicPay', title, body);
    }

    if (includesAny(full, 'boleto', 'conta paga', 'pagamento de conta')) {
      return make('expense', 'Boleto', -amt, 'Boleto PicPay', title, body);
    }

    if (includesAny(full, 'cashback')) {
      return make('income', 'Outros', amt, 'Cashback PicPay', title, body);
    }

    if (includesAny(full, 'estorno', 'reembolso', 'devolução', 'devolucao')) {
      return make('income', 'Estorno', amt, 'Estorno PicPay', title, body);
    }

    if (includesAny(full, 'recarga', 'celular')) {
      return make('expense', 'Outros', -amt, 'Recarga PicPay', title, body);
    }

    return null;
  },
};
