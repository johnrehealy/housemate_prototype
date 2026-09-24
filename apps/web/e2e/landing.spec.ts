import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The landing page. These start signed out; see playwright.config.ts, where
 * this file is listed in the `signed-out` project — a spec that matches no
 * project is silently never run.
 *
 * The addresses here are generated per run, so a re-run doesn't depend on what
 * the last one left in the table.
 */

const PANEL_HEADINGS = [
  "Built for busy homes",
  "Designed to feel familiar",
  "Equipped to deliver",
  "Supported by real people",
  "Controlled by you",
  "Your home is your business",
];

function newAddress() {
  return `landing.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** Opens the hero's email bar and submits `address`. */
async function join(page: import("@playwright/test").Page, address: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Join the waitlist" }).click();
  await page.getByLabel("Email address").fill(address);
  await page.getByRole("button", { name: "Join the waitlist" }).click();
}

test("shows a signed-out visitor the page, not sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  // Not "Housemate · Housemate": the root layout templates every other title.
  await expect(page).toHaveTitle("Housemate");

  // The heading reads as one steady line however long the rotation runs.
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Every home needs someone to call the plumber",
  );
});

test("every rotating phrase fits its slot, at every width", async ({
  page,
}) => {
  await page.goto("/");
  // The hero is sized to its longest phrase rather than wrapped around it
  // (board H4 r3, option A), so a phrase that grows, or a width nobody looked
  // at, would be clipped by the slot without any other sign.
  for (const width of [320, 390, 640, 767, 768, 1023, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const misfits = await page.evaluate(() => {
      const slot = document.querySelector<HTMLElement>("h1 > [aria-hidden]")!;
      return [...slot.children]
        .filter(
          (phrase) =>
            phrase.scrollWidth > slot.clientWidth + 1 ||
            phrase.getBoundingClientRect().height > slot.clientHeight + 1,
        )
        .map((phrase) => phrase.textContent);
    });
    expect(misfits, `at ${width}px`).toEqual([]);
  }
});

test("carries every panel on one page", async ({ page }) => {
  await page.goto("/");
  for (const heading of PANEL_HEADINGS) {
    await expect(page.getByRole("heading", { name: heading })).toBeAttached();
  }
  await expect(
    page.getByRole("heading", { name: "Every home deserves a Housemate" }),
  ).toBeAttached();
});

test("the ribbon reaches sign-in", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("takes an address and says thanks", async ({ page }) => {
  await join(page, newAddress());
  await expect(page.getByRole("status")).toHaveText(
    "Thanks for joining the waitlist!",
  );
});

test("says exactly the same thing to an address already on the list", async ({
  page,
}) => {
  const address = newAddress();
  await join(page, address);
  await expect(page.getByRole("status")).toBeVisible();

  // Same answer either way, so the page can't be used to find out who has
  // signed up — the rule sign-in follows for numbers.
  await join(page, address);
  await expect(page.getByRole("status")).toHaveText(
    "Thanks for joining the waitlist!",
  );
});

test("asks for an address when the field is empty", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Join the waitlist" }).click();
  // Left empty. A malformed address is caught by the email input itself and
  // never reaches the server; an empty one is what the server has to answer.
  await page.getByRole("button", { name: "Join the waitlist" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "Enter an email address." }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

test("the close's call to action lands on a field, not a button", async ({
  page,
}) => {
  await page.goto("/");
  // The last ask on the page. It is 6,000px from the hero, so landing on the
  // closed button would cost the visitor a second click to get anywhere to
  // type — at the highest-intent moment there is.
  await page.getByRole("link", { name: "Join the waitlist" }).last().click();

  await expect(page.getByLabel("Email address")).toBeFocused();
});

test("the hero's cue goes to the first panel", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Learn more" }).click();
  await expect(page).toHaveURL(/#built$/);
});

// Whether the button is there is about where you are on the page, so reduced
// motion changes how it arrives, not when.
for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`the ribbon never repeats an ask that's already on screen (${reducedMotion})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/");
    const ribbon = page.getByRole("navigation", { name: "Site" });
    const ribbonJoin = ribbon.getByRole("link", { name: "Join the waitlist" });

    // While any of the hero is on screen, its own call to action is the only
    // one — including its last 60px, just before it leaves.
    await expect(ribbonJoin).toBeHidden();
    for (const offset of [200, 60]) {
      await page.evaluate((offset) => {
        const hero = document.querySelector<HTMLElement>(".hm-hero")!;
        window.scrollTo(0, hero.offsetHeight - offset);
      }, offset);
      await expect(ribbonJoin).toBeHidden();
    }

    // "Learn more" lands P1 exactly as the hero leaves, so the button has to
    // be there on arrival, not one scroll later.
    await page.getByRole("link", { name: "Learn more" }).click();
    await expect(page).toHaveURL(/#built$/);
    await expect(ribbonJoin).toBeVisible();

    // The close carries its own button, so this one makes way for it.
    await page
      .getByRole("heading", { name: "Every home deserves a Housemate" })
      .scrollIntoViewIfNeeded();
    await expect(ribbonJoin).toBeHidden();

    // "Sign in" holds the bar's right edge throughout.
    await expect(ribbon.getByRole("link").last()).toHaveText("Sign in");
  });
}

test("no line of a panel's copy stops short of 70% of the measure", async ({
  page,
}) => {
  await page.goto("/");
  // The user's rule: a short last line reads as a mistake. Every width from a
  // small phone to a wide desktop, because the narrow layouts are fluid and a
  // rule checked at five widths holds at five widths.
  const failures: string[] = [];
  for (let width = 320; width <= 1920; width += 10) {
    await page.setViewportSize({ width, height: 900 });
    // The paragraphs are refitted on the frame after a resize.
    await page.evaluate(
      () =>
        new Promise((done) =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => requestAnimationFrame(done)),
          ),
        ),
    );
    const short = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("main h2 + p")].flatMap(
        (copy) => {
          const range = document.createRange();
          range.selectNodeContents(copy);
          const lines: { top: number; left: number; right: number }[] = [];
          for (const rect of range.getClientRects()) {
            const line = lines.find((l) => Math.abs(l.top - rect.top) < 4);
            if (line) {
              line.left = Math.min(line.left, rect.left);
              line.right = Math.max(line.right, rect.right);
            } else {
              lines.push({ top: rect.top, left: rect.left, right: rect.right });
            }
          }
          const ratios = lines.map(
            (l) => ((l.right - l.left) / copy.clientWidth) * 100,
          );
          const label = copy.closest("section")!.id || "close";
          return ratios.some((ratio) => ratio < 70)
            ? [`${label}: ${ratios.map(Math.round).join("/")}`]
            : [];
        },
      ),
    );
    failures.push(...short.map((line) => `${width}px ${line}`));
  }
  expect(failures).toEqual([]);
});

test("the close's heading is one line wherever it fits", async ({ page }) => {
  await page.goto("/");
  const heading = page.getByRole("heading", {
    name: "Every home deserves a Housemate",
  });
  // The user's note: one line. From sm up it fits at every width; below
  // that it takes two, broken where the tones change.
  for (const [width, expected] of [
    [320, 2],
    [390, 2],
    [640, 1],
    [768, 1],
    [1023, 1],
    [1024, 1],
    [1280, 1],
    [1440, 1],
    [1920, 1],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    const lines = await heading.evaluate((h2) =>
      Math.round(
        h2.getBoundingClientRect().height /
          parseFloat(getComputedStyle(h2).lineHeight),
      ),
    );
    expect(lines, `at ${width}px`).toBe(expected);
  }
});

test("has nothing to scroll sideways at 390", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const overflows = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});

/*
 * P1's demo video. Playwright's Chromium can't decode HEVC, so here it falls
 * back to the H.264 file — which also shows the fallback works.
 */

/** Both cuts of the demo video; the breakpoint shows one and hides the other. */
function demoCuts(page: Page) {
  const panel = page.locator("#built");
  return {
    film: panel.locator('video:has(source[src$="/film-h264.mp4"])'),
    phone: panel.locator('video:has(source[src$="/phone-h264.mp4"])'),
  };
}

function playback(video: Locator) {
  return video.evaluate((v: HTMLVideoElement) => ({
    playing: !v.paused,
    muted: v.muted,
    file: v.currentSrc.split("/").pop(),
  }));
}

/** Every demo file the page asks for, videos and posters, from here on. */
function videoRequests(page: Page) {
  const files: string[] = [];
  page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    if (pathname.startsWith("/site/demo/"))
      files.push(pathname.split("/").pop()!);
  });
  return files;
}

const videos = (files: string[]) => files.filter((f) => f.endsWith(".mp4"));

/** Lets an IntersectionObserver deliver what the last scroll changed. */
async function settle(page: Page) {
  await page.evaluate(
    () =>
      new Promise((done) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => setTimeout(done)),
        ),
      ),
  );
}

test("the demo video waits for its panel, then plays the film muted", async ({
  page,
}) => {
  const requested = videoRequests(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const { film, phone } = demoCuts(page);
  await expect(film).toBeVisible();
  await expect(phone).toBeHidden();
  // A visitor who never reaches P1 never downloads it.
  expect(videos(requested)).toEqual([]);

  // A glimpse of the frame isn't enough: it waits for a quarter of it.
  await film.evaluate((video) => {
    const frame = video.parentElement!.getBoundingClientRect();
    window.scrollBy(0, frame.top - window.innerHeight + frame.height * 0.1);
  });
  await settle(page);
  expect((await playback(film)).playing).toBe(false);
  expect(videos(requested)).toEqual([]);

  await film.scrollIntoViewIfNeeded();
  await expect
    .poll(() => playback(film))
    .toEqual({ playing: true, muted: true, file: "film-h264.mp4" });
  expect(requested).toContain("film-poster.jpg");
  // The phone cut, hidden at this width, is never fetched, poster included.
  expect(requested.every((file) => file.startsWith("film-"))).toBe(true);
});

test("the demo video's controls pause it and turn the sound on", async ({
  page,
}) => {
  await page.goto("/");
  const { film } = demoCuts(page);
  await film.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await playback(film)).playing).toBe(true);

  await page.getByRole("button", { name: "Pause the video" }).click();
  await expect(
    page.getByRole("button", { name: "Play the video" }),
  ).toBeVisible();
  expect((await playback(film)).playing).toBe(false);

  // Scrolling away and back doesn't overrule the visitor's pause.
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);
  await film.scrollIntoViewIfNeeded();
  await settle(page);
  expect((await playback(film)).playing).toBe(false);

  await page.getByRole("button", { name: "Play the video" }).click();
  await expect.poll(async () => (await playback(film)).playing).toBe(true);

  await page.getByRole("button", { name: "Turn the sound on" }).click();
  await expect(
    page.getByRole("button", { name: "Turn the sound off" }),
  ).toBeVisible();
  expect((await playback(film)).muted).toBe(false);

  // Scrolled away, it stops, so the music never plays off screen.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(async () => (await playback(film)).playing).toBe(false);
});

test("below md the phone cut plays instead", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requested = videoRequests(page);
  await page.goto("/");
  const { film, phone } = demoCuts(page);
  await expect(phone).toBeVisible();
  await expect(film).toBeHidden();

  await phone.scrollIntoViewIfNeeded();
  await expect
    .poll(() => playback(phone))
    .toEqual({ playing: true, muted: true, file: "phone-h264.mp4" });
  expect(requested.every((file) => file.startsWith("phone-"))).toBe(true);
});

test("under reduced motion the demo video waits for Play", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const requested = videoRequests(page);
  await page.goto("/");
  const { film } = demoCuts(page);
  await film.scrollIntoViewIfNeeded();
  await settle(page);
  expect((await playback(film)).playing).toBe(false);
  expect(videos(requested)).toEqual([]);
  // The frame shows the poster instead.
  await expect(film).toHaveAttribute("poster", "/site/demo/film-poster.jpg");

  await page.getByRole("button", { name: "Play the video" }).click();
  await expect.poll(async () => (await playback(film)).playing).toBe(true);
});

test("the demo video tells its story in words too", async ({ page }) => {
  await page.goto("/");
  const { film } = demoCuts(page);
  await expect(film).toHaveAccessibleName("Housemate demo video");
  await expect(film).toHaveAccessibleDescription(
    /Just text your Housemate\..*So you always stay in control\./,
  );
});
