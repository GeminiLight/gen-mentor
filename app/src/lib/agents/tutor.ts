/** AI Chatbot Tutor: streams a reply grounded in the profile, optional context and history. */
import { fill, type PromptValue } from "@/lib/prompts/format";
import { tutorSystem, tutorTask } from "@/lib/prompts/tutor";
import type { ChatTurn } from "@/lib/schemas";
import { formatResources, webSearch } from "@/lib/search";
import { streamText } from "./run";

export interface TutorInput {
  messages: ChatTurn[];
  learner_profile?: PromptValue;
  external_resources?: string;
  use_search?: boolean;
}

const historyText = (messages: ChatTurn[]) => messages.map((m) => `${m.role}: ${m.content}`).join("\n");
const lastUserQuery = (messages: ChatTurn[]) => [...messages].reverse().find((m) => m.role === "user")?.content.trim() ?? "";

export async function tutorReply(input: TutorInput, onDelta?: (d: string) => void) {
  let external = input.external_resources ?? "";
  if (input.use_search ?? false) {
    const { text } = formatResources(await webSearch(lastUserQuery(input.messages)));
    if (text) external = external ? `${external}\n${text}` : text;
  }
  const user = fill(tutorTask, { learner_profile: input.learner_profile ?? "", external_resources: external, messages: historyText(input.messages) });
  return streamText({ tier: "fast", system: tutorSystem, messages: [{ role: "user", content: user }] }, onDelta);
}
