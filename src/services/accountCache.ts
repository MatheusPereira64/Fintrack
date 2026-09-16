import { Account } from '../models/types';
import { AccountRepository } from '../database/repositories/AccountRepository';

const TTL_MS = 30_000;
let cache: { at: number; accounts: Account[] } | null = null;

export function invalidateAccountCache(): void {
  cache = null;
}

export async function getAccountsCached(): Promise<Account[]> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return cache.accounts;
  }
  const accounts = await AccountRepository.findAll();
  cache = { at: Date.now(), accounts };
  return accounts;
}
