import type { Metadata } from "next";
import { requireMember } from "@/lib/auth/session";
import { Placeholder } from "../_components/placeholder";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatPage() {
  await requireMember();
  return <Placeholder area="Chat" />;
}
