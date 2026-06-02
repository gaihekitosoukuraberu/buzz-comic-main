import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "Buzz Comic - AIで漫画を作ろう",
    template: "%s | Buzz Comic",
  },
  description:
    "AIを活用してバズる漫画を誰でも簡単に生成・投稿・収益化できるプラットフォーム。無料で始めよう。",
  keywords: ["漫画", "AI生成", "コミック", "マンガ", "クリエイター"],
  authors: [{ name: "Buzz Comic" }],
  creator: "Buzz Comic",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://buzz-comic.app",
    siteName: "Buzz Comic",
    title: "Buzz Comic - AIで漫画を作ろう",
    description:
      "AIを活用してバズる漫画を誰でも簡単に生成・投稿・収益化できるプラットフォーム。",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Buzz Comic",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Buzz Comic - AIで漫画を作ろう",
    description:
      "AIを活用してバズる漫画を誰でも簡単に生成・投稿・収益化できるプラットフォーム。",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${inter.variable} ${notoSansJP.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
