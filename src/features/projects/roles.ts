import type { Database } from "@/lib/supabase/database.types";

export type ProjectRole = Database["public"]["Enums"]["project_role"];

export const PROJECT_ROLES = ["editor", "reviewer"] as const satisfies readonly ProjectRole[];

export const ROLE_LABELS: Record<ProjectRole, string> = {
  editor: "Monteur",
  reviewer: "Validateur",
};
