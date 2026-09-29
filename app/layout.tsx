import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Household Expense Tracker",
  description: "Track household expenses with categories, monthly summaries, charts, and CSV import.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
