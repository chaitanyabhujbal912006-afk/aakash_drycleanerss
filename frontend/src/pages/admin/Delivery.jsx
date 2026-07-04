import { useEffect, useState } from "react";
import api from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MapPin } from "lucide-react";

export default function Delivery() {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selection, setSelection] = useState({});

  const load = async () => {
    const { data } = await api.get("/orders");
    setOrders(data.filter((o) => !["delivered", "cancelled"].includes(o.status)));
  };
  useEffect(() => {
    load();
    api.get("/users", { params: { role: "delivery" } }).then(({ data }) => setDrivers(data));
  }, []);

  const assign = async (orderId, driverId) => {
    await api.patch(`/orders/${orderId}/assign`, { delivery_user_id: driverId });
    toast.success("Assigned");
    load();
  };

  const perDriver = drivers.map((d) => ({
    ...d,
    active: orders.filter((o) => o.delivery_user_id === d.id).length,
    delivered: 0,
  }));

  return (
    <div data-testid="admin-delivery">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="overline">Field ops</div>
          <h1 className="font-display text-3xl font-extrabold mt-1">Delivery</h1>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {perDriver.map((d) => (
          <div key={d.id} className="wf-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{d.name}</div>
                <div className="text-xs text-muted2">{d.phone}</div>
              </div>
              <div className="font-display text-2xl font-extrabold text-brand">{d.active}</div>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-line">
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, d.active * 20)}%` }} />
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted2 mt-2">Active tasks</div>
          </div>
        ))}
        {perDriver.length === 0 && (
          <div className="wf-card p-5 md:col-span-3 text-sm text-muted2">No delivery agents yet.</div>
        )}
      </div>

      <div className="wf-card">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div>
            <div className="overline">Today’s schedule</div>
            <h3 className="font-display text-lg font-bold mt-1">Pickups & drop-offs</h3>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-[0.15em] text-muted2 border-b border-line">
            <tr>
              <th className="text-left px-5 py-3">Order</th>
              <th className="text-left px-5 py-3">Client</th>
              <th className="text-left px-5 py-3">Address</th>
              <th className="text-left px-5 py-3">Slot</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-left px-5 py-3">Driver</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-line last:border-0 hover:bg-bg">
                <td className="px-5 py-3 font-mono text-xs">{o.number}</td>
                <td className="px-5 py-3">{o.client_name}</td>
                <td className="px-5 py-3 text-xs text-muted2 max-w-[240px] truncate">
                  <MapPin className="inline w-3 h-3 mr-1" />{o.pickup_address}
                </td>
                <td className="px-5 py-3 text-xs">{o.pickup_slot}</td>
                <td className="px-5 py-3"><StatusBadge status={o.status} small /></td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <Select value={selection[o.id] || o.delivery_user_id || ""}
                            onValueChange={(v) => setSelection({ ...selection, [o.id]: v })}>
                      <SelectTrigger className="h-8 w-40" data-testid={`assign-select-${o.number}`}>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="h-8 bg-brand hover:bg-brand-600 text-white"
                            onClick={() => selection[o.id] && assign(o.id, selection[o.id])}
                            data-testid={`assign-btn-${o.number}`}>
                      Save
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-muted2">Nothing on the road today.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
