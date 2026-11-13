/**
 * Backup completo: exportar e restaurar precisam levar todas as tabelas
 * (contas, metas, orçamentos...), não só as transações.
 */
type Row = Record<string, unknown>;

/** SQLite falso em memória: só os comandos que o BackupService usa. */
function createFakeDb(schema: Record<string, string[]>, version: number) {
  const tables: Record<string, Row[]> = {};
  for (const name of Object.keys(schema)) tables[name] = [];
  const result = (rows: Row[]) => ({ rows: { length: rows.length, item: (i: number) => rows[i] } });

  function run(sql: string, params: unknown[] = []): Row[] {
    let m;
    if (/FROM sqlite_master/.test(sql)) return Object.keys(schema).sort().map(name => ({ name }));
    if (/MAX\(version\)/.test(sql)) return [{ v: version }];
    if ((m = /PRAGMA table_info\("(\w+)"\)/.exec(sql))) return schema[m[1]].map(name => ({ name }));
    if (/PRAGMA foreign_keys/.test(sql)) return [];
    if ((m = /SELECT \* FROM "(\w+)"/.exec(sql))) return tables[m[1]].map(r => ({ ...r }));
    if ((m = /DELETE FROM "(\w+)"/.exec(sql))) { tables[m[1]] = []; return []; }
    if ((m = /INSERT INTO "(\w+)" \(([^)]+)\)/.exec(sql))) {
      const cols = m[2].split(',').map(c => c.trim().replace(/"/g, ''));
      const row: Row = {};
      cols.forEach((c, i) => { row[c] = params[i]; });
      tables[m[1]].push(row);
      return [];
    }
    throw new Error(`SQL não suportado no teste: ${sql}`);
  }

  return {
    tables,
    executeSql: async (sql: string, params?: unknown[]) => [result(run(sql, params))],
    transaction: async (fn: (tx: { executeSql: (s: string, p?: unknown[]) => void }) => void) => {
      const snapshot = JSON.parse(JSON.stringify(tables));
      try {
        fn({ executeSql: (s, p) => { run(s, p); } });
      } catch (e) {
        Object.assign(tables, snapshot);
        throw e;
      }
    },
  };
}

const SCHEMA = {
  _migrations:  ['version'],
  logs:         ['id', 'message'],
  accounts:     ['id', 'name', 'balance'],
  goals:        ['id', 'title', 'target_amount'],
  transactions: ['id', 'account_id', 'amount', 'description'],
};

let mockDb: ReturnType<typeof createFakeDb>;
const mockStorage: Record<string, string> = {};

jest.mock('../src/database/db', () => ({ getDatabase: async () => mockDb }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (k: string) => mockStorage[k] ?? null,
    setItem: async (k: string, v: string) => { mockStorage[k] = v; },
  },
}));
jest.mock('react-native-fs', () => ({ __esModule: true, default: { CachesDirectoryPath: '/cache' } }));
jest.mock('../src/i18n/config', () => ({ __esModule: true, default: { language: 'pt-BR', t: (k: string) => k } }));

import { BackupService, BackupError } from '../src/services/BackupService';

beforeEach(() => {
  for (const k of Object.keys(mockStorage)) delete mockStorage[k];
});

test('backup leva todas as tabelas de dados e as preferências, sem tabelas internas', async () => {
  mockDb = createFakeDb(SCHEMA, 7);
  mockDb.tables.accounts.push({ id: 1, name: 'Nubank', balance: 100.5 });
  mockDb.tables.goals.push({ id: 3, title: 'Viagem', target_amount: 9000 });
  mockDb.tables.logs.push({ id: 1, message: 'log' });
  mockStorage['@fintrack:settings'] = JSON.stringify({ theme: 'dark', userName: 'Ana' });

  const backup = await BackupService.build();

  expect(backup.app).toBe('FinTrack');
  expect(backup.schemaVersion).toBe(7);
  expect(Object.keys(backup.tables).sort()).toEqual(['accounts', 'goals', 'transactions']);
  expect(backup.tables.goals).toEqual([{ id: 3, title: 'Viagem', target_amount: 9000 }]);
  expect(backup.settings).toEqual({ theme: 'dark', userName: 'Ana' });
});

test('restaurar troca os dados atuais pelos do backup e mantém preferências do aparelho', async () => {
  mockDb = createFakeDb(SCHEMA, 7);
  mockDb.tables.accounts.push({ id: 1, name: 'Nubank', balance: 100.5 });
  mockDb.tables.transactions.push({ id: 10, account_id: 1, amount: -42.9, description: 'iFood' });
  mockStorage['@fintrack:settings'] = JSON.stringify({ theme: 'dark', onboardingCompleted: true });
  const backup = BackupService.parse(JSON.stringify(await BackupService.build()));

  // Aparelho novo: banco vazio, onboarding ainda não concluído.
  mockDb = createFakeDb(SCHEMA, 7);
  mockDb.tables.accounts.push({ id: 99, name: 'Conta de teste', balance: 0 });
  mockStorage['@fintrack:settings'] = JSON.stringify({ onboardingCompleted: false, notificationPermissionGranted: true });

  const summary = await BackupService.restore(backup);

  expect(summary).toEqual({ tables: 3, rows: 2 });
  expect(mockDb.tables.accounts).toEqual([{ id: 1, name: 'Nubank', balance: 100.5 }]);
  expect(mockDb.tables.transactions).toEqual([{ id: 10, account_id: 1, amount: -42.9, description: 'iFood' }]);
  expect(JSON.parse(mockStorage['@fintrack:settings'])).toEqual({
    theme: 'dark', onboardingCompleted: false, notificationPermissionGranted: true,
  });
});

test('colunas que o app não tem mais são ignoradas na restauração', async () => {
  mockDb = createFakeDb(SCHEMA, 7);
  const backup = BackupService.parse(JSON.stringify({
    app: 'FinTrack', format: 1, appVersion: '1.0.7', schemaVersion: 5, createdAt: '', settings: null,
    tables: { accounts: [{ id: 1, name: 'Inter', balance: 10, coluna_antiga: 'x' }] },
  }));

  await BackupService.restore(backup);

  expect(mockDb.tables.accounts).toEqual([{ id: 1, name: 'Inter', balance: 10 }]);
});

test('recusa arquivos que não são backup e backups de versão mais nova', async () => {
  mockDb = createFakeDb(SCHEMA, 7);
  expect(() => BackupService.parse('{"foo":1}')).toThrow(BackupError);
  expect(() => BackupService.parse('não é json')).toThrow(BackupError);

  const newer = BackupService.parse(JSON.stringify({
    app: 'FinTrack', format: 1, schemaVersion: 8, tables: {}, settings: null,
  }));
  await expect(BackupService.restore(newer)).rejects.toMatchObject({ code: 'newer' });
});
