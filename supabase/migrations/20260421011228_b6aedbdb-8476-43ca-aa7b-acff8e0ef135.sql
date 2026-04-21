CREATE TABLE public.nav_buttons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  external BOOLEAN NOT NULL DEFAULT false,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nav_buttons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view nav buttons"
  ON public.nav_buttons FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert nav buttons"
  ON public.nav_buttons FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update nav buttons"
  ON public.nav_buttons FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete nav buttons"
  ON public.nav_buttons FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_nav_buttons_updated_at
  BEFORE UPDATE ON public.nav_buttons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.nav_buttons;