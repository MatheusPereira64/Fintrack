/**
 * Serviço central de parsing de notificações bancárias.
 * Recebe dados brutos do NotificationListenerService nativo,
 * identifica o banco, extrai a transação e persiste no SQLite.
 */
import { getBankConfig, isKnownBank } from './BankRegistry';
import { ParsedTransaction } from '../../../models/types';
import { TransactionRepository } from '../../../database/repositories/TransactionRepository';
import { AccountRepository }     from '../../../database/repositories/AccountRepository';
import { CategoryRepository }    from '../../../database/repositories/CategoryRepository';

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
  transactionId?: number;
  error?: string;
  ignored?: boolean;
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
  const parsed = bankConfig.parser.parse(raw.title, fullText, raw.packageName);

  if (!parsed) {
    return { success: false, ignored: true };
  }

  try {
    // Encontra ou usa a primeira conta disponível
    const accounts = await AccountRepository.findAll();
    if (accounts.length === 0) {
      return { success: false, error: 'Nenhuma conta cadastrada' };
    }

    // Tenta encontrar conta pelo nome do banco
    const account = accounts.find(a =>
      a.bankName?.toLowerCase().includes(parsed.bankName.toLowerCase()),
    ) ?? accounts[0];

    // Encontra categoria pelo nome
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
      bankName:           parsed.bankName,
      sourceNotification: `${raw.title} | ${raw.text}`,
    });

    return { success: true, transaction: parsed, transactionId: inserted.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}
