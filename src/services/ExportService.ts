import { Transaction, Account } from '../models/types';
import { formatDate } from '../utils/date';
import i18n from '../i18n/config';

export const ExportService = {
  toCSV(transactions: Transaction[], accounts: Account[]): string {
    const accountMap = new Map(accounts.map(a => [a.id, a.name]));

    const header = [
      i18n.t('exportService.headerId'),
      i18n.t('exportService.headerDate'),
      i18n.t('exportService.headerDescription'),
      i18n.t('exportService.headerAmount'),
      i18n.t('exportService.headerType'),
      i18n.t('exportService.headerAccount'),
      i18n.t('exportService.headerBank'),
      i18n.t('exportService.headerRecurring'),
      i18n.t('exportService.headerAuto'),
    ].join(',');

    const rows = transactions.map(tx => [
      tx.id,
      `"${formatDate(tx.date, 'short')}"`,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.amount.toFixed(2).replace('.', ','),
      tx.type,
      `"${accountMap.get(tx.accountId) ?? ''}"`,
      `"${tx.bankName ?? ''}"`,
      tx.isRecurring ? i18n.t('common.yes') : i18n.t('common.no'),
      tx.sourceNotification ? i18n.t('common.yes') : i18n.t('common.no'),
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
