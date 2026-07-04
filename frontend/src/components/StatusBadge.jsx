const STATUS_META = {
  pending:          { color: "#F59E0B", label: "Pending" },
  assigned:         { color: "#3B82F6", label: "Assigned" },
  picked_up:        { color: "#8B5CF6", label: "Picked up" },
  at_shop:          { color: "#6366F1", label: "At shop" },
  washing:          { color: "#0EA5E9", label: "Washing" },
  ironing:          { color: "#14B8A6", label: "Ironing" },
  ready:            { color: "#10B981", label: "Ready" },
  out_for_delivery: { color: "#F97316", label: "Out for delivery" },
  delivered:        { color: "#0C5E48", label: "Delivered" },
  cancelled:        { color: "#94A3B8", label: "Cancelled" },
  paid:             { color: "#0C5E48", label: "Paid" },
  open:             { color: "#F59E0B", label: "Open" },
  overdue:          { color: "#DC2626", label: "Overdue" },
};

export function statusColor(s) { return STATUS_META[s]?.color || "#94A3B8"; }
export function statusLabel(s) { return STATUS_META[s]?.label || s; }

export function StatusBadge({ status, className = "", small = false }) {
  const meta = STATUS_META[status] || { color: "#94A3B8", label: status };
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={`inline-flex items-center rounded-full border border-line bg-white ${small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"} font-medium text-ink ${className}`}
    >
      <span
        className="status-dot"
        style={{
          background: meta.color,
          boxShadow: `0 0 8px ${meta.color}90`,
        }}
      />
      {meta.label}
    </span>
  );
}
