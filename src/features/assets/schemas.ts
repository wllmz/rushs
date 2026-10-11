import { z } from "zod";

export const assetTitleSchema = z.string().trim().min(1, "Titre requis").max(120, "120 caractères maximum");

export const registerAssetSchema = z.object({
  projectId: z.uuid(),
  assetId: z.uuid(),
  title: assetTitleSchema,
  // {project_id}/{asset_id}/{file_id}.{ext}: register_asset checks the ids, this bounds the input
  storagePath: z.string().max(255).regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]+$/),
});

export type RegisterAssetInput = z.infer<typeof registerAssetSchema>;
