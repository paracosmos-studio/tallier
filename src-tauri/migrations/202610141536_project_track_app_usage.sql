-- SPDX-License-Identifier: AGPL-3.0-only
-- SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

ALTER TABLE projects ADD COLUMN "track_app_usage" INTEGER NOT NULL DEFAULT 0;

-- rows seeded by the initial schema
UPDATE projects SET "track_app_usage" = 1 WHERE "id" IN (1, 2, 3);
