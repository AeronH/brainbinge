import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";

const onest = localFont({
  src: [
    {
      path: "../../public/fonts/Onest-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Onest-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/Onest-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/Onest-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-onest",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BrainBinge - Learn Anything with AI Professors",
  description: "Learn anything through interactive AI professors with personalized teaching styles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${onest.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

