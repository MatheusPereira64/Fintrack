export interface CategoryTotal {
  categoryId: number | null;
  name:       string;
  color:      string;
  total:      number;
}

export interface CategoryChange extends CategoryTotal {
  previous: number;
  delta:    number;
  /** Variação relativa ao mês anterior; null quando não houve gasto antes. */
  percent:  number | null;
}

/**
 * Compara o gasto por categoria do mês com o anterior. Ordena pelas maiores
 * variações em valor, para destacar o que mais mudou.
 */
export function compareCategorySpending(
  current: CategoryTotal[],
  previous: CategoryTotal[],
  limit = 5,
): CategoryChange[] {
  const before = new Map(previous.map(c => [c.categoryId, c]));
  const seen = new Set<number | null>();
  const rows: CategoryChange[] = [];

  for (const cat of current) {
    seen.add(cat.categoryId);
    const prev = before.get(cat.categoryId)?.total ?? 0;
    rows.push({
      ...cat,
      previous: prev,
      delta:    cat.total - prev,
      percent:  prev > 0 ? (cat.total - prev) / prev : null,
    });
  }
  // Categorias que tiveram gasto no mês anterior e zeraram neste também contam.
  for (const cat of previous) {
    if (seen.has(cat.categoryId)) continue;
    rows.push({ ...cat, total: 0, previous: cat.total, delta: -cat.total, percent: -1 });
  }

  return rows
    .filter(r => r.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, limit);
}
