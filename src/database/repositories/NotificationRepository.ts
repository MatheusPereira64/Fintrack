import { getDatabase } from '../db';
import { AppNotification, InsertAppNotification } from '../../models/types';

function rowToNotif(r: any): AppNotification {
  return {
    id:        r.id,
    type:      r.type,
    title:     r.title,
    message:   r.message,
    read:      r.read === 1,
    metadata:  r.metadata ?? undefined,
    createdAt: r.created_at,
  };
}

export const NotificationRepository = {
  async findAll(limit = 100): Promise<AppNotification[]> {
    const db = await getDatabase();
    const [r] = await db.executeSql(
      'SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?', [limit],
    );
    const rows: AppNotification[] = [];
    for (let i = 0; i < r.rows.length; i++) rows.push(rowToNotif(r.rows.item(i)));
    return rows;
  },

  async countUnread(): Promise<number> {
    const db = await getDatabase();
    const [r] = await db.executeSql('SELECT COUNT(*) as c FROM notifications WHERE read = 0');
    return r.rows.item(0).c;
  },

  async insert(data: InsertAppNotification): Promise<number> {
    const db = await getDatabase();
    const [r] = await db.executeSql(
      `INSERT INTO notifications (type, title, message, metadata) VALUES (?, ?, ?, ?)`,
      [data.type, data.title, data.message, data.metadata ? JSON.stringify(data.metadata) : null],
    );
    return r.insertId;
  },

  async markRead(id: number): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('UPDATE notifications SET read = 1 WHERE id = ?', [id]);
  },

  async markAllRead(): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('UPDATE notifications SET read = 1');
  },

  async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM notifications WHERE id = ?', [id]);
  },

  async deleteAll(): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM notifications');
  },
};
