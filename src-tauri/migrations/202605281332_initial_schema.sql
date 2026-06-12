CREATE TABLE IF NOT EXISTS timers (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "status" TEXT NOT NULL CHECK("status" IN ('running', 'stopped')),
    "date" DATE NOT NULL,
    "start" TIME NOT NULL,
    "end" TIME,
    "total" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "hourly_rate" REAL,
    "currency" TEXT,
    "max_daily" INTEGER,
    "max_daily_alert" INTEGER,
    "max_weekly" INTEGER,
    "max_weekly_alert" INTEGER,
    "max_daily_enabled" INTEGER NOT NULL DEFAULT 0,
    "max_weekly_enabled" INTEGER NOT NULL DEFAULT 0,
    UNIQUE("id", "position")
);

INSERT INTO projects ("position", "name") VALUES
    (0, 'Personal'),
    (1, 'Work'),
    (2, 'Study');

CREATE TABLE IF NOT EXISTS entries (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "timer_id" INTEGER NOT NULL,
    "project_id" INTEGER NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "is_billable" INTEGER NOT NULL DEFAULT 1,
    "created_at" TEXT NOT NULL DEFAULT '',
    "updated_at" TEXT,
    "updated_reason" TEXT,
    FOREIGN KEY ("timer_id") REFERENCES timers("id"),
    FOREIGN KEY ("project_id") REFERENCES projects("id")
);

CREATE TABLE IF NOT EXISTS settings (
    "key" TEXT PRIMARY KEY,
    "value" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "contact_name" TEXT NOT NULL,
    "company_name" TEXT,
    "mailing_address" TEXT,
    "avatar" TEXT,
    "emails" TEXT,
    "phones" TEXT,
    "websites" TEXT,
    "invoice_id_prefix" TEXT
);
