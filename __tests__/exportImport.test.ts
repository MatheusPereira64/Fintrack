/**
 * Exportar em CSV e importar de volta precisa preservar valor, data e descrição:
 * é o caminho que os usuários usam para levar os dados ao reinstalar o app.
 */
jest.mock('../src/i18n/config', () => {
  const pt = require('../src/i18n/locales/pt-BR.json');
  const t = (key: string) => key.split('.').reduce((o: any, p) => o?.[p], pt) ?? key;
  return { __esModule: true, default: { t, language: 'pt-BR' } };
});
jest.mock('../src/services/LoggerService', () => ({
  Logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('react-native-document-picker', () => ({ __esModule: true, default: {} }));
const mockReadFile = jest.fn();
jest.mock('react-native-fs', () => ({
  __esModule: true,
  default: { readFile: (...args: unknown[]) => mockReadFile(...args) },
}));

import { ExportService } from '../src/services/ExportService';
import { parseImportFile } from '../src/services/ImportService';

const tx = (id: number, date: string, amount: number, description: string) => ({
  id, accountId: 1, date, amount, description,
  type: amount < 0 ? 'expense' : 'income', isRecurring: false, createdAt: date,
});

test('CSV exportado é importado com os mesmos valores, datas e descrições', async () => {
  const csv = ExportService.toCSV([
    tx(1, '2026-11-05', -42.9, 'iFood, delivery'),
    tx(2, '2026-11-01', 8400, 'Salário'),
    tx(3, '2026-10-31', -1850.55, 'Aluguel "outubro"'),
  ] as any, [{ id: 1, name: 'Nubank' } as any]);

  mockReadFile.mockResolvedValue(csv);
  const result = await parseImportFile({ uri: 'file://fintrack.csv', name: 'fintrack.csv' } as any);

  expect(result.success).toBe(true);
  expect(result.candidates.map(c => [c.date, c.amount, c.description])).toEqual([
    ['2026-11-05', -42.9, 'iFood, delivery'],
    ['2026-11-01', 8400, 'Salário'],
    ['2026-10-31', -1850.55, 'Aluguel outubro'],
  ]);
});

test('CSV exportado pela 1.0.6 (valor sem aspas) é importado sem perder centavos', async () => {
  mockReadFile.mockResolvedValue([
    'ID,Data,Descrição,Valor,Tipo,Conta,Banco,Recorrente,Auto-registrado',
    '1,"05/11/2026","iFood",-42,90,expense,"Nubank","",Não,Não',
    '2,"01/11/2026","Salário",8400,00,income,"Nubank","",Sim,Não',
  ].join('\n'));
  const result = await parseImportFile({ uri: 'file://fintrack.csv', name: 'fintrack.csv' } as any);

  expect(result.candidates.map(c => [c.date, c.amount, c.type])).toEqual([
    ['2026-11-05', -42.9, 'expense'],
    ['2026-11-01', 8400, 'income'],
  ]);
});

test('CSV de banco com colunas normais não é alterado', async () => {
  mockReadFile.mockResolvedValue('data,descricao,valor\n05/11/2026,Padaria,"-12,50"\n06/11/2026,Pix,30');
  const result = await parseImportFile({ uri: 'file://banco.csv', name: 'banco.csv' } as any);

  expect(result.candidates.map(c => [c.date, c.amount])).toEqual([
    ['2026-11-05', -12.5],
    ['2026-11-06', 30],
  ]);
});
