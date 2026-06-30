import { getDatabase } from '../db';
import { Category, InsertCategory } from '../../models/types';

function rowToCategory(row: any): Category {
  return {
    id:       row.id,
    name:     row.name,
    color:    row.color,
    icon:     row.icon ?? undefined,
    isSystem: row.is_system === 1,
  };
}

export const CategoryRepository = {
  async findAll(): Promise<Category[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM categories ORDER BY is_system DESC, name ASC',
    );
    const rows: Category[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      rows.push(rowToCategory(result.rows.item(i)));
    }
    return rows;
  },

  async findById(id: number): Promise<Category | null> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM categories WHERE id = ? LIMIT 1',
      [id],
    );
    if (result.rows.length === 0) return null;
    return rowToCategory(result.rows.item(0));
  },

  async findByName(name: string): Promise<Category | null> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1',
      [name],
    );
    if (result.rows.length === 0) return null;
    return rowToCategory(result.rows.item(0));
  },

  async insert(data: InsertCategory): Promise<Category> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'INSERT INTO categories (name, color, icon, is_system) VALUES (?, ?, ?, ?)',
      [data.name, data.color, data.icon ?? null, data.isSystem ? 1 : 0],
    );
    const inserted = await this.findById(result.insertId);
    if (!inserted) throw new Error('Failed to insert category');
    return inserted;
  },

  async update(id: number, data: Partial<InsertCategory>): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name  !== undefined) { fields.push('name = ?');  values.push(data.name); }
    if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
    if (data.icon  !== undefined) { fields.push('icon = ?');  values.push(data.icon); }

    if (fields.length === 0) return;
    values.push(id);
    await db.executeSql(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
      values as any[],
    );
  },

  async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM categories WHERE id = ? AND is_system = 0', [id]);
  },
};
