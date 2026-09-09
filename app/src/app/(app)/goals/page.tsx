import type { Metadata } from "next";
import { GoalsView } from "@/features/goals/goals-view";

export const metadata: Metadata = { title: "Goals" };

export default function GoalsPage() {
  return <GoalsView />;
}
