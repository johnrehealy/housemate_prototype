import type { Metadata } from "next";
import { requireMember } from "@/lib/auth/session";
import { Placeholder } from "../_components/placeholder";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage() {
  await requireMember();
  return <Placeholder area="Services" />;
}
