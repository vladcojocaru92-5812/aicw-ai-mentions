-- Free-score requests from the landing form. Concierge flow: new -> scanned -> sent.
CREATE TABLE requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand TEXT NOT NULL,
  domain TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'scanned', 'sent')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
