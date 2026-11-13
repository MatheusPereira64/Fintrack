/**
 * Backup completo do FinTrack: todas as tabelas do SQLite (contas, transações,
 * categorias, metas, orçamentos, padrões ensinados...) e as preferências.
 * Usado para trocar de aparelho ou reinstalar sem perder nada.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { getDatabase } from '../database/db';
import { toLocalISODate } from '../utils/date';
import appPackage from '../../package.json';

export const BACKUP_APP = 'FinTrack';
export const BACKUP_FORMAT = 1;

/** Tabelas internas ou que não fazem sentido levar para outro aparelho. */
const SKIPPED_TABLES = new Set(['_migrations', 'logs', 'sqlite_sequence', 'android_metadata']);
const SETTINGS_KEY = '@fintrack:settings';
/** Preferências que dependem do aparelho e não vêm do backup. */
const DEVICE_SETTINGS = ['notificationPermissionGranted', 'onboardingCompleted'];

type Row = Record<string, unknown>;

export interface BackupFile {
  app:           typeof BACKUP_APP;
  format:        number;
  appVersion:    string;
  schemaVersion: number;
  createdAt:     string;
  settings:      Record<string, unknown> | null;
  tables:        Record<string, Row[]>;
}

export interface RestoreSummary {
  tables: number;
  rows:   number;
}

export class BackupError extends Error {
  constructor(public readonly code: 'invalid' | 'newer', message: string) {
    super(message);
  }
}

type Db = Awaited<ReturnType<typeof getDatabase>>;

function rowsOf(result: { rows: { length: number; item(i: number): Row } }): Row[] {
  const out: Row[] = [];
  for (let i = 0; i < result.rows.length; i++) out.push(result.rows.item(i));
  return out;
}

async function userTables(db: Db): Promise<string[]> {
  const [res] = await db.executeSql(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  return rowsOf(res).map(r => String(r.name)).filter(name => !SKIPPED_TABLES.has(name));
}

async function schemaVersion(db: Db): Promise<number> {
  const [res] = await db.executeSql('SELECT MAX(version) AS v FROM _migrations');
  return Number(res.rows.item(0)?.v ?? 0);
}

async function tableColumns(db: Db, table: string): Promise<string[]> {
  const [res] = await db.executeSql(`PRAGMA table_info("${table}")`);
  return rowsOf(res).map(r => String(r.name));
}

export const BackupService = {
  async build(): Promise<BackupFile> {
    const db = await getDatabase();
    const tables: Record<string, Row[]> = {};
    for (const table of await userTables(db)) {
      const [res] = await db.executeSql(`SELECT * FROM "${table}"`);
      tables[table] = rowsOf(res);
    }
    const rawSettings = await AsyncStorage.getItem(SETTINGS_KEY);
    return {
      app:           BACKUP_APP,
      format:        BACKUP_FORMAT,
      appVersion:    appPackage.version,
      schemaVersion: await schemaVersion(db),
      createdAt:     new Date().toISOString(),
      settings:      rawSettings ? JSON.parse(rawSettings) : null,
      tables,
    };
  },

  /** Grava o backup em arquivo e devolve o caminho. */
  async writeToFile(): Promise<string> {
    const backup = await this.build();
    const path = `${RNFS.CachesDirectoryPath}/FinTrack-backup-${toLocalISODate()}.json`;
    await RNFS.writeFile(path, JSON.stringify(backup), 'utf8');
    return path;
  },

  parse(content: string): BackupFile {
    let data: Partial<BackupFile>;
    try {
      data = JSON.parse(content);
    } catch {
      throw new BackupError('invalid', 'Arquivo não é um backup do FinTrack');
    }
    if (data?.app !== BACKUP_APP || typeof data.tables !== 'object' || data.tables === null) {
      throw new BackupError('invalid', 'Arquivo não é um backup do FinTrack');
    }
    if ((data.format ?? 0) > BACKUP_FORMAT) {
      throw new BackupError('newer', 'Backup feito por uma versão mais nova do FinTrack');
    }
    return data as BackupFile;
  },

  /**
   * Substitui todos os dados pelos do backup, numa única transação: ou entra
   * tudo, ou nada muda. Colunas que não existem mais no app são ignoradas.
   */
  async restore(backup: BackupFile): Promise<RestoreSummary> {
    const db = await getDatabase();
    if (backup.schemaVersion > await schemaVersion(db)) {
      throw new BackupError('newer', 'Backup feito por uma versão mais nova do FinTrack');
    }

    const current = await userTables(db);
    const plan: Array<{ table: string; columns: string[]; rows: Row[] }> = [];
    for (const table of current) {
      const rows = backup.tables[table];
      if (!Array.isArray(rows)) continue;
      const columns = await tableColumns(db, table);
      plan.push({ table, columns, rows });
    }

    await db.executeSql('PRAGMA foreign_keys = OFF');
    try {
      await db.transaction(tx => {
        for (const { table, columns, rows } of plan) {
          tx.executeSql(`DELETE FROM "${table}"`);
          for (const row of rows) {
            const cols = columns.filter(c => c in row);
            if (cols.length === 0) continue;
            const quoted = cols.map(c => `"${c}"`).join(', ');
            const marks = cols.map(() => '?').join(', ');
            tx.executeSql(
              `INSERT INTO "${table}" (${quoted}) VALUES (${marks})`,
              cols.map(c => row[c] as never),
            );
          }
        }
      });
    } finally {
      await db.executeSql('PRAGMA foreign_keys = ON');
    }

    if (backup.settings) {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      const local = raw ? JSON.parse(raw) : {};
      const restored = { ...backup.settings };
      for (const key of DEVICE_SETTINGS) {
        if (key in local) restored[key] = local[key];
        else delete restored[key];
      }
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...local, ...restored }));
    }

    return {
      tables: plan.length,
      rows:   plan.reduce((sum, p) => sum + p.rows.length, 0),
    };
  },
};
