import { z } from 'zod';

export const listReportsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  sort: z.enum(['newest', 'oldest']).optional().default('newest'),
});

export const correctBiomarkerSchema = z.object({
  value: z.number(),
  unit: z.string().optional(),
});

export type ListReportsInput = z.infer<typeof listReportsSchema>;
export type CorrectBiomarkerInput = z.infer<typeof correctBiomarkerSchema>;
