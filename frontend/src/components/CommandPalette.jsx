import { useEffect, useState } from "react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Send, Sparkles, LayoutDashboard, Package, Users, Receipt, Truck } from "lucide-react";

export default function CommandPalette({ open, onOpenChange }) {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!open) { setQ(""); setAnswer(""); } }, [open]);

  const go = (path) => { onOpenChange(false); nav(path); };

  const ask = async () => {
    if (!q.trim()) return;
    setBusy(true); setAnswer("");
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/ai/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("wf_token")}`,
          },
          body: JSON.stringify({ session_id: "admin-cmdk", message: q }),
        }
      );
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnswer((a) => a + dec.decode(value));
      }
    } catch (e) {
      setAnswer(`Error: ${e.message}`);
    } finally { setBusy(false); }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Ask ops copilot or jump to…"
        value={q}
        onValueChange={setQ}
        data-testid="cmdk-input"
        onKeyDown={(e) => { if (e.key === "Enter" && e.shiftKey === false) { e.preventDefault(); ask(); } }}
      />
      <CommandList>
        {answer && (
          <div className="px-4 py-4 border-b border-line">
            <div className="overline mb-2 flex items-center gap-2"><Sparkles className="w-3 h-3" /> Copilot</div>
            <div className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{answer}{busy && "▋"}</div>
          </div>
        )}
        <CommandEmpty>No results. Press Enter to ask the AI copilot.</CommandEmpty>
        <CommandGroup heading="Ask">
          <CommandItem onSelect={ask} data-testid="cmdk-ask-ai">
            <Send className="w-4 h-4 mr-2" /> Ask copilot: “{q || "how many mismatches this week?"}”
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Jump to">
          <CommandItem onSelect={() => go("/admin")}><LayoutDashboard className="w-4 h-4 mr-2" />Dashboard</CommandItem>
          <CommandItem onSelect={() => go("/admin/orders")}><Package className="w-4 h-4 mr-2" />Orders</CommandItem>
          <CommandItem onSelect={() => go("/admin/delivery")}><Truck className="w-4 h-4 mr-2" />Delivery</CommandItem>
          <CommandItem onSelect={() => go("/admin/customers")}><Users className="w-4 h-4 mr-2" />Customers</CommandItem>
          <CommandItem onSelect={() => go("/admin/invoices")}><Receipt className="w-4 h-4 mr-2" />Invoices</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
