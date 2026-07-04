import { useEffect, useState } from "react";
import api, { rupees } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, CreditCard } from "lucide-react";

export default function ClientInvoices() {
  const [invoices, setInvoices] = useState([]);

  const load = () => api.get("/invoices").then(({ data }) => setInvoices(data));
  useEffect(() => { load(); }, []);

  const pay = async (inv) => {
    try {
      await api.post(`/payments/create-order/${inv.id}`);
      // MOCKED razorpay — auto-verify for demo
      await api.post(`/payments/verify/${inv.id}`);
      toast.success(`Paid ${rupees(inv.total_paise)} · Thank you!`);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Payment failed"); }
  };

  return (
    <div className="space-y-4" data-testid="client-invoices">
      <div>
        <div className="overline">Payments</div>
        <h1 className="font-display text-3xl font-extrabold mt-1">Invoices</h1>
      </div>

      {invoices.length === 0 && (
        <div className="wf-card p-6 text-center text-sm text-muted2">
          No invoices yet. They appear once your order is delivered.
        </div>
      )}

      {invoices.map((i) => (
        <div key={i.id} className="wf-card p-4" data-testid={`client-invoice-${i.number}`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="font-mono text-xs text-muted2">{i.number}</div>
              <div className="font-medium mt-1">{i.order_number}</div>
              <div className="text-[11px] text-muted2 mt-1">{i.created_at.slice(0, 10)}</div>
            </div>
            <StatusBadge status={i.status} small />
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div className="font-display text-2xl font-extrabold text-brand">{rupees(i.total_paise)}</div>
            <div className="flex gap-2">
              <a
                href={`${process.env.REACT_APP_BACKEND_URL}/api/invoices/${i.id}/pdf?token=${localStorage.getItem("wf_token")}`}
                target="_blank" rel="noreferrer"
                data-testid={`client-invoice-pdf-${i.number}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-line text-xs hover:border-brand">
                <Download className="w-3 h-3" /> PDF
              </a>
              {i.status !== "paid" && (
                <Button size="sm" onClick={() => pay(i)}
                        data-testid={`client-invoice-pay-${i.number}`}
                        className="bg-brand hover:bg-brand-600 text-white h-8">
                  <CreditCard className="w-3 h-3 mr-1" /> Pay
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
