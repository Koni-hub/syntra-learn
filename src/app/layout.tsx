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
  title: "LearnHealth - AI-Powered Learning Analytics",
  description:
    "Transform your learning with AI-powered insights. Upload materials, generate quizzes, and track your understanding.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "LearnHealth - AI-Powered Learning Analytics",
    description:
      "Transform your learning with AI-powered insights. Upload materials, generate quizzes, and track your understanding.",
    url: siteUrl,
    siteName: "LearnHealth",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "LearnHealth - AI-Powered Learning Analytics",
    description:
      "Transform your learning with AI-powered insights. Upload materials, generate quizzes, and track your understanding.",
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL(siteUrl),
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
