import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { MapPin, RefreshCw, Navigation } from "lucide-react";

/* ------------------------------------------------------------------ 
   Leaflet loaded from CDN — no npm install needed, works in CRA.
   We inject it once then use window.L.
------------------------------------------------------------------ */
function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) return resolve(window.L);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve(window.L);
    document.head.appendChild(script);
  });
}

const STATUS_COLOR = {
  assigned: "#f59e0b",
  picked_up: "#3b82f6",
  at_shop: "#8b5cf6",
  washing: "#06b6d4",
  ironing: "#10b981",
  ready: "#22c55e",
  out_for_delivery: "#f97316",
  delivered: "#6b7280",
};

export default function DeliveryMap() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [pings, setPings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let interval;
    (async () => {
      const L = await loadLeaflet();
      if (!mapRef.current || mapInstanceRef.current) return;

      const map = L.map(mapRef.current, { zoomControl: true }).setView([12.9716, 77.5946], 12);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      await fetchAndRender(L, map);
      interval = setInterval(() => fetchAndRender(L, map), 30000);
    })();

    return () => {
      clearInterval(interval);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAndRender = async (L, map) => {
    try {
      const [pingsRes, ordersRes] = await Promise.all([
        api.get("/gps/drivers"),
        api.get("/orders"),
      ]);
      const newPings = pingsRes.data;
      const newOrders = ordersRes.data;
      setPings(newPings);
      setOrders(newOrders);
      setLastRefresh(new Date());

      // Build order lookup
      const orderMap = {};
      newOrders.forEach((o) => { orderMap[o.id] = o; });

      // Update / create markers
      const seenIds = new Set();
      newPings.forEach((ping) => {
        seenIds.add(ping.driver_id);
        const order = ping.order_id ? orderMap[ping.order_id] : null;
        const color = order ? (STATUS_COLOR[order.status] || "#6366f1") : "#6366f1";

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:40px;height:40px;border-radius:50% 50% 50% 0;
            background:${color};border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            transform:rotate(-45deg);font-size:16px;
          "><span style="transform:rotate(45deg)">🚗</span></div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
        });

        const popupHtml = `
          <div style="font-family:sans-serif;font-size:13px;min-width:160px">
            <strong>${ping.driver_name}</strong><br/>
            ${order ? `<span style="color:#6366f1">Order: ${order.number}</span><br/>
            Status: <strong>${order.status.replace(/_/g," ")}</strong><br/>
            Client: ${order.client_name}` : "No active order"}
            <br/><small style="color:#888">Updated: ${new Date(ping.at).toLocaleTimeString()}</small>
          </div>`;

        if (markersRef.current[ping.driver_id]) {
          markersRef.current[ping.driver_id]
            .setLatLng([ping.lat, ping.lng])
            .setIcon(icon)
            .getPopup().setContent(popupHtml);
        } else {
          const marker = L.marker([ping.lat, ping.lng], { icon })
            .addTo(map)
            .bindPopup(popupHtml);
          markersRef.current[ping.driver_id] = marker;
        }
      });

      // Remove stale markers
      Object.keys(markersRef.current).forEach((id) => {
        if (!seenIds.has(id)) {
          markersRef.current[id].remove();
          delete markersRef.current[id];
        }
      });
    } catch {
      // silent — admin might not have network
    } finally {
      setLoading(false);
    }
  };

  const manualRefresh = () => {
    if (!mapInstanceRef.current) return;
    setLoading(true);
    fetchAndRender(window.L, mapInstanceRef.current);
  };

  const activeDrivers = pings.length;
  const activeOrders = orders.filter(o => !["delivered","cancelled"].includes(o.status)).length;

  return (
    <div className="space-y-4" data-testid="delivery-map">
      <div className="flex items-center justify-between">
        <div>
          <div className="overline">Live</div>
          <h1 className="font-display text-2xl font-extrabold mt-1">Delivery Map</h1>
        </div>
        <button
          onClick={manualRefresh}
          className="flex items-center gap-2 text-sm text-brand hover:text-brand-600 font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="wf-card p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
            <Navigation className="w-4 h-4 text-brand" />
          </div>
          <div>
            <div className="text-lg font-bold">{activeDrivers}</div>
            <div className="text-xs text-muted2">Active Drivers</div>
          </div>
        </div>
        <div className="wf-card p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <div className="text-lg font-bold">{activeOrders}</div>
            <div className="text-xs text-muted2">Active Orders</div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="wf-card overflow-hidden" style={{ height: "420px", position: "relative" }}>
        {pings.length === 0 && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-surface/80 pointer-events-none">
            <Navigation className="w-10 h-10 text-muted2 mb-2" />
            <p className="text-sm text-muted2">No drivers are broadcasting GPS yet.</p>
            <p className="text-xs text-muted2 mt-1">Drivers share location automatically when on the Pickup page.</p>
          </div>
        )}
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      </div>

      {/* Driver list */}
      {pings.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted2 uppercase tracking-wide">Driver Locations</div>
          {pings.map((p) => {
            const order = orders.find(o => o.id === p.order_id);
            return (
              <div key={p.driver_id} className="wf-card p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{p.driver_name}</div>
                  {order && <div className="text-xs text-muted2 mt-0.5">{order.number} · {order.status.replace(/_/g," ")}</div>}
                </div>
                <div className="text-xs text-muted2">
                  {new Date(p.at).toLocaleTimeString()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lastRefresh && (
        <p className="text-xs text-muted2 text-center">
          Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 30s
        </p>
      )}
    </div>
  );
}
