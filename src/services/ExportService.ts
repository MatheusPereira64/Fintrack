import { Transaction, Account } from '../models/types';
import { formatDate } from '../utils/date';

export const ExportService = {
  toCSV(transactions: Transaction[], accounts: Account[]): string {
    const accountMap = new Map(accounts.map(a => [a.id, a.name]));

    const header = [
      'ID', 'Data', 'Descrição', 'Valor', 'Tipo', 'Conta',
      'Banco', 'Recorrente', 'Auto-registrado',
    ].join(',');

    const rows = transactions.map(tx => [
      tx.id,
      `"${formatDate(tx.date, 'short')}"`,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.amount.toFixed(2).replace('.', ','),
      tx.type,
      `"${accountMap.get(tx.accountId) ?? ''}"`,
      `"${tx.bankName ?? ''}"`,
      tx.isRecurring ? 'Sim' : 'Não',
      tx.sourceNotification ? 'Sim' : 'Não',
    ].join(','));

    return [header, ...rows].join('\n');
  },

  toJSON(transactions: Transaction[], accounts: Account[]): string {
    const accountMap = new Map(accounts.map(a => [a.id, a]));

    const data = {
      exportedAt: new Date().toISOString(),
      totalTransactions: transactions.length,
      accounts: accounts.map(a => ({
        id: a.id, name: a.name, type: a.type, balance: a.balance,
      })),
      transactions: transactions.map(tx => ({
        ...tx,
        accountName: accountMap.get(tx.accountId)?.name,
      })),
    };

    return JSON.stringify(data, null, 2);
  },
};
