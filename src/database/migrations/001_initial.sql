-- FinTrack Mobile Database Schema
-- SQLite (react-native-sqlite-storage)

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Contas bancárias
CREATE TABLE IF NOT EXISTS accounts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  type        TEXT    NOT NULL DEFAULT 'checking',
  balance     REAL    NOT NULL DEFAULT 0,
  "limit"     REAL,
  color       TEXT    NOT NULL DEFAULT '#7C3AED',
  bank_name   TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Categorias de transação
CREATE TABLE IF NOT EXISTS categories (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT    NOT NULL,
  color     TEXT    NOT NULL DEFAULT '#7C3AED',
  icon      TEXT,
  is_system INTEGER NOT NULL DEFAULT 0
);

-- Subcategorias
CREATE TABLE IF NOT EXISTS subcategories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL
);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#7C3AED'
);

-- Centros de custo
CREATE TABLE IF NOT EXISTS cost_centers (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#7C3AED'
);

-- Transações (núcleo do app)
CREATE TABLE IF NOT EXISTS transactions (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id         INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id        INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  cost_center_id     INTEGER REFERENCES cost_centers(id) ON DELETE SET NULL,
  date               TEXT    NOT NULL,
  amount             REAL    NOT NULL,
  description        TEXT    NOT NULL,
  type               TEXT    NOT NULL DEFAULT 'expense',
  is_recurring       INTEGER NOT NULL DEFAULT 0,
  tags               TEXT,
  bank_name          TEXT,
  source_notification TEXT,
  created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Índice para consultas por data (mais usada)
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);

-- Orçamentos
CREATE TABLE IF NOT EXISTS budgets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  amount      REAL NOT NULL,
  period      TEXT NOT NULL DEFAULT 'monthly',
  start_date  TEXT NOT NULL,
  end_date    TEXT
);

-- Notificações internas do app
CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT    NOT NULL,
  title      TEXT    NOT NULL,
  message    TEXT    NOT NULL,
  read       INTEGER NOT NULL DEFAULT 0,
  metadata   TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Insights financeiros
CREATE TABLE IF NOT EXISTS insights (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  severity    TEXT NOT NULL DEFAULT 'info',
  metadata    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Pagamentos futuros/recorrentes
CREATE TABLE IF NOT EXISTS upcoming_payments (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  title             TEXT    NOT NULL,
  amount            REAL    NOT NULL,
  due_date          TEXT    NOT NULL,
  is_paid           INTEGER NOT NULL DEFAULT 0,
  recurring_interval TEXT,
  category_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL
);

-- Metas financeiras
CREATE TABLE IF NOT EXISTS goals (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  title          TEXT    NOT NULL,
  target_amount  REAL    NOT NULL,
  current_amount REAL    NOT NULL DEFAULT 0,
  deadline       TEXT,
  category       TEXT    NOT NULL DEFAULT 'custom',
  icon           TEXT,
  color          TEXT    NOT NULL DEFAULT '#7C3AED',
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Configurações do usuário (linha única)
CREATE TABLE IF NOT EXISTS user_settings (
  id                           INTEGER PRIMARY KEY DEFAULT 1,
  theme                        TEXT    NOT NULL DEFAULT 'system',
  currency                     TEXT    NOT NULL DEFAULT 'BRL',
  language                     TEXT    NOT NULL DEFAULT 'pt-BR',
  monthly_income               REAL,
  budget_limit                 REAL,
  onboarding_completed         INTEGER NOT NULL DEFAULT 0,
  notification_permission      INTEGER NOT NULL DEFAULT 0,
  biometric_enabled            INTEGER NOT NULL DEFAULT 0,
  user_name                    TEXT,
  CHECK (id = 1)
);

INSERT OR IGNORE INTO user_settings (id) VALUES (1);

-- Categorias padrão do sistema
INSERT OR IGNORE INTO categories (id, name, color, icon, is_system) VALUES
  (1,  'Alimentação',      '#EF4444', '🍔', 1),
  (2,  'Transporte',       '#F97316', '🚗', 1),
  (3,  'Moradia',          '#EAB308', '🏠', 1),
  (4,  'Saúde',            '#22C55E', '💊', 1),
  (5,  'Educação',         '#3B82F6', '📚', 1),
  (6,  'Lazer',            '#8B5CF6', '🎮', 1),
  (7,  'Vestuário',        '#EC4899', '👕', 1),
  (8,  'Pix',              '#06B6D4', '⚡', 1),
  (9,  'Compra Débito',    '#10B981', '💳', 1),
  (10, 'Compra Crédito',   '#7C3AED', '💳', 1),
  (11, 'Transferência',    '#6366F1', '↔️', 1),
  (12, 'TED/DOC',          '#0EA5E9', '🏦', 1),
  (13, 'Boleto',           '#78716C', '📄', 1),
  (14, 'Saque',            '#DC2626', '💵', 1),
  (15, 'Depósito',         '#16A34A', '📥', 1),
  (16, 'Estorno',          '#059669', '↩️', 1),
  (17, 'Salário',          '#15803D', '💰', 1),
  (18, 'Investimentos',    '#0369A1', '📈', 1),
  (19, 'Outros',           '#6B7280', '📦', 1);
