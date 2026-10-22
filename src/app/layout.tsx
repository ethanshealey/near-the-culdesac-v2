import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  title: "Near the Culdesac",
  description: "Near the Culdesac is a cover band from Durham, NC.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
