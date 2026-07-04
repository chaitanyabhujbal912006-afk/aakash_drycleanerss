import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name}`);
      nav(u.role === "admin" ? "/admin" : u.role === "delivery" ? "/delivery" : "/app", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally { setBusy(false); }
  };

  const quickLogin = (e, p) => { setEmail(e); setPassword(p); };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg">
      {/* Left panel: brand */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-brand text-white relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-white/5 blur-3xl"></div>
        <div className="flex items-center gap-3 relative">
          <Logo variant="mark" className="w-11 h-11" />
          <div>
            <div className="font-display text-lg font-extrabold tracking-tight">AAKASH</div>
            <div className="text-[10px] tracking-[0.28em] opacity-80 -mt-0.5">DRYCLEANERS</div>
          </div>
        </div>
        <div className="relative">
          <div className="overline text-white/70">WashFlow ERP</div>
          <h1 className="font-display text-5xl xl:text-6xl font-extrabold leading-none mt-3 text-white tracking-tight">
            Every fold,<br/>every fibre,<br/>accounted for.
          </h1>
          <p className="mt-6 text-white/80 max-w-md text-sm leading-relaxed">
            The operations backbone for premium Indian drycleaners — from pickup OTP
            to GST invoice, all in one calm workflow.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-3">
          {[
            { k: "Orders / day", v: "230+" },
            { k: "Uptime", v: "99.9%" },
            { k: "Cities", v: "8" },
          ].map((s) => (
            <div key={s.k} className="border border-white/15 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">{s.k}</div>
              <div className="font-display font-bold text-xl mt-1">{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel: form */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <Logo variant="mark" className="w-10 h-10" />
            <div>
              <div className="font-display text-base font-extrabold">AAKASH</div>
              <div className="text-[9px] tracking-[0.28em] text-muted2">DRYCLEANERS</div>
            </div>
          </div>

          <div className="overline">Sign in</div>
          <h2 className="font-display text-4xl font-extrabold mt-2">Welcome back.</h2>
          <p className="text-sm text-muted2 mt-2">Pick up right where you left off.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input id="email" type="email" required value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     data-testid="login-email-input"
                     className="mt-1 h-11" placeholder="you@example.com" />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs">Password</Label>
              <Input id="password" type="password" required value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     data-testid="login-password-input"
                     className="mt-1 h-11" placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={busy}
                    data-testid="login-submit-button"
                    className="w-full h-11 bg-brand hover:bg-brand-600 text-white font-medium">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-8 border border-line bg-white rounded-lg p-4">
            <div className="overline mb-2">Demo accounts</div>
            <div className="grid gap-2 text-xs">
              {[
                ["admin@aakash.in", "admin123", "Admin dashboard"],
                ["driver@aakash.in", "driver123", "Delivery agent"],
                ["priya@example.com", "priya123", "Client"],
              ].map(([e, p, l]) => (
                <button type="button" key={e}
                        data-testid={`demo-login-${l.split(" ")[0].toLowerCase()}`}
                        onClick={() => quickLogin(e, p)}
                        className="flex items-center justify-between w-full px-3 py-2 rounded-md border border-line hover:border-brand hover:bg-brand-50 transition text-left">
                  <span>
                    <div className="font-medium text-ink">{l}</div>
                    <div className="text-muted2 font-mono text-[11px]">{e}</div>
                  </span>
                  <span className="kbd">use</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 text-sm text-muted2">
            New customer?{" "}
            <Link to="/register" data-testid="link-register" className="text-brand font-medium hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
