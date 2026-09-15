import {
  simulateAccountPlan,
  estimateMonthlyYield,
  projectCompoundYield,
  accountSupportsYield,
} from '../src/services/AccountPlanService';

describe('AccountPlanService', () => {
  it('projeta saldo com receita, despesa e rendimento', () => {
    const r = simulateAccountPlan({
      startingBalance: 1000,
      monthlyIncome: 500,
      monthlyExpense: 200,
      monthlyYieldRate: 1,
      months: 2,
    });
    // mês1: (1000+500-200)*1.01 = 1313
    expect(r.months[0].balance).toBeCloseTo(1313, 1);
    expect(r.months).toHaveLength(2);
    expect(r.profitOrLoss).toBeGreaterThan(0);
  });

  it('estima rendimento mensal simples sobre o saldo', () => {
    expect(estimateMonthlyYield(10000, 0.5)).toBeCloseTo(50, 5);
    expect(estimateMonthlyYield(0, 0.5)).toBe(0);
    expect(estimateMonthlyYield(1000, 0)).toBe(0);
  });

  it('projeta rendimento composto', () => {
    const after12 = projectCompoundYield(10000, 0.5, 12);
    expect(after12).toBeCloseTo(10000 * Math.pow(1.005, 12), 2);
  });

  it('reconhece tipos com renda passiva', () => {
    expect(accountSupportsYield('savings')).toBe(true);
    expect(accountSupportsYield('investment')).toBe(true);
    expect(accountSupportsYield('checking')).toBe(false);
  });
});
