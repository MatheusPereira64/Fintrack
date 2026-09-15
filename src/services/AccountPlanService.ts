export interface PlanInput {
  startingBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyYieldRate: number; // % a.m. e.g. 0.5 = 0.5%
  months: number;
}

/** Tipos de conta com renda passiva / rendimento. */
export const YIELD_ACCOUNT_TYPES = ['savings', 'investment'] as const;

export function accountSupportsYield(type: string): boolean {
  return (YIELD_ACCOUNT_TYPES as readonly string[]).includes(type);
}

/**
 * Estimativa simples do rendimento do próximo mês sobre o saldo atual.
 * yield = saldo * (taxa% / 100)
 */
export function estimateMonthlyYield(balance: number, monthlyYieldRatePercent: number): number {
  if (balance <= 0 || monthlyYieldRatePercent <= 0) return 0;
  return balance * (monthlyYieldRatePercent / 100);
}

/**
 * Projeta saldo após N meses só com rendimento composto (sem receitas/despesas).
 */
export function projectCompoundYield(
  balance: number,
  monthlyYieldRatePercent: number,
  months: number,
): number {
  if (balance <= 0 || monthlyYieldRatePercent <= 0 || months <= 0) return Math.max(0, balance);
  const rate = monthlyYieldRatePercent / 100;
  return balance * Math.pow(1 + rate, months);
}

export interface PlanMonthPoint {
  month: number;
  balance: number;
  income: number;
  expense: number;
  yieldAmount: number;
  net: number;
}

export interface PlanResult {
  months: PlanMonthPoint[];
  finalBalance: number;
  totalIncome: number;
  totalExpense: number;
  totalYield: number;
  profitOrLoss: number;
}

/**
 * Simula evolução do saldo:
 * saldo = (saldo + receita - despesa) * (1 + taxa)
 */
export function simulateAccountPlan(input: PlanInput): PlanResult {
  const rate = Math.max(0, input.monthlyYieldRate) / 100;
  const months = Math.min(Math.max(1, Math.floor(input.months)), 60);
  let balance = input.startingBalance;
  const points: PlanMonthPoint[] = [];
  let totalIncome = 0;
  let totalExpense = 0;
  let totalYield = 0;

  for (let m = 1; m <= months; m++) {
    const income = Math.max(0, input.monthlyIncome);
    const expense = Math.max(0, input.monthlyExpense);
    const beforeYield = balance + income - expense;
    const yieldAmount = beforeYield > 0 ? beforeYield * rate : 0;
    balance = beforeYield + yieldAmount;
    totalIncome += income;
    totalExpense += expense;
    totalYield += yieldAmount;
    points.push({
      month: m,
      balance,
      income,
      expense,
      yieldAmount,
      net: income - expense + yieldAmount,
    });
  }

  return {
    months: points,
    finalBalance: balance,
    totalIncome,
    totalExpense,
    totalYield,
    profitOrLoss: balance - input.startingBalance,
  };
}
