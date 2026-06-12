import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, Target, Users, Settings as SettingsIcon, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpsertMe } from "@workspace/api-client-react";
import { useEffect, useRef } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/log", label: "Log", icon: Activity },
  { href: "/insights", label: "Insights", icon: Zap },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/community", label: "Community", icon: Users },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const upsertMe = useUpsertMe();
  const upserted = useRef(false);

  useEffect(() => {
    if (!upserted.current) {
      upserted.current = true;
      upsertMe.mutate({
        data: {
          email: "demo@example.com",
          displayName: "Demo User",
          region: "global",
        },
      });
    }
  }, [upsertMe]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground md:flex-row">
      <aside
        className="hidden w-64 flex-col border-r border-border bg-card md:flex"
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center px-6 border-b border-border">
          <div
            className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary"
            role="banner"
          >
            <Zap className="h-6 w-6" aria-hidden="true" />
            <span>CarbonPulse</span>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-4" role="navigation" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="block">
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                  role="menuitem"
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <Link href="/settings" className="block">
            <div
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                location === "/settings"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
              role="menuitem"
              aria-current={location === "/settings" ? "page" : undefined}
            >
              <SettingsIcon className="h-5 w-5" aria-hidden="true" />
              Settings
            </div>
          </Link>
        </div>
      </aside>

      <main className="flex-1 pb-16 md:pb-0" id="main-content">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
        >
          Skip to main content
        </a>
        <div className="mx-auto max-w-5xl p-4 md:p-8">{children}</div>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t border-border bg-card/80 backdrop-blur-lg md:hidden"
        role="navigation"
        aria-label="Mobile navigation"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <div
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
                role="menuitem"
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
