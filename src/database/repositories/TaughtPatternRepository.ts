import { getDatabase } from '../db';
import { InsertTaughtPattern, TaughtPattern } from '../../models/types';

function rowToPattern(r: any): TaughtPattern {
  return {
    id:                   r.id,
    packageName:          r.package_name,
    name:                 r.name ?? undefined,
    matchSnippet:         r.match_snippet ?? undefined,
    matchRegex:           r.match_regex ?? undefined,
    transactionType:      r.transaction_type,
    category:             r.category,
    descriptionTemplate:  r.description_template ?? undefined,
    bankName:             r.bank_name ?? undefined,
    isActive:             r.is_active === 1,
    createdAt:            r.created_at,
  };
}

export const TaughtPatternRepository = {
  async insert(data: InsertTaughtPattern): Promise<TaughtPattern> {
    const db = await getDatabase();
    const [r] = await db.executeSql(
      `INSERT INTO taught_patterns (
        package_name, name, match_snippet, match_regex,
        transaction_type, category, description_template, bank_name, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        data.packageName,
        data.name ?? null,
        data.matchSnippet ?? null,
        data.matchRegex ?? null,
        data.transactionType,
        data.category,
        data.descriptionTemplate ?? null,
        data.bankName ?? null,
      ],
    );
    const created = await this.findById(r.insertId);
    if (!created) throw new Error('Falha ao salvar padrão ensinado');
    return created;
  },

  async findById(id: number): Promise<TaughtPattern | null> {
    const db = await getDatabase();
    const [r] = await db.executeSql(
      'SELECT * FROM taught_patterns WHERE id = ? LIMIT 1',
      [id],
    );
    if (r.rows.length === 0) return null;
    return rowToPattern(r.rows.item(0));
  },

  async findActiveByPackage(packageName: string): Promise<TaughtPattern[]> {
    const db = await getDatabase();
    const [r] = await db.executeSql(
      `SELECT * FROM taught_patterns
       WHERE package_name = ? AND is_active = 1
       ORDER BY id DESC`,
      [packageName],
    );
    const rows: TaughtPattern[] = [];
    for (let i = 0; i < r.rows.length; i++) rows.push(rowToPattern(r.rows.item(i)));
    return rows;
  },

  async findAllActive(): Promise<TaughtPattern[]> {
    const db = await getDatabase();
    const [r] = await db.executeSql(
      `SELECT * FROM taught_patterns WHERE is_active = 1 ORDER BY id DESC`,
    );
    const rows: TaughtPattern[] = [];
    for (let i = 0; i < r.rows.length; i++) rows.push(rowToPattern(r.rows.item(i)));
    return rows;
  },

  async deactivate(id: number): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      'UPDATE taught_patterns SET is_active = 0 WHERE id = ?',
      [id],
    );
  },
};
