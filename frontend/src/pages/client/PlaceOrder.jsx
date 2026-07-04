import { useEffect, useMemo, useState } from "react";
import api, { rupees } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Minus, Plus } from "lucide-react";

export default function PlaceOrder() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [qty, setQty] = useState({});
  const [address, setAddress] = useState(user?.address || "");
  const [slot, setSlot] = useState("Today 5pm-7pm");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [catFilter, setCatFilter] = useState("All");

  useEffect(() => { api.get("/services").then(({ data }) => setServices(data)); }, []);

  const cats = ["All", ...Array.from(new Set(services.map((s) => s.category)))];
  const filtered = catFilter === "All" ? services : services.filter((s) => s.category === catFilter);

  const items = Object.entries(qty).filter(([, q]) => q > 0).map(([id, q]) => ({ service_id: id, quantity: q }));
  const subtotal = items.reduce((s, { service_id, quantity }) => {
    const svc = services.find((x) => x.id === service_id);
    return s + (svc ? svc.rate_paise * quantity : 0);
  }, 0);
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;

  const submit = async () => {
    if (items.length === 0) return toast.error("Add at least one item");
    if (!address.trim()) return toast.error("Enter a pickup address");
    setBusy(true);
    try {
      const { data } = await api.post("/orders", { items, pickup_address: address, pickup_slot: slot, notes });
      toast.success(`Order ${data.number} placed`);
      nav(`/app/orders/${data.id}`);
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-5 pb-24" data-testid="place-order">
      <div>
        <div className="overline">New order</div>
        <h1 className="font-display text-3xl font-extrabold mt-1">Place order</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto py-1 -mx-1 px-1">
        {cats.map((c) => (
          <button key={c} onClick={() => setCatFilter(c)}
                  data-testid={`cat-chip-${c}`}
                  className={`px-3 py-1.5 rounded-full text-xs border whitespace-nowrap transition ${
                    catFilter === c ? "bg-brand text-white border-brand" : "bg-white border-line text-muted2 hover:border-brand"
                  }`}>{c}</button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((s) => {
          const n = qty[s.id] || 0;
          return (
            <div key={s.id} className="wf-card p-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{s.name}</div>
                <div className="text-[11px] text-muted2">{s.category} · {s.service_type}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm font-mono">{rupees(s.rate_paise)}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQty({ ...qty, [s.id]: Math.max(0, n - 1) })}
                          data-testid={`qty-minus-${s.id}`}
                          className="w-8 h-8 rounded-full border border-line flex items-center justify-center hover:border-brand">
                    <Minus className="w-3 h-3" />
                  </button>
                  <div className="w-6 text-center text-sm font-medium">{n}</div>
                  <button onClick={() => setQty({ ...qty, [s.id]: n + 1 })}
                          data-testid={`qty-plus-${s.id}`}
                          className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="wf-card p-4 space-y-3">
        <div><Label className="text-xs">Pickup address</Label>
          <Textarea value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" data-testid="pickup-address" /></div>
        <div><Label className="text-xs">Pickup slot</Label>
          <Input value={slot} onChange={(e) => setSlot(e.target.value)} className="mt-1 h-11" data-testid="pickup-slot" /></div>
        <div><Label className="text-xs">Notes for driver</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" data-testid="pickup-notes" /></div>
      </div>

      <div className="wf-card p-4 text-sm">
        <div className="flex justify-between"><span className="text-muted2">Subtotal</span><span>{rupees(subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-muted2">GST (18%)</span><span>{rupees(gst)}</span></div>
        <div className="flex justify-between font-medium text-brand text-base mt-2"><span>Total</span><span>{rupees(total)}</span></div>
      </div>

      <div className="sticky bottom-24 z-10">
        <Button onClick={submit} disabled={busy}
                data-testid="submit-order-button"
                className="w-full h-12 bg-brand hover:bg-brand-600 text-white text-base">
          {busy ? "Placing…" : "Confirm order"}
        </Button>
      </div>
    </div>
  );
}
