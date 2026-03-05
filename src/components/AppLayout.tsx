import { useAuth } from "@/contexts/AuthContext";
import { NavLink, useLocation } from "react-router-dom";
import { Activity, BarChart3, ClipboardList, LayoutDashboard, LogOut, Menu, Settings, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/test-entry", icon: ClipboardList, label: "Test Entry" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/profile", icon: Settings, label: "Profile" },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut, role, user } = useAuth();
  const location = useLocation();

  return (
    <>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}
        {role === "coach" && (
          <NavLink
            to="/team"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
              location.pathname === "/team"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Users className="h-5 w-5" />
            Team
          </NavLink>
        )}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3 rounded-xl bg-secondary px-4 py-2">
          <p className="truncate text-sm text-foreground">{user?.email}</p>
          <p className="text-xs capitalize text-muted-foreground">{role || "user"}</p>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        {/* Fixed top header */}
        <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4">
          <div className="flex items-center gap-2">
            <div className="gradient-orange flex h-8 w-8 items-center justify-center rounded-lg">
              <Activity className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold text-foreground">PerformLab</span>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-secondary"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Overlay */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/60 transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* Sliding drawer */}
        <aside
          className={cn(
            "fixed right-0 top-0 z-50 flex h-full w-72 flex-col border-l border-border bg-card transition-transform duration-300 ease-in-out",
            drawerOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex items-center justify-between border-b border-border p-4">
            <span className="text-base font-bold text-foreground">Menu</span>
            <button
              onClick={() => setDrawerOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <SidebarContent onNavigate={() => setDrawerOpen(false)} />
        </aside>

        {/* Main content */}
        <main className="mt-14 flex-1 px-4 py-6">
          {children}
        </main>
      </div>
    );
  }

  // Desktop layout (unchanged)
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border p-6">
          <div className="gradient-orange flex h-10 w-10 items-center justify-center rounded-xl">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">PerformLab</span>
        </div>
        <SidebarContent />
      </aside>
      <main className="ml-64 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
