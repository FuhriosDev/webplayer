import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LibraryStateProvider } from "./providers/LibraryStateProvider";
import { PlaybackProvider } from "./providers/PlaybackProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Webplayer",
  description: "Your personal music library.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LibraryStateProvider>
          <PlaybackProvider>{children}</PlaybackProvider>
        </LibraryStateProvider>
      </body>
    </html>
  );
}
