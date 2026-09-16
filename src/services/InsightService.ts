/**
 * InsightService — médias, projeções e sugestões de controle financeiro.
 * Bancos não liberam saldo via API sem Open Finance; o app usa
 * saldo informado + transações locais para orientar o usuário.
 */
import { Insight, InsightType, NotificationSeverity } from '../models/types';
import { TransactionRepository } from '../database/repositories/TransactionRepository';
import { NotificationRepository } from '../database/repositories/NotificationRepository';
import { formatCurrency } from '../utils/currency';

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
        'Médias dos últimos meses',
        `Receita média ${formatCurrency(snapshot.avgIncome)} · Despesa média ${formatCurrency(snapshot.avgExpense)} · Resultado médio ${formatCurrency(snapshot.avgBalance)}.`,
        snapshot.avgBalance >= 0 ? 'info' : 'warning',
        snapshot,
      ));
    }

    // ── Projeção de lucro / prejuízo ──────────────────────────────────────────
    if (snapshot.dayOfMonth >= 5 && snapshot.curExpense > 0) {
      const profit = snapshot.projectedBalance >= 0;
      insights.push(makeInsight(
        profit ? 'savings_opportunity' : 'anomaly',
        profit ? 'Projeção: mês no azul' : 'Projeção: risco de prejuízo',
        profit
          ? `No ritmo atual, o mês fecha com cerca de ${formatCurrency(snapshot.projectedBalance)} de sobra (despesa projetada ${formatCurrency(snapshot.projectedExpense)}).`
          : `No ritmo atual, as despesas podem chegar a ${formatCurrency(snapshot.projectedExpense)} e o mês fechar com ${formatCurrency(Math.abs(snapshot.projectedBalance))} no vermelho.`,
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
          change > 0 ? 'Gastos aumentaram' : 'Ótimo controle de gastos',
          change > 0
            ? `Despesas subiram ${Math.abs(change).toFixed(0)}% vs. mês passado (${formatCurrency(prevSums.expense)} → ${formatCurrency(curSums.expense)}). Revise categorias e atualize saldos nas contas.`
            : `Despesas caíram ${Math.abs(change).toFixed(0)}% vs. mês passado. Mantenha o hábito de registrar e atualizar saldos.`,
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
          `${top.name} concentra seus gastos`,
          `${top.name} representa ${pct.toFixed(0)}% das despesas (${formatCurrency(top.total)}). Considere um teto mensal nessa categoria.`,
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
        'Despesas acima da média',
        `Você já gastou ${formatCurrency(over)} a mais que a média dos últimos meses. Atualize o saldo das contas e revise o orçamento.`,
        'warning',
        { over, avgExpense: snapshot.avgExpense, curExpense: curSums.expense },
      ));
    }

    // ── Sem receitas no mês ────────────────────────────────────────────────────
    if (curSums.income === 0 && curSums.expense > 0) {
      insights.push(makeInsight(
        'anomaly',
        'Nenhuma receita registrada',
        'Há despesas neste mês, mas nenhuma receita. Cadastre o salário ou Pix recebidos para o FinTrack projetar o resultado corretamente.',
        'warning',
      ));
    }

    // ── Saldo negativo do mês ──────────────────────────────────────────────────
    const balance = curSums.income - curSums.expense;
    if (balance < 0) {
      insights.push(makeInsight(
        'anomaly',
        'Mês no vermelho até agora',
        `Despesas (${formatCurrency(curSums.expense)}) superam receitas (${formatCurrency(curSums.income)}) em ${formatCurrency(Math.abs(balance))}.`,
        'critical',
        { balance, income: curSums.income, expense: curSums.expense },
      ));
    }

    // ── Transações automáticas ─────────────────────────────────────────────────
    if (autoCount > 0) {
      insights.push(makeInsight(
        'spending_pattern',
        `${autoCount} movimentações via notificação`,
        `O FinTrack registrou ${autoCount} transação${autoCount > 1 ? 'ões' : ''} automaticamente. Confira se os valores batem com o app do banco.`,
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
          change > 0 ? 'Gastos aumentaram' : 'Ótimo controle de gastos',
          change > 0
            ? `Gastos aumentaram ${Math.abs(change).toFixed(0)}% vs. mês passado.`
            : `Gastos reduziram ${Math.abs(change).toFixed(0)}% vs. mês passado.`,
          change > 0 ? 'warning' : 'info',
        ));
      }
    }

    if (curIncome === 0 && curExpenses > 0) {
      insights.push(makeInsight('anomaly', 'Sem receitas no mês', 'Nenhuma receita registrada este mês.', 'warning'));
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
          `${cat?.name ?? 'Sem categoria'} concentra gastos`,
          `${cat?.name ?? 'Sem categoria'} representa ${pct.toFixed(0)}% das despesas.`,
          'info',
        ));
      }
    }

    return insights;
  },
};
