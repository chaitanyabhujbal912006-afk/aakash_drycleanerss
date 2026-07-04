import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { Home, ShoppingBag, MessageCircle, Receipt, ListChecks, LogOut } from "lucide-react";

export default function MobileLayout({ audience = "client" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const tabs =
    audience === "client"
      ? [
          { to: "/app", label: "Home", icon: Home, end: true },
          { to: "/app/order", label: "Order", icon: ShoppingBag },
          { to: "/app/invoices", label: "Bills", icon: Receipt },
          { to: "/app/chat", label: "Support", icon: MessageCircle },
        ]
      : [
          { to: "/delivery", label: "Tasks", icon: ListChecks, end: true },
        ];

  return (
    <div className="min-h-screen bg-bg font-mobile">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-bg/85 backdrop-blur border-b border-line">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-5 py-3">
          <Link to={audience === "client" ? "/app" : "/delivery"} className="flex items-center gap-2">
            <Logo variant="mark" className="w-8 h-8" />
            <div>
              <div className="font-display text-[13px] font-extrabold leading-none">AAKASH</div>
              <div className="text-[8px] tracking-[0.28em] text-muted2 mt-0.5">DRYCLEANERS</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium">{user?.name}</div>
              <div className="text-[10px] text-muted2">{user?.phone}</div>
            </div>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              data-testid="mobile-logout-button"
              className="p-2 text-muted2 hover:text-ink"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 pt-4 pb-28">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 border-t border-line bg-white/95 backdrop-blur z-40">
        <div className="max-w-2xl mx-auto grid grid-cols-4 sm:grid-cols-4">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                data-testid={`bottom-tab-${t.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-3 gap-1 text-[11px] transition ${
                    isActive ? "text-brand font-semibold" : "text-muted2"
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {t.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
