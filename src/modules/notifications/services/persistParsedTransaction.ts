/**
 * Persiste uma transação parseada no SQLite (após aceite na fila de revisão).
 */
import { ParsedTransaction, Transaction, Account } from '../../../models/types';
import { TransactionRepository } from '../../../database/repositories/TransactionRepository';
import { CategoryRepository } from '../../../database/repositories/CategoryRepository';
import { getAccountsCached } from '../../../services/accountCache';
import { getBankConfig, normalizeBankName } from './BankRegistry';

export function resolveAccount(
  accounts: Account[],
  parsed: ParsedTransaction,
  packageName: string,
): Account | undefined {
  const bankFromPkg = getBankConfig(packageName)?.name;
  const targets = [parsed.bankName, bankFromPkg].filter(Boolean) as string[];

  for (const target of targets) {
    const norm = normalizeBankName(target);
    const match = accounts.find(a => {
      if (!a.bankName && !a.name) return false;
      const byBank = a.bankName ? normalizeBankName(a.bankName) : '';
      const byName = normalizeBankName(a.name);
      return (
        byBank === norm
        || byName === norm
        || (byBank && (byBank.includes(norm) || norm.includes(byBank)))
        || byName.includes(norm)
        || a.bankName?.toLowerCase().includes(target.toLowerCase())
      );
    });
    if (match) return match;
  }

  const withBank = accounts.filter(a => a.bankName);
  if (withBank.length === 1) return withBank[0];
  return accounts[0];
}

export interface PersistResult {
  inserted: Transaction;
  categoryId?: number;
}

export async function persistParsedTransaction(
  parsed: ParsedTransaction,
  opts: {
    packageName: string;
    title: string;
    text: string;
    timestamp: number;
  },
): Promise<PersistResult> {
  const accounts = await getAccountsCached();
  if (accounts.length === 0) {
    throw new Error('Nenhuma conta cadastrada');
  }

  const account = resolveAccount(accounts, parsed, opts.packageName);
  if (!account) {
    throw new Error('Nenhuma conta cadastrada');
  }

  const category = await CategoryRepository.findByName(parsed.category);
  const categoryId = category?.id;
  const date = new Date(opts.timestamp).toISOString().slice(0, 10);

  const inserted = await TransactionRepository.insert({
    accountId:          account.id,
    categoryId,
    date,
    amount:             parsed.amount,
    description:        parsed.description,
    type:               parsed.type,
    isRecurring:        false,
    installmentCurrent: parsed.installmentCurrent ?? null,
    installmentTotal:   parsed.installmentTotal ?? null,
    bankName:           parsed.bankName,
    sourceNotification: `${opts.title} | ${opts.text}`,
  });

  return { inserted, categoryId };
}
