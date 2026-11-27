-- Which offer the visitor clicked before filling the form. Payments are not live, so this only labels the request.
ALTER TABLE requests ADD COLUMN plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'repair', 'beat'));
