import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/contexts/AuthContext";
import { SiteContentProvider } from "@/hooks/useSiteContent";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Toaster } from "sonner";
import { Link } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-deep px-4 pt-20">
      <div className="max-w-md text-center">
        <h1 className="font-heading text-8xl font-bold text-primary glow-text">404</h1>
        <h2 className="mt-4 font-heading text-2xl font-semibold">Pagină inexistentă</h2>
        <p className="mt-2 text-sm text-text-dim">
          Pagina pe care o cauți nu există sau a fost mutată.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded bg-primary px-5 py-2.5 font-heading font-bold uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary/90"
          >
            Înapoi acasă
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Cs16Radar — Radar Live Servere CS 1.6 România" },
      { name: "description", content: "Listare gratuită + boost premium pentru servere Counter-Strike 1.6. Radar live, jucători reali, activare instantă." },
      { name: "author", content: "Cs16Radar" },
      { property: "og:title", content: "Cs16Radar — Radar CS 1.6 România" },
      { property: "og:description", content: "Listează gratuit serverul tău CS 1.6 sau alege un boost premium." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Exo+2:wght@300;400;500;600;700&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <SiteContentProvider>
      <AuthProvider>
        <Navbar />
        <main className="pt-16 min-h-screen">
          <Outlet />
        </main>
        <Footer />
        <Toaster theme="dark" position="top-right" richColors />
      </AuthProvider>
    </SiteContentProvider>
  );
}
