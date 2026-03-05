import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { runAIEngine } from '@/lib/ai-engine';
import AIInsightCard from '@/components/ai-insight-card';
import type { Lang, Project, ProjectCategory } from '@shared/schema';
import { PROJECT_CATEGORIES, CATEGORY_COLORS, HEALTH_COLORS, STATUS_COLORS } from '@shared/schema';
import { useTranslate } from '@/lib/translations';
import { storage } from '@/lib/storage';
import {
  FolderKanban, Plus, Search, Filter, TrendingUp, DollarSign, Target, Activity,
  ChevronRight, X, Save, Users, Calendar
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Legend
} from 'recharts';

interface ProjectPortfolioProps {
  lang: Lang;
  onOpenAI?: () => void;
}

export default function ProjectPortfolio({ lang, onOpenAI }: ProjectPortfolioProps) {
  const tr = useTranslate(lang);
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<'overview' | 'projects'>('overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const aiOutput = useMemo(() => runAIEngine(), []);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<ProjectCategory | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Project>>({});

  useEffect(() => {
    setProjects(storage.getProjects());
  }, []);

  const filtered = useMemo(() => {
    return projects.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.owner.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCat !== 'all' && p.category !== filterCat) return false;
      return true;
    });
  }, [projects, search, filterCat]);

  const activeProjects = projects.filter(p => p.status !== 'completed').length;
  const totalExpected = projects.reduce((s, p) => s + p.expectedSavings, 0);
  const totalRealized = projects.reduce((s, p) => s + p.realizedSavings, 0);

  const governanceIndex = useMemo(() => {
    if (projects.length === 0) return 'N/A';
    const avgProgress = projects.reduce((s, p) => s + p.progress, 0) / projects.length;
    const onTrackPct = projects.filter(p => p.health === 'green').length / projects.length;
    if (avgProgress > 40 && onTrackPct > 0.6) return 'High';
    if (avgProgress > 25 && onTrackPct > 0.3) return 'Medium';
    return 'Low';
  }, [projects]);

  const healthData = useMemo(() => {
    const counts = { green: 0, orange: 0, red: 0 };
    projects.forEach(p => counts[p.health]++);
    return [
      { name: 'On Track', value: counts.green, fill: HEALTH_COLORS.green },
      { name: 'At Risk', value: counts.orange, fill: HEALTH_COLORS.orange },
      { name: 'Delayed', value: counts.red, fill: HEALTH_COLORS.red },
    ].filter(d => d.value > 0);
  }, [projects]);

  const categoryData = useMemo(() => {
    return PROJECT_CATEGORIES.map(cat => ({
      name: cat,
      count: projects.filter(p => p.category === cat).length,
      fill: CATEGORY_COLORS[cat],
    }));
  }, [projects]);

  const govColor = governanceIndex === 'High' ? 'text-emerald-400' : governanceIndex === 'Medium' ? 'text-amber-400' : 'text-red-400';
  const govBg = governanceIndex === 'High' ? 'bg-emerald-500/10' : governanceIndex === 'Medium' ? 'bg-amber-500/10' : 'bg-red-500/10';

  const handleSave = () => {
    if (!form.name || !form.category || !form.dept) return;
    const entry: Project = {
      id: `proj-${Date.now()}`,
      name: form.name || '',
      description: form.description || '',
      projectType: (form.projectType as any) || 'CI',
      category: form.category as ProjectCategory,
      area: form.area || '',
      dept: form.dept as any,
      owner: form.owner || '',
      team: form.team || [],
      startDate: form.startDate || new Date().toISOString().slice(0, 10),
      endDate: form.endDate || '',
      status: 'not-started',
      health: 'green',
      progress: 0,
      impactKPI: form.impactKPI || '',
      expectedSavings: Number(form.expectedSavings) || 0,
      realizedSavings: 0,
      targetEfficiencyGain: Number(form.targetEfficiencyGain) || 0,
      realizedGain: 0,
      impactType: form.impactType || '',
      returnRate: 0,
      baselineDescription: form.baselineDescription || '',
      targetDescription: form.targetDescription || '',
      risks: [],
      actions: [],
      wbsTasks: [],
      sustainmentItems: [],
    };
    const updated = [...projects, entry];
    setProjects(updated);
    storage.setProjects(updated);
    setShowForm(false);
    setForm({});
  };

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <AIInsightCard module="portfolio" output={aiOutput} onOpenCopilot={onOpenAI} />
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="text-portfolio-title" className="text-2xl font-bold text-white">
            OPEX Project Portfolio
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Continuous Improvement Project Management</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white/5 rounded-lg p-0.5">
            <button
              data-testid="tab-overview"
              onClick={() => setTab('overview')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === 'overview' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              OVERVIEW
            </button>
            <button
              data-testid="tab-projects"
              onClick={() => setTab('projects')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === 'projects' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              PROJECTS
            </button>
          </div>
        </div>
      </div>

      {tab === 'overview' ? (
        <OverviewTab
          projects={projects}
          activeProjects={activeProjects}
          totalExpected={totalExpected}
          totalRealized={totalRealized}
          governanceIndex={governanceIndex}
          govColor={govColor}
          govBg={govBg}
          healthData={healthData}
          categoryData={categoryData}
          lang={lang}
          onNavigate={(id) => navigate(`/portfolio/${id}`)}
        />
      ) : (
        <ProjectsTab
          projects={filtered}
          search={search}
          setSearch={setSearch}
          filterCat={filterCat}
          setFilterCat={setFilterCat}
          onRegister={() => setShowForm(true)}
          onNavigate={(id) => navigate(`/portfolio/${id}`)}
          lang={lang}
        />
      )}

      {showForm && (
        <RegisterProjectModal
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
          lang={lang}
        />
      )}
    </div>
  );
}

interface OverviewTabProps {
  projects: Project[];
  activeProjects: number;
  totalExpected: number;
  totalRealized: number;
  governanceIndex: string;
  govColor: string;
  govBg: string;
  healthData: { name: string; value: number; fill: string }[];
  categoryData: { name: string; count: number; fill: string }[];
  lang: Lang;
  onNavigate: (id: string) => void;
}

function OverviewTab({ projects, activeProjects, totalExpected, totalRealized, governanceIndex, govColor, govBg, healthData, categoryData, lang, onNavigate }: OverviewTabProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <FolderKanban size={14} />
            <span className="text-xs uppercase tracking-wider">Total Active Projects</span>
          </div>
          <div data-testid="text-active-count" className="text-3xl font-bold text-white font-mono">{activeProjects}</div>
          <div className="text-[10px] text-zinc-500 mt-1">{projects.length} total registered</div>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <TrendingUp size={14} />
            <span className="text-xs uppercase tracking-wider">Total Expected Gains</span>
          </div>
          <div data-testid="text-expected-gains" className="text-3xl font-bold text-emerald-400 font-mono">{(totalExpected / 1000).toFixed(0)}k€</div>
          <div className="text-[10px] text-zinc-500 mt-1">Annualized savings target</div>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <DollarSign size={14} />
            <span className="text-xs uppercase tracking-wider">Realized Gains YTD</span>
          </div>
          <div data-testid="text-realized-gains" className="text-3xl font-bold text-blue-400 font-mono">{(totalRealized / 1000).toFixed(0)}k€</div>
          <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${totalExpected > 0 ? Math.min((totalRealized / totalExpected) * 100, 100) : 0}%` }} />
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">{totalExpected > 0 ? ((totalRealized / totalExpected) * 100).toFixed(0) : 0}% of target</div>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Target size={14} />
            <span className="text-xs uppercase tracking-wider">Governance Index</span>
          </div>
          <div className={`text-3xl font-bold font-mono ${govColor}`}>{governanceIndex}</div>
          <div className={`mt-2 px-2 py-0.5 rounded-full text-[10px] ${govBg} ${govColor} inline-block`}>
            Project discipline level
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Portfolio Health (G/O/R)</h3>
          <div className="h-56 flex items-center justify-center">
            {healthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="transparent"
                  >
                    {healthData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#e4e4e7' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-zinc-500">No data</p>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {healthData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                <span className="text-zinc-400">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Projects by Performance Category</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                <YAxis tick={{ fill: '#71717a', fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={36}>
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Project Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {projects.slice(0, 5).map((p: Project) => (
            <div
              key={p.id}
              data-testid={`card-overview-project-${p.id}`}
              onClick={() => onNavigate(p.id)}
              className="glass rounded-lg p-4 cursor-pointer hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: HEALTH_COLORS[p.health] }} />
                <span className="text-xs font-semibold text-white truncate">{p.name}</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-500">Progress</span>
                  <span className="text-zinc-300 font-mono">{p.progress}%</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${p.progress}%`, backgroundColor: HEALTH_COLORS[p.health] }} />
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-500">Savings</span>
                  <span className="text-emerald-400 font-mono">{(p.realizedSavings / 1000).toFixed(0)}k€</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

interface ProjectsTabProps {
  projects: Project[];
  search: string;
  setSearch: (s: string) => void;
  filterCat: ProjectCategory | 'all';
  setFilterCat: (c: ProjectCategory | 'all') => void;
  onRegister: () => void;
  onNavigate: (id: string) => void;
  lang: Lang;
}

function ProjectsTab({ projects, search, setSearch, filterCat, setFilterCat, onRegister, onNavigate, lang }: ProjectsTabProps) {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            data-testid="input-search-projects"
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
            placeholder="Search by project name or owner..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none focus:border-blue-500"
          />
        </div>
        <select
          data-testid="select-filter-category"
          value={filterCat}
          onChange={(e: any) => setFilterCat(e.target.value)}
          className="px-3 py-2 rounded-lg text-xs bg-white/5 text-zinc-300 border border-white/10 outline-none"
        >
          <option value="all">All Categories</option>
          {PROJECT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          data-testid="button-register-project"
          onClick={onRegister}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
        >
          <Plus size={14} />
          Register Project
        </button>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left py-3 px-4 text-zinc-500 font-medium">Project Name</th>
              <th className="text-left py-3 px-4 text-zinc-500 font-medium">Area / Line</th>
              <th className="text-left py-3 px-4 text-zinc-500 font-medium">Category</th>
              <th className="text-left py-3 px-4 text-zinc-500 font-medium">Impact KPI</th>
              <th className="text-left py-3 px-4 text-zinc-500 font-medium">Status</th>
              <th className="text-left py-3 px-4 text-zinc-500 font-medium">Owner</th>
              <th className="text-right py-3 px-4 text-zinc-500 font-medium">Expected Savings</th>
              <th className="text-right py-3 px-4 text-zinc-500 font-medium">Realized Savings</th>
              <th className="py-3 px-4 text-zinc-500 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p: Project) => (
              <tr
                key={p.id}
                data-testid={`row-project-${p.id}`}
                onClick={() => onNavigate(p.id)}
                className="border-b border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: HEALTH_COLORS[p.health] }} />
                    <span className="text-zinc-200 font-medium">{p.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-zinc-400">{p.area}</td>
                <td className="py-3 px-4">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] border"
                    style={{ borderColor: `${CATEGORY_COLORS[p.category]}30`, color: CATEGORY_COLORS[p.category], backgroundColor: `${CATEGORY_COLORS[p.category]}10` }}
                  >
                    {p.category}
                  </span>
                </td>
                <td className="py-3 px-4 text-zinc-400">{p.impactKPI}</td>
                <td className="py-3 px-4">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px]"
                    style={{ backgroundColor: `${STATUS_COLORS[p.status]}20`, color: STATUS_COLORS[p.status] }}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-zinc-300">{p.owner}</td>
                <td className="py-3 px-4 text-right text-zinc-400 font-mono">{p.expectedSavings.toLocaleString()}€</td>
                <td className="py-3 px-4 text-right text-emerald-400 font-mono">{p.realizedSavings.toLocaleString()}€</td>
                <td className="py-3 px-4">
                  <ChevronRight size={14} className="text-zinc-600" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {projects.length === 0 && (
          <div className="text-center py-12 text-sm text-zinc-500">No projects found</div>
        )}
      </div>
    </>
  );
}

interface RegisterProjectModalProps {
  form: Partial<Project>;
  setForm: (f: Partial<Project>) => void;
  onSave: () => void;
  onClose: () => void;
  lang: Lang;
}

function RegisterProjectModal({ form, setForm, onSave, onClose, lang }: RegisterProjectModalProps) {
  const DEPARTMENTS = ['P1', 'P2', 'P3', 'P4', 'Coupe', 'Qualité', 'Maintenance', 'Logistique', 'RH', 'HSE'];
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="glass-strong rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e: any) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Register New Project</h3>
          <button data-testid="button-close-register" onClick={onClose} className="text-zinc-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <input data-testid="input-proj-name" placeholder="Project Name" value={form.name || ''} onChange={(e: any) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none focus:border-blue-500" />
          <textarea data-testid="input-proj-desc" placeholder="Description" value={form.description || ''} onChange={(e: any) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none h-16 resize-none" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select data-testid="select-proj-type" value={form.projectType || ''} onChange={(e: any) => setForm({ ...form, projectType: e.target.value })}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
              <option value="">Project Type</option>
              <option value="CI">CI</option>
              <option value="Kaizen">Kaizen</option>
              <option value="Structural Improvement">Structural Improvement</option>
            </select>
            <select data-testid="select-proj-category" value={form.category || ''} onChange={(e: any) => setForm({ ...form, category: e.target.value })}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
              <option value="">Category</option>
              {PROJECT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input data-testid="input-proj-area" placeholder="Area / Line" value={form.area || ''} onChange={(e: any) => setForm({ ...form, area: e.target.value })}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
            <select data-testid="select-proj-dept" value={form.dept || ''} onChange={(e: any) => setForm({ ...form, dept: e.target.value })}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
              <option value="">Department</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input data-testid="input-proj-owner" placeholder="Owner" value={form.owner || ''} onChange={(e: any) => setForm({ ...form, owner: e.target.value })}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
            <input data-testid="input-proj-kpi" placeholder="Impact KPI" value={form.impactKPI || ''} onChange={(e: any) => setForm({ ...form, impactKPI: e.target.value })}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500">Start Date</label>
              <input type="date" value={form.startDate || ''} onChange={(e: any) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500">End Date</label>
              <input type="date" value={form.endDate || ''} onChange={(e: any) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
            </div>
          </div>
          <input data-testid="input-proj-savings" type="number" placeholder="Expected Savings (€)" value={form.expectedSavings || ''} onChange={(e: any) => setForm({ ...form, expectedSavings: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
          <div>
            <label className="text-[10px] text-zinc-500">Baseline Description</label>
            <textarea placeholder="Current state..." value={form.baselineDescription || ''} onChange={(e: any) => setForm({ ...form, baselineDescription: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none h-14 resize-none" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500">Target Description</label>
            <textarea placeholder="Target state..." value={form.targetDescription || ''} onChange={(e: any) => setForm({ ...form, targetDescription: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none h-14 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400">Cancel</button>
          <button data-testid="button-save-project" onClick={onSave} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
            <Save size={14} />
            Register Project
          </button>
        </div>
      </div>
    </div>
  );
}
