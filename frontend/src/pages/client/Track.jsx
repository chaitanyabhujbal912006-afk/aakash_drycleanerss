import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { rupees } from "@/lib/api";
import { StatusBadge, statusLabel, statusColor } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MapPin, Package } from "lucide-react";

const STAGES = [
  "pending", "assigned", "picked_up", "at_shop", "washing",
  "ironing", "ready", "out_for_delivery", "delivered",
];

export default function Track() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [logs, setLogs] = useState([]);

  const load = () => {
    api.get(`/orders/${id}`).then(({ data }) => setOrder(data));
    api.get(`/orders/${id}/verification-logs`).then(({ data }) => setLogs(data));
  };
  useEffect(load, [id]);
  useEffect(() => {
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [id]);

  if (!order) return <div className="text-muted2 text-sm">Loading order…</div>;

  const currentIdx = STAGES.indexOf(order.status);

  return (
    <div className="space-y-5" data-testid="client-track">
      <div>
        <div className="overline">Order {order.number}</div>
        <h1 className="font-display text-3xl font-extrabold mt-1">Tracking</h1>
      </div>

      <div className="wf-card p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted2">Status</div>
          <div className="font-medium mt-0.5">{statusLabel(order.status)}</div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Timeline */}
      <div className="wf-card p-5">
        <div className="overline mb-4">Progress</div>
        <ol className="space-y-4">
          {STAGES.map((s, i) => {
            const done = i <= currentIdx;
            return (
              <li key={s} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                    done ? "bg-brand text-white border-brand" : "bg-white border-line"
                  }`}>
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-line" />}
                  </div>
                  {i < STAGES.length - 1 && <div className={`w-0.5 h-6 ${done && i < currentIdx ? "bg-brand" : "bg-line"}`} />}
                </div>
                <div className="pb-1">
                  <div className={`text-sm ${done ? "font-medium text-ink" : "text-muted2"}`}>{statusLabel(s)}</div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* OTP hero */}
      {(order.status === "assigned" || order.status === "pending") && (
        <Link to={`/app/orders/${order.id}/verify`}>
          <div className="rounded-2xl border-2 border-brand p-5 bg-brand-50 flex items-center justify-between wf-hover-lift"
               data-testid="verify-cta">
            <div>
              <div className="overline text-brand">Action required</div>
              <div className="font-display text-xl font-extrabold mt-1">Verify & share pickup OTP</div>
              <div className="text-xs text-muted2 mt-1">Confirm the driver&apos;s count before pickup.</div>
            </div>
            <Package className="w-8 h-8 text-brand" />
          </div>
        </Link>
      )}

      <div className="wf-card p-5">
        <div className="overline mb-2">Pickup</div>
        <div className="text-sm"><MapPin className="inline w-3.5 h-3.5 mr-1" /> {order.pickup_address}</div>
        <div className="text-xs text-muted2 mt-1">Slot: {order.pickup_slot}</div>
        {order.delivery_user_name && (
          <div className="mt-3 text-xs text-muted2">Driver: <span className="text-ink font-medium">{order.delivery_user_name}</span></div>
        )}
      </div>

      <div className="wf-card p-5">
        <div className="overline mb-2">Items</div>
        <div className="space-y-2 text-sm">
          {order.items.map((i) => (
            <div key={i.id} className="flex justify-between">
              <span>{i.service_name} <span className="text-muted2">× {i.quantity}</span></span>
              <span className="font-medium">{rupees(i.total_paise)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-line mt-3 pt-3 text-sm space-y-1">
          <div className="flex justify-between text-muted2"><span>Subtotal</span><span>{rupees(order.subtotal_paise)}</span></div>
          <div className="flex justify-between text-muted2"><span>GST 18%</span><span>{rupees(order.gst_paise)}</span></div>
          <div className="flex justify-between font-bold text-brand text-base"><span>Total</span><span>{rupees(order.total_paise)}</span></div>
        </div>
      </div>

      {order.status === "delivered" && !order.paid && (
        <Link to="/app/invoices">
          <Button data-testid="pay-now-cta" className="w-full h-12 bg-brand hover:bg-brand-600 text-white text-base">
            Pay now via Razorpay
          </Button>
        </Link>
      )}

      {logs.length > 0 && (
        <div className="wf-card p-5">
          <div className="overline mb-3">Verification history</div>
          <div className="space-y-2 text-xs">
            {logs.map((l) => (
              <div key={l.id} className="flex justify-between border-b border-line pb-2 last:border-0">
                <span className="font-medium capitalize">{l.checkpoint.replace(/_/g, " ")}</span>
                <span className="text-muted2">{new Date(l.at).toLocaleTimeString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
