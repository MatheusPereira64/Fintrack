/**
 * Aplica padrões ensinados pelo usuário a uma notificação.
 */
import { ParsedTransaction, TaughtPattern, TransactionType } from '../../../models/types';
import { parseNotificationAmount } from '../../../utils/notificationAmount';

export function matchesTaughtPattern(
  pattern: TaughtPattern,
  title: string,
  body: string,
): boolean {
  const full = `${title} ${body}`;
  if (pattern.matchRegex?.trim()) {
    try {
      return new RegExp(pattern.matchRegex, 'i').test(full);
    } catch {
      return false;
    }
  }
  if (pattern.matchSnippet?.trim()) {
    return full.toLowerCase().includes(pattern.matchSnippet.trim().toLowerCase());
  }
  return false;
}

export function applyTaughtPattern(
  pattern: TaughtPattern,
  title: string,
  body: string,
): ParsedTransaction | null {
  if (!matchesTaughtPattern(pattern, title, body)) return null;

  const amount = parseNotificationAmount(`${title} ${body}`);
  if (amount == null || amount <= 0) return null;

  const type = pattern.transactionType as TransactionType;
  const signed = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
  const description =
    pattern.descriptionTemplate?.trim()
    || title.trim()
    || 'Transação';

  return {
    type,
    category: pattern.category,
    amount: signed,
    description,
    bankName: pattern.bankName?.trim() || 'Banco',
    rawTitle: title,
    rawBody: body,
  };
}

export function tryTaughtPatterns(
  patterns: TaughtPattern[],
  title: string,
  body: string,
): ParsedTransaction | null {
  for (const pattern of patterns) {
    if (!pattern.isActive) continue;
    const parsed = applyTaughtPattern(pattern, title, body);
    if (parsed) return parsed;
  }
  return null;
}
