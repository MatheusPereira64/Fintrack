/**
 * InsightService — gera insights financeiros consultando o repositório diretamente
 * para acessar múltiplos meses (correção do bug original que só carregava 1 mês).
 */
import { Insight, InsightType, NotificationSeverity } from '../models/types';
import { TransactionRepository } from '../database/repositories/TransactionRepository';
import { NotificationRepository } from '../database/repositories/NotificationRepository';

function now(): { year: number; month: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function prevMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
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
  } as any;
}

export const InsightService = {

  /**
   * Gera insights buscando dados diretamente no SQLite (não depende do store).
   * Isso corrige o problema de ter apenas o mês atual carregado em memória.
   */
  async generateAndSave(): Promise<Insight[]> {
    const insights: Insight[] = [];
    const cur  = now();
    const prev = prevMonth(cur.year, cur.month);

    const [curSums, prevSums, catSpending, autoCount, monthlyTotals] = await Promise.all([
      TransactionRepository.sumByMonth(cur.year, cur.month),
      TransactionRepository.sumByMonth(prev.year, prev.month),
      TransactionRepository.spendingByCategory(cur.year, cur.month),
      TransactionRepository.countByMonth(cur.year, cur.month),
      TransactionRepository.monthlyTotals(6),
    ]);

    // ── Comparação mês a mês ───────────────────────────────────────────────────
    if (prevSums.expense > 0) {
      const change = ((curSums.expense - prevSums.expense) / prevSums.expense) * 100;
      if (Math.abs(change) > 15) {
        insights.push(makeInsight(
          change > 0 ? 'anomaly' : 'savings_opportunity',
          change > 0 ? '📈 Gastos aumentaram' : '📉 Ótimo controle!',
          change > 0
            ? `Seus gastos aumentaram ${Math.abs(change).toFixed(0)}% em relação ao mês passado (R$ ${prevSums.expense.toFixed(2)} → R$ ${curSums.expense.toFixed(2)}).`
            : `Seus gastos reduziram ${Math.abs(change).toFixed(0)}% em relação ao mês passado. Continue assim!`,
          change > 0 ? 'warning' : 'info',
          { change, curExpense: curSums.expense, prevExpense: prevSums.expense },
        ));
      }
    }

    // ── Categoria dominante ────────────────────────────────────────────────────
    if (catSpending.length > 0) {
      const totalExpense = catSpending.reduce((s, c) => s + c.total, 0);
      const top = catSpending[0];
      const pct = (top.total / totalExpense) * 100;

      if (pct > 35) {
        insights.push(makeInsight(
          'spending_pattern',
          `${top.icon} ${top.name} domina seus gastos`,
          `${top.name} representa ${pct.toFixed(0)}% das suas despesas este mês.`,
          pct > 60 ? 'warning' : 'info',
          { categoryId: top.categoryId, amount: top.total, percentage: pct },
        ));
      }
    }

    // ── Sem receitas no mês ────────────────────────────────────────────────────
    if (curSums.income === 0 && curSums.expense > 0) {
      insights.push(makeInsight(
        'anomaly',
        '💰 Nenhuma receita registrada',
        'Você tem despesas este mês, mas nenhuma receita foi registrada.',
        'warning',
      ));
    }

    // ── Saldo negativo do mês ──────────────────────────────────────────────────
    const balance = curSums.income - curSums.expense;
    if (balance < 0) {
      insights.push(makeInsight(
        'anomaly',
        '🚨 Saldo negativo no mês',
        `Suas despesas (R$ ${curSums.expense.toFixed(2)}) superaram suas receitas (R$ ${curSums.income.toFixed(2)}) em R$ ${Math.abs(balance).toFixed(2)}.`,
        'critical',
        { balance, income: curSums.income, expense: curSums.expense },
      ));
    }

    // ── Transações automáticas ─────────────────────────────────────────────────
    if (autoCount > 0) {
      const curTxs = await TransactionRepository.findByMonth(cur.year, cur.month);
      const autoTxs = curTxs.filter(t => t.sourceNotification);
      if (autoTxs.length > 0) {
        insights.push(makeInsight(
          'spending_pattern',
          `🤖 ${autoTxs.length} transações monitoradas`,
          `O FinTrack registrou automaticamente ${autoTxs.length} transação${autoTxs.length > 1 ? 'ões' : ''} via notificações bancárias este mês.`,
          'info',
          { count: autoTxs.length },
        ));
      }
    }

    // ── Persiste notificações para os insights críticos ────────────────────────
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

  /** Versão síncrona (in-memory) para usar quando os dados já estão no store */
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
          change > 0 ? '📈 Gastos aumentaram' : '📉 Ótimo controle!',
          change > 0
            ? `Gastos aumentaram ${Math.abs(change).toFixed(0)}% vs. mês passado.`
            : `Gastos reduziram ${Math.abs(change).toFixed(0)}% vs. mês passado!`,
          change > 0 ? 'warning' : 'info',
        ));
      }
    }

    if (curIncome === 0 && curExpenses > 0) {
      insights.push(makeInsight('anomaly', '💰 Sem receitas no mês', 'Nenhuma receita registrada este mês.', 'warning'));
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
        insights.push(makeInsight(
          'spending_pattern',
          `${cat?.icon ?? ''} ${cat?.name ?? 'Sem categoria'} domina gastos`,
          `${cat?.name ?? 'Sem categoria'} representa ${pct.toFixed(0)}% das despesas.`,
          'info',
        ));
      }
    }

    return insights;
  },
};
