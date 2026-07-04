import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Register() {
  const nav = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "", email: "", phone: "+91", password: "", address: "",
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await register({ ...form, role: "client" });
      toast.success("Account ready. Welcome to Aakash!");
      nav("/app", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-3 mb-8">
          <Logo variant="mark" className="w-10 h-10" />
          <div>
            <div className="font-display text-base font-extrabold">AAKASH</div>
            <div className="text-[9px] tracking-[0.28em] text-muted2">DRYCLEANERS</div>
          </div>
        </Link>

        <div className="overline">Create account</div>
        <h1 className="font-display text-4xl font-extrabold mt-2">Meet your new laundry ritual.</h1>

        <form onSubmit={submit} className="mt-8 space-y-4 bg-white p-6 rounded-lg border border-line">
          <div>
            <Label className="text-xs">Full name</Label>
            <Input required value={form.name} data-testid="reg-name"
                   onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 h-11" />
          </div>
          <div>
            <Label className="text-xs">Phone (+91)</Label>
            <Input required value={form.phone} data-testid="reg-phone"
                   onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 h-11" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input type="email" required value={form.email} data-testid="reg-email"
                   onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 h-11" />
          </div>
          <div>
            <Label className="text-xs">Password</Label>
            <Input type="password" required value={form.password} data-testid="reg-password"
                   onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1 h-11" />
          </div>
          <div>
            <Label className="text-xs">Default pickup address</Label>
            <Input value={form.address} data-testid="reg-address"
                   onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1 h-11" />
          </div>
          <Button type="submit" disabled={busy} data-testid="reg-submit"
                  className="w-full h-11 bg-brand hover:bg-brand-600 text-white">
            {busy ? "Creating…" : "Create account"}
          </Button>
        </form>

        <div className="mt-6 text-sm text-muted2 text-center">
          Already with us?{" "}
          <Link to="/login" data-testid="link-login" className="text-brand font-medium hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
