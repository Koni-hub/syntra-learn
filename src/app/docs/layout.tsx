import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Docs",
  description:
    "Learn how to use Syntra — from uploading your first module and generating AI quizzes to tracking analytics and mastering any subject with flashcards and spaced repetition.",
  openGraph: {
    title: "Syntra Docs — Study Your Notes with Tracking, Review, and Adaptation",
    description:
      "Learn how to use Syntra. Upload PDFs, generate AI quizzes, track analytics, and master any subject with flashcards and spaced repetition.",
  },
  twitter: {
    title: "Syntra Docs — Study Your Notes with Tracking, Review, and Adaptation",
    description:
      "Learn how to use Syntra. Upload PDFs, generate AI quizzes, track analytics, and master any subject with flashcards and spaced repetition.",
  },
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children
}
