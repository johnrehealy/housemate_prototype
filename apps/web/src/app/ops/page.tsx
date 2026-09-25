import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";

/** Costs is the only ops page so far. */
export default async function OpsPage() {
  await requireStaff();
  redirect("/ops/costs");
}
