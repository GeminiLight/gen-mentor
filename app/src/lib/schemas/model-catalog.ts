import { z } from "zod";
import { ByokHeaders } from "../llm/config";

export const ModelCatalogRequest = ByokHeaders.pick({ provider: true, apiKey: true, baseUrl: true }).extend({
  baseUrl: z.string().trim().url().refine((value) => {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash;
  }).optional(),
});
export type ModelConnection = z.infer<typeof ModelCatalogRequest>;
export const ModelCatalog = z.object({
  models: z.array(z.object({ id: z.string().min(1).max(120), name: z.string().max(200).optional() })).max(3000),
  truncated: z.boolean(),
});
export type ModelCatalogData = z.infer<typeof ModelCatalog>;
