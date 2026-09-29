import { parseNotificationAmount } from '../src/utils/notificationAmount';
import { NubankParser } from '../src/modules/notifications/parsers/NubankParser';
import { InterParser } from '../src/modules/notifications/parsers/InterParser';
import { GenericBankParser } from '../src/modules/notifications/parsers/GenericBankParser';
import { SantanderParser } from '../src/modules/notifications/parsers/SantanderParser';
import { C6Parser } from '../src/modules/notifications/parsers/C6Parser';
import { PicPayParser } from '../src/modules/notifications/parsers/PicPayParser';
import { MercadoPagoParser } from '../src/modules/notifications/parsers/MercadoPagoParser';
import {
  applyTaughtPattern,
  matchesTaughtPattern,
} from '../src/modules/notifications/services/TaughtPatternMatcher';
import { TaughtPattern } from '../src/models/types';

describe('parseNotificationAmount', () => {
  it('aceita centavos BR', () => {
    expect(parseNotificationAmount('Você recebeu R$ 1.000,00')).toBe(1000);
    expect(parseNotificationAmount('Pix de R$ 50,90')).toBe(50.9);
  });

  it('aceita valor sem centavos', () => {
    expect(parseNotificationAmount('você recebeu um pix de R$ 1000')).toBe(1000);
    expect(parseNotificationAmount('Pix de R$ 1.000')).toBe(1000);
  });
});

describe('NubankParser Pix', () => {
  it('detecta você recebeu um pix', () => {
    const r = NubankParser.parse(
      'Pix',
      'Você recebeu um pix de R$ 1000',
      'com.nu.production',
    );
    expect(r).not.toBeNull();
    expect(r!.type).toBe('income');
    expect(r!.amount).toBe(1000);
    expect(r!.category).toBe('Pix');
  });

  it('detecta Pix de R$ com centavos', () => {
    const r = NubankParser.parse('Pix', 'Pix de R$ 1.000,00', 'com.nu.production');
    expect(r!.amount).toBe(1000);
    expect(r!.type).toBe('income');
  });
});

describe('InterParser Pix', () => {
  it('detecta pix recebido sem centavos', () => {
    const r = InterParser.parse('Pix recebido', 'Você recebeu R$ 250', 'br.com.intermedium');
    expect(r).not.toBeNull();
    expect(r!.type).toBe('income');
    expect(r!.amount).toBe(250);
  });

  it('Pix de R$ ambíguo não assume saída', () => {
    const r = InterParser.parse('Pix', 'Pix de R$ 1000', 'br.com.intermedium');
    expect(r!.type).toBe('income');
    expect(r!.amount).toBe(1000);
  });
});

describe('GenericBankParser', () => {
  it('mapeia com.nu.production para Nubank', () => {
    const r = GenericBankParser.parse(
      'Pix',
      'Você recebeu um pix de R$ 10,00',
      'com.nu.production',
    );
    expect(r!.bankName).toBe('Nubank');
    expect(r!.type).toBe('income');
  });
});

describe('SantanderParser', () => {
  const pkg = 'com.santander.app';

  it('pix recebido', () => {
    const r = SantanderParser.parse(
      'Santander',
      'Pix recebido de Maria Silva no valor de R$ 150,00',
      pkg,
    );
    expect(r).not.toBeNull();
    expect(r!.bankName).toBe('Santander');
    expect(r!.type).toBe('income');
    expect(r!.category).toBe('Pix');
    expect(r!.amount).toBe(150);
  });

  it('pix enviado', () => {
    const r = SantanderParser.parse(
      'Pix enviado',
      'Você enviou um Pix de R$ 89,90 para João',
      pkg,
    );
    expect(r!.type).toBe('expense');
    expect(r!.amount).toBe(-89.9);
  });

  it('compra no crédito', () => {
    const r = SantanderParser.parse(
      'Compra aprovada',
      'Compra no crédito de R$ 220,50 em Magazine Luiza',
      pkg,
    );
    expect(r!.type).toBe('expense');
    expect(r!.category).toBe('Compra Crédito');
    expect(r!.amount).toBe(-220.5);
  });

  it('boleto / fatura', () => {
    const r = SantanderParser.parse(
      'Santander',
      'Pagamento de fatura realizado: R$ 1.234,56',
      pkg,
    );
    expect(r!.category).toBe('Boleto');
    expect(r!.amount).toBe(-1234.56);
  });
});

describe('C6Parser', () => {
  const pkg = 'br.com.c6bank.app';

  it('pix recebido', () => {
    const r = C6Parser.parse(
      'C6 Bank',
      'Você recebeu um Pix de R$ 75,00',
      pkg,
    );
    expect(r!.type).toBe('income');
    expect(r!.bankName).toBe('C6 Bank');
    expect(r!.amount).toBe(75);
  });

  it('compra atlas / cartão', () => {
    const r = C6Parser.parse(
      'Compra aprovada',
      'Compra no cartão Atlas de R$ 49,90 em Padaria Central',
      pkg,
    );
    expect(r!.type).toBe('expense');
    expect(r!.category).toBe('Compra Crédito');
    expect(r!.amount).toBe(-49.9);
  });

  it('transferência enviada', () => {
    const r = C6Parser.parse(
      'Transferência',
      'Transferência enviada de R$ 300,00',
      pkg,
    );
    expect(r!.type).toBe('expense');
    expect(r!.category).toBe('Transferência');
    expect(r!.amount).toBe(-300);
  });

  it('cashback', () => {
    const r = C6Parser.parse(
      'Cashback',
      'Você ganhou cashback de R$ 5,25',
      pkg,
    );
    expect(r!.type).toBe('income');
    expect(r!.amount).toBe(5.25);
  });
});

describe('PicPayParser', () => {
  const pkg = 'com.picpay';

  it('pagamento enviado', () => {
    const r = PicPayParser.parse(
      'PicPay',
      'Você pagou R$ 40,00 para Ana Costa',
      pkg,
    );
    expect(r!.type).toBe('expense');
    expect(r!.bankName).toBe('PicPay');
    expect(r!.amount).toBe(-40);
  });

  it('pagamento recebido', () => {
    const r = PicPayParser.parse(
      'Pagamento recebido',
      'Você recebeu R$ 120,00 de Pedro',
      pkg,
    );
    expect(r!.type).toBe('income');
    expect(r!.amount).toBe(120);
  });

  it('pix enviado', () => {
    const r = PicPayParser.parse(
      'Pix',
      'Pix enviado de R$ 33,10 para Loja XPTO',
      pkg,
    );
    expect(r!.type).toBe('expense');
    expect(r!.category).toBe('Pix');
    expect(r!.amount).toBe(-33.1);
  });

  it('cashback', () => {
    const r = PicPayParser.parse(
      'Cashback',
      'Cashback de R$ 2,00 creditado',
      pkg,
    );
    expect(r!.type).toBe('income');
    expect(r!.amount).toBe(2);
  });
});

describe('MercadoPagoParser', () => {
  const pkg = 'com.mercadopago.wallet';

  it('pix recebido', () => {
    const r = MercadoPagoParser.parse(
      'Mercado Pago',
      'Você recebeu um Pix de R$ 200,00',
      pkg,
    );
    expect(r!.type).toBe('income');
    expect(r!.bankName).toBe('Mercado Pago');
    expect(r!.amount).toBe(200);
  });

  it('pagamento aprovado', () => {
    const r = MercadoPagoParser.parse(
      'Pagamento aprovado',
      'Você pagou R$ 59,90 em Loja Online',
      pkg,
    );
    expect(r!.type).toBe('expense');
    expect(r!.amount).toBe(-59.9);
  });

  it('transferência enviada', () => {
    const r = MercadoPagoParser.parse(
      'Transferência',
      'Transferência enviada de R$ 80,00',
      pkg,
    );
    expect(r!.type).toBe('expense');
    expect(r!.category).toBe('Transferência');
    expect(r!.amount).toBe(-80);
  });

  it('estorno', () => {
    const r = MercadoPagoParser.parse(
      'Estorno',
      'Reembolso de R$ 15,00 creditado na sua conta',
      pkg,
    );
    expect(r!.type).toBe('income');
    expect(r!.category).toBe('Estorno');
    expect(r!.amount).toBe(15);
  });
});

describe('TaughtPatternMatcher', () => {
  const base: TaughtPattern = {
    id: 1,
    packageName: 'com.santander.app',
    matchSnippet: 'compra liberada',
    transactionType: 'expense',
    category: 'Compra Crédito',
    descriptionTemplate: 'Compra Santander',
    bankName: 'Santander',
    isActive: true,
    createdAt: '2026-01-01',
  };

  it('casa por snippet e extrai valor', () => {
    expect(matchesTaughtPattern(base, 'Santander', 'Compra liberada de R$ 10,00')).toBe(true);
    const parsed = applyTaughtPattern(base, 'Santander', 'Compra liberada de R$ 10,00');
    expect(parsed).not.toBeNull();
    expect(parsed!.amount).toBe(-10);
    expect(parsed!.category).toBe('Compra Crédito');
  });

  it('casa por regex', () => {
    const pattern: TaughtPattern = {
      ...base,
      matchSnippet: undefined,
      matchRegex: 'pix\\s+especial',
      transactionType: 'income',
      category: 'Pix',
    };
    const parsed = applyTaughtPattern(
      pattern,
      'Pix',
      'Pix especial recebido R$ 50,00',
    );
    expect(parsed!.type).toBe('income');
    expect(parsed!.amount).toBe(50);
  });

  it('falha sem match', () => {
    expect(applyTaughtPattern(base, 'Outro', 'Nada a ver R$ 10,00')).toBeNull();
  });
});
