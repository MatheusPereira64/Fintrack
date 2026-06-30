import { getDatabase } from '../db';
import { Budget, InsertBudget } from '../../models/types';

function rowToBudget(r: any): Budget & { categoryName?: string; categoryIcon?: string; categoryColor?: string; spent: number } {
  return {
    id:            r.id,
    categoryId:    r.category_id ?? undefined,
    amount:        r.amount,
    period:        r.period,
    startDate:     r.start_date,
    endDate:       r.end_date ?? undefined,
    categoryName:  r.cat_name ?? undefined,
    categoryIcon:  r.cat_icon ?? undefined,
    categoryColor: r.cat_color ?? undefined,
    spent:         r.spent ?? 0,
  };
}

export const BudgetRepository = {
  async findAll(): Promise<ReturnType<typeof rowToBudget>[]> {
    const db = await getDatabase();
    const [r] = await db.executeSql(
      `SELECT b.*, c.name as cat_name, c.icon as cat_icon, c.color as cat_color
       FROM budgets b LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.period = 'monthly' ORDER BY b.id DESC`,
    );
    const rows = [];
    for (let i = 0; i < r.rows.length; i++) rows.push(rowToBudget(r.rows.item(i)));
    return rows;
  },

  async findById(id: number): Promise<ReturnType<typeof rowToBudget> | null> {
    const db = await getDatabase();
    const [r] = await db.executeSql(
      `SELECT b.*, c.name as cat_name, c.icon as cat_icon, c.color as cat_color
       FROM budgets b LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.id = ? LIMIT 1`,
      [id],
    );
    if (r.rows.length === 0) return null;
    return rowToBudget(r.rows.item(0));
  },

  async insert(data: InsertBudget): Promise<number> {
    const db = await getDatabase();
    const [r] = await db.executeSql(
      `INSERT INTO budgets (category_id, amount, period, start_date, end_date) VALUES (?, ?, ?, ?, ?)`,
      [data.categoryId ?? null, data.amount, data.period, data.startDate, data.endDate ?? null],
    );
    return r.insertId;
  },

  async update(id: number, data: Partial<InsertBudget>): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.amount     !== undefined) { fields.push('amount = ?');      values.push(data.amount); }
    if (data.categoryId !== undefined) { fields.push('category_id = ?'); values.push(data.categoryId); }
    if (data.endDate    !== undefined) { fields.push('end_date = ?');    values.push(data.endDate); }
    if (fields.length === 0) return;
    values.push(id);
    await db.executeSql(`UPDATE budgets SET ${fields.join(', ')} WHERE id = ?`, values as any[]);
  },

  async updateSpent(id: number, spent: number): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('UPDATE budgets SET spent = ? WHERE id = ?', [spent, id]);
  },

  async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM budgets WHERE id = ?', [id]);
  },
};
