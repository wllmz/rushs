import { z } from "zod";

export const commentBodySchema = z
  .string()
  .trim()
  .min(1, "Écrivez un commentaire")
  .max(2000, "2000 caractères maximum");

export const addCommentSchema = z.object({
  projectId: z.uuid(),
  assetId: z.uuid(),
  versionId: z.uuid(),
  body: commentBodySchema,
  // Seconds from the start of a video, within numeric(10, 3); null for an image or the whole version
  timecode: z.number().nonnegative().max(9_999_999).nullable(),
});

export type AddCommentInput = z.infer<typeof addCommentSchema>;
