import type { Metadata } from "next";
import { PathView } from "@/features/path/path-view";

export const metadata: Metadata = { title: "Learning path" };

export default function LearningPathPage() {
  return <PathView />;
}
