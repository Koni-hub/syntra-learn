export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  role: "student" | "educator" | "admin"
  created_at: string
  updated_at: string
}

export interface Module {
  id: string
  user_id: string
  title: string
  description: string | null
  content_type: "pdf" | "text" | "markdown"
  storage_path: string | null
  raw_text: string | null
  raw_pdf: string | null
  structured_content: Record<string, unknown> | null
  status: "processing" | "ready" | "failed"
  category: string | null
  topic_labels: string[]
  created_at: string
  updated_at: string
}

export interface ModuleChunk {
  id: string
  module_id: string
  chunk_index: number
  content: string
  token_count: number
  embedding: number[] | null
  created_at: string
}

export interface Quiz {
  id: string
  module_id: string
  user_id: string
  title: string
  quiz_type: "initial" | "review" | "spaced_retrieval"
  difficulty: "easy" | "medium" | "hard"
  topic_focus: string[]
  question_ids: string[]
  time_limit_seconds: number | null
  created_at: string
}

export interface Question {
  id: string
  quiz_id: string
  topic: string
  question_text: string
  question_type: "mcq" | "true_false" | "short_answer"
  options: { label: string; text: string }[] | null
  correct_answer: string
  explanation: string | null
  difficulty: "easy" | "medium" | "hard"
  order_index: number
  created_at: string
}

export interface QuizAttempt {
  id: string
  quiz_id: string
  user_id: string
  question_id: string
  given_answer: string
  is_correct: boolean
  time_spent_ms: number
  attempted_at: string
}

export interface TopicMastery {
  id: string
  user_id: string
  topic: string
  total_attempts: number
  correct_attempts: number
  understanding_score: number
  retention_score: number
  last_assessed_at: string | null
  created_at: string
  updated_at: string
}

export interface AnalyticsSnapshot {
  id: string
  user_id: string
  snapshot_date: string
  overall_understanding: number
  overall_retention: number
  topics_covered: number
  quizzes_taken: number
  total_questions_answered: number
  streak_days: number
  created_at: string
}
