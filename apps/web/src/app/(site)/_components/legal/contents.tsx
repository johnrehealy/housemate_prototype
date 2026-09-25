"use client";

import { CaretDown } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";
import type { OutlineItem } from "./outline";

/*
 * How far below the top of the window a section's heading has to rise before
 * it counts as the one being read: the bar (64px) plus the narrow contents
 * bar under it (84px), and a little more.
 */
const READING_LINE = 160;

/** The section being read: the last one whose top has passed the line. */
function useCurrentSection(items: readonly OutlineItem[]) {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const atEnd =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      let found: string | null = null;
      for (const { id } of items) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= READING_LINE) found = id;
      }
      // The last sections are too short to ever reach the line, so the end of
      // the page belongs to the last of them.
      setCurrent(atEnd ? items[items.length - 1].id : found);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items]);

  return current;
}

/**
 * The document's contents (board L1 wide, L2 narrow).
 *
 * From xl it's a rail beside the text that stays in view, with the section
 * being read marked by an evergreen rule. Below xl there's no room beside the
 * text, so it collapses to a bar that sticks under the ribbon, names the
 * section being read, and opens into the same list.
 */
export function Contents({ items }: { items: readonly OutlineItem[] }) {
  const current = useCurrentSection(items);
  const currentItem = items.find((item) => item.id === current);

  return (
    <>
      <nav
        aria-label="Contents"
        className="sticky top-[calc(var(--spacing-bar)_+_32px)] hidden max-h-[calc(100vh_-_var(--spacing-bar)_-_64px)] flex-col gap-1 self-start overflow-y-auto xl:flex"
      >
        <p className="pb-3 text-xs uppercase tracking-wide text-muted">
          Contents
        </p>
        <ol className="flex flex-col gap-0.5 border-l border-line">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={item.id === current ? "location" : undefined}
                className="group -ml-px flex gap-2 border-l-2 border-transparent py-1.5 pl-[15px] text-label text-body transition-colors duration-120 ease-out hover:text-heading focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-evergreen aria-[current=location]:border-evergreen aria-[current=location]:font-bold aria-[current=location]:text-evergreen"
              >
                <span className="w-6 shrink-0 text-muted group-aria-[current=location]:text-evergreen">
                  {item.number}
                </span>
                {item.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <ContentsBar items={items} current={currentItem} />
    </>
  );
}

function ContentsBar({
  items,
  current,
}: {
  items: readonly OutlineItem[];
  current: OutlineItem | undefined;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);

  // Closes on Escape and on a press anywhere outside it, like any menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="sticky top-(--spacing-bar) z-40 -mx-6 bg-canvas px-6 py-4 lg:-mx-30 lg:px-30 xl:hidden">
      <div ref={root} className="relative max-w-(--container-thread)">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((was) => !was)}
          className="flex h-(--spacing-row) w-full items-center justify-between gap-3 rounded-lg border border-line-strong bg-surface px-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen"
        >
          <span className="flex min-w-0 items-baseline gap-2.5">
            <span className="text-2xs uppercase tracking-wide text-muted">
              Contents
            </span>
            {current && (
              <span className="truncate text-label font-bold text-evergreen">
                {current.number} · {current.title}
              </span>
            )}
          </span>
          <CaretDown
            aria-hidden
            className={`size-5 shrink-0 text-muted transition-transform duration-120 ease-out ${open ? "rotate-180" : ""}`}
          />
        </button>
        <nav
          id={listId}
          aria-label="Contents"
          hidden={!open}
          className="absolute inset-x-0 top-full mt-2 max-h-[min(480px,calc(100vh_-_var(--spacing-bar)_-_120px))] overflow-y-auto rounded-lg border border-line-strong bg-surface py-2 shadow-float"
        >
          <ol>
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={() => setOpen(false)}
                  aria-current={
                    item.id === current?.id ? "location" : undefined
                  }
                  className="flex gap-2 px-4 py-2.5 text-label text-body hover:bg-nav-hover focus-visible:bg-nav-hover focus-visible:outline-hidden aria-[current=location]:font-bold aria-[current=location]:text-evergreen"
                >
                  <span className="w-6 shrink-0 text-muted">{item.number}</span>
                  {item.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  );
}
