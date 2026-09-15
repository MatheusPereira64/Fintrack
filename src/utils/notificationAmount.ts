import { parseAmount } from './currency';

/**
 * Extrai o primeiro valor monetário de texto de notificação.
 * Aceita: R$ 1.000,00 | R$ 1.000 | R$ 1000 | R$50,90
 */
export function parseNotificationAmount(text: string): number | null {
  const re = /r\$\s*([\d.]+(?:,\d{1,2})?)/gi;
  const m = re.exec(text);
  if (!m) return null;
  const value = parseAmount(m[1]);
  return value > 0 ? value : null;
}

export function notificationIncludes(text: string, ...terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some(t => lower.includes(t.toLowerCase()));
}
