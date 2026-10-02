import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";

/** Ops opens on the waitlist. */
export default async function OpsPage() {
  await requireStaff();
  redirect("/ops/waitlist");
}
