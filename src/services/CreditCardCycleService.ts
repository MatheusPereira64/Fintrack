/**
 * Classificação do ciclo de fatura de cartão de crédito (fechamento / vencimento).
 */
import { Account } from '../models/types';

export type InvoiceCycleStatus = 'open' | 'closed' | 'overdue' | 'unknown';

export interface InvoiceCycleInfo {
  status: InvoiceCycleStatus;
  closingDay: number | null;
  dueDay: number | null;
  /** Próxima (ou atual) data de fechamento YYYY-MM-DD */
  nextClosingDate: string | null;
  /** Próxima (ou atual) data de vencimento YYYY-MM-DD */
  nextDueDate: string | null;
  /** Último fechamento YYYY-MM-DD */
  lastClosingDate: string | null;
}

function clampDay(year: number, month: number, day: number): Date {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last));
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Próxima ocorrência do dia do mês a partir de `from` (inclusive se for hoje). */
export function nextOccurrence(dayOfMonth: number, from: Date = new Date()): Date {
  const today = startOfDay(from);
  const thisMonth = clampDay(today.getFullYear(), today.getMonth(), dayOfMonth);
  if (thisMonth >= today) return thisMonth;
  return clampDay(today.getFullYear(), today.getMonth() + 1, dayOfMonth);
}

/** Última ocorrência do dia do mês até `from` (inclusive se for hoje). */
export function lastOccurrence(dayOfMonth: number, from: Date = new Date()): Date {
  const today = startOfDay(from);
  const thisMonth = clampDay(today.getFullYear(), today.getMonth(), dayOfMonth);
  if (thisMonth <= today) return thisMonth;
  return clampDay(today.getFullYear(), today.getMonth() - 1, dayOfMonth);
}

/**
 * Entre fechamento e vencimento a fatura está fechada.
 * Após o vencimento (com fatura > 0) → atrasada.
 * Nos demais dias → aberta (compras acumulando).
 */
export function classifyInvoiceCycle(
  closingDay: number | null | undefined,
  dueDay: number | null | undefined,
  invoiceAmount: number | null | undefined = null,
  today: Date = new Date(),
): InvoiceCycleInfo {
  if (
    closingDay == null || dueDay == null
    || !Number.isInteger(closingDay) || !Number.isInteger(dueDay)
    || closingDay < 1 || closingDay > 31
    || dueDay < 1 || dueDay > 31
  ) {
    return {
      status: 'unknown',
      closingDay: closingDay ?? null,
      dueDay: dueDay ?? null,
      nextClosingDate: null,
      nextDueDate: null,
      lastClosingDate: null,
    };
  }

  const now = startOfDay(today);
  const lastClosing = lastOccurrence(closingDay, now);
  const nextClosing = nextOccurrence(closingDay, now);
  // Vencimento associado ao último fechamento
  let dueForLastClose = clampDay(
    lastClosing.getFullYear(),
    lastClosing.getMonth(),
    dueDay,
  );
  if (dueForLastClose < lastClosing) {
    dueForLastClose = clampDay(
      lastClosing.getFullYear(),
      lastClosing.getMonth() + 1,
      dueDay,
    );
  }

  const nextDue = nextOccurrence(dueDay, now);
  const invoice = invoiceAmount ?? 0;

  let status: InvoiceCycleStatus;
  if (now >= lastClosing && now <= dueForLastClose) {
    status = 'closed';
  } else if (now > dueForLastClose && invoice > 0) {
    status = 'overdue';
  } else {
    status = 'open';
  }

  return {
    status,
    closingDay,
    dueDay,
    nextClosingDate: toISODate(nextClosing),
    nextDueDate: toISODate(nextDue),
    lastClosingDate: toISODate(lastClosing),
  };
}

export function getAccountInvoiceCycle(
  account: Pick<Account, 'closingDay' | 'dueDay' | 'invoiceAmount'>,
  today: Date = new Date(),
): InvoiceCycleInfo {
  return classifyInvoiceCycle(
    account.closingDay,
    account.dueDay,
    account.invoiceAmount,
    today,
  );
}

/** Limite usado: manual tem prioridade; senão abs(saldo informado ou calculado). */
export function resolveUsedLimit(
  account: Pick<Account, 'usedLimit' | 'informedBalance' | 'balance'>,
): number {
  if (account.usedLimit != null && Number.isFinite(account.usedLimit)) {
    return Math.max(0, account.usedLimit);
  }
  const base = account.informedBalance ?? account.balance;
  return Math.abs(base ?? 0);
}

export function resolveLimitUsageRatio(
  account: Pick<Account, 'limit' | 'usedLimit' | 'informedBalance' | 'balance'>,
): number {
  if (!account.limit || account.limit <= 0) return 0;
  return Math.min(resolveUsedLimit(account) / account.limit, 1);
}
