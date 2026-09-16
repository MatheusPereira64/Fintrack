/**
 * RecurringService — Processa transações recorrentes no bootstrap.
 */
import { TransactionRepository } from '../database/repositories/TransactionRepository';
import { AccountRepository }     from '../database/repositories/AccountRepository';
import { NotificationRepository } from '../database/repositories/NotificationRepository';
import { Logger }                 from './LoggerService';

export const RecurringService = {
  async processCurrentMonth(): Promise<number> {
    const now       = new Date();
    const year      = now.getFullYear();
    const month     = now.getMonth() + 1;
    const today     = now.toISOString().slice(0, 10);
    const monthStr  = `${year}-${String(month).padStart(2, '0')}`;

    let created = 0;

    try {
      const recurring = await TransactionRepository.findRecurringTemplates();
      if (recurring.length === 0) return 0;

      const thisMonth = await TransactionRepository.findByMonth(year, month);
      const thisMonthKeys = new Set(thisMonth.map(t => `${t.description}|${t.accountId}`));
      const accounts = await AccountRepository.findAll();
      const accountIds = new Set(accounts.map(a => a.id));

      for (const tx of recurring) {
        const key = `${tx.description}|${tx.accountId}`;
        if (thisMonthKeys.has(key)) continue;
        if (tx.date.startsWith(monthStr)) continue;
        if (!accountIds.has(tx.accountId)) continue;

        const newDate = `${monthStr}-${String(tx.date.slice(8, 10)).padStart(2, '0')}`;

        await TransactionRepository.insert({
          accountId:   tx.accountId,
          categoryId:  tx.categoryId,
          date:        newDate > today ? today : newDate,
          amount:      tx.amount,
          description: tx.description,
          type:        tx.type,
          isRecurring: true,
          bankName:    tx.bankName,
        });

        created++;
        thisMonthKeys.add(key);
        Logger.info('RecurringService', `Criada recorrência: ${tx.description}`);
      }

      if (created > 0) {
        await NotificationRepository.insert({
          type:    'info',
          title:   `${created} transaç${created === 1 ? 'ão recorrente criada' : 'ões recorrentes criadas'}`,
          message: `Suas transações recorrentes de ${getMonthName(month)}/${year} foram registradas automaticamente.`,
          metadata: JSON.stringify({ month, year, count: created }),
        });
      }
    } catch (e) {
      Logger.error('RecurringService', 'Erro ao processar recorrências', e);
    }

    return created;
  },
};

function getMonthName(month: number): string {
  return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][month - 1] ?? String(month);
}
