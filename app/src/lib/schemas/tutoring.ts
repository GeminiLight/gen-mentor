import { z } from "zod";

export const ChatTurn = z.object({ role: z.enum(["user", "assistant"]), content: z.string() });
export type ChatTurn = z.infer<typeof ChatTurn>;
export const ChatHistory = z.array(ChatTurn).min(1, "At least one message is required.");
