-- Receipt Scanner persistence schema.
-- Postgres / Supabase. Mirrors lib/schema.ts (the Zod contract).
-- Wire lib/persist.ts to insert into these tables.

create table if not exists receipts (
  id              uuid primary key default gen_random_uuid(),
  vendor          text,
  vendor_address  text,
  receipt_date    date,
  receipt_time    time,
  currency        text,
  subtotal        numeric(12, 2),
  tax             numeric(12, 2),
  tip             numeric(12, 2),
  total           numeric(12, 2),
  payment_method  text,
  notes           text,
  raw             jsonb not null,
  created_at      timestamptz not null default now()
);

create table if not exists receipt_items (
  id           uuid primary key default gen_random_uuid(),
  receipt_id   uuid not null references receipts (id) on delete cascade,
  description  text not null,
  quantity     numeric(12, 3),
  unit_price   numeric(12, 2),
  total        numeric(12, 2)
);

create index if not exists receipt_items_receipt_id_idx on receipt_items (receipt_id);
create index if not exists receipts_date_idx on receipts (receipt_date);
create index if not exists receipts_vendor_idx on receipts (vendor);
