/** Busca em todo o histórico: filtros viram SQL, e % e _ digitados não viram curinga. */
const calls: Array<{ sql: string; params: unknown[] }> = [];

jest.mock('../src/database/db', () => ({
  getDatabase: async () => ({
    executeSql: async (sql: string, params: unknown[] = []) => {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      return [{ rows: { length: 0, item: () => null } }];
    },
  }),
}));

import { TransactionRepository, SEARCH_LIMIT } from '../src/database/repositories/TransactionRepository';

beforeEach(() => { calls.length = 0; });

test('busca sem filtro de mês, com texto e filtros avançados', async () => {
  await TransactionRepository.search({ query: ' uber ', categoryId: 2, bankName: 'Nubank', minAmount: 10, maxAmount: 50 });

  const { sql, params } = calls[0];
  expect(sql).not.toMatch(/date >=/);
  expect(sql).toMatch(/description LIKE \? ESCAPE '!' OR bank_name LIKE \? ESCAPE '!'/);
  expect(sql).toMatch(/ORDER BY date DESC, id DESC LIMIT \?$/);
  expect(params).toEqual(['%uber%', '%uber%', 2, 'Nubank', 10, 50, SEARCH_LIMIT]);
});

test('% e _ digitados são procurados literalmente', async () => {
  await TransactionRepository.search({ query: '50%_off!' });

  expect(calls[0].params.slice(0, 1)).toEqual(['%50!%!_off!!%']);
});

test('sem filtros, devolve os mais recentes sem WHERE', async () => {
  await TransactionRepository.search({}, 20);

  expect(calls[0].sql).not.toMatch(/WHERE/);
  expect(calls[0].params).toEqual([20]);
});
