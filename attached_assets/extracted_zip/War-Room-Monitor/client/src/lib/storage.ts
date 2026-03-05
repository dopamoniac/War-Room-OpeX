import type { Lang, KPIEntry, Action, Abnormality, CIProject, VSMStep, VSMContext, Project, SharedFile, ReportRecord, KaizenCard } from '@shared/schema';

const KEYS = {
  lang: 'leoni-lang',
  kpis: 'leoni-kpis-sim',
  actions: 'leoni-actions-sim',
  abnormalities: 'leoni-abnormalities-sim',
  vsmCurrent: 'leoni-vsm-current',
  vsmFuture: 'leoni-vsm-future',
  vsmContext: 'leoni-vsm-context',
  ciProjects: 'leoni-ci-projects',
  projects: 'leoni-projects',
  files: 'fileSharing/files',
  reports: 'leoni-report-history',
  kaizenCards: 'leoni-kaizen-cards',
  vsmPoster: 'leoni-vsm-poster',
};

function get<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  getLang: (): Lang => get<Lang>(KEYS.lang, 'fr'),
  setLang: (lang: Lang) => set(KEYS.lang, lang),

  getKPIs: (): KPIEntry[] => get<KPIEntry[]>(KEYS.kpis, []),
  setKPIs: (kpis: KPIEntry[]) => set(KEYS.kpis, kpis),

  getActions: (): Action[] => get<Action[]>(KEYS.actions, []),
  setActions: (actions: Action[]) => set(KEYS.actions, actions),

  getAbnormalities: (): Abnormality[] => get<Abnormality[]>(KEYS.abnormalities, []),
  setAbnormalities: (abnormalities: Abnormality[]) => set(KEYS.abnormalities, abnormalities),

  getVSMCurrent: (): VSMStep[] => get<VSMStep[]>(KEYS.vsmCurrent, []),
  setVSMCurrent: (steps: VSMStep[]) => set(KEYS.vsmCurrent, steps),

  getVSMFuture: (): VSMStep[] => get<VSMStep[]>(KEYS.vsmFuture, []),
  setVSMFuture: (steps: VSMStep[]) => set(KEYS.vsmFuture, steps),

  getVSMContext: (): VSMContext => get<VSMContext>(KEYS.vsmContext, {
    customerDemand: 1200,
    taktTime: 60,
    productFamily: 'Câblage Moteur',
    shiftPattern: '3x8',
  }),
  setVSMContext: (ctx: VSMContext) => set(KEYS.vsmContext, ctx),

  getCIProjects: (): CIProject[] => get<CIProject[]>(KEYS.ciProjects, []),
  setCIProjects: (projects: CIProject[]) => set(KEYS.ciProjects, projects),

  getProjects: (): Project[] => get<Project[]>(KEYS.projects, []),
  setProjects: (projects: Project[]) => set(KEYS.projects, projects),

  getFiles: (): SharedFile[] => get<SharedFile[]>(KEYS.files, []),
  setFiles: (files: SharedFile[]) => set(KEYS.files, files),

  getReports: (): ReportRecord[] => get<ReportRecord[]>(KEYS.reports, []),
  setReports: (reports: ReportRecord[]) => set(KEYS.reports, reports),

  getKaizenCards: (): KaizenCard[] => get<KaizenCard[]>(KEYS.kaizenCards, []),
  setKaizenCards: (cards: KaizenCard[]) => set(KEYS.kaizenCards, cards),

  getVSMPoster: (): any => get<any>(KEYS.vsmPoster, null),
  setVSMPoster: (data: any) => set(KEYS.vsmPoster, data),

  clearAll: () => {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  },
};
