import type { Metadata } from "next";
import { requireMember } from "@/lib/auth/session";
import { Placeholder } from "../_components/placeholder";

export const metadata: Metadata = { title: "To do" };

export default async function TodoPage() {
  await requireMember();
  return <Placeholder area="To do" />;
}
