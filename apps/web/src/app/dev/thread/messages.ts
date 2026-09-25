/** The columns the thread view reads, as Supabase returns them. */
export const THREAD_COLUMNS =
  "id, direction, author, body, delivery_status, created_at";

export type ThreadMessage = {
  id: string;
  direction: "inbound" | "outbound";
  author: string;
  body: string;
  delivery_status: string;
  created_at: string;
};

/** How many of the latest texts the view shows. */
export const THREAD_LIMIT = 50;
