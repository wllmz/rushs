import { z } from "zod";

export const assetTitleSchema = z.string().trim().min(1, "Titre requis").max(120, "120 caractères maximum");

// {project_id}/{asset_id}/{file_id}.{ext}: the database functions check the ids, this bounds the input
const storagePathSchema = z
  .string()
  .max(255)
  .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]+$/);

export const registerAssetSchema = z.object({
  projectId: z.uuid(),
  assetId: z.uuid(),
  title: assetTitleSchema,
  storagePath: storagePathSchema,
});

export type RegisterAssetInput = z.infer<typeof registerAssetSchema>;

export const addVersionSchema = z.object({
  projectId: z.uuid(),
  assetId: z.uuid(),
  storagePath: storagePathSchema,
});

export type AddVersionInput = z.infer<typeof addVersionSchema>;
