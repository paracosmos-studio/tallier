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
    UNIQUE("id", "position")
);

CREATE TABLE IF NOT EXISTS entries (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "timer_id" INTEGER NOT NULL,
    "project_id" INTEGER NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    FOREIGN KEY ("timer_id") REFERENCES timers("id"),
    FOREIGN KEY ("project_id") REFERENCES projects("id")
);

CREATE TABLE IF NOT EXISTS settings (
    "key" TEXT PRIMARY KEY,
    "value" TEXT NOT NULL
);