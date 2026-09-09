import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SessionView } from "@/features/session/session-view";

export const metadata: Metadata = { title: "Session" };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const index = Number.parseInt(id, 10);
  if (!Number.isInteger(index) || index < 0) notFound();
  return <SessionView index={index} />;
}
