import type { Metadata } from "next";
import { requireMember } from "@/lib/auth/session";
import { Placeholder } from "../_components/placeholder";

export const metadata: Metadata = { title: "Property" };

export default async function PropertyPage() {
  await requireMember();
  return <Placeholder area="Property" />;
}
