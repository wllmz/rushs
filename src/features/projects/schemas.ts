import { z } from "zod";
import { PROJECT_ROLES } from "./roles";

const role = z.enum(PROJECT_ROLES, "Choisissez un rôle");

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(100, "100 caractères maximum"),
  role,
});

export const addMemberSchema = z.object({
  projectId: z.uuid(),
  email: z.email("Adresse e-mail invalide"),
  role,
});
