import { useEffect, useState } from "react";
import api, { rupees } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Download } from "lucide-react";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => { api.get("/invoices").then(({ data }) => setInvoices(data)); }, []);

  const filtered = invoices.filter((i) => filter === "all" ? true : i.status === filter);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total_paise, 0);
  const outstanding = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + i.total_paise, 0);
  const rate = invoices.length ? Math.round((invoices.filter(i => i.status === "paid").length / invoices.length) * 100) : 0;

  return (
    <div data-testid="admin-invoices">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="overline">Finance</div>
          <h1 className="font-display text-3xl font-extrabold mt-1">Invoices</h1>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="wf-card p-5">
          <div className="overline">Collected</div>
          <div className="font-display text-3xl font-extrabold mt-2 text-brand">{rupees(totalPaid)}</div>
        </div>
        <div className="wf-card p-5">
          <div className="overline">Outstanding</div>
          <div className="font-display text-3xl font-extrabold mt-2 text-amber-600">{rupees(outstanding)}</div>
        </div>
        <div className="wf-card p-5">
          <div className="overline">Collection rate</div>
          <div className="font-display text-3xl font-extrabold mt-2">{rate}%</div>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        {["all", "paid", "pending"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
                  data-testid={`invoice-chip-${f}`}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${
                    filter === f ? "bg-brand text-white border-brand" : "bg-white border-line hover:border-brand text-muted2"
                  }`}>
            {f}
          </button>
        ))}
      </div>

      <div className="wf-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-[0.15em] text-muted2 border-b border-line">
            <tr>
              <th className="text-left px-5 py-3">Invoice</th>
              <th className="text-left px-5 py-3">Order</th>
              <th className="text-left px-5 py-3">Client</th>
              <th className="text-left px-5 py-3">Date</th>
              <th className="text-right px-5 py-3">Amount</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-left px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-b border-line last:border-0 hover:bg-bg">
                <td className="px-5 py-3 font-mono text-xs">{i.number}</td>
                <td className="px-5 py-3 font-mono text-xs text-muted2">{i.order_number}</td>
                <td className="px-5 py-3">{i.client_name}</td>
                <td className="px-5 py-3 text-xs text-muted2">{i.created_at.slice(0,10)}</td>
                <td className="px-5 py-3 text-right font-medium">{rupees(i.total_paise)}</td>
                <td className="px-5 py-3"><StatusBadge status={i.status} small /></td>
                <td className="px-5 py-3">
                  <a
                    href={`${process.env.REACT_APP_BACKEND_URL}/api/invoices/${i.id}/pdf?token=${localStorage.getItem("wf_token")}`}
                    target="_blank" rel="noreferrer"
                    data-testid={`invoice-pdf-${i.number}`}
                    className="inline-flex items-center gap-1 text-xs text-brand hover:underline">
                    <Download className="w-3 h-3" /> PDF
                  </a>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-muted2">No invoices.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
