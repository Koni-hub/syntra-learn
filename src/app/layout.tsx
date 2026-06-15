import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const siteUrl = "https://edtech-scaffold.vercel.app"

export const metadata: Metadata = {
  title: {
    default: "Syntra — Study Your Notes with Tracking, Review, and Adaptation",
    template: "%s | Syntra",
  },
  description:
    "Syntra (Study Your Notes with Tracking, Review, and Adaptation) is an AI-powered learning platform. Upload materials, generate intelligent quizzes, track understanding with deep analytics, and master any subject through adaptive practice.",
  keywords: [
    "AI learning platform",
    "study notes",
    "quiz generator",
    "flashcard app",
    "spaced repetition",
    "learning analytics",
    "AI education",
    "study tracker",
    "adaptive learning",
    "Syntra",
  ],
  authors: [{ name: "Syntra" }],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Syntra — Study Your Notes with Tracking, Review, and Adaptation",
    description:
      "Upload your materials, generate intelligent quizzes, and track your understanding over time. Syntra adapts to your pace.",
    url: siteUrl,
    siteName: "Syntra",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Syntra — Study Your Notes with Tracking, Review, and Adaptation",
    description:
      "Upload your materials, generate intelligent quizzes, and track your understanding over time. Syntra adapts to your pace.",
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
