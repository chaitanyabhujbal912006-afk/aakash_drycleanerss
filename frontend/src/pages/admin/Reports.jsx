import { useEffect, useState } from "react";
import api, { rupees } from "@/lib/api";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get("/dashboard/stats").then(({ data }) => setStats(data));
    api.get("/orders").then(({ data }) => setOrders(data));
  }, []);

  // service breakdown
  const svcMap = {};
  orders.forEach((o) => o.items.forEach((i) => {
    svcMap[i.service_type] = (svcMap[i.service_type] || 0) + i.quantity;
  }));
  const svcData = Object.entries(svcMap).map(([name, count]) => ({ name, count }));

  const statusRows = Object.entries(stats?.status_breakdown || {}).map(([k, v]) => ({ status: k, count: v }));

  return (
    <div data-testid="admin-reports">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="overline">Analytics</div>
          <h1 className="font-display text-3xl font-extrabold mt-1">Reports</h1>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-4 mb-4">
        <div className="wf-card p-5">
          <div className="overline">Monthly-week revenue</div>
          <h3 className="font-display text-lg font-bold mt-1 mb-4">Paid invoices (7d)</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={stats?.seven_days || []}>
                <CartesianGrid vertical={false} stroke="#E2E0D8" />
                <XAxis dataKey="day" tick={{ fill: "#4A6159", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#4A6159", fontSize: 11 }} axisLine={false} tickLine={false}
                       tickFormatter={(v) => `₹${(v/100).toFixed(0)}`} width={60}/>
                <Tooltip formatter={(v) => rupees(v)} contentStyle={{ background: "#fff", border: "1px solid #E2E0D8", borderRadius: 8 }} />
                <Line type="monotone" dataKey="revenue_paise" stroke="#0C5E48" strokeWidth={2.5} dot={{ fill: "#0C5E48", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="wf-card p-5">
          <div className="overline">Service mix</div>
          <h3 className="font-display text-lg font-bold mt-1 mb-4">By service type</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={svcData}>
                <CartesianGrid vertical={false} stroke="#E2E0D8" />
                <XAxis dataKey="name" tick={{ fill: "#4A6159", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#4A6159", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2E0D8", borderRadius: 8 }} />
                <Bar dataKey="count" fill="#0C5E48" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-4">
        <div className="wf-card p-5">
          <div className="overline">Drivers</div>
          <h3 className="font-display text-lg font-bold mt-1 mb-4">Top performers</h3>
          <div className="space-y-3 text-sm">
            {(stats?.drivers || []).map((d) => (
              <div key={d.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{d.name}</div>
                  <div className="text-[11px] text-muted2">{d.delivered} delivered / {d.assigned} assigned</div>
                </div>
                <div className="font-mono text-xs">{d.assigned ? Math.round((d.delivered / d.assigned) * 100) : 0}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="wf-card p-5">
          <div className="overline">Pipeline</div>
          <h3 className="font-display text-lg font-bold mt-1 mb-4">Orders by status</h3>
          <div className="space-y-2">
            {statusRows.map((r) => (
              <div key={r.status} className="flex items-center gap-3 text-sm">
                <div className="w-32 text-muted2 capitalize">{r.status.replace(/_/g, " ")}</div>
                <div className="flex-1 h-2 bg-line rounded-full overflow-hidden">
                  <div className="h-full bg-brand" style={{ width: `${Math.min(100, r.count * 12)}%` }} />
                </div>
                <div className="w-8 text-right font-medium">{r.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
