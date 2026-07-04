import { useEffect, useState } from "react";
import api, { rupees } from "@/lib/api";
import { StatusBadge, statusColor, statusLabel } from "@/components/StatusBadge";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Package, IndianRupee, AlertTriangle, Truck, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

const KPI = ({ label, value, icon: Icon, sub, tone = "brand" }) => (
  <div className="wf-card p-5 wf-hover-lift" data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
    <div className="flex items-start justify-between">
      <div className="overline">{label}</div>
      <div className={`w-8 h-8 rounded-md flex items-center justify-center bg-brand-50`}>
        <Icon className="w-4 h-4 text-brand" />
      </div>
    </div>
    <div className="font-display text-4xl font-extrabold mt-3 leading-none">{value}</div>
    {sub && <div className="text-xs text-muted2 mt-2">{sub}</div>}
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get("/dashboard/stats").then(({ data }) => setStats(data));
    api.get("/orders").then(({ data }) => setOrders(data.slice(0, 8)));
  }, []);

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      <div className="flex items-end justify-between">
        <div>
          <div className="overline">Overview</div>
          <h1 className="font-display text-3xl font-extrabold mt-1">Control Room</h1>
        </div>
        <div className="text-xs text-muted2">
          Today · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPI label="Active orders"    value={stats?.active_orders ?? "—"}      icon={Package}      sub="In washing / ironing / delivery" />
        <KPI label="Revenue today"    value={stats ? rupees(stats.revenue_today_paise) : "—"} icon={IndianRupee} sub="Paid invoices, incl. GST" />
        <KPI label="Pending pickups"  value={stats?.pending_pickups ?? "—"}     icon={Truck}        sub="Awaiting driver dispatch" />
        <KPI label="Active mismatches" value={stats?.mismatches ?? "—"}         icon={AlertTriangle} sub="Discrepancies logged" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="wf-card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="overline">7-day revenue</div>
              <h3 className="font-display text-lg font-bold mt-1">Paid, incl. GST</h3>
            </div>
          </div>
          <div className="h-64" data-testid="revenue-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.seven_days || []}>
                <CartesianGrid vertical={false} stroke="#E2E0D8" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#4A6159", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#4A6159", fontSize: 11 }}
                       tickFormatter={(v) => `₹${(v / 100).toFixed(0)}`} width={60} />
                <Tooltip
                  cursor={{ fill: "#EAF3F0" }}
                  contentStyle={{ background: "#fff", border: "1px solid #E2E0D8", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => rupees(v)}
                />
                <Bar dataKey="revenue_paise" fill="#0C5E48" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="wf-card p-5">
          <div className="overline">Team workload</div>
          <h3 className="font-display text-lg font-bold mt-1">Drivers · today</h3>
          <div className="mt-4 space-y-3">
            {(stats?.drivers || []).map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium text-ink">{d.name}</div>
                  <div className="text-[11px] text-muted2">{d.assigned} assigned · {d.delivered} delivered</div>
                </div>
                <div className="w-24 h-1.5 bg-line rounded-full overflow-hidden">
                  <div className="h-full bg-brand"
                       style={{ width: `${d.assigned ? (d.delivered / d.assigned) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
            {(!stats?.drivers?.length) && (
              <div className="text-xs text-muted2">No drivers assigned yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="wf-card">
        <div className="flex items-center justify-between p-5 border-b border-line">
          <div>
            <div className="overline">Live</div>
            <h3 className="font-display text-lg font-bold mt-1">Recent orders</h3>
          </div>
          <Link to="/admin/orders" className="text-xs text-brand font-medium flex items-center gap-1 hover:underline">
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-[0.15em] text-muted2 border-b border-line">
            <tr>
              <th className="text-left px-5 py-3">Number</th>
              <th className="text-left px-5 py-3">Client</th>
              <th className="text-left px-5 py-3">Items</th>
              <th className="text-left px-5 py-3">Total</th>
              <th className="text-left px-5 py-3">Driver</th>
              <th className="text-left px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-line last:border-0 hover:bg-bg transition">
                <td className="px-5 py-3 font-mono text-xs">{o.number}</td>
                <td className="px-5 py-3">{o.client_name}</td>
                <td className="px-5 py-3">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                <td className="px-5 py-3 font-medium">{rupees(o.total_paise)}</td>
                <td className="px-5 py-3 text-muted2">{o.delivery_user_name || "—"}</td>
                <td className="px-5 py-3"><StatusBadge status={o.status} small /></td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-muted2 text-sm">No orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
