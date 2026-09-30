"use client";

import { Pause, Play, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

/*
 * One cut of the demo video, with its two controls (boards "r5 · P1" and
 * "r5 · P1 · Video controls spec").
 *
 * It plays muted and loops while at least a quarter of the frame is on screen,
 * and pauses when less is, so a visitor who never reaches P1 never downloads
 * it. The poster loads half a screen ahead, so the frame is never empty when
 * it arrives. A cut hidden by its breakpoint never intersects, so it loads
 * nothing, poster included. Under reduced motion it never starts on its own:
 * the poster shows, with Play.
 *
 * The pause button is what keeps an autoplaying, looping video within WCAG
 * 2.2.2, and the sound button is the only way to hear the music: browsers
 * allow autoplay only while muted.
 */

/*
 * Exact codec strings, read from each file's hvcC and avcC boxes, so a browser
 * that can't decode HEVC skips to H.264 instead of failing on it. HEVC is ~40%
 * smaller and Safari, iOS and most Chrome builds play it.
 */
const HEVC = 'video/mp4; codecs="hvc1.1.6.L123.B0, mp4a.40.2"';
const H264 = 'video/mp4; codecs="avc1.64002a, mp4a.40.2"';

const PLAY_AT = 0.25;
const POSTER_AHEAD = "50% 0px";

const BUTTON =
  "flex size-[34px] items-center justify-center rounded-full text-heading transition-opacity duration-120 ease-out hover:opacity-70 focus-visible:outline-hidden focus-visible:shadow-[0_0_0_2px_var(--color-evergreen),0_0_0_4px_var(--color-canvas)]";

type DemoVideoProps = {
  /** The files, as served from `public/`. */
  hevc: string;
  h264: string;
  poster: string;
  /** The frame's shape and visibility, e.g. `aspect-2/1 hidden md:block`. */
  className: string;
  /** Below md the controls stack, so they clear the phone in the phone cut. */
  stacked?: boolean;
  /** The id of the element that tells the story in words. */
  describedBy: string;
};

export function DemoVideo({
  hevc,
  h264,
  poster,
  className,
  stacked = false,
  describedBy,
}: DemoVideoProps) {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [near, setNear] = useState(false);
  // Set when the visitor pauses, so scrolling back doesn't restart it.
  const held = useRef(false);

  useEffect(() => {
    // A `poster` attribute is fetched as soon as it's set, even on a hidden
    // element, so it waits until the frame comes near.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setNear(true);
        observer.disconnect();
      },
      { rootMargin: POSTER_AHEAD },
    );
    observer.observe(frame.current!);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const player = video.current!;
    // React sets `muted` as a property, not an attribute, so make sure of it
    // before the first play: an unmuted autoplay is refused.
    player.muted = true;
    held.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const observer = new IntersectionObserver(
      // By ratio, not `isIntersecting`: that turns true at the first pixel
      // whatever the threshold.
      ([entry]) => {
        if (entry.intersectionRatio < PLAY_AT) player.pause();
        else if (!held.current) {
          // Refused in iOS Low Power Mode, among others; the button then
          // reads Play, which is the truth.
          player.play().catch(() => {});
        }
      },
      { threshold: PLAY_AT },
    );
    observer.observe(frame.current!);
    return () => observer.disconnect();
  }, []);

  function togglePlay() {
    const player = video.current!;
    if (player.paused) {
      held.current = false;
      player.play().catch(() => {});
    } else {
      held.current = true;
      player.pause();
    }
  }

  function toggleSound() {
    const player = video.current!;
    player.muted = !player.muted;
  }

  return (
    <div
      ref={frame}
      className={`relative overflow-hidden rounded-[20px] bg-nav ${className}`}
    >
      <video
        ref={video}
        className="absolute inset-0 size-full object-cover"
        poster={near ? poster : undefined}
        preload="none"
        loop
        muted
        playsInline
        aria-label="Housemate demo video"
        aria-describedby={describedBy}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
      >
        <source src={hevc} type={HEVC} />
        <source src={h264} type={H264} />
      </video>
      <div
        className={`absolute flex rounded-full border border-heading/8 bg-canvas/70 backdrop-blur-md ${
          stacked
            ? "right-2.5 bottom-2.5 flex-col py-0.5"
            : "right-4 bottom-4 px-0.5"
        }`}
      >
        <button
          type="button"
          className={BUTTON}
          aria-label={playing ? "Pause the video" : "Play the video"}
          onClick={togglePlay}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          type="button"
          className={BUTTON}
          aria-label={muted ? "Turn the sound on" : "Turn the sound off"}
          onClick={toggleSound}
        >
          {muted ? <SpeakerSlash size={16} /> : <SpeakerHigh size={16} />}
        </button>
      </div>
    </div>
  );
}
