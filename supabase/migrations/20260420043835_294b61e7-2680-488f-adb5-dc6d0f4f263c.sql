-- 1. Site content table (key/value for editable site copy)
CREATE TABLE IF NOT EXISTS public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site content"
  ON public.site_content FOR SELECT
  USING (true);

CREATE POLICY "Admins manage site content"
  ON public.site_content FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_site_content_updated_at
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Default content
INSERT INTO public.site_content (key, value, category, label) VALUES
  ('brand_name', 'Cs16Radar', 'brand', 'Numele brandului'),
  ('brand_tagline', 'Radar live pentru servere CS 1.6', 'brand', 'Slogan brand'),
  ('hero_badge', 'ONLINE • Platformă Activă 24/7', 'hero', 'Badge hero'),
  ('hero_title_1', 'Boost-ează', 'hero', 'Titlu hero — linia 1'),
  ('hero_title_2', 'serverul tău', 'hero', 'Titlu hero — linia 2'),
  ('hero_title_3', 'CS 1.6', 'hero', 'Titlu hero — linia 3 (accent)'),
  ('hero_subtitle', 'Jucători reali, masterserver propriu, listare gratuită. Cea mai rapidă platformă din România.', 'hero', 'Subtitlu hero'),
  ('hero_cta_primary', '🚀 Adaugă Serverul Tău', 'hero', 'Buton principal hero'),
  ('hero_cta_secondary', '👁 Vezi Pachetele', 'hero', 'Buton secundar hero'),
  ('contact_email', 'contact@cs16radar.ro', 'contact', 'Email contact'),
  ('contact_discord', 'Discord', 'contact', 'Discord'),
  ('contact_facebook', 'Facebook', 'contact', 'Facebook'),
  ('footer_about', 'Platforma #1 de listare și boost pentru servere Counter-Strike 1.6 din România. Listare gratuită + boost premium.', 'footer', 'Despre footer'),
  ('footer_copyright', '© 2025 Cs16Radar — Toate drepturile rezervate', 'footer', 'Copyright'),
  ('meta_title', 'Cs16Radar — Radar Live Servere CS 1.6 România', 'seo', 'Title SEO global'),
  ('meta_description', 'Listare gratuită + boost premium pentru servere Counter-Strike 1.6. Radar live, jucători reali, activare instantă.', 'seo', 'Description SEO global')
ON CONFLICT (key) DO NOTHING;

-- 3. Free package (listing gratuit)
INSERT INTO public.packages (slug, name, price, duration_days, max_slots, color, featured, sort_order, active, features)
VALUES (
  'free',
  'FREE',
  0,
  7,
  10,
  '#10b981',
  false,
  0,
  true,
  '["Listare gratuită 7 zile", "Server vizibil pe Cs16Radar", "Pagină publică /server", "Reînnoire gratuită oricând"]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
