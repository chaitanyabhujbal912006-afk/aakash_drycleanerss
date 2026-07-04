import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { rupees } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, ShoppingBag, Truck, ShieldCheck, MessageCircleQuestion } from "lucide-react";

export default function ClientHome() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => { api.get("/orders").then(({ data }) => setOrders(data)); }, []);

  const active = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));

  return (
    <div className="space-y-6" data-testid="client-home">
      <div>
        <div className="overline">Namaste, {user?.name?.split(" ")[0]}</div>
        <h1 className="font-display text-3xl font-extrabold mt-1 leading-tight">
          Fresh laundry,<br/>at your doorstep.
        </h1>
      </div>

      {/* Hero card */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-brand text-white p-6">
        <div className="relative z-10 max-w-[62%]">
          <div className="text-xs uppercase tracking-[0.2em] text-white/70">Free pickup · 24h turnaround</div>
          <h2 className="font-display text-2xl font-extrabold mt-2 leading-tight">Book your first order today.</h2>
          <p className="text-xs text-white/80 mt-2">18% GST · UPI · Cards accepted</p>
          <Link to="/app/order">
            <Button data-testid="place-order-cta" className="mt-4 bg-white text-brand hover:bg-brand-50 h-10">
              <ShoppingBag className="w-4 h-4 mr-2" /> Place an order
            </Button>
          </Link>
        </div>
        <img
          src="https://images.unsplash.com/photo-1491336477066-31156b5e4f35?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwyfHxwcmVtaXVtJTIwc3VpdCUyMGRyeSUyMGNsZWFuaW5nfGVufDB8fHx8MTc4MzE4NjEyNXww&ixlib=rb-4.1.0&q=85"
          alt="Premium dry cleaning" className="absolute right-0 top-0 h-full w-1/2 object-cover opacity-70 mix-blend-luminosity"
        />
        <div className="absolute inset-y-0 left-2/3 w-40 bg-gradient-to-r from-brand to-transparent"></div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { to: "/app/order", label: "Order", icon: ShoppingBag },
          { to: "/app/chat", label: "Ask", icon: MessageCircleQuestion },
          { to: "/app/complaints", label: "Support", icon: ShieldCheck },
        ].map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} data-testid={`quick-${label.toLowerCase()}`}
                className="wf-card p-4 text-center wf-hover-lift">
            <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center mx-auto">
              <Icon className="w-5 h-5 text-brand" />
            </div>
            <div className="mt-2 text-sm font-medium">{label}</div>
          </Link>
        ))}
      </div>

      {/* Active orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg font-bold">Your orders</h3>
          <div className="text-xs text-muted2">{orders.length} total</div>
        </div>
        <div className="space-y-3">
          {orders.length === 0 && (
            <div className="wf-card p-6 text-center text-sm text-muted2">
              No orders yet. Place your first!
            </div>
          )}
          {orders.map((o) => (
            <Link to={`/app/orders/${o.id}`} key={o.id}
                  data-testid={`client-order-${o.number}`}
                  className="block wf-card p-4 hover:border-brand transition">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-mono text-xs text-muted2">{o.number}</div>
                  <div className="font-medium mt-1">{o.items.reduce((s,i)=>s+i.quantity,0)} items · {rupees(o.total_paise)}</div>
                  <div className="text-[11px] text-muted2 mt-1">{o.pickup_slot}</div>
                </div>
                <StatusBadge status={o.status} small />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
