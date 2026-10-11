import { z } from "zod";

export const assetTitleSchema = z.string().trim().min(1, "Titre requis").max(120, "120 caractères maximum");

export const registerAssetSchema = z.object({
  projectId: z.uuid(),
  assetId: z.uuid(),
  title: assetTitleSchema,
  storagePath: z.string().min(1),
});

export type RegisterAssetInput = z.infer<typeof registerAssetSchema>;
