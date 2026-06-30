/**
 * Serviço de logging centralizado.
 * Grava logs em memória e no SQLite para auditoria e debug.
 * Segue princípio de responsabilidade única (SRP).
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  tag: string;
  message: string;
  metadata?: unknown;
  timestamp: string;
}

// Fila em memória para não bloquear a UI
const LOG_QUEUE: LogEntry[] = [];
let isFlushingLogs = false;

async function flushToDatabase(): Promise<void> {
  if (isFlushingLogs || LOG_QUEUE.length === 0) return;
  isFlushingLogs = true;

  try {
    const { getDatabase } = require('../database/db');
    const db = await getDatabase();
    const batch = LOG_QUEUE.splice(0, 50); // processa até 50 por vez

    for (const entry of batch) {
      await db.executeSql(
        `INSERT INTO logs (level, tag, message, metadata, created_at) VALUES (?, ?, ?, ?, ?)`,
        [
          entry.level,
          entry.tag,
          entry.message,
          entry.metadata ? JSON.stringify(entry.metadata) : null,
          entry.timestamp,
        ],
      );
    }
  } catch {
    // Silenciar erros de log para não criar loops
  } finally {
    isFlushingLogs = false;
  }
}

function log(level: LogLevel, tag: string, message: string, metadata?: unknown): void {
  const entry: LogEntry = {
    level,
    tag,
    message,
    metadata,
    timestamp: new Date().toISOString(),
  };

  if (__DEV__) {
    const prefix = { debug: '🔍', info: 'ℹ️', warn: '⚠️', error: '❌' }[level];
    console.log(`${prefix} [${tag}] ${message}`, metadata ?? '');
  }

  // Não persiste debug no banco (muito verboso)
  if (level !== 'debug') {
    LOG_QUEUE.push(entry);
    // Flush assíncrono sem bloquear
    setTimeout(flushToDatabase, 500);
  }
}

export const Logger = {
  debug: (tag: string, msg: string, meta?: unknown) => log('debug', tag, msg, meta),
  info:  (tag: string, msg: string, meta?: unknown) => log('info',  tag, msg, meta),
  warn:  (tag: string, msg: string, meta?: unknown) => log('warn',  tag, msg, meta),
  error: (tag: string, msg: string, meta?: unknown) => log('error', tag, msg, meta),

  async getRecentLogs(limit = 100): Promise<LogEntry[]> {
    try {
      const { getDatabase } = require('../database/db');
      const db = await getDatabase();
      const [result] = await db.executeSql(
        'SELECT * FROM logs ORDER BY created_at DESC LIMIT ?',
        [limit],
      );
      const rows: LogEntry[] = [];
      for (let i = 0; i < result.rows.length; i++) {
        const r = result.rows.item(i);
        rows.push({
          level:     r.level,
          tag:       r.tag,
          message:   r.message,
          metadata:  r.metadata ? JSON.parse(r.metadata) : undefined,
          timestamp: r.created_at,
        });
      }
      return rows;
    } catch {
      return [];
    }
  },

  async clearLogs(): Promise<void> {
    const { getDatabase } = require('../database/db');
    const db = await getDatabase();
    await db.executeSql('DELETE FROM logs');
  },
};
