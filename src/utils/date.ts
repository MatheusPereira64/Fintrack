/**
 * Utilitários de data para o FinTrack
 */

export function now(): string {
  return new Date().toISOString();
}

export function startOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function formatDate(
  dateStr: string | Date,
  style: 'short' | 'medium' | 'long' | 'relative' = 'medium',
): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;

  if (style === 'relative') {
    return formatRelative(date);
  }

  const options: Intl.DateTimeFormatOptions = {
    short:  { day: '2-digit', month: '2-digit', year: 'numeric' },
    medium: { day: '2-digit', month: 'short', year: 'numeric' },
    long:   { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' },
  }[style] as Intl.DateTimeFormatOptions;

  return new Intl.DateTimeFormat('pt-BR', options).format(date);
}

export function formatTime(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return new Intl.DateTimeFormat('pt-BR', {
    hour:   '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatMonthYear(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year:  'numeric',
  }).format(date);
}

export function formatShortMonth(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date);
}

function formatRelative(date: Date): string {
  const now  = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  const hrs  = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1)  return 'Agora mesmo';
  if (mins < 60) return `Há ${mins} min`;
  if (hrs  < 24) return `Há ${hrs}h`;
  if (days === 1) return 'Ontem';
  if (days < 7)   return `Há ${days} dias`;

  return formatDate(date, 'short');
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function subtractMonths(date: Date, months: number): Date {
  return addMonths(date, -months);
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today  = startOfDay(new Date());
  const diff   = target.getTime() - today.getTime();
  return Math.ceil(diff / 86_400_000);
}

export function groupByDate(
  items: Array<{ date: string }>,
): Map<string, typeof items> {
  const map = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.date.slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

export function getLast6Months(): Array<{ label: string; date: Date }> {
  return Array.from({ length: 6 }, (_, i) => {
    const d = subtractMonths(new Date(), 5 - i);
    return { label: formatShortMonth(d), date: d };
  });
}
