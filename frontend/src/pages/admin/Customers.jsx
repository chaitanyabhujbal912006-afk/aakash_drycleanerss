import { useEffect, useState, useMemo } from "react";
import api, { rupees } from "@/lib/api";
import { Search, TrendingUp, Users as UsersIcon, AlertCircle } from "lucide-react";

export default function Customers() {
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("spend"); // spend | orders | name

  useEffect(() => {
    api.get("/users", { params: { role: "client" } }).then(({ data }) => setClients(data));
    api.get("/orders").then(({ data }) => setOrders(data));
    api.get("/complaints").then(({ data }) => setComplaints(data));
  }, []);

  const rows = useMemo(() => {
    let list = clients.map((c) => {
      const myOrders = orders.filter((o) => o.client_id === c.id);
      const spend = myOrders.filter((o) => o.paid).reduce((s, o) => s + o.total_paise, 0);
      const openComplaints = complaints.filter((k) => k.client_id === c.id && k.status === "open").length;
      const lastOrder = myOrders[0];
      return { ...c, orders: myOrders.length, spend, openComplaints, lastOrder };
    });

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (c) => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q)
      );
    }

    list.sort((a, b) => {
      if (sort === "spend") return b.spend - a.spend;
      if (sort === "orders") return b.orders - a.orders;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [clients, orders, complaints, query, sort]);

  const totalRevenue = rows.reduce((s, r) => s + r.spend, 0);
  const totalOpen = rows.reduce((s, r) => s + r.openComplaints, 0);

  return (
    <div data-testid="admin-customers">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="overline">CRM</div>
          <h1 className="font-display text-3xl font-extrabold mt-1">Customers</h1>
        </div>
        <div className="text-xs text-muted2">{clients.length} total</div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total clients", value: clients.length, icon: UsersIcon },
          { label: "Lifetime revenue", value: rupees(totalRevenue), icon: TrendingUp },
          { label: "Open complaints", value: totalOpen, icon: AlertCircle, alert: totalOpen > 0 },
        ].map(({ label, value, icon: Icon, alert }) => (
          <div key={label} className="wf-card p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-md flex items-center justify-center ${alert ? "bg-red-50" : "bg-brand-50"}`}>
              <Icon className={`w-4 h-4 ${alert ? "text-red-600" : "text-brand"}`} />
            </div>
            <div>
              <div className="text-xs text-muted2">{label}</div>
              <div className={`font-display text-xl font-extrabold ${alert ? "text-red-600" : ""}`}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Sort controls */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email or phone..."
            data-testid="customer-search"
            className="w-full pl-9 pr-3 h-10 border border-line rounded-md text-sm focus:outline-none focus:border-brand"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          data-testid="customer-sort"
          className="h-10 px-3 border border-line rounded-md text-sm focus:outline-none focus:border-brand bg-white"
        >
          <option value="spend">Sort: By spend</option>
          <option value="orders">Sort: By orders</option>
          <option value="name">Sort: By name</option>
        </select>
      </div>

      <div className="wf-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-[0.15em] text-muted2 border-b border-line">
            <tr>
              <th className="text-left px-5 py-3">Name</th>
              <th className="text-left px-5 py-3 hidden md:table-cell">Phone</th>
              <th className="text-left px-5 py-3 hidden lg:table-cell">Email</th>
              <th className="text-right px-5 py-3">Orders</th>
              <th className="text-right px-5 py-3">Lifetime spend</th>
              <th className="text-right px-5 py-3">Open complaints</th>
              <th className="text-left px-5 py-3 hidden xl:table-cell">Last order</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0 hover:bg-bg transition">
                <td className="px-5 py-3">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-[10px] text-muted2 mt-0.5">{c.address || "—"}</div>
                </td>
                <td className="px-5 py-3 text-muted2 font-mono text-xs hidden md:table-cell">{c.phone}</td>
                <td className="px-5 py-3 text-muted2 hidden lg:table-cell">{c.email}</td>
                <td className="px-5 py-3 text-right font-medium">{c.orders}</td>
                <td className="px-5 py-3 text-right font-medium text-brand">{rupees(c.spend)}</td>
                <td className="px-5 py-3 text-right">
                  {c.openComplaints
                    ? <span className="text-red-600 font-semibold">{c.openComplaints}</span>
                    : <span className="text-muted2">—</span>}
                </td>
                <td className="px-5 py-3 hidden xl:table-cell">
                  {c.lastOrder ? (
                    <div>
                      <div className="font-mono text-[10px] text-muted2">{c.lastOrder.number}</div>
                      <div className="text-xs capitalize">{c.lastOrder.status.replace(/_/g, " ")}</div>
                    </div>
                  ) : <span className="text-muted2">—</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-muted2">
                {query ? "No customers match your search." : "No customers yet."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
