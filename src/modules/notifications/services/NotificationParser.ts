/**
 * Serviço central de parsing de notificações bancárias.
 * Não grava transações diretamente — enfileira revisão ou inbox não reconhecida.
 */
import { getBankConfig, isKnownBank } from './BankRegistry';
import { GenericBankParser } from '../parsers/GenericBankParser';
import { ParsedTransaction, PendingReview } from '../../../models/types';
import { parseInstallments } from '../../../utils/installmentParser';
import { PendingReviewRepository } from '../../../database/repositories/PendingReviewRepository';
import { UnrecognizedNotificationRepository } from '../../../database/repositories/UnrecognizedNotificationRepository';
import { TaughtPatternRepository } from '../../../database/repositories/TaughtPatternRepository';
import { tryTaughtPatterns } from './TaughtPatternMatcher';
import {
  persistParsedTransaction,
  PersistResult,
} from './persistParsedTransaction';

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
  inserted?: PersistResult['inserted'];
  transactionId?: number;
  categoryId?: number;
  review?: PendingReview;
  needsReview?: boolean;
  error?: string;
  ignored?: boolean;
}

async function enqueueUnrecognized(raw: RawNotification): Promise<ParseResult> {
  try {
    await UnrecognizedNotificationRepository.insert({
      packageName:    raw.packageName,
      title:          raw.title,
      body:           raw.text,
      subText:        raw.subText,
      notificationTs: raw.timestamp,
    });
  } catch {
    // inbox é best-effort; ignore falhas de persistência
  }
  return { success: false, ignored: true };
}

function enrichInstallments(parsed: ParsedTransaction, fullText: string): void {
  if (parsed.installmentCurrent == null || parsed.installmentTotal == null) {
    const installments = parseInstallments(fullText);
    if (installments) {
      parsed.installmentCurrent = installments.current;
      parsed.installmentTotal = installments.total;
    }
  }
}

export async function parseRawNotification(
  raw: RawNotification,
): Promise<ParsedTransaction | null> {
  if (!isKnownBank(raw.packageName)) return null;

  const bankConfig = getBankConfig(raw.packageName);
  if (!bankConfig) return null;

  const fullText = [raw.title, raw.text, raw.subText].filter(Boolean).join(' ');

  let parsed =
    bankConfig.parser.parse(raw.title, fullText, raw.packageName)
    ?? null;

  if (!parsed) {
    const taught = await TaughtPatternRepository.findActiveByPackage(raw.packageName);
    parsed = tryTaughtPatterns(taught, raw.title, fullText);
  }

  if (!parsed) {
    parsed = GenericBankParser.parse(raw.title, fullText, raw.packageName);
  }

  if (!parsed) return null;

  enrichInstallments(parsed, fullText);
  return parsed;
}

export async function processNotification(raw: RawNotification): Promise<ParseResult> {
  if (!isKnownBank(raw.packageName)) {
    return { success: false, ignored: true };
  }

  const bankConfig = getBankConfig(raw.packageName);
  if (!bankConfig) {
    return { success: false, ignored: true };
  }

  const parsed = await parseRawNotification(raw);
  if (!parsed) {
    return enqueueUnrecognized(raw);
  }

  try {
    const review = await PendingReviewRepository.insert({
      packageName:         raw.packageName,
      title:               raw.title,
      body:                raw.text,
      subText:             raw.subText,
      notificationTs:      raw.timestamp,
      proposedType:        parsed.type,
      proposedCategory:    parsed.category,
      proposedAmount:      parsed.amount,
      proposedDescription: parsed.description,
      proposedBankName:    parsed.bankName,
      installmentCurrent:  parsed.installmentCurrent ?? null,
      installmentTotal:    parsed.installmentTotal ?? null,
    });

    return {
      success: true,
      needsReview: true,
      review,
      transaction: parsed,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/** Aceita uma revisão pendente e grava a transação no SQLite. */
export async function acceptPendingReview(
  reviewId: number,
  overrides?: Partial<{
    type: ParsedTransaction['type'];
    category: string;
    amount: number;
    description: string;
    bankName: string;
    installmentCurrent: number | null;
    installmentTotal: number | null;
  }>,
): Promise<ParseResult> {
  const review = await PendingReviewRepository.findById(reviewId);
  if (!review || review.status !== 'pending') {
    return { success: false, error: 'Revisão não encontrada' };
  }

  const type = overrides?.type ?? review.proposedType;
  const amountRaw = overrides?.amount ?? review.proposedAmount;
  const signedAmount =
    type === 'expense'
      ? -Math.abs(amountRaw)
      : Math.abs(amountRaw);

  const parsed: ParsedTransaction = {
    type,
    category:           overrides?.category ?? review.proposedCategory,
    amount:             signedAmount,
    description:        overrides?.description ?? review.proposedDescription,
    bankName:           overrides?.bankName ?? review.proposedBankName,
    rawTitle:           review.title,
    rawBody:            review.body,
    installmentCurrent: overrides?.installmentCurrent !== undefined
      ? overrides.installmentCurrent ?? undefined
      : review.installmentCurrent ?? undefined,
    installmentTotal: overrides?.installmentTotal !== undefined
      ? overrides.installmentTotal ?? undefined
      : review.installmentTotal ?? undefined,
  };

  try {
    if (overrides) {
      await PendingReviewRepository.updateProposed(reviewId, {
        proposedType:        parsed.type,
        proposedCategory:    parsed.category,
        proposedAmount:      parsed.amount,
        proposedDescription: parsed.description,
        proposedBankName:    parsed.bankName,
        installmentCurrent:  parsed.installmentCurrent ?? null,
        installmentTotal:    parsed.installmentTotal ?? null,
      });
    }

    const { inserted, categoryId } = await persistParsedTransaction(parsed, {
      packageName: review.packageName,
      title:       review.title,
      text:        review.body,
      timestamp:   review.notificationTs,
    });

    await PendingReviewRepository.setStatus(reviewId, 'accepted');

    return {
      success: true,
      transaction: parsed,
      inserted,
      transactionId: inserted.id,
      categoryId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

export async function ignorePendingReview(reviewId: number): Promise<void> {
  await PendingReviewRepository.setStatus(reviewId, 'ignored');
}
