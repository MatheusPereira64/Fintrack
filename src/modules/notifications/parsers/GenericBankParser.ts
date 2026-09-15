/**
 * Parser genérico — fallback para bancos não mapeados ou padrões comuns.
 */
import { BankParser, ParsedTransaction } from '../../../models/types';
import { parseNotificationAmount } from '../../../utils/notificationAmount';

function includes(text: string, ...terms: string[]): boolean {
  return terms.some(t => text.includes(t));
}

function extractName(text: string, after: string): string {
  const re = new RegExp(
    `\\b${after}:?\\s+([A-Za-zÀ-ú][A-Za-zÀ-ú ]{1,40})(?:\\s*[-|,]|\\s*r\\$|\\s*\\(|$)`,
    'i',
  );
  const m = re.exec(text);
  return m ? ` · ${m[1].trim()}` : '';
}

function extractMerchant(text: string): string | null {
  const m = /(?:em|na loja|no estabelecimento|@)\s*([A-Za-zÀ-ú0-9 &.']{2,40}?)(?:\s*r\$|\s*no valor|\s*[-–]|\s*\*|\.|$)/i.exec(text);
  return m ? m[1].trim() : null;
}

export const GenericBankParser: BankParser = {
  parse(title: string, body: string, packageName: string): ParsedTransaction | null {
    const t    = title.toLowerCase();
    const b    = body.toLowerCase();
    const full = `${t} ${b}`;
    const raw  = `${title} ${body}`;

    const value = parseNotificationAmount(raw);
    if (!value && !includes(full, 'salário', 'salary', 'cashback')) return null;

    const v = value ?? 0;
    const bankName = deriveBankName(packageName, raw);

    if (includes(full, 'salário', 'salary', 'folha de pagamento', 'holerite', 'pagamento de salário')) {
      return make('income', 'Salário', v, `Salário recebido${extractName(raw, 'de')}`, bankName, title, body);
    }

    if (includes(full, 'pix')) {
      const isIn = includes(full, 'recebido', 'recebeu', 'recebida', 'entrada', 'pix in', 'creditado', 'você recebeu', 'voce recebeu');
      const isOut = includes(full, 'enviado', 'enviada', 'enviou', 'realizado', 'realizada',
        'efetuado', 'efetuada', 'concluído', 'concluida', 'pix out', 'debitado', 'transferi', 'pagou');
      if (isIn) return make('income',  'Pix', v,  `Pix recebido${extractName(raw,  'de')}`,   bankName, title, body);
      if (isOut) return make('expense','Pix', -v, `Pix enviado${extractName(raw,  'para')}`,  bankName, title, body);
      return make('income', 'Pix', v, 'Pix', bankName, title, body);
    }

    if (includes(full, 'compra aprovada', 'compra realizada', 'compra no crédito', 'purchase approved',
                       'compra no cartão', 'compra efetuada', 'crédito aprovado', 'transação aprovada')) {
      const merchant = extractMerchant(raw);
      return make('expense', 'Compra Crédito', -v,
        merchant ? `Compra: ${merchant}` : 'Compra no cartão crédito', bankName, title, body);
    }

    if (includes(full, 'compra débito', 'débito automático', 'compra no débito', 'debit purchase',
                       'debitado', 'débito em conta', 'débito aprovado')) {
      const merchant = extractMerchant(raw);
      return make('expense', 'Compra Débito', -v,
        merchant ? `Débito: ${merchant}` : 'Compra no débito', bankName, title, body);
    }

    if (includes(full, 'transferência recebid', 'transferencia recebid', 'recebemos sua transferência')) {
      return make('income', 'Transferência', v, 'Transferência recebida', bankName, title, body);
    }

    if (includes(full, 'transferência enviad', 'transferencia enviad', 'enviamos sua transferência')) {
      return make('expense', 'Transferência', -v, 'Transferência enviada', bankName, title, body);
    }

    if (includes(full, 'ted', 'doc')) {
      const isIn = includes(full, 'receb', 'entrada', 'crédito');
      return make(isIn ? 'income' : 'expense', 'Transferência',
        isIn ? v : -v, isIn ? 'TED/DOC recebido' : 'TED/DOC enviado', bankName, title, body);
    }

    if (includes(full, 'boleto', 'pagamento de conta', 'conta paga', 'bill payment')) {
      return make('expense', 'Boleto', -v, `Boleto${extractName(raw, 'para')}`, bankName, title, body);
    }

    if (includes(full, 'fatura', 'pagamento de fatura', 'invoice')) {
      return make('expense', 'Boleto', -v, 'Pagamento de fatura', bankName, title, body);
    }

    if (includes(full, 'saque', 'cash withdrawal', 'retirada')) {
      return make('expense', 'Saque', -v, 'Saque', bankName, title, body);
    }

    if (includes(full, 'depósito', 'creditado', 'crédito recebido', 'deposit')) {
      return make('income', 'Depósito', v, 'Depósito recebido', bankName, title, body);
    }

    if (includes(full, 'estorno', 'reembolso', 'chargeback', 'refund', 'cancelamento')) {
      return make('income', 'Estorno', v, 'Estorno/reembolso', bankName, title, body);
    }

    if (includes(full, 'cashback', 'cash back')) {
      if (!v) return null;
      return make('income', 'Cashback', v, `Cashback de ${formatBRL(v)}`, bankName, title, body);
    }

    if (includes(full, 'tarifa', 'iof', 'taxa', 'fee', 'juros', 'multa')) {
      return make('expense', 'Tarifas', -v, 'Tarifa/Encargo', bankName, title, body);
    }

    if (includes(full, 'cobrança', 'pagamento', 'debitado')) {
      return make('expense', 'Outros', -v, 'Cobrança', bankName, title, body);
    }

    return null;
  },
};

function make(
  type: 'income' | 'expense',
  category: string,
  amount: number,
  description: string,
  bankName: string,
  rawTitle: string,
  rawBody: string,
): ParsedTransaction {
  return { type, category, amount, description, bankName, rawTitle, rawBody };
}

function deriveBankName(packageName: string, raw: string): string {
  const byPackage: Record<string, string> = {
    'com.nu.production':              'Nubank',
    'com.nubank.nubank':              'Nubank',
    'br.com.intermedium':             'Inter',
    'com.bancointer.banking':         'Inter',
    'com.itau':                       'Itaú',
    'com.itau.empresas':              'Itaú',
    'com.bradesco':                   'Bradesco',
    'com.bradesco.prime':             'Bradesco',
    'com.bb.android':                 'Banco do Brasil',
    'br.com.bb.android':              'Banco do Brasil',
    'com.santander.app':              'Santander',
    'com.santander.way':              'Santander',
    'br.com.c6bank.app':              'C6 Bank',
    'com.c6bank.app':                 'C6 Bank',
    'br.gov.caixa.internet.smartphones': 'Caixa',
    'com.mercadopago.wallet':         'Mercado Pago',
    'com.picpay':                     'PicPay',
  };
  if (byPackage[packageName]) return byPackage[packageName];

  const knownNames = [
    'Nubank', 'Inter', 'Itaú', 'Bradesco', 'Banco do Brasil', 'Santander',
    'C6 Bank', 'Caixa', 'Mercado Pago', 'PicPay', 'Next', 'Neon',
    'PagBank', 'Banco Original', 'Sicoob', 'Sicredi', 'BTG', 'XP',
  ];
  for (const n of knownNames) {
    if (raw.toLowerCase().includes(n.toLowerCase())) return n;
  }
  const parts = packageName.split('.');
  return parts[parts.length - 1] ?? 'Banco';
}

function formatBRL(v: number): string {
  return `R$ ${v.toFixed(2).replace('.', ',')}`;
}
