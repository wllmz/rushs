import "server-only";
import { getCurrentUser } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";
import type { ProjectRole } from "./roles";

export type ProjectSummary = {
  id: string;
  name: string;
  createdAt: string;
  myRole: ProjectRole;
};

export type ProjectMember = {
  userId: string;
  fullName: string;
  role: ProjectRole;
};

export type ProjectDetail = {
  id: string;
  name: string;
  isCreator: boolean;
  myRole: ProjectRole;
  members: ProjectMember[];
};

// RLS already limits the rows to the user's projects: the user filter picks their own membership
export async function listMyProjects(): Promise<ProjectSummary[]> {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("project_members")
    .select("role, projects (id, name, created_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not list projects: ${error.message}`);

  return data.map(({ role, projects }) => ({
    id: projects.id,
    name: projects.name,
    createdAt: projects.created_at,
    myRole: role,
  }));
}

// null when the project does not exist or the user is not a member: RLS hides both the same way
export async function getProject(projectId: string): Promise<ProjectDetail | null> {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, created_by, project_members (user_id, role, profiles (full_name))")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw new Error(`Could not load the project: ${error.message}`);
  if (!data) return null;

  const members = data.project_members.map((member) => ({
    userId: member.user_id,
    fullName: member.profiles.full_name,
    role: member.role,
  }));
  const me = members.find((member) => member.userId === user.id);
  if (!me) return null;

  return {
    id: data.id,
    name: data.name,
    isCreator: data.created_by === user.id,
    myRole: me.role,
    members,
  };
}
