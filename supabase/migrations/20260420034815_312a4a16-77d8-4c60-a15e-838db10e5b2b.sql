-- Add map column for current map info
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS current_map text DEFAULT 'de_dust2';
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS hostname text;