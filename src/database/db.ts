import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';

SQLite.enablePromise(true);
SQLite.DEBUG(false);

const DB_NAME = 'fintrack.db';

let dbInstance: SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
  await runMigrations(dbInstance);
  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}

// ─── Migrations ────────────────────────────────────────────────────────────────

async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.executeSql('PRAGMA journal_mode = WAL;');
  await db.executeSql('PRAGMA foreign_keys = ON;');

  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const [res] = await db.executeSql('SELECT MAX(version) as v FROM _migrations');
  const current: number = res.rows.item(0).v ?? 0;

  if (current < 1) { await migration001(db); await db.executeSql('INSERT INTO _migrations (version) VALUES (1)'); }
  if (current < 2) { await migration002(db); await db.executeSql('INSERT INTO _migrations (version) VALUES (2)'); }
  if (current < 3) { await migration003(db); await db.executeSql('INSERT INTO _migrations (version) VALUES (3)'); }
}

// ─── Migration 001 — Schema inicial ───────────────────────────────────────────

async function migration001(db: SQLiteDatabase): Promise<void> {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS accounts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      type       TEXT NOT NULL DEFAULT 'checking',
      balance    REAL NOT NULL DEFAULT 0,
      "limit"    REAL,
      color      TEXT NOT NULL DEFAULT '#7C3AED',
      bank_name  TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT NOT NULL,
      color     TEXT NOT NULL DEFAULT '#7C3AED',
      icon      TEXT,
      is_system INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS subcategories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name        TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS tags (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#7C3AED'
    )`,
    `CREATE TABLE IF NOT EXISTS cost_centers (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#7C3AED'
    )`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id          INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      category_id         INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      cost_center_id      INTEGER REFERENCES cost_centers(id) ON DELETE SET NULL,
      date                TEXT NOT NULL,
      amount              REAL NOT NULL,
      description         TEXT NOT NULL,
      type                TEXT NOT NULL DEFAULT 'expense',
      is_recurring        INTEGER NOT NULL DEFAULT 0,
      tags                TEXT,
      bank_name           TEXT,
      source_notification TEXT,
      created_at          TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_tx_date     ON transactions(date)`,
    `CREATE INDEX IF NOT EXISTS idx_tx_account  ON transactions(account_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id)`,
    `CREATE TABLE IF NOT EXISTS budgets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      amount      REAL NOT NULL,
      spent       REAL NOT NULL DEFAULT 0,
      period      TEXT NOT NULL DEFAULT 'monthly',
      start_date  TEXT NOT NULL,
      end_date    TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      type       TEXT NOT NULL,
      title      TEXT NOT NULL,
      message    TEXT NOT NULL,
      read       INTEGER NOT NULL DEFAULT 0,
      metadata   TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS insights (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      type        TEXT NOT NULL,
      title       TEXT NOT NULL,
      description TEXT NOT NULL,
      severity    TEXT NOT NULL DEFAULT 'info',
      metadata    TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS upcoming_payments (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      title              TEXT NOT NULL,
      amount             REAL NOT NULL,
      due_date           TEXT NOT NULL,
      is_paid            INTEGER NOT NULL DEFAULT 0,
      recurring_interval TEXT,
      category_id        INTEGER REFERENCES categories(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS goals (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      title          TEXT NOT NULL,
      target_amount  REAL NOT NULL,
      current_amount REAL NOT NULL DEFAULT 0,
      deadline       TEXT,
      category       TEXT NOT NULL DEFAULT 'custom',
      icon           TEXT,
      color          TEXT NOT NULL DEFAULT '#7C3AED',
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS user_settings (
      id                      INTEGER PRIMARY KEY DEFAULT 1,
      theme                   TEXT NOT NULL DEFAULT 'system',
      currency                TEXT NOT NULL DEFAULT 'BRL',
      language                TEXT NOT NULL DEFAULT 'pt-BR',
      monthly_income          REAL,
      budget_limit            REAL,
      onboarding_completed    INTEGER NOT NULL DEFAULT 0,
      notification_permission INTEGER NOT NULL DEFAULT 0,
      biometric_enabled       INTEGER NOT NULL DEFAULT 0,
      user_name               TEXT
    )`,
    `INSERT OR IGNORE INTO user_settings (id) VALUES (1)`,
    // 30 categorias padrão do sistema
    `INSERT OR IGNORE INTO categories (id, name, color, icon, is_system) VALUES
      (1,'Alimentação','#EF4444','🍔',1),(2,'Mercado','#F97316','🛒',1),
      (3,'Restaurante','#FB923C','🍽️',1),(4,'Delivery','#FBBF24','🛵',1),
      (5,'Transporte','#84CC16','🚗',1),(6,'Combustível','#22C55E','⛽',1),
      (7,'Uber/99','#10B981','🚕',1),(8,'Moradia','#14B8A6','🏠',1),
      (9,'Aluguel','#06B6D4','🏡',1),(10,'Contas','#0EA5E9','💡',1),
      (11,'Saúde','#3B82F6','💊',1),(12,'Farmácia','#6366F1','💉',1),
      (13,'Médico','#8B5CF6','🩺',1),(14,'Educação','#A855F7','📚',1),
      (15,'Cursos','#D946EF','🎓',1),(16,'Lazer','#EC4899','🎮',1),
      (17,'Streaming','#F43F5E','📺',1),(18,'Vestuário','#E11D48','👕',1),
      (19,'Pix','#0891B2','⚡',1),(20,'Transferência','#0284C7','↔',1),
      (21,'TED/DOC','#0369A1','🏦',1),(22,'Boleto','#78716C','📄',1),
      (23,'Compra Débito','#57534E','💳',1),(24,'Compra Crédito','#44403C','💳',1),
      (25,'Saque','#DC2626','💵',1),(26,'Depósito','#16A34A','📥',1),
      (27,'Salário','#15803D','💰',1),(28,'Estorno','#059669','↩',1),
      (29,'Investimentos','#0369A1','📈',1),(30,'Outros','#6B7280','📦',1)`,
  ];
  for (const sql of stmts) await db.executeSql(sql);
}

// ─── Migration 002 — Bancos e Logs ────────────────────────────────────────────

async function migration002(db: SQLiteDatabase): Promise<void> {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS banks (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      package_name TEXT NOT NULL UNIQUE,
      primary_color TEXT NOT NULL DEFAULT '#7C3AED',
      logo_emoji   TEXT,
      is_active    INTEGER NOT NULL DEFAULT 1,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      level      TEXT NOT NULL DEFAULT 'info',
      tag        TEXT NOT NULL,
      message    TEXT NOT NULL,
      metadata   TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at)`,
    // Bancos padrão
    `INSERT OR IGNORE INTO banks (name, package_name, primary_color, logo_emoji) VALUES
      ('Nubank','com.nubank.nubank','#820AD1','💜'),
      ('Banco Inter','br.com.intermedium','#FF6B00','🟠'),
      ('Banco Inter','com.bancointer.banking','#FF6B00','🟠'),
      ('Itaú','com.itau','#EC7000','🔵'),
      ('Bradesco','com.bradesco','#CC0000','❤'),
      ('Banco do Brasil','com.bb.android','#FFD700','💛'),
      ('Santander','com.santander.app','#EC0000','🔴'),
      ('C6 Bank','br.com.c6bank.app','#1C1C1C','⚫'),
      ('Caixa','br.gov.caixa.internet.smartphones','#006FB4','🔷'),
      ('Mercado Pago','com.mercadopago.wallet','#009EE3','💙'),
      ('PicPay','com.picpay','#21C25E','💚'),
      ('Next','br.com.bradesco.next','#00E5B4','🟢'),
      ('PagBank','br.com.uol.ps.myaccount','#03C759','💳'),
      ('Neon','br.com.neon.app','#00CFBD','🩵')`,
    // Coluna bank_name em transactions (se não existir)
    `CREATE INDEX IF NOT EXISTS idx_tx_bank ON transactions(bank_name)`,
  ];
  for (const sql of stmts) await db.executeSql(sql);
}

// ─── Migration 003 — Saldo informado ────────────────────────────────────────

async function migration003(db: SQLiteDatabase): Promise<void> {
  try {
    await db.executeSql(`ALTER TABLE accounts ADD COLUMN informed_balance REAL`);
  } catch {
    // coluna já existe
  }
  await db.executeSql(`UPDATE accounts SET informed_balance = balance WHERE informed_balance IS NULL`);
}
