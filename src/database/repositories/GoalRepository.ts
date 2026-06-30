import { getDatabase } from '../db';
import { Goal, InsertGoal } from '../../models/types';

function rowToGoal(row: any): Goal {
  return {
    id:            row.id,
    title:         row.title,
    targetAmount:  row.target_amount,
    currentAmount: row.current_amount,
    deadline:      row.deadline ?? undefined,
    category:      row.category,
    icon:          row.icon ?? undefined,
    color:         row.color,
    createdAt:     row.created_at,
  };
}

export const GoalRepository = {
  async findAll(): Promise<Goal[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM goals ORDER BY created_at DESC',
    );
    const rows: Goal[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      rows.push(rowToGoal(result.rows.item(i)));
    }
    return rows;
  },

  async findById(id: number): Promise<Goal | null> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM goals WHERE id = ? LIMIT 1',
      [id],
    );
    if (result.rows.length === 0) return null;
    return rowToGoal(result.rows.item(0));
  },

  async insert(data: InsertGoal): Promise<Goal> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `INSERT INTO goals (title, target_amount, current_amount, deadline, category, icon, color)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title,
        data.targetAmount,
        data.currentAmount ?? 0,
        data.deadline ?? null,
        data.category,
        data.icon ?? null,
        data.color ?? '#7C3AED',
      ],
    );
    const inserted = await this.findById(result.insertId);
    if (!inserted) throw new Error('Failed to insert goal');
    return inserted;
  },

  async update(id: number, data: Partial<InsertGoal>): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.title         !== undefined) { fields.push('title = ?');          values.push(data.title); }
    if (data.targetAmount  !== undefined) { fields.push('target_amount = ?');  values.push(data.targetAmount); }
    if (data.currentAmount !== undefined) { fields.push('current_amount = ?'); values.push(data.currentAmount); }
    if (data.deadline      !== undefined) { fields.push('deadline = ?');       values.push(data.deadline); }
    if (data.color         !== undefined) { fields.push('color = ?');          values.push(data.color); }
    if (data.icon          !== undefined) { fields.push('icon = ?');           values.push(data.icon); }

    if (fields.length === 0) return;
    values.push(id);
    await db.executeSql(
      `UPDATE goals SET ${fields.join(', ')} WHERE id = ?`,
      values as any[],
    );
  },

  async addToCurrentAmount(id: number, amount: number): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      'UPDATE goals SET current_amount = current_amount + ? WHERE id = ?',
      [amount, id],
    );
  },

  async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM goals WHERE id = ?', [id]);
  },
};
