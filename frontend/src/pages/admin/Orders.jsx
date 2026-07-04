import { useEffect, useMemo, useState } from "react";
import api, { rupees } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, ShieldCheck } from "lucide-react";

const STATUSES = [
  "pending", "assigned", "picked_up", "at_shop", "washing",
  "ironing", "ready", "out_for_delivery", "delivered", "cancelled",
];
const CHIP_STATUSES = ["all", ...STATUSES];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [selected, setSelected] = useState(null);
  const [logs, setLogs] = useState([]);

  const load = async () => {
    const { data } = await api.get("/orders");
    setOrders(data);
  };

  useEffect(() => {
    load();
    api.get("/users", { params: { role: "delivery" } }).then(({ data }) => setDrivers(data));
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusF !== "all" && o.status !== statusF) return false;
      if (q && !`${o.number} ${o.client_name} ${o.client_phone}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [orders, q, statusF]);

  const openDetail = async (o) => {
    setSelected(o);
    const { data } = await api.get(`/orders/${o.id}/verification-logs`);
    setLogs(data);
  };

  const assign = async (driverId) => {
    await api.patch(`/orders/${selected.id}/assign`, { delivery_user_id: driverId });
    toast.success("Driver assigned");
    load(); const r = await api.get(`/orders/${selected.id}`); setSelected(r.data);
  };

  const advance = async (status) => {
    await api.patch(`/orders/${selected.id}/status`, { status });
    toast.success(`Moved to ${status.replace(/_/g, " ")}`);
    load(); const r = await api.get(`/orders/${selected.id}`); setSelected(r.data);
  };

  const genInvoice = async () => {
    const { data } = await api.post(`/invoices/generate/${selected.id}`);
    toast.success(`Invoice ${data.number} generated`);
  };

  const shopReceipt = async () => {
    // quick "OK" audit — actual = expected
    const items = selected.items.map((i) => ({ category: i.category, count: i.quantity }));
    await api.post(`/orders/${selected.id}/shop-receipt`, { actual_items: items });
    toast.success("Shop receipt confirmed");
    load(); const r = await api.get(`/orders/${selected.id}`); setSelected(r.data);
    const l = await api.get(`/orders/${selected.id}/verification-logs`); setLogs(l.data);
  };

  return (
    <div data-testid="admin-orders">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="overline">Operations</div>
          <h1 className="font-display text-3xl font-extrabold mt-1">Orders</h1>
        </div>
      </div>

      <div className="wf-card p-4 mb-4">
        <div className="flex gap-3 items-center flex-wrap">
          <Input
            placeholder="Search by number, client, phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="orders-search"
            className="max-w-sm h-10"
          />
          <div className="flex flex-wrap gap-1.5">
            {CHIP_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusF(s)}
                data-testid={`chip-${s}`}
                className={`px-2.5 py-1 rounded-full text-xs border transition ${
                  statusF === s ? "bg-brand text-white border-brand" : "bg-white border-line text-muted2 hover:border-brand"
                }`}
              >
                {s === "all" ? "All" : s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="wf-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-[0.15em] text-muted2 border-b border-line">
            <tr>
              <th className="text-left px-4 py-3">Number</th>
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-left px-4 py-3">Items</th>
              <th className="text-left px-4 py-3">Total</th>
              <th className="text-left px-4 py-3">Slot</th>
              <th className="text-left px-4 py-3">Driver</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id}
                  onClick={() => openDetail(o)}
                  data-testid={`order-row-${o.number}`}
                  className="border-b border-line last:border-0 hover:bg-bg cursor-pointer">
                <td className="px-4 py-3 font-mono text-xs">{o.number}</td>
                <td className="px-4 py-3">
                  <div>{o.client_name}</div>
                  <div className="text-[11px] text-muted2">{o.client_phone}</div>
                </td>
                <td className="px-4 py-3">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                <td className="px-4 py-3 font-medium">{rupees(o.total_paise)}</td>
                <td className="px-4 py-3 text-xs text-muted2">{o.pickup_slot}</td>
                <td className="px-4 py-3 text-muted2">{o.delivery_user_name || "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} small /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted2 text-sm">No orders match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-over */}
      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="order-detail-sheet">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-2xl">{selected.number}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-6">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="overline">Client</div>
                    <div className="mt-1 font-medium">{selected.client_name}</div>
                    <div className="text-xs text-muted2">{selected.client_phone}</div>
                  </div>
                  <div>
                    <div className="overline">Status</div>
                    <div className="mt-1"><StatusBadge status={selected.status} /></div>
                  </div>
                  <div className="col-span-2">
                    <div className="overline">Pickup address</div>
                    <div className="text-sm mt-1">{selected.pickup_address}</div>
                    <div className="text-xs text-muted2 mt-1">Slot: {selected.pickup_slot}</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="overline mb-2">Stage progress</div>
                  <div className="flex items-center gap-0.5">
                    {STATUSES.slice(0, -1).map((s) => {
                      const passed =
                        STATUSES.indexOf(s) <= STATUSES.indexOf(selected.status);
                      return (
                        <div key={s} className="flex-1">
                          <div className={`h-1.5 rounded-full ${passed ? "bg-brand" : "bg-line"}`} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-xs text-muted2 mt-2 capitalize">{selected.status.replace(/_/g, " ")}</div>
                </div>

                {/* Assign / advance */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="overline mb-1">Driver</div>
                    <Select value={selected.delivery_user_id || ""} onValueChange={assign}>
                      <SelectTrigger data-testid="assign-driver-select" className="h-10">
                        <SelectValue placeholder="Assign driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="overline mb-1">Advance stage</div>
                    <Select onValueChange={advance}>
                      <SelectTrigger data-testid="advance-status-select" className="h-10">
                        <SelectValue placeholder="Set status…" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="overline mb-2">Items</div>
                  <div className="border border-line rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-bg text-muted2">
                        <tr>
                          <th className="text-left px-3 py-2">Garment</th>
                          <th className="text-left px-3 py-2">Service</th>
                          <th className="text-right px-3 py-2">Qty</th>
                          <th className="text-right px-3 py-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.items.map((i) => (
                          <tr key={i.id} className="border-t border-line">
                            <td className="px-3 py-2">{i.service_name} <span className="text-muted2">· {i.category}</span></td>
                            <td className="px-3 py-2 text-muted2">{i.service_type}</td>
                            <td className="px-3 py-2 text-right">{i.quantity}</td>
                            <td className="px-3 py-2 text-right font-medium">{rupees(i.total_paise)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-bg">
                        <tr><td colSpan={3} className="px-3 py-2 text-right text-muted2">Subtotal</td><td className="px-3 py-2 text-right">{rupees(selected.subtotal_paise)}</td></tr>
                        <tr><td colSpan={3} className="px-3 py-2 text-right text-muted2">GST (18%)</td><td className="px-3 py-2 text-right">{rupees(selected.gst_paise)}</td></tr>
                        <tr><td colSpan={3} className="px-3 py-2 text-right font-medium">Total</td><td className="px-3 py-2 text-right font-bold text-brand">{rupees(selected.total_paise)}</td></tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Verification logs */}
                {logs.length > 0 && (
                  <div>
                    <div className="overline mb-2">Verification logs</div>
                    <div className="space-y-2">
                      {logs.map((l) => (
                        <div key={l.id} className="border border-line rounded-md p-3 text-xs">
                          <div className="flex justify-between">
                            <div className="font-medium">{l.checkpoint.replace(/_/g, " ")}</div>
                            <div className="text-muted2">{new Date(l.at).toLocaleString("en-IN")}</div>
                          </div>
                          {l.expected_count != null && (
                            <div className="text-muted2 mt-1">
                              expected {l.expected_count} · actual {l.actual_count}{" "}
                              {l.mismatch && <span className="text-red-600 font-medium">· mismatch</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={shopReceipt}
                          data-testid="shop-receipt-button"
                          className="h-10">
                    <ShieldCheck className="w-4 h-4 mr-2" /> Shop receipt OK
                  </Button>
                  <Button onClick={genInvoice}
                          data-testid="generate-invoice-button"
                          className="h-10 bg-brand hover:bg-brand-600 text-white">
                    <FileText className="w-4 h-4 mr-2" /> Generate invoice
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
