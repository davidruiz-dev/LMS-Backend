export const MANUAL_QUESTION_TYPES = ['essay', 'short_answer', 'fill_in_blank'] as const;
export type ManualQuestionType = (typeof MANUAL_QUESTION_TYPES)[number];

export function isManualQuestion(type: string): boolean {
  return (MANUAL_QUESTION_TYPES as readonly string[]).includes(type);
}