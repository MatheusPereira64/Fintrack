/**
 * Editar uma transação precisa manter os saldos das contas corretos,
 * inclusive quando ela muda de conta.
 */
const calls: Array<{ sql: string; params: unknown[] }> = [];
const current = {
  id: 7, account_id: 1, category_id: null, cost_center_id: null, date: '2026-11-05',
  amount: -50, description: 'Mercado', type: 'expense', is_recurring: 0,
  installment_current: null, installment_total: null, tags: null, bank_name: null,
  source_notification: null, created_at: '2026-11-05',
};

jest.mock('../src/database/db', () => ({
  getDatabase: async () => ({
    executeSql: async (sql: string, params: unknown[] = []) => {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      const rows = /FROM transactions WHERE id = \?/.test(sql) ? [current] : [];
      return [{ rows: { length: rows.length, item: (i: number) => rows[i] }, insertId: 0 }];
    },
  }),
}));

import { TransactionRepository } from '../src/database/repositories/TransactionRepository';

const balanceMoves = () => calls
  .filter(c => c.sql.startsWith('UPDATE accounts SET balance'))
  .map(c => c.params);

beforeEach(() => { calls.length = 0; });

test('trocar de conta tira o valor da conta antiga e põe na nova', async () => {
  await TransactionRepository.update(7, { accountId: 2 });

  expect(balanceMoves()).toEqual([[50, 1], [-50, 2]]);
  const update = calls.find(c => c.sql.startsWith('UPDATE transactions'));
  expect(update?.sql).toContain('account_id = ?');
  expect(update?.params).toEqual([2, 7]);
});

test('trocar de conta e de valor ao mesmo tempo usa o valor novo na conta nova', async () => {
  await TransactionRepository.update(7, { accountId: 2, amount: -80 });

  expect(balanceMoves()).toEqual([[50, 1], [-80, 2]]);
});

test('mudar só o valor ajusta a diferença na mesma conta', async () => {
  await TransactionRepository.update(7, { amount: -80 });

  expect(balanceMoves()).toEqual([[-30, 1]]);
});

test('manter a mesma conta não move saldo', async () => {
  await TransactionRepository.update(7, { accountId: 1, description: 'Feira' });

  expect(balanceMoves()).toEqual([]);
});
