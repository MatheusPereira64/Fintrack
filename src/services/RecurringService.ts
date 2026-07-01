/**
 * RecurringService — Processa transações recorrentes.
 *
 * Chamado no bootstrap do App.tsx.
 * Para cada transação marcada como is_recurring, verifica se já existe
 * uma cópia no mês atual. Se não existir, cria automaticamente.
 *
 * Isso permite que o usuário marque uma transação como "Salário mensal",
 * "Aluguel", "Academia" etc. e ela apareça automaticamente todo mês.
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
      // Pega todas as recorrentes (de qualquer mês passado)
      const allTx  = await TransactionRepository.findAll(500, 0);
      const recurring = allTx.filter(t => t.isRecurring);

      if (recurring.length === 0) return 0;

      // Pega as já existentes no mês atual
      const thisMonth = await TransactionRepository.findByMonth(year, month);
      const thisMonthKeys = new Set(thisMonth.map(t => `${t.description}|${t.accountId}`));

      for (const tx of recurring) {
        const key = `${tx.description}|${tx.accountId}`;
        if (thisMonthKeys.has(key)) continue; // já existe no mês

        // Verifica se a transação é de um mês anterior (não copia o próprio mês)
        if (tx.date.startsWith(monthStr)) continue;

        // Verifica conta ainda existe
        const accounts = await AccountRepository.findAll();
        const account  = accounts.find(a => a.id === tx.accountId);
        if (!account) continue;

        // Cria a cópia para o mês atual
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
        thisMonthKeys.add(key); // evita duplicatas dentro do próprio loop

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
