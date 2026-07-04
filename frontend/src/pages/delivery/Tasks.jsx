import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { MapPin, ArrowRight } from "lucide-react";

export default function DeliveryTasks() {
  const [orders, setOrders] = useState([]);

  useEffect(() => { api.get("/orders").then(({ data }) => setOrders(data)); }, []);

  const pickups = orders.filter((o) => ["assigned", "picked_up"].includes(o.status));
  const deliveries = orders.filter((o) => ["ready", "out_for_delivery"].includes(o.status));

  return (
    <div className="space-y-6" data-testid="delivery-tasks">
      <div>
        <div className="overline">Today</div>
        <h1 className="font-display text-3xl font-extrabold mt-1">Your tasks</h1>
      </div>

      <TaskSection title="Pickups" count={pickups.length}
                   orders={pickups} kind="pickup" />
      <TaskSection title="Deliveries" count={deliveries.length}
                   orders={deliveries} kind="deliver" />
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
        {orders.map((o) => (
          <Link key={o.id} to={`/delivery/${kind}/${o.id}`}
                data-testid={`delivery-task-${o.number}`}
                className="block wf-card p-4 hover:border-brand transition">
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
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(o.pickup_address)}`}
              target="_blank" rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-3 inline-flex items-center gap-1 text-xs text-brand hover:underline"
              data-testid={`open-maps-${o.number}`}
            >
              Navigate in Maps
            </a>
          </Link>
        ))}
      </div>
    </section>
  );
}
