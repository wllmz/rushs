import type { Metadata } from "next";

export const metadata: Metadata = { title: "Projets · Rushs" };

// Placeholder until the projects feature (#3)
export default function ProjectsPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Projets</h1>
      <p className="mt-2 text-foreground/70">Aucun projet pour l&apos;instant.</p>
    </>
  );
}
