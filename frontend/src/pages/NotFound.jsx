import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const { user } = useAuth();
  const home = user
    ? user.role === "admin" ? "/admin"
    : user.role === "delivery" ? "/delivery"
    : "/app"
    : "/";

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="font-display text-[120px] font-extrabold leading-none text-brand/10 select-none">
          404
        </div>
        <h1 className="font-display text-3xl font-extrabold mt-4 -translate-y-8">
          Page not found
        </h1>
        <p className="text-muted2 text-sm mt-2 -translate-y-6 leading-relaxed">
          This page doesn't exist or has been moved. If you think this is an
          error, please contact support.
        </p>
        <div className="flex gap-3 justify-center mt-2 -translate-y-4">
          <Button
            variant="outline"
            className="border-line hover:border-brand"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Go back
          </Button>
          <Link to={home}>
            <Button className="bg-brand hover:bg-brand-600 text-white">
              <Home className="w-4 h-4 mr-2" /> Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
