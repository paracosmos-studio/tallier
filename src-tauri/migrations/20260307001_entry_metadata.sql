ALTER TABLE entries ADD COLUMN "created_at" TEXT NOT NULL DEFAULT '';
ALTER TABLE entries ADD COLUMN "updated_at" TEXT;
ALTER TABLE entries ADD COLUMN "updated_reason" TEXT;
