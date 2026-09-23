import Image from "next/image";
import { Play } from "@phosphor-icons/react/dist/ssr";
import {
  Bubble,
  Composer,
  Phone,
  PhoneContact,
  Thread,
  Timestamp,
} from "./phone";

/** The drawn waveform on the voice note. Heights in px, out of 20. */
const WAVEFORM = [6, 11, 16, 9, 19, 13, 7, 17, 11, 20, 8, 14, 10, 5];

/** P2's visual: a thread that mixes text, a photo and a voice note. */
export function FamiliarThread() {
  return (
    <Phone>
      <PhoneContact />
      <Thread>
        <Timestamp>Today 4:12 PM</Timestamp>
        <Bubble from="member">Sink is leaking under the kitchen cabinet</Bubble>
        <Image
          src="/site/leak-under-sink.png"
          alt=""
          width={1448}
          height={1086}
          sizes="248px"
          className="h-auto w-[248px] self-end rounded-[18px] object-cover"
        />
        <Bubble from="housemate">
          Got it — I&rsquo;ll find a plumber who can come today
        </Bubble>
        <span className="flex items-center gap-2.5 self-end rounded-[18px] bg-evergreen px-3.5 py-2.5">
          <Play size={16} weight="fill" className="text-on-evergreen" />
          <span className="flex items-end gap-0.5" aria-hidden>
            {WAVEFORM.map((height, index) => (
              <span
                key={index}
                style={{ height }}
                className="w-0.5 rounded-full bg-on-evergreen/70"
              />
            ))}
          </span>
          <span className="text-2xs text-on-evergreen/80">0:12</span>
        </span>
        <Bubble from="housemate">
          Heard it — that rattle sounds like the disposal. I&rsquo;ll have them
          look at both
        </Bubble>
      </Thread>
      <Composer />
    </Phone>
  );
}
