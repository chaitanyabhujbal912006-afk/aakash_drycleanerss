import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import CommandPalette from "@/components/CommandPalette";
import {
  LayoutDashboard, Package, Truck, Users, Receipt, BarChart3, Settings,
  Search, LogOut, Bell,
} from "lucide-react";
import api from "@/lib/api";

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/orders", label: "Orders", icon: Package },
  { to: "/admin/delivery", label: "Delivery", icon: Truck },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/invoices", label: "Invoices", icon: Receipt },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    const down = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault(); setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    api.get("/notifications").then(({ data }) =>
      setNotifCount(data.filter((n) => !n.read).length)
    ).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Sidebar */}
      <aside className="w-[220px] fixed top-0 left-0 h-screen bg-bg border-r border-line flex flex-col z-40">
        <div className="px-5 py-6 border-b border-line">
          <Logo className="h-9" />
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                data-testid={`nav-${n.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                    isActive
                      ? "bg-brand text-white font-medium"
                      : "text-ink/80 hover:bg-white hover:text-ink"
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {n.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-3 border-t border-line">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center font-medium text-xs">
              {user?.name?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{user?.name}</div>
              <div className="text-[10px] text-muted2 truncate">{user?.email}</div>
            </div>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              data-testid="admin-logout-button"
              className="p-1.5 text-muted2 hover:text-ink"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-[220px] flex-1 min-h-screen">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-bg/85 backdrop-blur border-b border-line">
          <div className="flex items-center justify-between px-8 py-3">
            <button
              onClick={() => setCmdOpen(true)}
              data-testid="cmdk-open-button"
              className="flex items-center gap-2 px-3 py-2 bg-white border border-line rounded-md w-96 text-sm text-muted2 hover:border-brand transition"
            >
              <Search className="w-4 h-4" />
              <span className="flex-1 text-left">Ask ops copilot or jump to…</span>
              <span className="kbd">⌘ K</span>
            </button>
            <div className="flex items-center gap-2">
              <button className="relative p-2 rounded-md hover:bg-white" data-testid="admin-notifications">
                <Bell className="w-4 h-4 text-ink" />
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand text-white text-[9px] font-medium flex items-center justify-center">{notifCount}</span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          <Outlet />
        </div>
      </main>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
