import type { Database } from "@/lib/supabase/database.types";

export type ReviewStatus = Database["public"]["Enums"]["review_status"];

export const REVIEW_STATUSES = ["pending", "changes_requested", "approved"] as const satisfies readonly ReviewStatus[];

export const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "En attente",
  changes_requested: "Modifications demandées",
  approved: "Validé",
};
