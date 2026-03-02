import { useAuth } from "@/contexts/AuthContext";
import { NavLink, useLocation } from "react-router-dom";
import { Activity, BarChart3, ClipboardList, LayoutDashboard, LogOut, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/test-entry", icon: ClipboardList, label: "Test Entry" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/profile", icon: Settings, label: "Profile" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { signOut, role, user } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border p-6">
          <div className="gradient-orange flex h-10 w-10 items-center justify-center rounded-xl">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">PerformLab</span>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
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
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
