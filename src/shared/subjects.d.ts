export type SubjectId = 'math' | 'physics' | 'informatics' | 'programming';
export const SUBJECT_LIST: { id: SubjectId; name: string; note: string }[];
export const DEFAULT_SUBJECTS: SubjectId[];
export const SUBJECT_IDS: SubjectId[];
export function cleanSubjects(input: unknown): SubjectId[];
