import type { Metadata } from "next";
import { requireMember } from "@/lib/auth/session";
import { Placeholder } from "../_components/placeholder";

export const metadata: Metadata = { title: "Errands" };

export default async function ErrandsPage() {
  await requireMember();
  return <Placeholder area="Errands" />;
}
