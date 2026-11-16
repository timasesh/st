export const ACTIVE_TRIAL_STATUSES: string[];
export function isActiveTrial(lesson: { status?: string | null } | null | undefined): boolean;
export function activeTrialsInSlot<T extends { status?: string | null; teacherId: string; day: number; hour: number }>(trials: T[] | null | undefined, teacherId: string, day: number, hour: number): T[];
