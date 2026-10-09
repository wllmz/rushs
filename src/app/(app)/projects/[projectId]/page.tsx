import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AddMemberForm } from "@/features/projects/components/add-member-form";
import { RoleBadge } from "@/features/projects/components/role-badge";
import { getProject } from "@/features/projects/queries";

async function loadProject(projectId: string) {
  // A malformed id would make Postgres throw: treat it as a missing project
  if (!z.uuid().safeParse(projectId).success) notFound();
  const project = await getProject(projectId);
  if (!project) notFound();
  return project;
}

export async function generateMetadata({ params }: PageProps<"/projects/[projectId]">): Promise<Metadata> {
  const project = await loadProject((await params).projectId);
  return { title: `${project.name} · Rushs` };
}

export default async function ProjectPage({ params }: PageProps<"/projects/[projectId]">) {
  const project = await loadProject((await params).projectId);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/projects" className="text-sm text-foreground/60 hover:text-foreground">
          ← Projets
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">{project.name}</h1>
          <RoleBadge role={project.myRole} />
        </div>
      </div>

      <section aria-labelledby="rushes" className="rounded-lg border border-dashed border-foreground/15 p-6">
        <h2 id="rushes" className="font-medium">
          Rushs
        </h2>
        <p className="mt-1 text-sm text-foreground/60">Le dépôt des fichiers arrive bientôt.</p>
      </section>

      <section aria-labelledby="members" className="flex flex-col gap-4">
        <h2 id="members" className="font-medium">
          Membres
        </h2>
        <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10">
          {project.members.map((member) => (
            <li key={member.userId} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="truncate text-sm">{member.fullName}</span>
              <RoleBadge role={member.role} />
            </li>
          ))}
        </ul>
        {project.isCreator && <AddMemberForm projectId={project.id} />}
      </section>
    </div>
  );
}
