// ClickUp API response types (minimal subset we use)

export interface ClickUpUser {
  id: number;
  username: string;
  color?: string;
  profilePicture?: string | null;
}

export interface ClickUpTeam {
  id: string;
  name: string;
  color?: string;
  avatar?: string | null;
  members?: ClickUpMember[];
}

export interface ClickUpSpace {
  id: string;
  name: string;
  private?: boolean;
  statuses?: ClickUpStatus[];
}

export interface ClickUpFolder {
  id: string;
  name: string;
  hidden?: boolean;
  task_count?: string | number | null;
  lists?: ClickUpList[];
}

export interface ClickUpList {
  id: string;
  name: string;
  task_count?: string | number | null;
  folder?: { id: string; name: string; hidden?: boolean } | null;
  space?: { id: string; name: string };
}

export interface ClickUpStatus {
  id: string;
  status: string;
  color: string;
  orderindex: number;
  type: string;
}

export interface ClickUpPriority {
  id: string;
  priority: string;
  color: string;
  orderindex: string;
}

export interface ClickUpTask {
  id: string;
  name: string;
  description?: string;
  text_content?: string;
  status: ClickUpStatus;
  priority?: ClickUpPriority | null;
  due_date?: string | null;
  start_date?: string | null;
  date_updated?: string | null;
  date_closed?: string | null;
  date_done?: string | null;
  custom_item_id?: number | null;
  parent?: string | null;
  url: string;
  assignees: ClickUpUser[];
  list?: { id: string; name: string };
  folder?: { id: string; name: string };
  space?: { id: string };
}

export interface ClickUpKeyResult {
  id: string;
  name: string;
  type: string;
  unit?: string;
  steps_start?: number;
  steps_end?: number;
  steps_current?: number | null;
  percent_completed?: number;
}

export interface ClickUpGoal {
  id: string;
  name: string;
  team_id: string;
  percent_completed: number;
  archived?: boolean;
  key_result_count?: number;
  key_results?: ClickUpKeyResult[];
  pretty_url?: string;
}

export interface ClickUpGoalsResponse {
  goals: ClickUpGoal[];
  folders?: { goals: ClickUpGoal[] }[];
}

export interface ClickUpGoalResponse {
  goal: ClickUpGoal;
}

export interface ClickUpTeamsResponse {
  teams: ClickUpTeam[];
}

export interface ClickUpSpacesResponse {
  spaces: ClickUpSpace[];
}

export interface ClickUpFoldersResponse {
  folders: ClickUpFolder[];
}

export interface ClickUpListsResponse {
  lists: ClickUpList[];
}

export interface ClickUpTasksResponse {
  tasks: ClickUpTask[];
  last_page: boolean;
}

export interface ClickUpListResponse {
  id: string;
  name: string;
  statuses?: ClickUpStatus[];
}

export interface ClickUpMemberUser {
  id: number;
  username: string;
  email?: string;
  color?: string;
  profilePicture?: string | null;
}

export interface ClickUpMember {
  user: ClickUpMemberUser;
}

export interface ClickUpMembersResponse {
  members: ClickUpMember[];
}

export interface TaskUpdatePayload {
  name?: string;
  status?: string;
  priority?: number | null;
  assignees?: { add?: number[]; rem?: number[] };
}

export interface TaskCreatePayload {
  name: string;
  parent?: string;
  assignees?: number[];
}
