import { STATUS_LABELS, type ReviewStatus } from "../review-status";

const styles: Record<ReviewStatus, string> = {
  pending: "bg-foreground/10 text-foreground/70",
  changes_requested: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  approved: "bg-green-500/10 text-green-700 dark:text-green-300",
};

export function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
