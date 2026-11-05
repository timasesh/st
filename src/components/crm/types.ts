export type StatusId = 'new' | 'contacted' | 'trial_booked' | 'trial_done' | 'paid' | 'lost';
export type LeadType = 'trial' | 'intensive' | 'level_test' | 'message' | 'manual';
export type ChannelId = 'telegram' | 'whatsapp' | 'instagram';

export type TimelineEntry = { at: string; type: string; text: string; by?: string; from?: string; to?: string };
export type TrialSnapshot = {
  id: string; status: string; scheduledAt: string; day: number; hour: number; teacherId: string; teacherName: string;
  lessonLink: string; declineReason: string; removed: boolean;
};
export type Lead = {
  id: string; number: number; type: LeadType; status: StatusId; contactId: string; studentId: string;
  parentName: string; studentName: string; phone: string; grade: number | null; topic: string; channel: string;
  source: string; medium: string; campaign: string; content: string; term: string; click: Record<string, string>;
  referrer: string; landing: string; note: string; trial: TrialSnapshot | null; trialLessonId: string;
  test: { status?: string; score: number | null; total: number | null; missedTopics: string[]; finishedAt?: string | null } | null;
  conversationId: string; lostReason: string; archived: boolean; createdAt: string; updatedAt: string; statusChangedAt: string;
  timeline: TimelineEntry[];
};
export type Contact = {
  id: string; kind: 'parent' | 'student'; name: string; phones: string[]; telegram: { id: string; username: string } | null;
  whatsapp: string; instagram: string; parentIds: string[]; childIds: string[]; grade: number | null; notes: string; tags: string[];
  accountId: string; archived: boolean; createdAt: string; updatedAt: string; history: { at: string; text: string }[];
};
export type Conversation = {
  id: string; channel: ChannelId; externalId: string; contactId: string; title: string; username: string; phone: string;
  lastAt: string; lastText: string; lastDir: 'in' | 'out'; lastAuto?: boolean; unread: number; archived: boolean; createdAt: string;
};
export type Attachment = { type: string; label?: string; fileId?: string; url?: string; mime?: string };
export type Message = { id: string; seq: number; dir: 'in' | 'out'; text: string; attachments: Attachment[]; at: string; auto: boolean; author: string };
export type Status = { id: StatusId; label: string };
export type ChannelState = Record<ChannelId, boolean>;
export type DuplicatePair = { key: string; a: Contact; b: Contact; reasons: string[]; score: number };
export type AnalyticsRow = { key: string; leads: number; booked: number; done: number; paid: number; lost: number; conversion: number };
export type Analytics = { groupBy: string; total: AnalyticsRow; series: { day: string; leads: number }[]; rows: AnalyticsRow[] };
export type TrialSlots = { teachers: { id: string; name: string }[]; occupied: { teacherId: string; day: number; hour: number }[]; hours: number[] };
