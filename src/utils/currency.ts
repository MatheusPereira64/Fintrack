/**
 * Formata um número como moeda brasileira (BRL)
 */
export function formatCurrency(
  value: number,
  options?: { compact?: boolean; showSign?: boolean },
): string {
  const { compact = false, showSign = false } = options ?? {};

  if (compact && Math.abs(value) >= 1_000) {
    const divisor = Math.abs(value) >= 1_000_000 ? 1_000_000 : 1_000;
    const suffix  = Math.abs(value) >= 1_000_000 ? 'M' : 'K';
    const formatted = (value / divisor).toFixed(1).replace('.', ',');
    return `R$ ${formatted}${suffix}`;
  }

  const sign = showSign && value > 0 ? '+' : '';
  return (
    sign +
    new Intl.NumberFormat('pt-BR', {
      style:    'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  );
}

/**
 * Converte string "R$ 1.234,56" para número 1234.56
 */
export function parseBRL(raw: string): number {
  const cleaned = raw
    .replace(/[^\d,]/g, '')
    .replace(',', '.');
  return parseFloat(cleaned) || 0;
}

/**
 * Converte string de valor com vírgula decimal para número
 * Suporta formatos: "53,90" | "1.234,56" | "1234.56"
 */
export function parseAmount(raw: string): number {
  if (!raw) return 0;
  const str = raw.trim();
  // Formato BR: 1.234,56
  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(str)) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  }
  // Já é número válido
  const num = parseFloat(str.replace(',', '.'));
  return isNaN(num) ? 0 : num;
}

/**
 * Retorna a cor adequada para um valor (positivo = verde, negativo = vermelho)
 */
export function getAmountColor(
  value: number,
  colors: { income: string; expense: string; text: string },
): string {
  if (value > 0) return colors.income;
  if (value < 0) return colors.expense;
  return colors.text;
}

/**
 * Formata percentual
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Calcula variação percentual entre dois valores
 */
export function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}
