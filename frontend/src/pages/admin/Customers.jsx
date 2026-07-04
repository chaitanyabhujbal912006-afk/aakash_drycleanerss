import { useEffect, useState } from "react";
import api, { rupees } from "@/lib/api";

export default function Customers() {
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    api.get("/users", { params: { role: "client" } }).then(({ data }) => setClients(data));
    api.get("/orders").then(({ data }) => setOrders(data));
    api.get("/complaints").then(({ data }) => setComplaints(data));
  }, []);

  const rows = clients.map((c) => {
    const myOrders = orders.filter((o) => o.client_id === c.id);
    const spend = myOrders.filter((o) => o.paid).reduce((s, o) => s + o.total_paise, 0);
    const openComplaints = complaints.filter((k) => k.client_id === c.id && k.status === "open").length;
    return { ...c, orders: myOrders.length, spend, openComplaints };
  });

  return (
    <div data-testid="admin-customers">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="overline">CRM</div>
          <h1 className="font-display text-3xl font-extrabold mt-1">Customers</h1>
        </div>
        <div className="text-xs text-muted2">{clients.length} total</div>
      </div>

      <div className="wf-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-[0.15em] text-muted2 border-b border-line">
            <tr>
              <th className="text-left px-5 py-3">Name</th>
              <th className="text-left px-5 py-3">Phone</th>
              <th className="text-left px-5 py-3">Email</th>
              <th className="text-right px-5 py-3">Orders</th>
              <th className="text-right px-5 py-3">Lifetime spend</th>
              <th className="text-right px-5 py-3">Open complaints</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0 hover:bg-bg">
                <td className="px-5 py-3 font-medium">{c.name}</td>
                <td className="px-5 py-3 text-muted2 font-mono text-xs">{c.phone}</td>
                <td className="px-5 py-3 text-muted2">{c.email}</td>
                <td className="px-5 py-3 text-right">{c.orders}</td>
                <td className="px-5 py-3 text-right font-medium">{rupees(c.spend)}</td>
                <td className="px-5 py-3 text-right">
                  {c.openComplaints
                    ? <span className="text-red-600 font-medium">{c.openComplaints}</span>
                    : <span className="text-muted2">—</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-muted2">No customers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
