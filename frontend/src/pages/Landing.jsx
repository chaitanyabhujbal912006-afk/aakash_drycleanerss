import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Sparkles, Truck } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Nav */}
      <nav className="border-b border-line bg-bg/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Logo variant="mark" className="w-9 h-9" />
            <div>
              <div className="font-display text-sm font-extrabold tracking-tight">AAKASH</div>
              <div className="text-[9px] tracking-[0.28em] text-muted2 -mt-0.5">DRYCLEANERS</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login" data-testid="nav-login">
              <Button variant="ghost" className="text-ink">Sign in</Button>
            </Link>
            <Link to="/register" data-testid="nav-register">
              <Button className="bg-brand hover:bg-brand-600 text-white">Get started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-12 gap-12 items-end">
        <div className="lg:col-span-7">
          <div className="overline">Premium laundry · Bengaluru</div>
          <h1 className="font-display text-6xl lg:text-7xl xl:text-8xl font-extrabold leading-[0.9] tracking-tight mt-4">
            Clothes that come back<br/>
            <span className="text-brand">exactly as you left them.</span>
          </h1>
          <p className="mt-8 text-lg text-muted2 max-w-xl leading-relaxed">
            Doorstep pickup, OTP-verified count, mismatch-proof handover and
            GST invoicing. All in one calm, obsessive workflow — built for
            drycleaners who care about the last button.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/register" data-testid="hero-cta-primary">
              <Button className="h-12 px-6 bg-brand hover:bg-brand-600 text-white text-base">
                Place your first order <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/login" data-testid="hero-cta-secondary">
              <Button variant="outline" className="h-12 px-6 border-line hover:border-brand text-base">
                See the admin demo
              </Button>
            </Link>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="border border-line rounded-lg overflow-hidden bg-white">
            <img
              src="https://images.unsplash.com/photo-1635274605638-d44babc08a4f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHwyfHxjbGVhbiUyMGZvbGRlZCUyMGxhdW5kcnl8ZW58MHx8fHwxNzgzMTg2MTI1fDA&ixlib=rb-4.1.0&q=85"
              alt="Perfectly folded laundry"
              className="w-full h-80 object-cover"
            />
            <div className="p-5 grid grid-cols-3 gap-4 border-t border-line">
              <Stat k="4-stage" v="Verification" />
              <Stat k="< 20" v="Hour turnaround" />
              <Stat k="18%" v="GST-ready" />
            </div>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="border-y border-line bg-white">
        <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-8">
          {[
            { icon: Truck, title: "Doorstep pickup", body: "Assign, dispatch and track drivers with live map & workload cards." },
            { icon: ShieldCheck, title: "OTP-verified count", body: "Every garment is counted, photographed and confirmed by both parties." },
            { icon: Sparkles, title: "Fabric-first care", body: "Washing, dry cleaning, ironing — logged stage by stage." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="wf-hover-lift">
              <div className="w-11 h-11 rounded-lg bg-brand-50 flex items-center justify-center">
                <Icon className="w-5 h-5 text-brand" />
              </div>
              <h3 className="font-display font-bold text-xl mt-4">{title}</h3>
              <p className="text-sm text-muted2 mt-2 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 text-xs text-muted2 flex justify-between">
        <div>© {new Date().getFullYear()} Aakash Drycleaners · WashFlow ERP</div>
        <div>Made with obsession, in Bengaluru.</div>
      </footer>
    </div>
  );
}

function Stat({ k, v }) {
  return (
    <div>
      <div className="font-display text-2xl font-extrabold text-brand leading-none">{k}</div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted2 mt-2">{v}</div>
    </div>
  );
}
