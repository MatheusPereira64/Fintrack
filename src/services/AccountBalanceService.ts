import { AccountRepository } from '../database/repositories/AccountRepository';
import { TransactionRepository } from '../database/repositories/TransactionRepository';

/** Ajusta o saldo calculado para bater com o saldo informado (cria transação de ajuste). */
export async function reconcileAccountBalance(
  accountId: number,
  targetInformedBalance: number,
): Promise<void> {
  const account = await AccountRepository.findById(accountId);
  if (!account) throw new Error('Conta não encontrada');

  const diff = targetInformedBalance - account.balance;

  if (Math.abs(diff) >= 0.01) {
    await TransactionRepository.insert({
      accountId,
      date:        new Date().toISOString().slice(0, 10),
      amount:      diff,
      description: 'Ajuste de saldo',
      type:        diff > 0 ? 'income' : 'expense',
      isRecurring: false,
    });
  }

  await AccountRepository.update(accountId, {
    informedBalance: targetInformedBalance,
  });
}

/** Atualiza apenas o saldo informado (sem alterar o calculado). */
export async function setInformedBalance(
  accountId: number,
  informedBalance: number,
): Promise<void> {
  await AccountRepository.update(accountId, { informedBalance });
}

export function hasBalanceDivergence(account: {
  balance: number;
  informedBalance?: number;
}, threshold = 0.01): boolean {
  const informed = account.informedBalance ?? account.balance;
  return Math.abs(informed - account.balance) >= threshold;
}
