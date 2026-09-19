import { parseInstallments } from '../src/utils/installmentParser';
import {
  classifyInvoiceCycle,
  nextOccurrence,
  lastOccurrence,
  resolveUsedLimit,
  resolveLimitUsageRatio,
} from '../src/services/CreditCardCycleService';
import { projectUpcomingInstallments } from '../src/services/CreditCardInstallmentService';
import { Transaction } from '../src/models/types';

describe('parseInstallments', () => {
  it('detecta parcelada em N vezes como 1/N', () => {
    expect(parseInstallments('Compra parcelada em 12 vezes de R$ 100,00')).toEqual({
      current: 1,
      total: 12,
    });
  });

  it('detecta em Nx', () => {
    expect(parseInstallments('Compra aprovada em 6x no valor de R$ 50,00')).toEqual({
      current: 1,
      total: 6,
    });
  });

  it('detecta parcela atual/total com barra', () => {
    expect(parseInstallments('Parcela 3/12 — R$ 89,90')).toEqual({ current: 3, total: 12 });
    expect(parseInstallments('Compra 4/10 no cartão')).toEqual({ current: 4, total: 10 });
  });

  it('detecta parcela N de M', () => {
    expect(parseInstallments('Parcela 2 de 8 no Nubank')).toEqual({ current: 2, total: 8 });
    expect(parseInstallments('Pagamento 5 de 12 parcelas')).toEqual({ current: 5, total: 12 });
  });

  it('ignora textos sem parcela clara', () => {
    expect(parseInstallments('Pix de R$ 100,00')).toBeNull();
    expect(parseInstallments('Compra aprovada de R$ 50')).toBeNull();
  });

  it('ignora pares inválidos', () => {
    expect(parseInstallments('parcela 15/10')).toBeNull();
    expect(parseInstallments('parcelada em 1 vez')).toBeNull();
  });

  it('não confunde data com ano', () => {
    // 19/09/2025 não deve virar parcela 19/9 (inválido) nem 19/09
    expect(parseInstallments('Compra no dia 19/09/2025 de R$ 10')).toBeNull();
  });
});

describe('classifyInvoiceCycle', () => {
  it('marca ciclo fechado entre fechamento e vencimento', () => {
    // fechamento dia 10, vencimento dia 17; hoje = 12
    const info = classifyInvoiceCycle(10, 17, 500, new Date(2026, 2, 12));
    expect(info.status).toBe('closed');
    expect(info.lastClosingDate).toBe('2026-03-10');
  });

  it('marca ciclo aberto fora da janela de pagamento', () => {
    // Antes do fechamento, fatura anterior quitada → ciclo aberto
    const beforeClose = classifyInvoiceCycle(10, 17, 0, new Date(2026, 2, 5));
    expect(beforeClose.status).toBe('open');
    const afterDuePaid = classifyInvoiceCycle(10, 17, 0, new Date(2026, 2, 20));
    expect(afterDuePaid.status).toBe('open');
  });

  it('marca atrasado após vencimento com fatura > 0', () => {
    // fechamento 25, vencimento 5 do mês seguinte; hoje 8 com fatura
    const info = classifyInvoiceCycle(25, 5, 200, new Date(2026, 3, 8));
    expect(info.status).toBe('overdue');
  });

  it('marca atrasado após vencimento no mesmo mês', () => {
    const info = classifyInvoiceCycle(10, 17, 500, new Date(2026, 2, 20));
    expect(info.status).toBe('overdue');
  });

  it('retorna unknown sem dias configurados', () => {
    expect(classifyInvoiceCycle(null, null).status).toBe('unknown');
  });
});

describe('occurrence helpers', () => {
  it('nextOccurrence avança para o próximo mês se o dia já passou', () => {
    const d = nextOccurrence(5, new Date(2026, 2, 12));
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(5);
  });

  it('lastOccurrence volta ao mês anterior se o dia ainda não chegou', () => {
    const d = lastOccurrence(20, new Date(2026, 2, 12));
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(20);
  });
});

describe('resolveUsedLimit', () => {
  it('prioriza usedLimit manual', () => {
    expect(resolveUsedLimit({ usedLimit: 800, informedBalance: -1200, balance: -1000 })).toBe(800);
  });

  it('usa abs do saldo informado quando usedLimit ausente', () => {
    expect(resolveUsedLimit({ usedLimit: null, informedBalance: -450, balance: -100 })).toBe(450);
    expect(resolveLimitUsageRatio({
      limit: 1000, usedLimit: 250, informedBalance: -900, balance: -900,
    })).toBe(0.25);
  });
});

describe('projectUpcomingInstallments', () => {
  it('projeta parcelas restantes mês a mês', () => {
    const today = new Date(2026, 2, 1); // 1 mar 2026
    const txs: Transaction[] = [{
      id: 1,
      accountId: 10,
      date: '2026-01-15',
      amount: -100,
      description: 'Notebook',
      type: 'expense',
      isRecurring: false,
      installmentCurrent: 1,
      installmentTotal: 3,
      createdAt: '2026-01-15',
    }];
    // parcela 1 = 15/01; próximas: 2 em 15/02, 3 em 15/03
    // em 1/03, só a parcela 3 ainda é futura (15/02 já passou)
    const projected = projectUpcomingInstallments(txs, 12, today);
    expect(projected).toHaveLength(1);
    expect(projected[0].installmentNumber).toBe(3);
    expect(projected[0].estimatedDate).toBe('2026-03-15');
    expect(projected[0].amount).toBe(100);
  });
});
