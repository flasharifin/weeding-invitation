-- Skema database undangan (PostgreSQL / Neon).
-- Aman dijalankan berulang kali (IF NOT EXISTS). Jalankan lewat: npm run db:migrate
-- atau tempel langsung di Neon SQL Editor.

CREATE TABLE IF NOT EXISTS guests (
  id             text PRIMARY KEY,
  name           text        NOT NULL,
  phone          text,
  pax            integer     NOT NULL DEFAULT 1 CHECK (pax BETWEEN 1 AND 20),
  token          text        NOT NULL UNIQUE,            -- isi QR & bagian dari link /i/<token>
  rsvp           text        CHECK (rsvp IN ('hadir', 'tidak')),
  checked_in_at  timestamptz,                            -- NULL = QR belum dipakai
  checked_in_by  text,                                   -- 'admin' / 'staff'
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wishes (
  id          text PRIMARY KEY,
  guest_id    text        NOT NULL UNIQUE                -- satu ucapan per tamu
              REFERENCES guests (id) ON DELETE CASCADE,  -- hapus tamu = hapus ucapannya
  name        text        NOT NULL,
  message     text        NOT NULL CHECK (char_length(message) <= 300),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guests_created_at_idx ON guests (created_at DESC);
CREATE INDEX IF NOT EXISTS wishes_created_at_idx ON wishes (created_at DESC);

CREATE TABLE IF NOT EXISTS gift_confirmations (
  id text PRIMARY KEY,
  guest_id text REFERENCES guests(id) ON DELETE SET NULL,
  guest_name text NOT NULL,
  sender text NOT NULL CHECK (char_length(sender) BETWEEN 1 AND 120),
  kind text NOT NULL CHECK (kind IN ('money', 'parcel')),
  destination text NOT NULL,
  amount bigint,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'money' AND amount IS NOT NULL AND amount BETWEEN 1 AND 999999999999 AND description IS NULL)
    OR (kind = 'parcel' AND amount IS NULL AND char_length(description) BETWEEN 1 AND 250 AND description IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS memory_photos (
  id text PRIMARY KEY,
  guest_id text NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  slot smallint NOT NULL CHECK (slot BETWEEN 1 AND 10),
  image bytea CHECK (octet_length(image) BETWEEN 1 AND 1048576),
  object_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guest_id, slot)
);

-- Upgrade existing photo tables without removing legacy photos.
ALTER TABLE memory_photos ADD COLUMN IF NOT EXISTS object_key text;
ALTER TABLE memory_photos ALTER COLUMN image DROP NOT NULL;
