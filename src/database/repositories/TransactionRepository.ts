import { getDatabase } from '../db';
import { Transaction, InsertTransaction } from '../../models/types';

function rowToTransaction(r: any): Transaction {
  return {
    id:                 r.id,
    accountId:          r.account_id,
    categoryId:         r.category_id ?? undefined,
    costCenterId:       r.cost_center_id ?? undefined,
    date:               r.date,
    amount:             r.amount,
    description:        r.description,
    type:               r.type,
    isRecurring:        r.is_recurring === 1,
    tags:               r.tags ? JSON.parse(r.tags) : [],
    bankName:           r.bank_name ?? undefined,
    sourceNotification: r.source_notification ?? undefined,
    createdAt:          r.created_at,
  };
}

/**
 * Gera condição SQL para o intervalo correto de um mês,
 * independente de quantos dias o mês possui.
 */
function monthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear  = month === 12 ? year + 1 : year;
  const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  return { start, end };
}

export const TransactionRepository = {

  async findAll(limit = 200, offset = 0): Promise<Transaction[]> {
    const db = await getDatabase();
    const [r] = await db.executeSql(
      `SELECT * FROM transactions ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`,
      [limit, offset],
    );
    const rows: Transaction[] = [];
    for (let i = 0; i < r.rows.length; i++) rows.push(rowToTransaction(r.rows.item(i)));
    return rows;
  },

  async findByMonth(year: number, month: number): Promise<Transaction[]> {
    const db = await getDatabase();
    const { start, end } = monthRange(year, month);
    const [r] = await db.executeSql(
      `SELECT * FROM transactions WHERE date >= ? AND date < ? ORDER BY date DESC, id DESC`,
      [start, end],
    );
    const rows: Transaction[] = [];
    for (let i = 0; i < r.rows.length; i++) rows.push(rowToTransaction(r.rows.item(i)));
    return rows;
  },

  async findByMonthRange(
    startYear: number, startMonth: number,
    endYear: number,   endMonth: number,
  ): Promise<Transaction[]> {
    const db = await getDatabase();
    const start = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;
    const { end } = monthRange(endYear, endMonth);
    const [r] = await db.executeSql(
      `SELECT * FROM transactions WHERE date >= ? AND date < ? ORDER BY date DESC, id DESC`,
      [start, end],
    );
    const rows: Transaction[] = [];
    for (let i = 0; i < r.rows.length; i++) rows.push(rowToTransaction(r.rows.item(i)));
    return rows;
  },

  async findById(id: number): Promise<Transaction | null> {
    const db = await getDatabase();
    const [r] = await db.executeSql(
      `SELECT * FROM transactions WHERE id = ? LIMIT 1`, [id],
    );
    if (r.rows.length === 0) return null;
    return rowToTransaction(r.rows.item(0));
  },

  async findByAccount(accountId: number, limit = 100): Promise<Transaction[]> {
    const db = await getDatabase();
    const [r] = await db.executeSql(
      `SELECT * FROM transactions WHERE account_id = ? ORDER BY date DESC LIMIT ?`,
      [accountId, limit],
    );
    const rows: Transaction[] = [];
    for (let i = 0; i < r.rows.length; i++) rows.push(rowToTransaction(r.rows.item(i)));
    return rows;
  },

  async insert(data: InsertTransaction): Promise<Transaction> {
    const db = await getDatabase();
    const tags = data.tags?.length ? JSON.stringify(data.tags) : null;

    const [r] = await db.executeSql(
      `INSERT INTO transactions
        (account_id, category_id, cost_center_id, date, amount, description,
         type, is_recurring, tags, bank_name, source_notification)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.accountId,
        data.categoryId ?? null,
        data.costCenterId ?? null,
        data.date,
        data.amount,
        data.description,
        data.type,
        data.isRecurring ? 1 : 0,
        tags,
        data.bankName ?? null,
        data.sourceNotification ?? null,
      ],
    );

    // Atualiza saldo da conta
    await db.executeSql(
      `UPDATE accounts SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?`,
      [data.amount, data.accountId],
    );

    const inserted = await this.findById(r.insertId);
    if (!inserted) throw new Error('Failed to insert transaction');
    return inserted;
  },

  /**
   * Atualiza a transação e recalcula o saldo da conta corretamente.
   */
  async update(id: number, data: Partial<InsertTransaction>): Promise<void> {
    const db = await getDatabase();
    const current = await this.findById(id);
    if (!current) throw new Error(`Transaction ${id} not found`);

    // Se o valor mudou, ajusta o saldo da conta
    if (data.amount !== undefined && data.amount !== current.amount) {
      const diff = data.amount - current.amount;
      await db.executeSql(
        `UPDATE accounts SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?`,
        [diff, current.accountId],
      );
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.amount      !== undefined) { fields.push('amount = ?');      values.push(data.amount); }
    if (data.categoryId  !== undefined) { fields.push('category_id = ?'); values.push(data.categoryId); }
    if (data.date        !== undefined) { fields.push('date = ?');        values.push(data.date); }
    if (data.type        !== undefined) { fields.push('type = ?');        values.push(data.type); }
    if (data.tags        !== undefined) { fields.push('tags = ?');        values.push(JSON.stringify(data.tags)); }
    if (data.isRecurring !== undefined) { fields.push('is_recurring = ?');values.push(data.isRecurring ? 1 : 0); }

    if (fields.length === 0) return;
    values.push(id);
    await db.executeSql(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`, values as any[]);
  },

  async delete(id: number): Promise<void> {
    const db = await getDatabase();
    const tx = await this.findById(id);
    if (tx) {
      await db.executeSql(
        `UPDATE accounts SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?`,
        [tx.amount, tx.accountId],
      );
    }
    await db.executeSql('DELETE FROM transactions WHERE id = ?', [id]);
  },

  // ─── Agregações ──────────────────────────────────────────────────────────────

  async sumByMonth(year: number, month: number): Promise<{ income: number; expense: number }> {
    const db = await getDatabase();
    const { start, end } = monthRange(year, month);
    const [r] = await db.executeSql(
      `SELECT
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)    as income,
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as expense
       FROM transactions WHERE date >= ? AND date < ?`,
      [start, end],
    );
    const row = r.rows.item(0);
    return { income: row.income, expense: row.expense };
  },

  async spendingByCategory(
    year: number, month: number,
  ): Promise<Array<{ categoryId: number; name: string; total: number; color: string; icon: string }>> {
    const db = await getDatabase();
    const { start, end } = monthRange(year, month);
    const [r] = await db.executeSql(
      `SELECT t.category_id, COALESCE(c.name,'Sem categoria') as name,
              COALESCE(c.color,'#6B7280') as color,
              COALESCE(c.icon,'📦') as icon,
              SUM(ABS(t.amount)) as total
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.date >= ? AND t.date < ? AND t.amount < 0
       GROUP BY t.category_id ORDER BY total DESC`,
      [start, end],
    );
    const rows = [];
    for (let i = 0; i < r.rows.length; i++) {
      const row = r.rows.item(i);
      rows.push({ categoryId: row.category_id, name: row.name, color: row.color, icon: row.icon, total: row.total });
    }
    return rows;
  },

  async monthlyTotals(
    lastNMonths = 6,
  ): Promise<Array<{ year: number; month: number; income: number; expense: number }>> {
    const db = await getDatabase();
    const now = new Date();
    const results = [];

    for (let i = lastNMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year  = d.getFullYear();
      const month = d.getMonth() + 1;
      const sums  = await this.sumByMonth(year, month);
      results.push({ year, month, ...sums });
    }
    return results;
  },

  async countByMonth(year: number, month: number): Promise<number> {
    const db = await getDatabase();
    const { start, end } = monthRange(year, month);
    const [r] = await db.executeSql(
      `SELECT COUNT(*) as total FROM transactions WHERE date >= ? AND date < ?`,
      [start, end],
    );
    return r.rows.item(0).total;
  },
};
