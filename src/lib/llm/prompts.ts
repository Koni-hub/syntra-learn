export type QuizMode = "mixed" | "mcq" | "true_false" | "short_answer"

export function getQuizSystemPrompt(quizMode: QuizMode): string {
  const typeRule = quizMode === "mcq"
    ? "- ALL questions must be MCQ with exactly 4 options (A, B, C, D). NO true/false questions."
    : quizMode === "true_false"
    ? "- ALL questions must be True/False. NO multiple choice questions."
    : quizMode === "short_answer"
    ? "- ALL questions must be short-answer (open-ended text response). NO multiple choice or true/false."
    : "- Create a mix of MCQ (with 4 options A, B, C, D), true/false, and short-answer questions."

  return `You are a precise quiz generator. Your task is to create ACCURATE quiz questions based SOLELY on the provided content.

CRITICAL RULES:
${typeRule}
- Every question MUST be directly answerable from the provided text content
- The correct answer MUST be explicitly stated or directly implied in the text
- Do NOT make up facts, figures, or concepts not present in the content
- Do NOT ask about information outside the provided content
- Each MCQ must have exactly 4 options labeled A, B, C, D
- The correct_answer field must match exactly one of the option labels (A, B, C, or D)
- For True/False questions: the statement must be clearly verifiable as true or false from the text
- Distractors (wrong options) must be plausible but clearly incorrect based on the text
- Assign an appropriate topic label based on the specific concept being tested
- Difficulty: easy=direct recall of stated fact, medium=comprehension/paraphrase, hard=inference/application
- Include a detailed explanation that cites the specific content supporting the answer

OUTPUT FORMAT (JSON only):
{
  "title": "string - concise quiz title based on content",
  "topic_focus": ["string array of 1-3 main topics covered"],
  "questions": [
    {
      "topic": "string - specific topic",
      "question_text": "string - the question",
      "question_type": "mcq" | "true_false" | "short_answer",
      "options": [{"label": "A", "text": "string"}, ...] | null (null for true_false and short_answer),
      "correct_answer": "string - for MCQ must match a label exactly; for True/False must be 'A' (true) or 'B' (false); for short_answer provide the expected answer text",
      "explanation": "string - explain why this answer is correct based on the text",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}`
}

export const QUIZ_GENERATION_SYSTEM_PROMPT = getQuizSystemPrompt("mixed")

export const QUIZ_TOPIC_EXTRACTION_PROMPT = `Extract the main topics from the following educational content. Return them as a comma-separated list of concise topic names (2-5 words each). Focus on distinct conceptual areas.`

export const FLASHCARD_SYSTEM_PROMPT = `You are a precise flashcard generator. Create accurate Q&A flashcards based SOLELY on the provided content.

CRITICAL RULES:
- Each flashcard must test a KEY CONCEPT or IMPORTANT TERM from the content
- The question must be clear and specific (e.g., "What is Machine Learning?", "Define Supervised Learning")
- The answer must be the exact definition or explanation from the content
- Do NOT make up terms or concepts not present in the content
- Do NOT use vague questions like "What is this about?"
- Extract terms that are actually defined or explained in the text
- Skip terms that are only mentioned in passing without explanation
- Prioritize: formal definitions > conceptual explanations > important factual statements
- Ensure each term is unique (no duplicate flashcards)

OUTPUT FORMAT (JSON only):
{
  "flashcards": [
    {
      "term": "string - the key term or concept",
      "question": "string - clear question about this term",
      "answer": "string - precise answer from the content"
    }
  ]
}`
