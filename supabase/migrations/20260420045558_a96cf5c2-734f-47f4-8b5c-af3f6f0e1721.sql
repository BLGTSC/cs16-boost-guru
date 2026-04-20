-- Free server listings (separate from boost servers)
CREATE TABLE public.listed_servers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 27015,
  hostname TEXT,
  current_map TEXT,
  players_current INTEGER NOT NULL DEFAULT 0,
  players_max INTEGER NOT NULL DEFAULT 32,
  game_mod TEXT,
  submitted_by_email TEXT,
  submitted_by_user_id UUID,
  approved BOOLEAN NOT NULL DEFAULT false,
  last_queried_at TIMESTAMP WITH TIME ZONE,
  query_failed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ip, port)
);

ALTER TABLE public.listed_servers ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can view approved listings
CREATE POLICY "Anyone can view approved listings"
ON public.listed_servers
FOR SELECT
TO anon, authenticated
USING (approved = true);

-- Anyone can submit a new listing (will be pending)
CREATE POLICY "Anyone can submit listings"
ON public.listed_servers
FOR INSERT
TO anon, authenticated
WITH CHECK (approved = false);

-- Admins manage everything
CREATE POLICY "Admins manage all listings"
ON public.listed_servers
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all (incl. pending)
CREATE POLICY "Admins view all listings"
ON public.listed_servers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_listed_servers_updated_at
BEFORE UPDATE ON public.listed_servers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_listed_servers_approved ON public.listed_servers(approved);
CREATE INDEX idx_listed_servers_last_queried ON public.listed_servers(last_queried_at);