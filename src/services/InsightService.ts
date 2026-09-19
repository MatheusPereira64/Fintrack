/**
 * InsightService — médias, projeções e sugestões de controle financeiro.
 * Bancos não liberam saldo via API sem Open Finance; o app usa
 * saldo informado + transações locais para orientar o usuário.
 */
import { Insight, InsightType, NotificationSeverity } from '../models/types';
import { TransactionRepository } from '../database/repositories/TransactionRepository';
import { NotificationRepository } from '../database/repositories/NotificationRepository';
import { formatCurrency } from '../utils/currency';
import i18n from '../i18n/config';

function now(): { year: number; month: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function prevMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function makeInsight(
  type: InsightType,
  title: string,
  description: string,
  severity: NotificationSeverity,
  meta?: unknown,
): Insight {
  return {
    id:          Date.now() + Math.random(),
    type,
    title,
    description,
    severity,
    metadata:    meta ? JSON.stringify(meta) : undefined,
    createdAt:   new Date().toISOString(),
  } as Insight;
}

export interface FinanceSnapshot {
  avgIncome: number;
  avgExpense: number;
  avgBalance: number;
  curIncome: number;
  curExpense: number;
  curBalance: number;
  projectedExpense: number;
  projectedBalance: number;
  dayOfMonth: number;
  daysTotal: number;
  monthsSampled: number;
}

export const InsightService = {

  /** Médias dos últimos N meses + projeção do mês atual (burn rate diário). */
  async getFinanceSnapshot(months = 6): Promise<FinanceSnapshot> {
    const cur = now();
    const monthly = await TransactionRepository.monthlyTotals(months);
    const past = monthly.filter(m => !(m.year === cur.year && m.month === cur.month));
    const sample = past.length > 0 ? past : monthly;

    const avgIncome  = sample.reduce((s, m) => s + m.income, 0) / Math.max(sample.length, 1);
    const avgExpense = sample.reduce((s, m) => s + m.expense, 0) / Math.max(sample.length, 1);
    const avgBalance = avgIncome - avgExpense;

    const curSums = await TransactionRepository.sumByMonth(cur.year, cur.month);
    const dayOfMonth = new Date().getDate();
    const daysTotal  = daysInMonth(cur.year, cur.month);
    const dailyBurn  = dayOfMonth > 0 ? curSums.expense / dayOfMonth : 0;
    const projectedExpense = dailyBurn * daysTotal;
    const projectedBalance = curSums.income - projectedExpense;

    return {
      avgIncome,
      avgExpense,
      avgBalance,
      curIncome: curSums.income,
      curExpense: curSums.expense,
      curBalance: curSums.income - curSums.expense,
      projectedExpense,
      projectedBalance,
      dayOfMonth,
      daysTotal,
      monthsSampled: sample.length,
    };
  },

  async generateAndSave(): Promise<Insight[]> {
    const insights: Insight[] = [];
    const cur  = now();
    const prev = prevMonth(cur.year, cur.month);

    const [curSums, prevSums, catSpending, autoCount, snapshot] = await Promise.all([
      TransactionRepository.sumByMonth(cur.year, cur.month),
      TransactionRepository.sumByMonth(prev.year, prev.month),
      TransactionRepository.spendingByCategory(cur.year, cur.month),
      TransactionRepository.countAutoByMonth(cur.year, cur.month),
      this.getFinanceSnapshot(6),
    ]);

    // ── Médias ────────────────────────────────────────────────────────────────
    if (snapshot.monthsSampled >= 2) {
      insights.push(makeInsight(
        'spending_pattern',
        i18n.t('insightService.averagesTitle'),
        i18n.t('insightService.averagesDescription', {
          avgIncome: formatCurrency(snapshot.avgIncome),
          avgExpense: formatCurrency(snapshot.avgExpense),
          avgBalance: formatCurrency(snapshot.avgBalance),
        }),
        snapshot.avgBalance >= 0 ? 'info' : 'warning',
        snapshot,
      ));
    }

    // ── Projeção de lucro / prejuízo ──────────────────────────────────────────
    if (snapshot.dayOfMonth >= 5 && snapshot.curExpense > 0) {
      const profit = snapshot.projectedBalance >= 0;
      insights.push(makeInsight(
        profit ? 'savings_opportunity' : 'anomaly',
        profit
          ? i18n.t('insightService.projectionProfitTitle')
          : i18n.t('insightService.projectionLossTitle'),
        profit
          ? i18n.t('insightService.projectionProfitDescription', {
              balance: formatCurrency(snapshot.projectedBalance),
              expense: formatCurrency(snapshot.projectedExpense),
            })
          : i18n.t('insightService.projectionLossDescription', {
              expense: formatCurrency(snapshot.projectedExpense),
              balance: formatCurrency(Math.abs(snapshot.projectedBalance)),
            }),
        profit ? 'info' : 'warning',
        { projectedBalance: snapshot.projectedBalance, projectedExpense: snapshot.projectedExpense },
      ));
    }

    // ── Comparação mês a mês ───────────────────────────────────────────────────
    if (prevSums.expense > 0) {
      const change = ((curSums.expense - prevSums.expense) / prevSums.expense) * 100;
      if (Math.abs(change) > 15) {
        insights.push(makeInsight(
          change > 0 ? 'anomaly' : 'savings_opportunity',
          change > 0
            ? i18n.t('insightService.spendingUpTitle')
            : i18n.t('insightService.spendingDownTitle'),
          change > 0
            ? i18n.t('insightService.spendingUpDescription', {
                percent: Math.abs(change).toFixed(0),
                prev: formatCurrency(prevSums.expense),
                cur: formatCurrency(curSums.expense),
              })
            : i18n.t('insightService.spendingDownDescription', {
                percent: Math.abs(change).toFixed(0),
              }),
          change > 0 ? 'warning' : 'info',
          { change, curExpense: curSums.expense, prevExpense: prevSums.expense },
        ));
      }
    }

    // ── Categoria dominante ────────────────────────────────────────────────────
    if (catSpending.length > 0) {
      const totalExpense = catSpending.reduce((s, c) => s + c.total, 0);
      const top = catSpending[0];
      const pct = totalExpense > 0 ? (top.total / totalExpense) * 100 : 0;

      if (pct > 35) {
        insights.push(makeInsight(
          'spending_pattern',
          i18n.t('insightService.categoryConcentrationTitle', { name: top.name }),
          i18n.t('insightService.categoryConcentrationDescription', {
            name: top.name,
            percent: pct.toFixed(0),
            amount: formatCurrency(top.total),
          }),
          pct > 60 ? 'warning' : 'info',
          { categoryId: top.categoryId, amount: top.total, percentage: pct },
        ));
      }
    }

    // ── Acima da média de despesa ──────────────────────────────────────────────
    if (snapshot.avgExpense > 0 && curSums.expense > snapshot.avgExpense * 1.2) {
      const over = curSums.expense - snapshot.avgExpense;
      insights.push(makeInsight(
        'anomaly',
        i18n.t('insightService.aboveAverageTitle'),
        i18n.t('insightService.aboveAverageDescription', {
          amount: formatCurrency(over),
        }),
        'warning',
        { over, avgExpense: snapshot.avgExpense, curExpense: curSums.expense },
      ));
    }

    // ── Sem receitas no mês ────────────────────────────────────────────────────
    if (curSums.income === 0 && curSums.expense > 0) {
      insights.push(makeInsight(
        'anomaly',
        i18n.t('insightService.noIncomeTitle'),
        i18n.t('insightService.noIncomeDescription'),
        'warning',
      ));
    }

    // ── Saldo negativo do mês ──────────────────────────────────────────────────
    const balance = curSums.income - curSums.expense;
    if (balance < 0) {
      insights.push(makeInsight(
        'anomaly',
        i18n.t('insightService.inRedTitle'),
        i18n.t('insightService.inRedDescription', {
          expense: formatCurrency(curSums.expense),
          income: formatCurrency(curSums.income),
          balance: formatCurrency(Math.abs(balance)),
        }),
        'critical',
        { balance, income: curSums.income, expense: curSums.expense },
      ));
    }

    // ── Transações automáticas ─────────────────────────────────────────────────
    if (autoCount > 0) {
      insights.push(makeInsight(
        'spending_pattern',
        i18n.t('insightService.autoTransactionsTitle', { count: autoCount }),
        autoCount > 1
          ? i18n.t('insightService.autoTransactionsDescriptionPlural', { count: autoCount })
          : i18n.t('insightService.autoTransactionsDescription', { count: autoCount }),
        'info',
        { count: autoCount },
      ));
    }

    for (const insight of insights) {
      if (insight.severity === 'critical' || insight.severity === 'warning') {
        await NotificationRepository.insert({
          type:    'unusual_spending',
          title:   insight.title,
          message: insight.description,
        });
      }
    }

    return insights;
  },

  generateSync(
    transactions: Array<{ date: string; amount: number; categoryId?: number; sourceNotification?: string }>,
    categories:   Array<{ id: number; name: string; icon?: string; color: string }>,
  ): Insight[] {
    const insights: Insight[] = [];
    const cur  = now();
    const prev = prevMonth(cur.year, cur.month);

    const isCurMonth  = (d: Date) => d.getFullYear() === cur.year  && d.getMonth() + 1 === cur.month;
    const isPrevMonth = (d: Date) => d.getFullYear() === prev.year && d.getMonth() + 1 === prev.month;

    const curExpenses  = transactions.filter(t => isCurMonth(new Date(t.date))  && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const prevExpenses = transactions.filter(t => isPrevMonth(new Date(t.date)) && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const curIncome    = transactions.filter(t => isCurMonth(new Date(t.date))  && t.amount > 0).reduce((s, t) => s + t.amount, 0);

    if (prevExpenses > 0) {
      const change = ((curExpenses - prevExpenses) / prevExpenses) * 100;
      if (Math.abs(change) > 15) {
        insights.push(makeInsight(
          change > 0 ? 'anomaly' : 'savings_opportunity',
          change > 0
            ? i18n.t('insightService.spendingUpTitle')
            : i18n.t('insightService.spendingDownTitle'),
          change > 0
            ? i18n.t('insightService.spendingUpShort', { percent: Math.abs(change).toFixed(0) })
            : i18n.t('insightService.spendingDownShort', { percent: Math.abs(change).toFixed(0) }),
          change > 0 ? 'warning' : 'info',
        ));
      }
    }

    if (curIncome === 0 && curExpenses > 0) {
      insights.push(makeInsight(
        'anomaly',
        i18n.t('insightService.noIncomeMonthTitle'),
        i18n.t('insightService.noIncomeMonthDescription'),
        'warning',
      ));
    }

    const catMap = new Map(categories.map(c => [c.id, c]));
    const catSpending = new Map<number, number>();
    transactions
      .filter(t => isCurMonth(new Date(t.date)) && t.amount < 0 && t.categoryId)
      .forEach(t => {
        const prev2 = catSpending.get(t.categoryId!) ?? 0;
        catSpending.set(t.categoryId!, prev2 + Math.abs(t.amount));
      });

    if (catSpending.size > 0) {
      const [topId, topAmt] = Array.from(catSpending.entries()).sort((a, b) => b[1] - a[1])[0];
      const total = Array.from(catSpending.values()).reduce((a, b) => a + b, 0);
      const pct   = (topAmt / total) * 100;
      if (pct > 35) {
        const cat = catMap.get(topId);
        const name = cat?.name ?? i18n.t('insightService.noCategory');
        insights.push(makeInsight(
          'spending_pattern',
          i18n.t('insightService.categoryConcentrationShortTitle', { name }),
          i18n.t('insightService.categoryConcentrationShortDescription', {
            name,
            percent: pct.toFixed(0),
          }),
          'info',
        ));
      }
    }

    return insights;
  },
};
