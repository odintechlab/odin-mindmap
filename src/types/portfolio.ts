import type { DashboardTaskSummary } from "@/types/dashboard";

export interface PortfolioProject {
  id: string;
  name: string;
  open: number;
  inProgress: number;
  closed: number;
  overdue: number;
  total: number;
  completionRate: number;
  velocityPerWeek: number | null;
}

export interface PortfolioPersonOverdue {
  id: number;
  name: string;
  profilePicture?: string | null;
  overdueCount: number;
}

export interface PortfolioStats {
  generatedAt: string;
  range: import("@/types/dashboard").DashboardDateRange;
  listId: string | null;
  projects: PortfolioProject[];
  topOverduePeople: PortfolioPersonOverdue[];
  staleTasks: DashboardTaskSummary[];
  atRiskMilestones: DashboardTaskSummary[];
  phase2: {
    customFields: string;
    forms: string;
    attachments: string;
  };
}
