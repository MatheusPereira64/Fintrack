import { getDatabase } from '../db';
import {
  InsertPendingReview,
  PendingReview,
  PendingReviewStatus,
  ParsedTransaction,
} from '../../models/types';

function rowToReview(r: any): PendingReview {
  return {
    id:                   r.id,
    packageName:          r.package_name,
    title:                r.title,
    body:                 r.body,
    subText:              r.sub_text ?? undefined,
    notificationTs:       r.notification_ts,
    proposedType:         r.proposed_type,
    proposedCategory:     r.proposed_category,
    proposedAmount:       r.proposed_amount,
    proposedDescription:  r.proposed_description,
    proposedBankName:     r.proposed_bank_name,
    installmentCurrent:   r.installment_current ?? null,
    installmentTotal:     r.installment_total ?? null,
    status:               r.status as PendingReviewStatus,
    createdAt:            r.created_at,
  };
}

export const PendingReviewRepository = {
  async insert(data: InsertPendingReview): Promise<PendingReview> {
    const db = await getDatabase();
    const [r] = await db.executeSql(
      `INSERT INTO pending_reviews (
        package_name, title, body, sub_text, notification_ts,
        proposed_type, proposed_category, proposed_amount,
        proposed_description, proposed_bank_name,
        installment_current, installment_total, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        data.packageName,
        data.title,
        data.body,
        data.subText ?? null,
        data.notificationTs,
        data.proposedType,
        data.proposedCategory,
        data.proposedAmount,
        data.proposedDescription,
        data.proposedBankName,
        data.installmentCurrent ?? null,
        data.installmentTotal ?? null,
      ],
    );
    const created = await this.findById(r.insertId);
    if (!created) throw new Error('Falha ao criar revisão pendente');
    return created;
  },

  async findById(id: number): Promise<PendingReview | null> {
    const db = await getDatabase();
    const [r] = await db.executeSql(
      'SELECT * FROM pending_reviews WHERE id = ? LIMIT 1',
      [id],
    );
    if (r.rows.length === 0) return null;
    return rowToReview(r.rows.item(0));
  },

  async findPending(limit = 100): Promise<PendingReview[]> {
    const db = await getDatabase();
    const [r] = await db.executeSql(
      `SELECT * FROM pending_reviews
       WHERE status = 'pending'
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit],
    );
    const rows: PendingReview[] = [];
    for (let i = 0; i < r.rows.length; i++) rows.push(rowToReview(r.rows.item(i)));
    return rows;
  },

  async countPending(): Promise<number> {
    const db = await getDatabase();
    const [r] = await db.executeSql(
      `SELECT COUNT(*) as c FROM pending_reviews WHERE status = 'pending'`,
    );
    return r.rows.item(0).c as number;
  },

  async updateProposed(
    id: number,
    fields: {
      proposedType: string;
      proposedCategory: string;
      proposedAmount: number;
      proposedDescription: string;
      proposedBankName: string;
      installmentCurrent?: number | null;
      installmentTotal?: number | null;
    },
  ): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `UPDATE pending_reviews SET
        proposed_type = ?,
        proposed_category = ?,
        proposed_amount = ?,
        proposed_description = ?,
        proposed_bank_name = ?,
        installment_current = ?,
        installment_total = ?
       WHERE id = ? AND status = 'pending'`,
      [
        fields.proposedType,
        fields.proposedCategory,
        fields.proposedAmount,
        fields.proposedDescription,
        fields.proposedBankName,
        fields.installmentCurrent ?? null,
        fields.installmentTotal ?? null,
        id,
      ],
    );
  },

  async setStatus(id: number, status: PendingReviewStatus): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      'UPDATE pending_reviews SET status = ? WHERE id = ?',
      [status, id],
    );
  },

  toParsedTransaction(review: PendingReview): ParsedTransaction {
    return {
      type:               review.proposedType as ParsedTransaction['type'],
      category:           review.proposedCategory,
      amount:             review.proposedAmount,
      description:        review.proposedDescription,
      bankName:           review.proposedBankName,
      rawTitle:           review.title,
      rawBody:            review.body,
      installmentCurrent: review.installmentCurrent ?? undefined,
      installmentTotal:   review.installmentTotal ?? undefined,
    };
  },
};
