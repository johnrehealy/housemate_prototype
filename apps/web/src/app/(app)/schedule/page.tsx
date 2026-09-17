import type { Metadata } from "next";
import { requireMember } from "@/lib/auth/session";
import { Placeholder } from "../_components/placeholder";

export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage() {
  await requireMember();
  return <Placeholder area="Schedule" />;
}
