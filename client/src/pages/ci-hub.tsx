import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import type { Lang, CIProject, Dept, Status, KaizenCard, KaizenCategory, KaizenStatus } from '@shared/schema';
import { DEPARTMENTS, KAIZEN_CATEGORIES, KAIZEN_STATUSES, KAIZEN_CATEGORY_COLORS, KAIZEN_STATUS_COLORS } from '@shared/schema';
import { useTranslate } from '@/lib/translations';
import { storage } from '@/lib/storage';
import {
  Lightbulb, Plus, X, Save, TrendingUp, Target, Trophy, Star,
  Search, Award, Users, Calendar, ArrowRight, Eye
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface CIHubProps {
  lang: Lang;
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  kaizen: { label: 'Kaizen', color: '#10b981' },
  '5s': { label: '5S', color: '#3b82f6' },
  smed: { label: 'SMED', color: '#f59e0b' },
  tpm: { label: 'TPM', color: '#8b5cf6' },
  'poka-yoke': { label: 'Poka-Yoke', color: '#ef4444' },
  kanban: { label: 'Kanban', color: '#06b6d4' },
  other: { label: 'Autre', color: '#6b7280' },
};

const PHASE_CONFIG: Record<string, { label: string; step: number }> = {
  define: { label: 'Define', step: 1 },
  measure: { label: 'Measure', step: 2 },
  analyze: { label: 'Analyze', step: 3 },
  improve: { label: 'Improve', step: 4 },
  control: { label: 'Control', step: 5 },
};

export default function CIHub({ lang }: CIHubProps) {
  const tr = useTranslate(lang);
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<'overview' | 'ideas' | 'board' | 'cards'>('overview');
  const [projects, setProjects] = useState<CIProject[]>([]);
  const [kaizenCards, setKaizenCards] = useState<KaizenCard[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<CIProject>>({});

  useEffect(() => {
    setProjects(storage.getCIProjects());
    setKaizenCards(storage.getKaizenCards());
  }, []);

  const totalSavings = projects.reduce((s, p) => s + p.savings, 0);
  const avgProgress = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;
  const kaizenSavings = kaizenCards.reduce((s, k) => s + k.costSaving, 0);

  const handleSave = () => {
    if (!form.title || !form.type || !form.dept) return;
    const entry: CIProject = {
      id: `ci-${Date.now()}`,
      title: form.title || '',
      description: form.description || '',
      type: form.type as CIProject['type'],
      dept: form.dept as Dept,
      leader: form.leader || '',
      team: [],
      startDate: form.startDate || new Date().toISOString().slice(0, 10),
      targetDate: form.targetDate || '',
      status: 'not-started' as Status,
      savings: Number(form.savings) || 0,
      progress: 0,
      phase: 'define',
    };
    const updated = [...projects, entry];
    setProjects(updated);
    storage.setCIProjects(updated);
    setShowForm(false);
    setForm({});
  };

  const updateProgress = (id: string, progress: number) => {
    const updated = projects.map(p => p.id === id ? { ...p, progress, status: progress >= 100 ? 'completed' as Status : p.status } : p);
    setProjects(updated);
    storage.setCIProjects(updated);
  };

  const updatePhase = (id: string, phase: CIProject['phase']) => {
    const updated = projects.map(p => p.id === id ? { ...p, phase } : p);
    setProjects(updated);
    storage.setCIProjects(updated);
  };

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'ideas' as const, label: 'Kaizen Ideas' },
    { key: 'board' as const, label: 'Kaizen Board' },
    { key: 'cards' as const, label: 'Kaizen Cards' },
  ];

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="text-ci-title" className="text-2xl font-bold text-white">{tr('ci.title')}</h1>
          <p className="text-sm text-zinc-500 mt-1">Digital Kaizen Card System • Continuous Improvement</p>
        </div>
        <div className="flex bg-white/5 rounded-lg p-0.5">
          {tabs.map(t => (
            <button
              key={t.key}
              data-testid={`tab-ci-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === t.key ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <OverviewTab
          projects={projects}
          kaizenCards={kaizenCards}
          totalSavings={totalSavings}
          kaizenSavings={kaizenSavings}
          avgProgress={avgProgress}
          lang={lang}
        />
      )}

      {tab === 'ideas' && (
        <IdeasTab
          projects={projects}
          showForm={showForm}
          setShowForm={setShowForm}
          form={form}
          setForm={setForm}
          handleSave={handleSave}
          updateProgress={updateProgress}
          updatePhase={updatePhase}
          tr={tr}
          lang={lang}
        />
      )}

      {tab === 'board' && (
        <BoardTab
          kaizenCards={kaizenCards}
          setKaizenCards={setKaizenCards}
          onNavigate={(id: string) => navigate(`/ci/kaizen/${id}`)}
        />
      )}

      {tab === 'cards' && (
        <CardsTab
          kaizenCards={kaizenCards}
          onNavigate={(id: string) => navigate(`/ci/kaizen/${id}`)}
          onCreateNew={() => navigate('/ci/kaizen/new')}
        />
      )}
    </div>
  );
}

function OverviewTab({ projects, kaizenCards, totalSavings, kaizenSavings, avgProgress, lang }: {
  projects: CIProject[];
  kaizenCards: KaizenCard[];
  totalSavings: number;
  kaizenSavings: number;
  avgProgress: number;
  lang: Lang;
}) {
  const typeData = Object.keys(TYPE_CONFIG).map(type => ({
    name: TYPE_CONFIG[type].label,
    count: projects.filter(p => p.type === type).length,
    fill: TYPE_CONFIG[type].color,
  })).filter(d => d.count > 0);

  const statusData = KAIZEN_STATUSES.map(status => ({
    name: status,
    value: kaizenCards.filter(k => k.status === status).length,
    fill: KAIZEN_STATUS_COLORS[status],
  })).filter(d => d.value > 0);

  const categoryData = KAIZEN_CATEGORIES.map(cat => ({
    name: cat,
    count: kaizenCards.filter(k => k.category === cat).length,
    fill: KAIZEN_CATEGORY_COLORS[cat],
  }));

  const leaderboard = useMemo(() => {
    const map = new Map<string, number>();
    kaizenCards.forEach(k => {
      map.set(k.ideaOwner, (map.get(k.ideaOwner) || 0) + k.points);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [kaizenCards]);

  return (
    <>
      <div className="grid grid-cols-5 gap-4">
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Lightbulb size={14} />
            <span className="text-xs uppercase tracking-wider">CI Projects</span>
          </div>
          <div data-testid="text-ci-count" className="text-3xl font-bold text-white font-mono">{projects.length}</div>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Star size={14} />
            <span className="text-xs uppercase tracking-wider">Kaizen Cards</span>
          </div>
          <div className="text-3xl font-bold text-amber-400 font-mono">{kaizenCards.length}</div>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <TrendingUp size={14} />
            <span className="text-xs uppercase tracking-wider">Total Savings</span>
          </div>
          <div className="text-3xl font-bold text-emerald-400 font-mono">{((totalSavings + kaizenSavings) / 1000).toFixed(0)}k€</div>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Target size={14} />
            <span className="text-xs uppercase tracking-wider">Avg Progress</span>
          </div>
          <div className="text-3xl font-bold text-blue-400 font-mono">{avgProgress}%</div>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Trophy size={14} />
            <span className="text-xs uppercase tracking-wider">Best Kaizen</span>
          </div>
          <div className="text-3xl font-bold text-yellow-400 font-mono">{kaizenCards.filter(k => k.status === 'Best Kaizen').length}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Kaizen by Status</h3>
          <div className="h-48">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" stroke="transparent">
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-zinc-500 text-center pt-16">No data</p>}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {statusData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                <span className="text-zinc-400">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Kaizen by Category</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 9 }} />
                <YAxis tick={{ fill: '#71717a', fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={28}>
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Trophy size={14} className="text-yellow-400" />
            Kaizen Leaderboard
          </h3>
          {leaderboard.length > 0 ? (
            <div className="space-y-2.5">
              {leaderboard.map(([name, points], i) => (
                <div key={name} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-zinc-400/20 text-zinc-300' : i === 2 ? 'bg-amber-700/20 text-amber-600' : 'bg-white/5 text-zinc-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-zinc-200">{name}</p>
                    <div className="w-full h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-yellow-500/60 rounded-full" style={{ width: `${leaderboard[0] ? (points / leaderboard[0][1]) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Award size={10} className="text-yellow-400" />
                    <span className="text-xs text-yellow-400 font-mono">{points}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 text-center pt-8">No points yet</p>
          )}
        </div>
      </div>

      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">CI Projects by Type</h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={Object.keys(TYPE_CONFIG).map(type => ({
              name: TYPE_CONFIG[type].label,
              count: projects.filter(p => p.type === type).length,
              fill: TYPE_CONFIG[type].color,
            })).filter(d => d.count > 0)} layout="vertical">
              <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#a1a1aa', fontSize: 10 }} width={80} />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                {Object.keys(TYPE_CONFIG).map(type => ({
                  name: TYPE_CONFIG[type].label,
                  count: projects.filter(p => p.type === type).length,
                  fill: TYPE_CONFIG[type].color,
                })).filter(d => d.count > 0).map((entry, i) => (
                  <Cell key={i} fill={entry.fill} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

function IdeasTab({ projects, showForm, setShowForm, form, setForm, handleSave, updateProgress, updatePhase, tr, lang }: {
  projects: CIProject[];
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  form: Partial<CIProject>;
  setForm: (f: Partial<CIProject>) => void;
  handleSave: () => void;
  updateProgress: (id: string, p: number) => void;
  updatePhase: (id: string, phase: CIProject['phase']) => void;
  tr: (key: string) => string;
  lang: Lang;
}) {
  return (
    <>
      <div className="flex justify-end">
        <button data-testid="button-add-ci" onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors">
          <Plus size={14} />
          {tr('ci.add')}
        </button>
      </div>

      <div className="space-y-3">
        {projects.map(project => {
          const typeConf = TYPE_CONFIG[project.type] || TYPE_CONFIG.other;
          const phaseConf = PHASE_CONFIG[project.phase];
          return (
            <div key={project.id} data-testid={`card-ci-${project.id}`} className="glass rounded-xl p-5 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: `${typeConf.color}20`, color: typeConf.color }}>
                  {typeConf.label.slice(0, 2)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white">{project.title}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] border"
                      style={{ borderColor: `${typeConf.color}30`, color: typeConf.color, backgroundColor: `${typeConf.color}10` }}>
                      {typeConf.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-3">{project.description}</p>
                  <div className="flex items-center gap-6 text-[10px] text-zinc-500">
                    <span>{tr('ci.leader')}: <span className="text-zinc-300">{project.leader}</span></span>
                    <span>{tr('kpi.dept')}: <span className="text-zinc-300">{project.dept}</span></span>
                    <span>{tr('ci.savings')}: <span className="text-emerald-400 font-mono">{project.savings.toLocaleString()}€</span></span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500">{tr('ci.phase')}:</span>
                    <select value={project.phase} onChange={e => updatePhase(project.id, e.target.value as CIProject['phase'])}
                      className="px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-zinc-300 outline-none">
                      {Object.entries(PHASE_CONFIG).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 w-40">
                    <input type="range" min="0" max="100" value={project.progress}
                      onChange={e => updateProgress(project.id, parseInt(e.target.value))}
                      className="flex-1 h-1 appearance-none bg-white/10 rounded-full accent-emerald-500" />
                    <span className="text-xs text-zinc-400 font-mono w-8 text-right">{project.progress}%</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-1">
                {Object.entries(PHASE_CONFIG).map(([key, val]) => (
                  <div key={key} className={`flex-1 h-1 rounded-full ${
                    val.step <= phaseConf.step ? 'bg-emerald-500' : 'bg-white/5'
                  }`} />
                ))}
              </div>
            </div>
          );
        })}
        {projects.length === 0 && (
          <div className="text-center py-12 text-sm text-zinc-500">No CI projects yet</div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="glass-strong rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{tr('ci.add')}</h3>
              <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input data-testid="input-ci-title" placeholder="Titre du projet" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
              <textarea data-testid="input-ci-description" placeholder="Description" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none h-20 resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <select data-testid="select-ci-type" value={form.type || ''} onChange={e => setForm({ ...form, type: e.target.value as CIProject['type'] })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
                  <option value="">Type</option>
                  {Object.entries(TYPE_CONFIG).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                </select>
                <select data-testid="select-ci-dept" value={form.dept || ''} onChange={e => setForm({ ...form, dept: e.target.value as Dept })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
                  <option value="">Département</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input data-testid="input-ci-leader" placeholder="Leader" value={form.leader || ''} onChange={e => setForm({ ...form, leader: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
                <input data-testid="input-ci-savings" type="number" placeholder="Économies (€)" value={form.savings || ''} onChange={e => setForm({ ...form, savings: Number(e.target.value) })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input data-testid="input-ci-start" type="date" value={form.startDate || ''} onChange={e => setForm({ ...form, startDate: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
                <input data-testid="input-ci-target" type="date" value={form.targetDate || ''} onChange={e => setForm({ ...form, targetDate: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-zinc-400">{tr('common.cancel')}</button>
              <button data-testid="button-save-ci" onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">
                <Save size={14} />
                {tr('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BoardTab({ kaizenCards, setKaizenCards, onNavigate }: {
  kaizenCards: KaizenCard[];
  setKaizenCards: (cards: KaizenCard[]) => void;
  onNavigate: (id: string) => void;
}) {
  const columns: { status: KaizenStatus; label: string }[] = [
    { status: 'Submitted', label: 'Submitted' },
    { status: 'Under Review', label: 'Under Review' },
    { status: 'Approved', label: 'Approved' },
    { status: 'Implemented', label: 'Implemented' },
    { status: 'Best Kaizen', label: 'Best Kaizen' },
  ];

  const moveCard = (cardId: string, newStatus: KaizenStatus) => {
    const updated = kaizenCards.map(k => k.id === cardId ? { ...k, status: newStatus } : k);
    setKaizenCards(updated);
    storage.setKaizenCards(updated);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {columns.map(col => {
        const cards = kaizenCards.filter(k => k.status === col.status);
        return (
          <div key={col.status} className="flex-shrink-0 w-64">
            <div className="flex items-center gap-2 mb-3 px-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: KAIZEN_STATUS_COLORS[col.status] }} />
              <span className="text-xs font-semibold text-zinc-300">{col.label}</span>
              <span className="text-[10px] text-zinc-500 ml-auto">{cards.length}</span>
            </div>
            <div className="space-y-2 min-h-[200px] glass rounded-xl p-2">
              {cards.map(card => (
                <div
                  key={card.id}
                  data-testid={`board-card-${card.id}`}
                  onClick={() => onNavigate(card.id)}
                  className="p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className="px-1.5 py-0.5 rounded text-[8px] border"
                      style={{ borderColor: `${KAIZEN_CATEGORY_COLORS[card.category]}30`, color: KAIZEN_CATEGORY_COLORS[card.category] }}>
                      {card.category}
                    </span>
                    {card.status === 'Best Kaizen' && <Star size={10} className="text-yellow-400" />}
                  </div>
                  <p className="text-xs text-white font-medium mb-1.5 leading-relaxed">{card.title}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">{card.ideaOwner}</span>
                    {card.costSaving > 0 && (
                      <span className="text-[10px] text-emerald-400 font-mono">{card.costSaving.toLocaleString()}€</span>
                    )}
                  </div>
                  <div className="flex gap-1 mt-2">
                    {col.status !== 'Submitted' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); moveCard(card.id, columns[columns.findIndex(c => c.status === col.status) - 1]?.status || 'Submitted'); }}
                        className="px-1.5 py-0.5 text-[8px] text-zinc-500 hover:text-zinc-300 bg-white/5 rounded"
                      >
                        ← Back
                      </button>
                    )}
                    {col.status !== 'Best Kaizen' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); moveCard(card.id, columns[columns.findIndex(c => c.status === col.status) + 1]?.status || 'Best Kaizen'); }}
                        className="px-1.5 py-0.5 text-[8px] text-zinc-500 hover:text-zinc-300 bg-white/5 rounded"
                      >
                        Advance →
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {cards.length === 0 && (
                <p className="text-[10px] text-zinc-600 text-center py-8">Empty</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CardsTab({ kaizenCards, onNavigate, onCreateNew }: {
  kaizenCards: KaizenCard[];
  onNavigate: (id: string) => void;
  onCreateNew: () => void;
}) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<KaizenCategory | 'all'>('all');

  const filtered = kaizenCards.filter(k => {
    if (search && !k.title.toLowerCase().includes(search.toLowerCase()) && !k.ideaOwner.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat !== 'all' && k.category !== filterCat) return false;
    return true;
  });

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            data-testid="input-search-kaizen"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search kaizen cards..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none focus:border-emerald-500"
          />
        </div>
        <select
          data-testid="select-filter-kaizen-category"
          value={filterCat}
          onChange={e => setFilterCat(e.target.value as KaizenCategory | 'all')}
          className="px-3 py-2 rounded-lg text-xs bg-white/5 text-zinc-300 border border-white/10 outline-none"
        >
          <option value="all">All Categories</option>
          {KAIZEN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          data-testid="button-create-kaizen"
          onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
        >
          <Plus size={14} />
          Create Kaizen Card
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map(card => (
          <div
            key={card.id}
            data-testid={`kaizen-card-preview-${card.id}`}
            onClick={() => onNavigate(card.id)}
            className="glass rounded-xl overflow-hidden cursor-pointer hover:bg-white/[0.03] transition-colors"
          >
            <div className="p-1.5 flex items-center justify-between" style={{ backgroundColor: `${KAIZEN_STATUS_COLORS[card.status]}15` }}>
              <div className="flex items-center gap-2 px-2">
                {card.status === 'Best Kaizen' && <Star size={12} className="text-yellow-400" />}
                <span className="text-[10px] font-semibold" style={{ color: KAIZEN_STATUS_COLORS[card.status] }}>{card.status}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[8px] border"
                style={{ borderColor: `${KAIZEN_CATEGORY_COLORS[card.category]}30`, color: KAIZEN_CATEGORY_COLORS[card.category] }}>
                {card.category}
              </span>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-semibold text-white mb-2">{card.title}</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="p-2 rounded bg-red-500/5 border border-red-500/10">
                  <p className="text-[8px] text-red-400 uppercase tracking-wider mb-1">BEFORE</p>
                  <p className="text-[10px] text-zinc-400 line-clamp-2">{card.problemDescription}</p>
                  {card.cycleTimeBefore > 0 && (
                    <p className="text-[10px] text-zinc-500 mt-1">CT: <span className="text-red-400 font-mono">{card.cycleTimeBefore} min</span></p>
                  )}
                </div>
                <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-[8px] text-emerald-400 uppercase tracking-wider mb-1">AFTER</p>
                  <p className="text-[10px] text-zinc-400 line-clamp-2">{card.solutionDescription}</p>
                  {card.cycleTimeAfter > 0 && (
                    <p className="text-[10px] text-zinc-500 mt-1">CT: <span className="text-emerald-400 font-mono">{card.cycleTimeAfter} min</span></p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-3 text-zinc-500">
                  <span className="flex items-center gap-1"><Users size={9} />{card.ideaOwner}</span>
                  <span className="flex items-center gap-1"><Calendar size={9} />{card.submissionDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  {card.costSaving > 0 && (
                    <span className="text-emerald-400 font-mono">{card.costSaving.toLocaleString()}€</span>
                  )}
                  <div className="flex items-center gap-0.5">
                    <Award size={9} className="text-yellow-400" />
                    <span className="text-yellow-400 font-mono">{card.points}pts</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-12 text-sm text-zinc-500">No kaizen cards found</div>
      )}
    </>
  );
}
