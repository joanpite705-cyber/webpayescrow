import { Badge } from "@/components/ui/badge";

const statusStyles: Record<string, string> = {
  pending: "status-pending",
  active: "status-active",
  paid: "status-pending",
  confirmed: "status-completed",
  completed: "status-completed",
  disputed: "status-disputed",
  cancelled: "status-cancelled",
  submitted: "status-pending",
  rejected: "status-disputed",
  open: "status-disputed",
  under_review: "status-pending",
  resolved: "status-completed",
  closed: "status-cancelled",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`${statusStyles[status] || ""} text-xs font-medium`}>
      {status.replace(/_/g, " ").toUpperCase()}
    </Badge>
  );
}
