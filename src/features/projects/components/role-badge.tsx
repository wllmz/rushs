import { ROLE_LABELS, type ProjectRole } from "../roles";

const styles: Record<ProjectRole, string> = {
  editor: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  reviewer: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

export function RoleBadge({ role }: { role: ProjectRole }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}
