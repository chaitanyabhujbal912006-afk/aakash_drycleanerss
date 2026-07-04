import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function DeliveryConfirm() {
  const { id } = useParams();
  const nav = useNavigate();
  const [order, setOrder] = useState(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get(`/orders/${id}`).then(({ data }) => setOrder(data)); }, [id]);
  if (!order) return <div className="text-muted2 text-sm">Loading…</div>;

  const verify = async () => {
    setBusy(true);
    try {
      await api.post(`/orders/${id}/verify-delivery-otp`, { otp });
      toast.success("Delivered!");
      nav("/delivery");
    } catch (e) { toast.error(e?.response?.data?.detail || "Invalid OTP"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-5" data-testid="delivery-deliver">
      <button onClick={() => nav(-1)} className="text-muted2 flex items-center gap-1 text-sm hover:text-ink">
        <ArrowLeft className="w-4 h-4" /> back
      </button>
      <div>
        <div className="overline">Deliver · {order.number}</div>
        <h1 className="font-display text-3xl font-extrabold mt-1">{order.client_name}</h1>
        <div className="text-sm text-muted2 mt-1">{order.pickup_address}</div>
      </div>

      <div className="wf-card p-5 bg-brand-50 border-brand">
        <div className="overline text-brand">Doorstep OTP</div>
        <div className="font-display text-lg font-extrabold mt-1">Enter customer&apos;s delivery OTP</div>
        <p className="text-xs text-muted2 mt-1">If the OTP isn&apos;t with them, ask admin to re-send.</p>
      </div>

      <Input
        value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
        data-testid="delivery-otp-input"
        placeholder="••••••" maxLength={6}
        className="h-16 text-3xl font-mono text-center tracking-[0.3em] bg-white"
      />
      <Button onClick={verify} disabled={busy || otp.length !== 6}
              data-testid="confirm-delivery-button"
              className="w-full h-14 bg-brand hover:bg-brand-600 text-white text-base">
        <ShieldCheck className="w-5 h-5 mr-2" />
        {busy ? "Verifying…" : "Confirm delivery"}
      </Button>
    </div>
  );
}
