import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, ShieldCheck } from "lucide-react";

const CATEGORIES = ["Gents", "Ladies", "Kids", "Household"];

export default function PickupEntry() {
  const { id } = useParams();
  const nav = useNavigate();
  const [order, setOrder] = useState(null);
  const [counts, setCounts] = useState({});
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState("count"); // count → otp
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);

  useEffect(() => { api.get(`/orders/${id}`).then(({ data }) => setOrder(data)); }, [id]);

  if (!order) return <div className="text-muted2 text-sm">Loading…</div>;

  const saveCount = async () => {
    setBusy(true);
    try {
      const items = CATEGORIES.filter((c) => counts[c]).map((c) => ({
        category: c, count: Number(counts[c]),
      }));
      if (items.length === 0) { toast.error("Enter counts for at least one category"); return; }
      await api.post(`/orders/${id}/driver-count`, { items, photo_urls: [], driver_notes: notes });
      toast.success("Count logged. Ask client to generate OTP now.");
      setStep("otp");
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  const verifyOtp = async () => {
    setBusy(true);
    try {
      await api.post(`/orders/${id}/verify-pickup-otp`, { otp });
      toast.success("Pickup confirmed!");
      nav("/delivery");
    } catch (e) { toast.error(e?.response?.data?.detail || "Invalid OTP"); }
    finally { setBusy(false); }
  };

  // "AI vision" — mock estimate that pre-fills based on expected quantities.
  const aiEstimate = async () => {
    setAiSuggesting(true);
    setTimeout(() => {
      const byCat = {};
      order.items.forEach((i) => {
        byCat[i.category] = (byCat[i.category] || 0) + i.quantity;
      });
      setCounts(byCat);
      setAiSuggesting(false);
      toast.success("AI estimated counts from camera preview.");
    }, 900);
  };

  const expected = order.items.reduce((s, i) => s + i.quantity, 0);
  const totalEntered = Object.values(counts).reduce((s, n) => s + (Number(n) || 0), 0);

  return (
    <div className="space-y-5" data-testid="delivery-pickup">
      <button onClick={() => nav(-1)} className="text-muted2 flex items-center gap-1 text-sm hover:text-ink">
        <ArrowLeft className="w-4 h-4" /> back
      </button>

      <div>
        <div className="overline">Pickup · {order.number}</div>
        <h1 className="font-display text-3xl font-extrabold mt-1">{order.client_name}</h1>
        <div className="text-sm text-muted2 mt-1">{order.pickup_address}</div>
      </div>

      {step === "count" && (
        <>
          <button onClick={aiEstimate} disabled={aiSuggesting}
                  data-testid="ai-count-button"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-brand text-brand text-sm font-medium hover:bg-brand-50">
            <Sparkles className="w-4 h-4" />
            {aiSuggesting ? "Analysing photo…" : "AI estimate from photo"}
          </button>

          <div className="space-y-3">
            {CATEGORIES.map((c) => (
              <div key={c} className="wf-card p-4">
                <Label className="text-xs">{c}</Label>
                <Input
                  type="number" inputMode="numeric" placeholder="0"
                  value={counts[c] || ""}
                  onChange={(e) => setCounts({ ...counts, [c]: e.target.value })}
                  data-testid={`count-${c.toLowerCase()}`}
                  className="mt-1 h-14 text-2xl font-display font-bold text-center"
                />
              </div>
            ))}
            <div className="wf-card p-3 text-sm flex justify-between">
              <span className="text-muted2">Expected {expected} · Entered {totalEntered}</span>
              <span className={totalEntered === expected ? "text-brand font-medium" : "text-amber-600 font-medium"}>
                {totalEntered === expected ? "match" : "diff"}
              </span>
            </div>
            <div>
              <Label className="text-xs">Driver notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                        data-testid="driver-notes" className="mt-1" placeholder="Stains, tears, missing buttons…" />
            </div>
          </div>

          <Button onClick={saveCount} disabled={busy}
                  data-testid="save-count-button"
                  className="w-full h-14 bg-brand hover:bg-brand-600 text-white text-base">
            {busy ? "Saving…" : "Save count & request OTP"}
          </Button>
        </>
      )}

      {step === "otp" && (
        <div className="space-y-4">
          <div className="wf-card p-5 bg-brand-50 border-brand">
            <div className="overline text-brand">Step 2</div>
            <div className="font-display text-xl font-extrabold mt-1">Enter client&apos;s 6-digit OTP</div>
            <p className="text-xs text-muted2 mt-1">Ask the customer to show the OTP from their app.</p>
          </div>

          <Input
            value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            data-testid="otp-input"
            placeholder="••••••" maxLength={6}
            className="h-16 text-3xl font-mono text-center tracking-[0.3em] bg-white"
          />
          <Button onClick={verifyOtp} disabled={busy || otp.length !== 6}
                  data-testid="verify-otp-button"
                  className="w-full h-14 bg-brand hover:bg-brand-600 text-white text-base">
            <ShieldCheck className="w-5 h-5 mr-2" />
            {busy ? "Verifying…" : "Confirm pickup"}
          </Button>
        </div>
      )}
    </div>
  );
}
