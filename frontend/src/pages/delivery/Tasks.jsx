import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { MapPin, ArrowRight, Package, Truck, CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function urgencyLabel(slot) {
  if (!slot) return null;
  const s = slot.toLowerCase();
  if (s.includes("today") || s.includes("now")) return "urgent";
  if (s.includes("tomorrow")) return "tomorrow";
  return null;
}

export default function DeliveryTasks() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => { api.get("/orders").then(({ data }) => setOrders(data)); }, []);

  const pickups = orders.filter((o) => ["assigned", "picked_up"].includes(o.status));
  const deliveries = orders.filter((o) => ["ready", "out_for_delivery"].includes(o.status));
  const delivered = orders.filter((o) => o.status === "delivered");

  return (
    <div className="space-y-6" data-testid="delivery-tasks">
      <div>
        <div className="overline">Today</div>
        <h1 className="font-display text-3xl font-extrabold mt-1">
          {user?.name?.split(" ")[0]}'s tasks
        </h1>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pickups", count: pickups.length, icon: Package, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Deliveries", count: deliveries.length, icon: Truck, color: "text-brand", bg: "bg-brand-50" },
          { label: "Done today", count: delivered.length, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
        ].map(({ label, count, icon: Icon, color, bg }) => (
          <div key={label} className="wf-card p-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-md ${bg} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              <div className="font-display text-2xl font-extrabold leading-none">{count}</div>
              <div className="text-[10px] text-muted2 mt-0.5">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <TaskSection title="Pickups" count={pickups.length} orders={pickups} kind="pickup" />
      <TaskSection title="Deliveries" count={deliveries.length} orders={deliveries} kind="deliver" />
    </div>
  );
}

function TaskSection({ title, count, orders, kind }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-lg font-bold">{title}</h3>
        <div className="text-xs text-muted2">{count} scheduled</div>
      </div>
      <div className="space-y-3">
        {orders.length === 0 && (
          <div className="wf-card p-4 text-sm text-muted2">No {title.toLowerCase()} right now.</div>
        )}
        {orders.map((o) => {
          const urgency = urgencyLabel(o.pickup_slot);
          return (
            <Link key={o.id} to={`/delivery/${kind}/${o.id}`}
                  data-testid={`delivery-task-${o.number}`}
                  className="block wf-card p-4 hover:border-brand transition">
              {urgency && (
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold mb-2 ${
                  urgency === "urgent" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                }`}>
                  <Clock className="w-3 h-3" /> {urgency === "urgent" ? "TODAY — urgent" : "Tomorrow"}
                </div>
              )}
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-xs text-muted2">{o.number}</div>
                  <div className="font-medium mt-1">{o.client_name}</div>
                  <div className="text-xs text-muted2 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {o.pickup_address}
                  </div>
                  <div className="text-[11px] text-muted2 mt-2">Slot: {o.pickup_slot}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={o.status} small />
                  <ArrowRight className="w-4 h-4 text-brand" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(o.pickup_address)}`}
                  target="_blank" rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
                  data-testid={`open-maps-${o.number}`}
                >
                  <MapPin className="w-3 h-3" /> Navigate in Maps
                </a>
                <div className="text-[10px] text-muted2">
                  {o.items?.reduce((s, i) => s + i.quantity, 0)} items
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
