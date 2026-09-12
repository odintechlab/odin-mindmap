import type {
  DashboardProject,
  DashboardTaskSummary,
} from "@/types/dashboard";

export interface PeopleWeeklyPoint {
  weekStartMs: number;
  weekLabel: string;
  count: number;
}

export interface PeopleHourlyPoint {
  hour: number;
  count: number;
  /** True for core work window 08:00–18:00 (hours 8–17). */
  core: boolean;
}

export type InsightId =
  | "overdueOfOpen"
  | "lastUpdateDaysAgo"
  | "lastUpdateDayAgo"
  | "noTaskUpdates"
  | "finishedOnTime"
  | "collabOpen"
  | "staleOpen"
  | "staleOpenOne"
  | "completedNoneOverdue"
  | "noAssignedTasks";

export interface PerformanceInsight {
  id: InsightId;
  params?: Record<string, number>;
}

export type PerformanceGradeLevel =
  | "good"
  | "average"
  | "bad"
  | "insufficient";

export type PerformanceGradeReasonId =
  | "noData"
  | "inactive"
  | "overdueHeavy"
  | "overdueOpen"
  | "staleWork"
  | "coldActivity"
  | "lateDelivery"
  | "onTrack"
  | "steady"
  | "mixed";

export type GradeImprovementId =
  | "finishOverdue"
  | "touchStale"
  | "updateRecently"
  | "deliverOnTime";

export interface GradeImprovement {
  id: GradeImprovementId;
  params?: Record<string, number>;
}

export interface PerformanceGrade {
  level: PerformanceGradeLevel;
  /** 0–100 composite score used to pick the level */
  score: number;
  reasonId: PerformanceGradeReasonId;
}

export interface PeopleStatusGroup {
  label: string;
  color: string;
  count: number;
  tasks: DashboardTaskSummary[];
}

export interface PeopleStatusCount {
  label: string;
  color: string;
  count: number;
}

export interface PeopleProjectMix {
  id: string;
  name: string;
  count: number;
}

export interface PeoplePriorityMix {
  label: string;
  color: string;
  count: number;
}

export interface PeopleRosterMember {
  id: number;
  name: string;
  profilePicture?: string | null;
  completed: number;
  open: number;
  inProgress: number;
  overdue: number;
  stale: number;
  completionPct: number;
  lastActiveAt: string | null;
  grade: PerformanceGrade;
  weeklyCompleted: PeopleWeeklyPoint[];
  byStatus: PeopleStatusCount[];
}

export interface PeopleRoster {
  generatedAt: string;
  from: string | null;
  to: string | null;
  listId: string | null;
  projects: DashboardProject[];
  members: PeopleRosterMember[];
}

export interface PeopleMemberKpis {
  completed: number;
  open: number;
  inProgress: number;
  completionRate: number;
  throughputPerWeek: number | null;
  onTimeRate: number | null;
  onTimeCount: number;
  datedCompletions: number;
  overdue: number;
  overdueRate: number;
  stale: number;
  cycleTimeMedianDays: number | null;
  lastActiveAt: string | null;
  touchDays: number;
  /** Peak hour 0–23 in APP_TIMEZONE, or null when no activity signals. */
  peakActiveHour: number | null;
  collabTasks: number;
  uniqueCollaborators: number;
}

export interface PeoplePercentiles {
  completed: number | null;
  overdue: number | null;
  sampleSize: number;
}

export interface PeopleMemberIdentity {
  id: number;
  name: string;
  profilePicture?: string | null;
}

export interface PeopleNeighbors {
  prevId: number | null;
  nextId: number | null;
}

export interface MemberPerformance {
  generatedAt: string;
  from: string | null;
  to: string | null;
  listId: string | null;
  projects: DashboardProject[];
  member: PeopleMemberIdentity;
  neighbors: PeopleNeighbors;
  kpis: PeopleMemberKpis;
  percentiles: PeoplePercentiles | null;
  grade: PerformanceGrade;
  insights: PerformanceInsight[];
  improvements: GradeImprovement[];
  weeklyCompleted: PeopleWeeklyPoint[];
  weeklyActivity: PeopleWeeklyPoint[];
  hourlyActivity: PeopleHourlyPoint[];
  byStatus: PeopleStatusCount[];
  byProject: PeopleProjectMix[];
  byPriority: PeoplePriorityMix[];
  overdueTasks: DashboardTaskSummary[];
  staleTasks: DashboardTaskSummary[];
  completedTasks: DashboardTaskSummary[];
  openByStatus: PeopleStatusGroup[];
}
