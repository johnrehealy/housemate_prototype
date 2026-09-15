import type { Metadata } from "next";
import { Placeholder } from "../_components/placeholder";

export const metadata: Metadata = { title: "To do" };

export default function TodoPage() {
  return <Placeholder area="To do" />;
}
