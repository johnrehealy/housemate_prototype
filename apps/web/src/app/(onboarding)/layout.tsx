import { DM_Serif_Text } from "next/font/google";

/*
 * Get started and Meet your housemate (D-068, D-070). Their questions are set
 * in the serif (docs/design.md §1), so it's loaded here, as the public site
 * loads it, and never for the app's own pages.
 */
const dmSerifText = DM_Serif_Text({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-serif-text",
});

export default function OnboardingLayout({ children }: LayoutProps<"/">) {
  return (
    <div
      className={`${dmSerifText.variable} flex min-h-full flex-col bg-canvas`}
    >
      {children}
    </div>
  );
}
