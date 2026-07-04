import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { rupees } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function Verify() {
  const { id } = useParams();
  const nav = useNavigate();
  const [order, setOrder] = useState(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get(`/orders/${id}`).then(({ data }) => setOrder(data)); }, [id]);

  const generate = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/orders/${id}/send-pickup-otp`);
      setOtp(data.otp);
      toast.success("OTP generated. Share with driver.");
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  if (!order) return <div className="text-muted2 text-sm">Loading…</div>;

  return (
    <div className="space-y-6" data-testid="client-verify">
      <button onClick={() => nav(-1)} className="text-muted2 flex items-center gap-1 text-sm hover:text-ink">
        <ArrowLeft className="w-4 h-4" /> back
      </button>
      <div>
        <div className="overline">Verify order {order.number}</div>
        <h1 className="font-display text-3xl font-extrabold mt-1">Pickup OTP</h1>
        <p className="text-sm text-muted2 mt-2">Please review the items. When the driver arrives, generate an OTP and share.</p>
      </div>

      <div className="wf-card p-5">
        <div className="overline mb-3">Your items</div>
        <div className="space-y-2 text-sm">
          {order.items.map((i) => (
            <div key={i.id} className="flex justify-between border-b border-line pb-2 last:border-0">
              <div>
                <div>{i.service_name} <span className="text-muted2">· {i.category}</span></div>
                <div className="text-[11px] text-muted2">{i.service_type}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">×{i.quantity}</div>
                <div className="text-[11px] text-muted2">{rupees(i.total_paise)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!otp && (
        <Button onClick={generate} disabled={busy}
                data-testid="generate-otp-button"
                className="w-full h-14 bg-brand hover:bg-brand-600 text-white text-base">
          <ShieldCheck className="w-5 h-5 mr-2" />
          {busy ? "Generating…" : "Generate 6-digit OTP"}
        </Button>
      )}

      {otp && (
        <div className="rounded-2xl border-2 border-brand p-8 bg-brand-50 text-center" data-testid="otp-display">
          <div className="overline text-brand mb-4">Your pickup OTP</div>
          <div className="font-display text-7xl font-extrabold tracking-[0.2em] text-brand tabular-nums">
            {otp}
          </div>
          <p className="text-xs text-muted2 mt-6 leading-relaxed">
            Share this OTP with your driver only. It expires once verified.
            <br/>The driver will enter it in their app to confirm pickup.
          </p>
        </div>
      )}
    </div>
  );
}
