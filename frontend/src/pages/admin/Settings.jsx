import { useEffect, useState } from "react";
import api, { rupees } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function Settings() {
  const [biz, setBiz] = useState(null);
  const [services, setServices] = useState([]);
  const [team, setTeam] = useState([]);

  useEffect(() => {
    api.get("/business").then(({ data }) => setBiz(data));
    api.get("/services").then(({ data }) => setServices(data));
    api.get("/users").then(({ data }) => setTeam(data));
  }, []);

  const updateSvcRate = async (svc, newRate) => {
    await api.patch(`/services/${svc.id}`, { ...svc, rate_paise: Math.round(Number(newRate) * 100) });
    toast.success(`Updated ${svc.name}`);
    api.get("/services").then(({ data }) => setServices(data));
  };

  return (
    <div data-testid="admin-settings">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="overline">Configuration</div>
          <h1 className="font-display text-3xl font-extrabold mt-1">Settings</h1>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4 bg-white border border-line">
          <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
          <TabsTrigger value="pricing" data-testid="tab-pricing">Pricing</TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">Notifications</TabsTrigger>
          <TabsTrigger value="team" data-testid="tab-team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="wf-card p-6 max-w-2xl">
            <div className="overline mb-4">Business identity</div>
            <div className="grid gap-4">
              <div><Label className="text-xs">Business name</Label><Input readOnly value={biz?.name || ""} className="mt-1 h-11" /></div>
              <div><Label className="text-xs">Address</Label><Input readOnly value={biz?.address || ""} className="mt-1 h-11" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">GSTIN</Label><Input readOnly value={biz?.gstin || ""} className="mt-1 h-11 font-mono" /></div>
                <div><Label className="text-xs">Phone</Label><Input readOnly value={biz?.phone || ""} className="mt-1 h-11" /></div>
              </div>
              <div><Label className="text-xs">Email</Label><Input readOnly value={biz?.email || ""} className="mt-1 h-11" /></div>
            </div>
            <div className="text-[11px] text-muted2 mt-4">Managed via backend .env (BUSINESS_*).</div>
          </div>
        </TabsContent>

        <TabsContent value="pricing">
          <div className="wf-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-[0.15em] text-muted2 border-b border-line">
                <tr>
                  <th className="text-left px-5 py-3">Garment</th>
                  <th className="text-left px-5 py-3">Category</th>
                  <th className="text-left px-5 py-3">Service</th>
                  <th className="text-right px-5 py-3">Rate (₹)</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 font-medium">{s.name}</td>
                    <td className="px-5 py-3 text-muted2">{s.category}</td>
                    <td className="px-5 py-3 text-muted2">{s.service_type}</td>
                    <td className="px-5 py-3 text-right">
                      <input
                        type="number"
                        defaultValue={(s.rate_paise / 100).toFixed(0)}
                        onBlur={(e) => updateSvcRate(s, e.target.value)}
                        data-testid={`price-input-${s.id}`}
                        className="w-24 h-9 px-2 border border-line rounded-md text-right font-medium focus:outline-none focus:border-brand"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="wf-card p-6 max-w-2xl space-y-4">
            {[
              ["SMS OTP (Pickup)", true],
              ["SMS OTP (Delivery)", true],
              ["Push — order stage changes", true],
              ["Email invoices", false],
              ["WhatsApp updates", false],
            ].map(([label, on]) => (
              <div key={label} className="flex items-center justify-between border-b border-line pb-3 last:border-0">
                <div>
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs text-muted2 mt-0.5">Channel enabled for all customers</div>
                </div>
                <Switch defaultChecked={on} />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="team">
          <div className="wf-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-[0.15em] text-muted2 border-b border-line">
                <tr>
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-5 py-3">Phone</th>
                  <th className="text-left px-5 py-3">Role</th>
                </tr>
              </thead>
              <tbody>
                {team.map((t) => (
                  <tr key={t.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">{t.name}</td>
                    <td className="px-5 py-3 text-muted2">{t.email}</td>
                    <td className="px-5 py-3 font-mono text-xs">{t.phone}</td>
                    <td className="px-5 py-3 capitalize">
                      <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-brand-50 text-brand text-xs font-medium">
                        {t.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
