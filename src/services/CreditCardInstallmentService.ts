/**
 * Projeção de parcelas futuras a partir de compras parceladas.
 */
import { Account, Transaction } from '../models/types';
import { TransactionRepository } from '../database/repositories/TransactionRepository';

export interface UpcomingInstallment {
  transactionId: number;
  description: string;
  /** Valor da parcela (positivo). */
  amount: number;
  /** Número da parcela projetada (ex.: 4). */
  installmentNumber: number;
  installmentTotal: number;
  /** Data estimada YYYY-MM-DD (mesmo dia do mês da compra + N meses). */
  estimatedDate: string;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseTxDate(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Para cada compra com parcelas restantes, gera as próximas parcelas
 * (current+1 … total), uma por mês a partir da data da compra.
 */
export function projectUpcomingInstallments(
  transactions: Transaction[],
  horizonMonths = 12,
  todayInput: Date = new Date(),
): UpcomingInstallment[] {
  const today = new Date(todayInput);
  today.setHours(0, 0, 0, 0);
  const horizonEnd = addMonths(today, horizonMonths);
  const results: UpcomingInstallment[] = [];

  for (const tx of transactions) {
    const current = tx.installmentCurrent;
    const total = tx.installmentTotal;
    if (current == null || total == null || total < 2 || current >= total) continue;

    const purchaseDate = parseTxDate(tx.date);
    const installmentAmount = Math.abs(tx.amount);

    for (let n = current + 1; n <= total; n++) {
      const estimated = addMonths(purchaseDate, n - 1);
      if (estimated < today) continue;
      if (estimated > horizonEnd) break;
      results.push({
        transactionId: tx.id,
        description: tx.description,
        amount: installmentAmount,
        installmentNumber: n,
        installmentTotal: total,
        estimatedDate: toISODate(estimated),
      });
    }
  }

  results.sort((a, b) => a.estimatedDate.localeCompare(b.estimatedDate));
  return results;
}

export async function loadUpcomingInstallmentsForAccount(
  account: Pick<Account, 'id'>,
  horizonMonths = 12,
): Promise<UpcomingInstallment[]> {
  const open = await TransactionRepository.findOpenInstallments(account.id);
  return projectUpcomingInstallments(open, horizonMonths);
}
