import type { Metadata } from "next";
import { OnboardingPage } from "@/features/onboarding/onboarding-page";

export const metadata: Metadata = { title: "Start with a goal" };

export default function Page() {
  return <OnboardingPage />;
}
