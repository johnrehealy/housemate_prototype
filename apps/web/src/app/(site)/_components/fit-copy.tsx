"use client";

import { useEffect } from "react";

/*
 * The user's rule for the page's copy: no line stops short of 70% of the way
 * across. A short last line reads as a mistake.
 *
 * `text-wrap: balance` gets most of the way, but not all of it. Balancing
 * evens out the lines inside a column; it can't change the column. A paragraph
 * that only just runs onto a second or third line has no wrapping that keeps
 * every line above 70% of that width, and on phones the width is whatever the
 * screen is. Chrome also stops balancing past six lines.
 *
 * So each marked paragraph is narrowed, a few pixels at a time, until every
 * line clears the bar — "toggling the spacing", in the user's words. It runs
 * once the fonts are in and again whenever the page's width changes. A
 * paragraph that no width within reason can fix is left as the browser set it.
 */

/** The shortest a line may be, as a share of its paragraph's width. */
const MIN_LINE = 0.7;
/** The narrowest a paragraph may get, as a share of its column. */
const MAX_NARROWING = 0.6;
const STEP_PX = 4;

function lineWidths(copy: HTMLElement) {
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
  return lines.map((line) => line.right - line.left);
}

function fits(copy: HTMLElement) {
  const width = copy.clientWidth;
  return lineWidths(copy).every((line) => line >= width * MIN_LINE);
}

function fit(copy: HTMLElement) {
  copy.style.maxWidth = "";
  const column = copy.clientWidth;
  let width = column;
  while (!fits(copy) && width - STEP_PX >= column * MAX_NARROWING) {
    width -= STEP_PX;
    copy.style.maxWidth = `${width}px`;
  }
  if (!fits(copy)) copy.style.maxWidth = "";
}

/** Fits every paragraph marked `data-fit-copy`. Renders nothing. */
export function FitCopy() {
  useEffect(() => {
    const paragraphs = [
      ...document.querySelectorAll<HTMLElement>("[data-fit-copy]"),
    ];
    let frame = 0;
    let lastWidth = -1;
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => paragraphs.forEach(fit));
    };

    // Only width changes rewrap text. Height changes — a phone's toolbar
    // sliding away mid-scroll — are ignored.
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width === lastWidth) return;
      lastWidth = entry.contentRect.width;
      run();
    });
    observer.observe(document.documentElement);
    void document.fonts.ready.then(run);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
