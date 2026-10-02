import { handleSendEmailHook } from "@housemate/core/mail";
import { mailer, sendEmailHookSecret } from "@/lib/server-context";

/**
 * Supabase Auth's Send Email hook (D-073). Supabase posts each sign-in code
 * here instead of emailing it, and we email it as Housemate. The work is in
 * `handleSendEmailHook`; this only carries the request in and the answer out.
 *
 * The log line holds the outcome only, never the address or the code.
 */
export async function POST(request: Request) {
  const response = await handleSendEmailHook(
    { secret: sendEmailHookSecret(), mailer: mailer() },
    {
      body: await request.text(),
      headers: Object.fromEntries(request.headers),
    },
  );
  if (response.status !== 200) {
    console.error("send-email hook: refused", { outcome: response.outcome });
  }
  return Response.json(response.body, { status: response.status });
}
