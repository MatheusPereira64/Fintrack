import { compareCategorySpending } from '../src/utils/categoryComparison';

const cat = (categoryId: number | null, name: string, total: number) => ({ categoryId, name, color: '#000', total });

test('calcula a variação e ordena pelo que mais mudou em valor', () => {
  const rows = compareCategorySpending(
    [cat(1, 'Alimentação', 600), cat(2, 'Lazer', 120), cat(3, 'Saúde', 90)],
    [cat(1, 'Alimentação', 400), cat(2, 'Lazer', 300), cat(3, 'Saúde', 90)],
  );

  expect(rows.map(r => [r.name, r.delta, r.percent])).toEqual([
    ['Alimentação', 200, 0.5],
    ['Lazer', -180, -0.6],
  ]);
});

test('categoria nova não tem percentual e categoria que zerou entra como -100%', () => {
  const rows = compareCategorySpending(
    [cat(4, 'Viagem', 800)],
    [cat(5, 'Academia', 100)],
  );

  expect(rows).toEqual([
    expect.objectContaining({ name: 'Viagem', previous: 0, delta: 800, percent: null }),
    expect.objectContaining({ name: 'Academia', total: 0, delta: -100, percent: -1 }),
  ]);
});

test('respeita o limite e trata transações sem categoria', () => {
  const current = [cat(null, 'Sem categoria', 50), ...[1, 2, 3, 4, 5, 6].map(i => cat(i, `C${i}`, i * 10))];
  const rows = compareCategorySpending(current, [], 3);

  expect(rows.map(r => r.name)).toEqual(['C6', 'Sem categoria', 'C5']);
});
