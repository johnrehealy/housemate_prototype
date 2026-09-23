import { DM_Serif_Text } from "next/font/google";

/*
 * The serif is loaded here rather than in the root layout, so the app's pages
 * never pay for a face only the public site uses. It ships in one weight, 400
 * (docs/design.md §1).
 */
const dmSerifText = DM_Serif_Text({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-serif-text",
});

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className={`hm-site ${dmSerifText.variable} bg-canvas`}>
      {children}
    </div>
  );
}
