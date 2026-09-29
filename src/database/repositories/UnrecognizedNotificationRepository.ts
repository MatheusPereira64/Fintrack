import { getDatabase } from '../db';
import {
  InsertUnrecognizedNotification,
  UnrecognizedNotification,
  UnrecognizedStatus,
} from '../../models/types';

function rowToItem(r: any): UnrecognizedNotification {
  return {
    id:             r.id,
    packageName:    r.package_name,
    title:          r.title,
    body:           r.body,
    subText:        r.sub_text ?? undefined,
    notificationTs: r.notification_ts,
    status:         r.status as UnrecognizedStatus,
    createdAt:      r.created_at,
  };
}

export const UnrecognizedNotificationRepository = {
  async insert(data: InsertUnrecognizedNotification): Promise<UnrecognizedNotification> {
    const db = await getDatabase();
    const [r] = await db.executeSql(
      `INSERT INTO unrecognized_notifications (
        package_name, title, body, sub_text, notification_ts, status
      ) VALUES (?, ?, ?, ?, ?, 'open')`,
      [
        data.packageName,
        data.title,
        data.body,
        data.subText ?? null,
        data.notificationTs,
      ],
    );
    const created = await this.findById(r.insertId);
    if (!created) throw new Error('Falha ao salvar notificação não reconhecida');
    return created;
  },

  async findById(id: number): Promise<UnrecognizedNotification | null> {
    const db = await getDatabase();
    const [r] = await db.executeSql(
      'SELECT * FROM unrecognized_notifications WHERE id = ? LIMIT 1',
      [id],
    );
    if (r.rows.length === 0) return null;
    return rowToItem(r.rows.item(0));
  },

  async findOpen(limit = 100): Promise<UnrecognizedNotification[]> {
    const db = await getDatabase();
    const [r] = await db.executeSql(
      `SELECT * FROM unrecognized_notifications
       WHERE status = 'open'
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit],
    );
    const rows: UnrecognizedNotification[] = [];
    for (let i = 0; i < r.rows.length; i++) rows.push(rowToItem(r.rows.item(i)));
    return rows;
  },

  async countOpen(): Promise<number> {
    const db = await getDatabase();
    const [r] = await db.executeSql(
      `SELECT COUNT(*) as c FROM unrecognized_notifications WHERE status = 'open'`,
    );
    return r.rows.item(0).c as number;
  },

  async setStatus(id: number, status: UnrecognizedStatus): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      'UPDATE unrecognized_notifications SET status = ? WHERE id = ?',
      [status, id],
    );
  },
};
