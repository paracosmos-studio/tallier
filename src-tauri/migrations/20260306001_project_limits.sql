ALTER TABLE projects ADD COLUMN "max_daily" INTEGER;
ALTER TABLE projects ADD COLUMN "max_daily_alert" INTEGER;
ALTER TABLE projects ADD COLUMN "max_weekly" INTEGER;
ALTER TABLE projects ADD COLUMN "max_weekly_alert" INTEGER;
ALTER TABLE projects ADD COLUMN "max_daily_enabled" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN "max_weekly_enabled" INTEGER NOT NULL DEFAULT 0;
