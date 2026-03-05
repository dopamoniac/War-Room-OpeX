import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type Lang = 'fr' | 'ar';
export type Dept = 'P1' | 'P2' | 'P3' | 'P4' | 'Coupe' | 'Qualité' | 'Maintenance' | 'Logistique' | 'RH' | 'HSE';
export type Status = 'on-track' | 'at-risk' | 'delayed' | 'completed' | 'not-started';
export type SQDCMCategory = 'S' | 'Q' | 'D' | 'C' | 'M';
export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface KPIEntry {
  id: string;
  name: string;
  category: SQDCMCategory;
  unit: string;
  target: number;
  actual: number;
  previousMonth: number;
  dept: Dept;
  trend: number[];
  date: string;
}

export interface ComputedKPI extends KPIEntry {
  achievement: number;
  gap: number;
  status: 'green' | 'yellow' | 'red';
}

export interface Action {
  id: string;
  title: string;
  description: string;
  category: SQDCMCategory;
  dept: Dept;
  owner: string;
  dueDate: string;
  status: Status;
  priority: Priority;
  progress: number;
  linkedAbnormality?: string;
  createdAt: string;
}

export interface A3QQOQCCP {
  qui_operateur: string; qui_dept: string; qui_equipe: string;
  quoi_desc: string; quoi_process: string; quoi_symptomes: string;
  ou_ligne: string; ou_poste: string; ou_machine: string;
  quand_date: string; quand_heure: string; quand_poste: string;
  comment_sequence: string; comment_conditions: string;
  combien_rebut: string; combien_arret: string; combien_retard: string;
  pourquoi_cause: string; pourquoi_obs: string;
}
export interface A3ParetoEntry { cause: string; count: number; }
export interface A3IshikawaBone { man: string[]; machine: string[]; method: string[]; material: string[]; measurement: string[]; milieu: string[]; }
export interface A3FiveWhys { w1: string; w2: string; w3: string; w4: string; w5: string; rootCause: string; }
export type A3PDCAPhase = 'Plan' | 'Do' | 'Check' | 'Act';
export interface A3PDCAItem { id: string; phase: A3PDCAPhase; action: string; responsible: string; deadline: string; status: 'pending' | 'in-progress' | 'done'; progress: number; }
export interface A3TimelineEvent { id: string; date: string; event: string; responsible: string; type: 'detection' | 'update' | 'action' | 'closure'; }
export interface A3Data {
  qqoqccp: Partial<A3QQOQCCP>;
  pareto: A3ParetoEntry[];
  ishikawa: Partial<A3IshikawaBone>;
  fiveWhys: Partial<A3FiveWhys>;
  pdca: A3PDCAItem[];
  timeline: A3TimelineEvent[];
}

export interface Abnormality {
  id: string;
  title: string;
  description: string;
  category: SQDCMCategory;
  dept: Dept;
  detectedBy: string;
  detectedDate: string;
  severity: Priority;
  status: 'open' | 'investigating' | 'contained' | 'closed';
  rootCause?: string;
  containmentAction?: string;
  correctiveAction?: string;
  linkedActions: string[];
  a3?: Partial<A3Data>;
}

export interface CIProject {
  id: string;
  title: string;
  description: string;
  type: 'kaizen' | '5s' | 'smed' | 'tpm' | 'poka-yoke' | 'kanban' | 'other';
  dept: Dept;
  leader: string;
  team: string[];
  startDate: string;
  targetDate: string;
  status: Status;
  savings: number;
  progress: number;
  phase: 'define' | 'measure' | 'analyze' | 'improve' | 'control';
}

export interface VSMStep {
  id: string;
  name: string;
  cycleTime: number;
  changeoverTime: number;
  uptime: number;
  operators: number;
  wip: number;
  leadTime: number;
  processTime: number;
  dept: Dept;
  scrapRate?: number;
}

export interface VSMContext {
  customerDemand: number;
  taktTime: number;
  productFamily: string;
  shiftPattern: string;
}

export type ProjectCategory = 'Productivity' | 'Quality' | 'Cost' | 'Safety' | 'Ergonomics';
export type ProjectType = 'CI' | 'Kaizen' | 'Structural Improvement';
export type ProjectHealth = 'green' | 'orange' | 'red';
export type ProjectActionStatus = 'Open' | 'In Progress' | 'Closed';
export type WBSLevel = 'project' | 'phase' | 'deliverable' | 'task' | 'sub-task';
export type GovernanceLevel = 'High' | 'Medium' | 'Low';

export interface Project {
  id: string;
  name: string;
  description: string;
  projectType: ProjectType;
  category: ProjectCategory;
  area: string;
  dept: Dept;
  owner: string;
  team: string[];
  startDate: string;
  endDate: string;
  status: Status;
  health: ProjectHealth;
  progress: number;
  impactKPI: string;
  expectedSavings: number;
  realizedSavings: number;
  targetEfficiencyGain: number;
  realizedGain: number;
  impactType: string;
  returnRate: number;
  baselineDescription: string;
  targetDescription: string;
  risks: ProjectRisk[];
  actions: ProjectAction[];
  wbsTasks: WBSTask[];
  sustainmentItems: SustainmentItem[];
}

export interface ProjectRisk {
  id: string;
  description: string;
  level: 'High' | 'Medium' | 'Low';
  countermeasure: string;
}

export interface ProjectAction {
  id: string;
  description: string;
  responsible: string;
  dueDate: string;
  status: ProjectActionStatus;
}

export type DependencyType = 'FS' | 'SS' | 'FF';

export interface TaskDependency {
  taskId: string;
  type: DependencyType;
}

export interface WBSTask {
  id: string;
  name: string;
  description: string;
  owner: string;
  startDate: string;
  endDate: string;
  progress: number;
  status: Status;
  parentId: string | null;
  level: WBSLevel;
  dependencies: string[];
  dependencyLinks?: TaskDependency[];
  collapsed?: boolean;
  order?: number;
}

export interface SustainmentItem {
  id: string;
  description: string;
  standardOwner: string;
  nextAuditDate: string;
  completed: boolean;
}

export const PROJECT_CATEGORIES: ProjectCategory[] = ['Productivity', 'Quality', 'Cost', 'Safety', 'Ergonomics'];
export const PROJECT_TYPES: ProjectType[] = ['CI', 'Kaizen', 'Structural Improvement'];

export const CATEGORY_COLORS: Record<ProjectCategory, string> = {
  Productivity: '#3b82f6',
  Quality: '#10b981',
  Cost: '#f59e0b',
  Safety: '#ef4444',
  Ergonomics: '#8b5cf6',
};

export const HEALTH_COLORS: Record<ProjectHealth, string> = {
  green: '#10b981',
  orange: '#f59e0b',
  red: '#ef4444',
};

export type KaizenCategory = 'Productivity' | 'Quality' | 'Safety' | 'Ergonomics' | 'Cost';
export type KaizenStatus = 'Submitted' | 'Under Review' | 'Approved' | 'Implemented' | 'Best Kaizen';
export type KaizenImpactLevel = 'Small' | 'Medium' | 'Major';

export const KAIZEN_CATEGORIES: KaizenCategory[] = ['Productivity', 'Quality', 'Safety', 'Ergonomics', 'Cost'];
export const KAIZEN_STATUSES: KaizenStatus[] = ['Submitted', 'Under Review', 'Approved', 'Implemented', 'Best Kaizen'];

export const KAIZEN_CATEGORY_COLORS: Record<KaizenCategory, string> = {
  Productivity: '#3b82f6',
  Quality: '#10b981',
  Safety: '#ef4444',
  Ergonomics: '#8b5cf6',
  Cost: '#f59e0b',
};

export const KAIZEN_STATUS_COLORS: Record<KaizenStatus, string> = {
  Submitted: '#6b7280',
  'Under Review': '#f59e0b',
  Approved: '#3b82f6',
  Implemented: '#10b981',
  'Best Kaizen': '#eab308',
};

export interface KaizenCard {
  id: string;
  title: string;
  plantName: string;
  plantManager: string;
  opexTeam: string[];
  submissionDate: string;
  category: KaizenCategory;
  area: string;
  ideaOwner: string;
  problemDescription: string;
  beforePhoto: string;
  cycleTimeBefore: number;
  solutionDescription: string;
  afterPhoto: string;
  cycleTimeAfter: number;
  timeSaving: number;
  productivityGain: number;
  qualityImprovement: string;
  ergonomicImprovement: string;
  costSaving: number;
  implementationDate: string;
  responsiblePerson: string;
  teamMembers: string[];
  areaAffected: string;
  equipmentUsed: string;
  supervisorApproval: boolean;
  opexApproval: boolean;
  plantManagerValidation: boolean;
  status: KaizenStatus;
  impactLevel: KaizenImpactLevel;
  points: number;
  comments: string;
}

export interface SharedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  dept: Dept;
  uploadedBy: string;
  uploadedAt: string;
  category: string;
  tags: string[];
}

export interface ReportRecord {
  id: string;
  type: string;
  generatedAt: string;
  generatedBy: string;
  format: string;
  filters: Record<string, string>;
}

export const DEPARTMENTS: Dept[] = ['P1', 'P2', 'P3', 'P4', 'Coupe', 'Qualité', 'Maintenance', 'Logistique', 'RH', 'HSE'];
export const SQDCM_CATEGORIES: SQDCMCategory[] = ['S', 'Q', 'D', 'C', 'M'];

export const SQDCM_LABELS: Record<SQDCMCategory, { fr: string; ar: string; color: string; icon: string }> = {
  S: { fr: 'Sécurité', ar: 'السلامة', color: '#ef4444', icon: 'Shield' },
  Q: { fr: 'Qualité', ar: 'الجودة', color: '#3b82f6', icon: 'CheckCircle' },
  D: { fr: 'Délai', ar: 'التسليم', color: '#f59e0b', icon: 'Clock' },
  C: { fr: 'Coût', ar: 'التكلفة', color: '#10b981', icon: 'DollarSign' },
  M: { fr: 'Moral', ar: 'المعنويات', color: '#8b5cf6', icon: 'Users' },
};

export const STATUS_COLORS: Record<Status, string> = {
  'on-track': '#10b981',
  'at-risk': '#f59e0b',
  'delayed': '#ef4444',
  'completed': '#3b82f6',
  'not-started': '#6b7280',
};
