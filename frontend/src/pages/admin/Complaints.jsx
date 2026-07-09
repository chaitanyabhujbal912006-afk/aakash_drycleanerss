import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { MessageSquare, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_META = {
  open:       { label: "Open",       cls: "bg-red-50 text-red-700",    icon: AlertCircle },
  in_review:  { label: "In Review",  cls: "bg-amber-50 text-amber-700", icon: Clock },
  resolved:   { label: "Resolved",   cls: "bg-green-50 text-green-700", icon: CheckCircle2 },
  closed:     { label: "Closed",     cls: "bg-gray-100 text-gray-500",  icon: CheckCircle2 },
};

function ComplaintBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.open;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${meta.cls}`}>
      <Icon className="w-3 h-3" /> {meta.label}
    </span>
  );
}

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [filter, setFilter] = useState("open");
  const [resolving, setResolving] = useState(null);

  const load = () =>
    api.get("/complaints").then(({ data }) => setComplaints(data));

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, newStatus) => {
    setResolving(id);
    try {
      await api.patch(`/complaints/${id}`, { status: newStatus });
      toast.success(`Complaint marked as ${newStatus}`);
      load();
    } catch {
      toast.error("Failed to update complaint");
    } finally {
      setResolving(null);
    }
  };

  const tabs = ["open", "in_review", "resolved", "closed"];
  const visible = complaints.filter((c) =>
    filter === "all" ? true : c.status === filter
  );

  const counts = tabs.reduce((acc, t) => {
    acc[t] = complaints.filter((c) => c.status === t).length;
    return acc;
  }, {});

  return (
    <div data-testid="admin-complaints">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="overline">Support queue</div>
          <h1 className="font-display text-3xl font-extrabold mt-1">Complaints</h1>
        </div>
        <div className="text-xs text-muted2">
          {complaints.filter((c) => c.status === "open").length} open
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[...tabs, "all"].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            data-testid={`filter-${t}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              filter === t
                ? "bg-brand text-white border-brand"
                : "bg-white border-line text-muted2 hover:border-brand hover:text-brand"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1).replace("_", " ")}
            {t !== "all" && counts[t] != null && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                filter === t ? "bg-white/20 text-white" : "bg-brand-50 text-brand"
              }`}>
                {counts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.length === 0 && (
          <div className="wf-card p-8 text-center text-sm text-muted2">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No {filter === "all" ? "" : filter} complaints.
          </div>
        )}

        {visible.map((c) => (
          <div key={c.id} className="wf-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <ComplaintBadge status={c.status} />
                  {c.order_id && (
                    <span className="font-mono text-[10px] text-muted2 bg-bg px-1.5 py-0.5 rounded">
                      {c.order_number || c.order_id.slice(-8).toUpperCase()}
                    </span>
                  )}
                  <span className="text-[10px] text-muted2">
                    {new Date(c.created_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="mt-2">
                  <div className="font-semibold text-sm">{c.subject}</div>
                  <div className="text-xs text-muted2 mt-1 leading-relaxed">{c.message}</div>
                </div>

                {c.client_name && (
                  <div className="mt-2 text-xs text-muted2">
                    By <span className="font-medium text-ink">{c.client_name}</span>
                    {c.client_email && ` · ${c.client_email}`}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 shrink-0">
                {c.status === "open" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 border-amber-300 text-amber-700 hover:bg-amber-50"
                    disabled={resolving === c.id}
                    onClick={() => updateStatus(c.id, "in_review")}
                    data-testid={`review-${c.id}`}
                  >
                    Mark In Review
                  </Button>
                )}
                {(c.status === "open" || c.status === "in_review") && (
                  <Button
                    size="sm"
                    className="text-xs h-8 bg-brand hover:bg-brand-600 text-white"
                    disabled={resolving === c.id}
                    onClick={() => updateStatus(c.id, "resolved")}
                    data-testid={`resolve-${c.id}`}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Resolve
                  </Button>
                )}
                {c.status === "resolved" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 text-gray-500 border-line"
                    disabled={resolving === c.id}
                    onClick={() => updateStatus(c.id, "closed")}
                    data-testid={`close-${c.id}`}
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
