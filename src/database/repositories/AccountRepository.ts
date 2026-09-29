import { getDatabase } from '../db';
import { Account, InsertAccount } from '../../models/types';

function rowToAccount(row: any): Account {
  return {
    id:               row.id,
    name:             row.name,
    type:             row.type,
    balance:          row.balance,
    informedBalance:  row.informed_balance ?? row.balance,
    monthlyYieldRate: row.monthly_yield_rate ?? undefined,
    limit:            row.limit ?? undefined,
    usedLimit:        row.used_limit ?? null,
    invoiceAmount:    row.invoice_amount ?? null,
    closingDay:       row.closing_day ?? null,
    dueDay:           row.due_day ?? null,
    color:            row.color,
    bankName:         row.bank_name ?? undefined,
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  };
}

export const AccountRepository = {
  async findAll(): Promise<Account[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM accounts ORDER BY name ASC',
    );
    const rows: Account[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      rows.push(rowToAccount(result.rows.item(i)));
    }
    return rows;
  },

  async findById(id: number): Promise<Account | null> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM accounts WHERE id = ? LIMIT 1',
      [id],
    );
    if (result.rows.length === 0) return null;
    return rowToAccount(result.rows.item(0));
  },

  async insert(data: InsertAccount): Promise<Account> {
    const db = await getDatabase();
    const informed = data.informedBalance ?? data.balance;
    const [result] = await db.executeSql(
      `INSERT INTO accounts (
         name, type, balance, informed_balance, monthly_yield_rate,
         "limit", used_limit, invoice_amount, closing_day, due_day,
         color, bank_name
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.type,
        data.balance,
        informed,
        data.monthlyYieldRate ?? null,
        data.limit ?? null,
        data.usedLimit ?? null,
        data.invoiceAmount ?? null,
        data.closingDay ?? null,
        data.dueDay ?? null,
        data.color,
        data.bankName ?? null,
      ],
    );
    const inserted = await this.findById(result.insertId);
    if (!inserted) throw new Error('Failed to insert account');
    return inserted;
  },

  async update(id: number, data: Partial<InsertAccount & { informedBalance?: number }>): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name             !== undefined) { fields.push('name = ?');              values.push(data.name); }
    if (data.type             !== undefined) { fields.push('type = ?');              values.push(data.type); }
    if (data.balance          !== undefined) { fields.push('balance = ?');           values.push(data.balance); }
    if (data.informedBalance  !== undefined) { fields.push('informed_balance = ?');  values.push(data.informedBalance); }
    if (data.monthlyYieldRate !== undefined) { fields.push('monthly_yield_rate = ?'); values.push(data.monthlyYieldRate); }
    if (data.color            !== undefined) { fields.push('color = ?');             values.push(data.color); }
    if (data.limit            !== undefined) { fields.push('"limit" = ?');           values.push(data.limit); }
    if (data.usedLimit        !== undefined) { fields.push('used_limit = ?');        values.push(data.usedLimit); }
    if (data.invoiceAmount    !== undefined) { fields.push('invoice_amount = ?');    values.push(data.invoiceAmount); }
    if (data.closingDay       !== undefined) { fields.push('closing_day = ?');       values.push(data.closingDay); }
    if (data.dueDay           !== undefined) { fields.push('due_day = ?');           values.push(data.dueDay); }
    if (data.bankName         !== undefined) { fields.push('bank_name = ?');         values.push(data.bankName); }

    if (fields.length === 0) return;
    fields.push("updated_at = datetime('now')");
    values.push(id);

    await db.executeSql(
      `UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`,
      values as any[],
    );
  },

  async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM accounts WHERE id = ?', [id]);
  },

  async totalBalance(): Promise<number> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT SUM(balance) as total FROM accounts',
    );
    return result.rows.item(0).total ?? 0;
  },
};
