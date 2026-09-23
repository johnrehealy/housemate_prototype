import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentMember } from "@/lib/auth/session";
import { ApprovalThread } from "./_components/approval-thread";
import { BrowserThread } from "./_components/browser-thread";
import { Close } from "./_components/close";
import { PANELS } from "./_components/copy";
import { DemoFrame } from "./_components/demo-frame";
import { FamiliarThread } from "./_components/familiar-thread";
import { Hero } from "./_components/hero";
import { Panel } from "./_components/panel";
import { Ribbon } from "./_components/ribbon";
import { SavedLogins } from "./_components/saved-logins";
import { TeamPhoto } from "./_components/team-photo";

const DESCRIPTION =
  "Housemate takes the repairs, services and errands your home needs, and gets them done. Join the waitlist.";

/*
 * An invite-only front door travels by being pasted into a message, so the
 * link preview is part of the page. There is no preview image yet: one would
 * be a design, and designs are approved in Paper first (D-034), so this is
 * text only until that exists.
 */
export const metadata: Metadata = {
  // Absolute, because the root layout's "%s · Housemate" template would
  // otherwise make the front door read "Housemate · Housemate".
  title: { absolute: "Housemate" },
  description: DESCRIPTION,
  openGraph: {
    title: "Housemate",
    description: DESCRIPTION,
    siteName: "Housemate",
    type: "website",
  },
  twitter: { card: "summary", title: "Housemate", description: DESCRIPTION },
};

/** The visual for each panel, keyed by the id in `copy.ts`. */
const VISUALS: Record<(typeof PANELS)[number]["id"], React.ReactNode> = {
  built: <DemoFrame />,
  familiar: <FamiliarThread />,
  equipped: <BrowserThread />,
  people: <TeamPhoto />,
  control: <ApprovalThread />,
  private: <SavedLogins />,
};

/**
 * Supabase's SSR client stores the session as `sb-<ref>-auth-token`, chunked
 * across `.0`, `.1`, … when it's long. Any of those means there is a session
 * worth resolving.
 */
async function hasSessionCookie() {
  const jar = await cookies();
  return jar
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"),
    );
}

export default async function LandingPage() {
  /*
   * A member who is already signed in wants the app, not the pitch. The check
   * is behind a cookie test so an anonymous visitor — which is nearly every
   * visitor here — never costs a query against the members table.
   */
  if (await hasSessionCookie()) {
    if (await currentMember()) redirect("/chat");
  }

  return (
    <>
      <Ribbon />
      <main>
        <Hero />
        {PANELS.map((panel, index) => (
          <Panel
            key={panel.id}
            id={panel.id}
            heading={panel.heading}
            body={panel.body}
            ground={panel.ground}
            layout={panel.layout}
            // The ribbon's waitlist button waits for this panel (M1 · A).
            className={index === 0 ? "hm-first-panel" : undefined}
          >
            {VISUALS[panel.id]}
          </Panel>
        ))}
        <Close />
      </main>
    </>
  );
}
