CREATE TABLE IF NOT EXISTS clients (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "contact_name" TEXT NOT NULL,
    "company_name" TEXT,
    "mailing_address" TEXT,
    "emails" TEXT,
    "phones" TEXT,
    "websites" TEXT,
    "invoice_id_prefix" TEXT
);
