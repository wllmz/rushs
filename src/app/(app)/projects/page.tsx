import type { Metadata } from "next";
import Link from "next/link";
import { CreateProjectForm } from "@/features/projects/components/create-project-form";
import { RoleBadge } from "@/features/projects/components/role-badge";
import { listMyProjects } from "@/features/projects/queries";

export const metadata: Metadata = { title: "Projets · Rushs" };

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export default async function ProjectsPage() {
  const projects = await listMyProjects();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Projets</h1>

      <section aria-labelledby="new-project" className="rounded-lg border border-foreground/10 p-4">
        <h2 id="new-project" className="mb-4 text-sm font-medium text-foreground/70">
          Nouveau projet
        </h2>
        <CreateProjectForm />
      </section>

      {projects.length === 0 ? (
        <p className="text-foreground/70">
          Aucun projet pour l&apos;instant. Créez le premier, ou demandez à un collègue de vous ajouter
          au sien.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="flex flex-col gap-2 rounded-lg border border-foreground/10 p-4 transition-colors hover:border-foreground/30"
              >
                <span className="truncate font-medium">{project.name}</span>
                <span className="flex items-center justify-between gap-2 text-sm text-foreground/60">
                  <RoleBadge role={project.myRole} />
                  {dateFormat.format(new Date(project.createdAt))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
