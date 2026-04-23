# Deploy pe cPanel (hosting Apache clasic)

Această aplicație rulează ca **SPA static** (HTML + JS + CSS). Backend-ul (autentificare,
bază de date, scrape GameTracker, scrape stats) rămâne pe **Lovable Cloud** și e apelat
prin HTTPS din browser — nu ai nevoie de Node.js sau PHP pe cPanel.

## 1. Build local

```bash
npm install
npm run build
```

Output-ul ajunge în `dist/` (sau `.output/public/` — verifică ce folder s-a creat).
Folosește folderul care conține `index.html` + folder `assets/`.

## 2. Upload pe cPanel

1. Intră în **cPanel → File Manager → public_html**.
2. Șterge conținutul existent (sau pune-l într-un subfolder).
3. Urcă **tot conținutul** folderului de build (NU folderul în sine — fișierele direct):
   - `index.html`
   - `assets/` (folder)
   - `.htaccess` ← **critic**, asigură-te că File Manager arată fișiere ascunse
     (Settings → Show Hidden Files)
   - orice alt asset (favicon, robots.txt etc.)
4. Verifică că `.htaccess` e prezent în root-ul `public_html`.

## 3. Test

Deschide `https://domeniul-tau.ro/` — ar trebui să vezi homepage-ul.
Testează un deep link direct: `https://domeniul-tau.ro/statistici` — trebuie să încarce,
nu să dea 404. Dacă dă 404, `.htaccess` lipsește sau `mod_rewrite` nu e activat
(majoritatea hosturilor cPanel îl au activat default).

## 4. Backend (rămâne pe Lovable Cloud)

Edge functions deja deployate:
- `gametracker-query` — scrape GameTracker + Steam API
- `stats-scrape` — scrape stats.cs16radar.com

URL-ul lor e `https://queawdgpkfvcspcgyrgt.supabase.co/functions/v1/...` și sunt apelate
automat din SPA. Nu ai ce configura pe cPanel pentru ele.

## 5. Variabile de mediu la build

Înainte de `npm run build`, asigură-te că ai un `.env` cu:

```
VITE_SUPABASE_URL=https://queawdgpkfvcspcgyrgt.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_SUPABASE_PROJECT_ID=queawdgpkfvcspcgyrgt
```

(Aceste valori sunt deja în `.env`-ul proiectului — descarcă-l odată cu sursele.)

## Note

- **Nu rula `npm install` pe cPanel.** Build-ul se face local sau în CI; pe cPanel urci
  doar fișierele statice.
- **HTTPS**: activează SSL gratuit (AutoSSL / Let's Encrypt) din cPanel pentru ca apelurile
  către Supabase (HTTPS) să nu fie blocate de mixed content.
- Dacă schimbi codul în Lovable, repetă build + upload.
