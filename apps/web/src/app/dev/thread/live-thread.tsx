"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { THREAD_COLUMNS, THREAD_LIMIT, type ThreadMessage } from "./messages";

type Status = "connecting" | "live" | "offline";

/** Adds or replaces texts by ID, oldest first, keeping the latest few. */
function merge(current: ThreadMessage[], incoming: ThreadMessage[]) {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-THREAD_LIMIT);
}

export function LiveThread({
  homeId,
  initial,
}: {
  homeId: string;
  initial: ThreadMessage[];
}) {
  const [thread, setThread] = useState(initial);
  const [status, setStatus] = useState<Status>("connecting");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let stopped = false;

    async function listen() {
      // Load the member's token before joining. Otherwise the join can go out
      // with only the publishable key, Realtime can't apply row-level security
      // to it, and the Postgres binding is refused without an error here.
      await supabase.realtime.setAuth();
      if (stopped) return;

      channel = supabase
        // `wait`: "subscribed" only once the Postgres binding is registered.
        .channel(`thread:${homeId}`, {
          config: { postgres_changes_options: { wait: true } },
        })
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter: `home_id=eq.${homeId}`,
          },
          (change) => {
            if (change.eventType === "DELETE") return;
            setThread((current) =>
              merge(current, [change.new as ThreadMessage]),
            );
          },
        )
        .subscribe(async (state) => {
          if (state !== "SUBSCRIBED") {
            setStatus("offline");
            return;
          }
          // Catch anything that landed between the server render and now.
          const { data } = await supabase
            .from("messages")
            .select(THREAD_COLUMNS)
            .eq("home_id", homeId)
            .order("created_at", { ascending: false })
            .limit(THREAD_LIMIT);
          if (data)
            setThread((current) => merge(current, data as ThreadMessage[]));
          setStatus("live");
        });
    }
    void listen();

    return () => {
      stopped = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [homeId]);

  return (
    <section
      className="flex flex-col gap-3"
      aria-labelledby="thread"
      data-realtime={status}
    >
      <h2 id="thread" className="text-label text-heading">
        Texts · {status === "live" ? "live" : status}
      </h2>
      {thread.length === 0 ? (
        <p className="text-label text-muted">No texts yet.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {thread.map((message) => (
            <li
              key={message.id}
              className="flex flex-col gap-1 rounded-md border border-line bg-surface px-3 py-2"
            >
              <span className="text-xs text-muted">
                {message.direction === "inbound"
                  ? "To Housemate"
                  : `From Housemate (${message.author})`}{" "}
                · {new Date(message.created_at).toLocaleTimeString("en-US")} ·{" "}
                {message.delivery_status}
              </span>
              <span className="text-base text-heading">{message.body}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
