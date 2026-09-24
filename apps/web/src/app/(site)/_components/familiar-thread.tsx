import Image from "next/image";
import { Play } from "@phosphor-icons/react/dist/ssr";
import {
  Bubble,
  Composer,
  Phone,
  PhoneContact,
  SMS_SENT,
  Thread,
  Timestamp,
} from "./phone";

/** The drawn waveform on the voice note. Heights in px, out of 22. */
const WAVEFORM = [8, 16, 22, 12, 18, 9, 14, 20, 10, 16, 7];

/**
 * P2's visual: a thread that mixes text, a photo and a voice note.
 *
 * The photo is the panel's point — you can just send a picture of the leak —
 * so it is the one thing lifted off the screen, and on wide screens it breaks
 * out past the phone's edge. The phone and thread leave their overflow visible
 * there for it; below xl it stays inside.
 */
export function FamiliarThread() {
  return (
    <Phone>
      <PhoneContact />
      <Thread className="xl:overflow-visible">
        <Timestamp>Today 4:12 PM</Timestamp>
        <Bubble from="member">Sink is leaking under the kitchen cabinet</Bubble>
        <Image
          src="/site/leak-under-sink.png"
          alt=""
          width={1448}
          height={1086}
          sizes="252px"
          className="h-[189px] w-[252px] shrink-0 self-end rounded-[22px] border-[5px] border-surface object-cover shadow-lift xl:relative xl:left-21"
        />
        <Bubble from="housemate">
          Got it - I&rsquo;ll find a plumber who can come today
        </Bubble>
        <span
          className={`flex items-center gap-2.5 self-end rounded-[18px] px-3 py-2 ${SMS_SENT}`}
        >
          <Play size={18} />
          <span className="flex h-[22px] items-center gap-[3px]">
            {WAVEFORM.map((height, index) => (
              <span
                key={index}
                style={{ height }}
                className="w-[3px] rounded-full bg-[#FFFFFF]/82"
              />
            ))}
          </span>
          <span className="text-xs text-[#FFFFFF]/88">0:12</span>
        </span>
        <Bubble from="housemate">
          Heard it - that rattle sounds like the disposal. I&rsquo;ll have them
          look at both
        </Bubble>
      </Thread>
      <Composer />
    </Phone>
  );
}
