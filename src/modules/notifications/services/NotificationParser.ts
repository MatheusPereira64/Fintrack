/**
 * Serviço central de parsing de notificações bancárias.
 */
import { getBankConfig, isKnownBank, normalizeBankName } from './BankRegistry';
import { GenericBankParser } from '../parsers/GenericBankParser';
import { ParsedTransaction, Transaction, Account } from '../../../models/types';
import { TransactionRepository } from '../../../database/repositories/TransactionRepository';
import { getAccountsCached }     from '../../../services/accountCache';
import { CategoryRepository }    from '../../../database/repositories/CategoryRepository';
import { parseInstallments }     from '../../../utils/installmentParser';

export interface RawNotification {
  packageName: string;
  title: string;
  text: string;
  subText?: string;
  timestamp: number;
}

export interface ParseResult {
  success: boolean;
  transaction?: ParsedTransaction;
  inserted?: Transaction;
  transactionId?: number;
  categoryId?: number;
  error?: string;
  ignored?: boolean;
}

function resolveAccount(
  accounts: Account[],
  parsed: ParsedTransaction,
  packageName: string,
) {
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

export async function processNotification(raw: RawNotification): Promise<ParseResult> {
  if (!isKnownBank(raw.packageName)) {
    return { success: false, ignored: true };
  }

  const bankConfig = getBankConfig(raw.packageName);
  if (!bankConfig) {
    return { success: false, ignored: true };
  }

  const fullText = [raw.title, raw.text, raw.subText].filter(Boolean).join(' ');
  const parsed =
    bankConfig.parser.parse(raw.title, fullText, raw.packageName)
    ?? GenericBankParser.parse(raw.title, fullText, raw.packageName);

  if (!parsed) {
    return { success: false, ignored: true };
  }

  // Parcelas: extrai do texto bruto; se ambíguo, deixa em branco (manual depois).
  if (parsed.installmentCurrent == null || parsed.installmentTotal == null) {
    const installments = parseInstallments(fullText);
    if (installments) {
      parsed.installmentCurrent = installments.current;
      parsed.installmentTotal = installments.total;
    }
  }

  try {
    const accounts = await getAccountsCached();
    if (accounts.length === 0) {
      return { success: false, error: 'Nenhuma conta cadastrada' };
    }

    const account = resolveAccount(accounts, parsed, raw.packageName);
    const category = await CategoryRepository.findByName(parsed.category);
    const categoryId = category?.id;
    const date = new Date(raw.timestamp).toISOString().slice(0, 10);

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
      sourceNotification: `${raw.title} | ${raw.text}`,
    });

    return { success: true, transaction: parsed, inserted, transactionId: inserted.id, categoryId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}
