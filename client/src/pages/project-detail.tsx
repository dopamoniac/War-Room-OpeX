import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
import { runAIEngine } from '@/lib/ai-engine';
import AIInsightCard from '@/components/ai-insight-card';
import type { Lang, Project, WBSTask, ProjectAction, ProjectRisk, ProjectActionStatus, Status, WBSLevel, DependencyType } from '@shared/schema';
import { HEALTH_COLORS } from '@shared/schema';
import { storage } from '@/lib/storage';
import {
  ArrowLeft, Users, Calendar, Target, DollarSign, AlertTriangle,
  CheckCircle, Plus, X, Save, ChevronRight, ChevronDown, FileDown,
  Shield, Layers, GanttChart, ClipboardList, Wrench, GripVertical, Link2, Trash2, Edit3, GitBranch
} from 'lucide-react';

interface ProjectDetailProps {
  id: string;
  lang: Lang;
  onOpenAI?: () => void;
}

export default function ProjectDetail({ id, lang, onOpenAI }: ProjectDetailProps) {
  const [, navigate] = useLocation();
  const [project, setProject] = useState<Project | null>(null);
  const aiOutput = useMemo(() => runAIEngine(), []);
  const [tab, setTab] = useState<'overview' | 'wbs' | 'gantt'>('overview');

  useEffect(() => {
    const projects = storage.getProjects();
    const found = projects.find(p => p.id === id);
    setProject(found || null);
  }, [id]);

  const saveProject = (updated: Project) => {
    setProject(updated);
    const all = storage.getProjects().map(p => p.id === updated.id ? updated : p);
    storage.setProjects(all);
  };

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-zinc-500 mb-4">Project not found</p>
        <button onClick={() => navigate('/portfolio')} className="text-blue-400 text-sm hover:underline">← Back to Portfolio</button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <AIInsightCard module="portfolio" output={aiOutput} onOpenCopilot={onOpenAI} />
      <div className="flex items-center gap-3">
        <button data-testid="button-back" onClick={() => navigate('/portfolio')} className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: HEALTH_COLORS[project.health] }} />
            <h1 data-testid="text-project-title" className="text-xl font-bold text-white">{project.name}</h1>
            <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-zinc-400">{project.projectType}</span>
          </div>
          <p className="text-xs text-zinc-500 mt-1 ml-6">{project.description}</p>
        </div>
      </div>

      <div className="flex bg-white/5 rounded-lg p-0.5 w-fit">
        {[
          { key: 'overview' as const, label: 'Overview', icon: ClipboardList },
          { key: 'wbs' as const, label: 'WBS Structure', icon: Layers },
          { key: 'gantt' as const, label: 'Gantt Timeline', icon: GanttChart },
        ].map(t => (
          <button
            key={t.key}
            data-testid={`tab-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === t.key ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewSection project={project} saveProject={saveProject} lang={lang} />}
      {tab === 'wbs' && <WBSSection project={project} saveProject={saveProject} />}
      {tab === 'gantt' && <GanttSection project={project} saveProject={saveProject} />}
    </div>
  );
}

function OverviewSection({ project, saveProject, lang }: { project: Project; saveProject: (p: Project) => void; lang: Lang }) {
  const [showActionForm, setShowActionForm] = useState(false);
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [actionForm, setActionForm] = useState<Partial<ProjectAction>>({});
  const [riskForm, setRiskForm] = useState<Partial<ProjectRisk>>({});

  const savingsPercent = project.expectedSavings > 0 ? (project.realizedSavings / project.expectedSavings) * 100 : 0;

  const addAction = () => {
    if (!actionForm.description) return;
    const action: ProjectAction = {
      id: `pa-${Date.now()}`,
      description: actionForm.description || '',
      responsible: actionForm.responsible || '',
      dueDate: actionForm.dueDate || '',
      status: 'Open',
    };
    saveProject({ ...project, actions: [...project.actions, action] });
    setShowActionForm(false);
    setActionForm({});
  };

  const updateActionStatus = (actionId: string, status: ProjectActionStatus) => {
    const updated = project.actions.map(a => a.id === actionId ? { ...a, status } : a);
    saveProject({ ...project, actions: updated });
  };

  const addRisk = () => {
    if (!riskForm.description) return;
    const risk: ProjectRisk = {
      id: `r-${Date.now()}`,
      description: riskForm.description || '',
      level: (riskForm.level || 'Medium') as ProjectRisk['level'],
      countermeasure: riskForm.countermeasure || '',
    };
    saveProject({ ...project, risks: [...project.risks, risk] });
    setShowRiskForm(false);
    setRiskForm({});
  };

  const generateGovernanceSheet = () => {
    const content = `
═══════════════════════════════════════════
  GOVERNANCE SHEET - ${project.name}
═══════════════════════════════════════════

PROJECT: ${project.name}
TYPE: ${project.projectType}
OWNER: ${project.owner}
TEAM: ${project.team.join(', ')}
PERIOD: ${project.startDate} → ${project.endDate}
STATUS: ${project.status.toUpperCase()}

── DESCRIPTION ──
${project.description}

── BASELINE ──
${project.baselineDescription}

── TARGET ──
${project.targetDescription}

── FINANCIAL IMPACT ──
Expected Savings: ${project.expectedSavings.toLocaleString()}€
Realized Savings: ${project.realizedSavings.toLocaleString()}€
Return Rate: ${project.returnRate}%

── RISKS ──
${project.risks.map(r => `[${r.level}] ${r.description}\n  → ${r.countermeasure}`).join('\n')}

── ACTION PLAN ──
${project.actions.map(a => `[${a.status}] ${a.description} | ${a.responsible} | Due: ${a.dueDate}`).join('\n')}

── SUSTAINMENT ──
${project.sustainmentItems.map(s => `${s.completed ? '✓' : '○'} ${s.description} | Owner: ${s.standardOwner} | Next Audit: ${s.nextAuditDate}`).join('\n')}

Generated: ${new Date().toLocaleString()}
═══════════════════════════════════════════`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `governance-${project.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-5">
          <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users size={12} />
            Project Team
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-600/30 flex items-center justify-center text-[10px] text-blue-400 font-bold">
                {project.owner.charAt(0)}
              </div>
              <div>
                <p className="text-xs text-white font-medium">{project.owner}</p>
                <p className="text-[10px] text-zinc-500">Project Owner</p>
              </div>
            </div>
            {project.team.map((member, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[10px] text-zinc-400 font-bold">
                  {member.charAt(0)}
                </div>
                <p className="text-xs text-zinc-300">{member}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5">
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <Calendar size={10} />
              <span>{project.startDate} → {project.endDate}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <Target size={10} />
              <span>Impact KPI: <span className="text-zinc-300">{project.impactKPI}</span></span>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <DollarSign size={12} />
            Financial Impact
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-zinc-500">Target Efficiency Gain</span>
                <span className="text-white font-mono">{project.targetEfficiencyGain}%</span>
              </div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-zinc-500">Realized Gain</span>
                <span className="text-emerald-400 font-mono">{project.realizedGain}%</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${project.targetEfficiencyGain > 0 ? (project.realizedGain / project.targetEfficiencyGain) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="pt-2 border-t border-white/5">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400">Expected Savings</span>
                <span className="text-white font-mono">{project.expectedSavings.toLocaleString()}€</span>
              </div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-zinc-400">Realized Savings</span>
                <span className="text-emerald-400 font-mono">{project.realizedSavings.toLocaleString()}€</span>
              </div>
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(savingsPercent, 100)}%` }} />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 text-right">{savingsPercent.toFixed(0)}% achieved</p>
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500 pt-1">
              <span>Impact: <span className="text-zinc-300">{project.impactType}</span></span>
              <span>ROI: <span className="text-emerald-400">{project.returnRate}%</span></span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Baseline (Before)</h3>
            <p className="text-xs text-zinc-400 whitespace-pre-line leading-relaxed">{project.baselineDescription}</p>
          </div>
          <div className="glass rounded-xl p-4 border border-emerald-500/10">
            <h3 className="text-[10px] text-emerald-400 uppercase tracking-wider mb-2">Target (After)</h3>
            <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed">{project.targetDescription}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" />
              Risk Assessment
            </h3>
            <button data-testid="button-add-risk" onClick={() => setShowRiskForm(true)} className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white">
              <Plus size={14} />
            </button>
          </div>
          {project.risks.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">No risks identified</p>
          ) : (
            <div className="space-y-2">
              {project.risks.map(risk => {
                const levelColors: Record<string, string> = { High: 'bg-red-500/15 text-red-400 border-red-500/20', Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20', Low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' };
                return (
                  <div key={risk.id} data-testid={`card-risk-${risk.id}`} className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-zinc-300">{risk.description}</p>
                      <span className={`px-2 py-0.5 rounded text-[10px] border whitespace-nowrap ${levelColors[risk.level]}`}>
                        {risk.level}
                      </span>
                    </div>
                    <div className="mt-2 flex items-start gap-1.5">
                      <Shield size={10} className="text-zinc-500 mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] text-zinc-500">{risk.countermeasure}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Wrench size={14} className="text-blue-400" />
              Sustainment Strategy
            </h3>
          </div>
          {project.sustainmentItems.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">No sustainment items</p>
          ) : (
            <div className="space-y-2">
              {project.sustainmentItems.map(item => (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02]">
                  <button
                    onClick={() => {
                      const updated = project.sustainmentItems.map(s => s.id === item.id ? { ...s, completed: !s.completed } : s);
                      saveProject({ ...project, sustainmentItems: updated });
                    }}
                    className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border ${item.completed ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'} flex items-center justify-center`}
                  >
                    {item.completed && <CheckCircle size={10} className="text-white" />}
                  </button>
                  <div>
                    <p className={`text-xs ${item.completed ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>{item.description}</p>
                    <div className="flex gap-3 mt-1 text-[10px] text-zinc-500">
                      <span>Owner: {item.standardOwner}</span>
                      <span>Next Audit: {item.nextAuditDate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ClipboardList size={14} className="text-blue-400" />
            Improvement Action Plan
          </h3>
          <div className="flex gap-2">
            <button data-testid="button-generate-governance" onClick={generateGovernanceSheet}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
              <FileDown size={12} />
              Generate Governance Sheet
            </button>
            <button data-testid="button-add-project-action" onClick={() => setShowActionForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              <Plus size={12} />
              Add Action
            </button>
          </div>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left py-2 px-3 text-zinc-500 font-medium">Description</th>
              <th className="text-left py-2 px-3 text-zinc-500 font-medium">Responsible</th>
              <th className="text-left py-2 px-3 text-zinc-500 font-medium">Due Date</th>
              <th className="text-left py-2 px-3 text-zinc-500 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {project.actions.map(action => {
              const statusStyles: Record<ProjectActionStatus, string> = {
                Open: 'bg-amber-500/15 text-amber-400',
                'In Progress': 'bg-blue-500/15 text-blue-400',
                Closed: 'bg-emerald-500/15 text-emerald-400',
              };
              return (
                <tr key={action.id} data-testid={`row-action-${action.id}`} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="py-2.5 px-3 text-zinc-300">{action.description}</td>
                  <td className="py-2.5 px-3 text-zinc-400">{action.responsible}</td>
                  <td className="py-2.5 px-3 text-zinc-400">{action.dueDate}</td>
                  <td className="py-2.5 px-3">
                    <select
                      value={action.status}
                      onChange={(e) => updateActionStatus(action.id, e.target.value as ProjectActionStatus)}
                      className={`px-2 py-0.5 rounded text-[10px] border-0 outline-none cursor-pointer ${statusStyles[action.status]}`}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {project.actions.length === 0 && <p className="text-xs text-zinc-500 text-center py-6">No actions defined</p>}
      </div>

      {showActionForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowActionForm(false)}>
          <div className="glass-strong rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Add Action</h3>
              <button onClick={() => setShowActionForm(false)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input data-testid="input-action-desc" placeholder="Description" value={actionForm.description || ''} onChange={e => setActionForm({ ...actionForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input data-testid="input-action-responsible" placeholder="Responsible" value={actionForm.responsible || ''} onChange={e => setActionForm({ ...actionForm, responsible: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
                <input data-testid="input-action-due" type="date" value={actionForm.dueDate || ''} onChange={e => setActionForm({ ...actionForm, dueDate: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowActionForm(false)} className="px-4 py-2 text-sm text-zinc-400">Cancel</button>
              <button data-testid="button-save-action" onClick={addAction} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                <Save size={14} className="inline mr-1" />Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showRiskForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowRiskForm(false)}>
          <div className="glass-strong rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Add Risk</h3>
              <button onClick={() => setShowRiskForm(false)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input data-testid="input-risk-desc" placeholder="Risk description" value={riskForm.description || ''} onChange={e => setRiskForm({ ...riskForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
              <select value={riskForm.level || 'Medium'} onChange={e => setRiskForm({ ...riskForm, level: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <input data-testid="input-risk-countermeasure" placeholder="Countermeasure" value={riskForm.countermeasure || ''} onChange={e => setRiskForm({ ...riskForm, countermeasure: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowRiskForm(false)} className="px-4 py-2 text-sm text-zinc-400">Cancel</button>
              <button data-testid="button-save-risk" onClick={addRisk} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                <Save size={14} className="inline mr-1" />Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function WBSSection({ project, saveProject }: { project: Project; saveProject: (p: Project) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<WBSTask | null>(null);
  const [form, setForm] = useState<Partial<WBSTask>>({});
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [inlineEdit, setInlineEdit] = useState<{ id: string; field: string } | null>(null);
  const [inlineValue, setInlineValue] = useState('');
  const [wbsView, setWbsView] = useState<'list' | 'diagram'>('list');

  const getChildren = (parentId: string | null): WBSTask[] => {
    return project.wbsTasks
      .filter(t => t.parentId === parentId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  };

  const rootTasks = getChildren(null);

  const toggleCollapse = (id: string) => {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollapsed(next);
  };

  const openAddForm = (parentId: string | null, level: WBSLevel) => {
    setEditTask(null);
    setForm({ parentId, level });
    setShowForm(true);
  };

  const openEditForm = (task: WBSTask) => {
    setEditTask(task);
    setForm({ ...task });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name) return;
    if (editTask) {
      const updated = project.wbsTasks.map(t => t.id === editTask.id ? { ...t, ...form } as WBSTask : t);
      saveProject({ ...project, wbsTasks: updated });
    } else {
      const siblings = getChildren(form.parentId || null);
      const task: WBSTask = {
        id: `wbs-${Date.now()}`,
        name: form.name || '',
        description: form.description || '',
        owner: form.owner || '',
        startDate: form.startDate || project.startDate,
        endDate: form.endDate || project.endDate,
        progress: Number(form.progress) || 0,
        status: (form.status as Status) || 'not-started',
        parentId: form.parentId || null,
        level: form.level || 'task',
        dependencies: [],
        dependencyLinks: [],
        order: siblings.length,
      };
      saveProject({ ...project, wbsTasks: [...project.wbsTasks, task] });
    }
    setShowForm(false);
    setForm({});
    setEditTask(null);
  };

  const deleteTask = (id: string) => {
    const idsToRemove = new Set<string>();
    const collect = (taskId: string) => {
      idsToRemove.add(taskId);
      project.wbsTasks.filter(t => t.parentId === taskId).forEach(c => collect(c.id));
    };
    collect(id);
    const updated = project.wbsTasks.filter(t => !idsToRemove.has(t.id));
    saveProject({ ...project, wbsTasks: updated });
  };

  const handleDragStart = (id: string) => { setDragItem(id); };
  const handleDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); setDragOverItem(id); };
  const handleDrop = (targetId: string) => {
    if (!dragItem || dragItem === targetId) { setDragItem(null); setDragOverItem(null); return; }
    const dragTask = project.wbsTasks.find(t => t.id === dragItem);
    const targetTask = project.wbsTasks.find(t => t.id === targetId);
    if (!dragTask || !targetTask) { setDragItem(null); setDragOverItem(null); return; }

    const newParentId = targetTask.parentId;
    const siblings = getChildren(newParentId).filter(t => t.id !== dragItem);
    const targetIdx = siblings.findIndex(t => t.id === targetId);
    siblings.splice(targetIdx, 0, dragTask);
    const reordered = siblings.map((s, i) => ({ ...s, order: i }));

    const updated = project.wbsTasks.map(t => {
      if (t.id === dragItem) return { ...t, parentId: newParentId, order: reordered.find(r => r.id === t.id)?.order ?? t.order };
      const reord = reordered.find(r => r.id === t.id);
      return reord ? { ...t, order: reord.order } : t;
    });
    saveProject({ ...project, wbsTasks: updated });
    setDragItem(null);
    setDragOverItem(null);
  };

  const startInlineEdit = (id: string, field: string, value: string) => {
    setInlineEdit({ id, field });
    setInlineValue(value);
  };

  const commitInlineEdit = () => {
    if (!inlineEdit) return;
    const updated = project.wbsTasks.map(t => {
      if (t.id !== inlineEdit.id) return t;
      const field = inlineEdit.field;
      if (field === 'name') return { ...t, name: inlineValue };
      if (field === 'owner') return { ...t, owner: inlineValue };
      if (field === 'startDate') return { ...t, startDate: inlineValue };
      if (field === 'endDate') return { ...t, endDate: inlineValue };
      if (field === 'progress') return { ...t, progress: Math.min(100, Math.max(0, Number(inlineValue) || 0)) };
      if (field === 'status') return { ...t, status: inlineValue as Status };
      return t;
    });
    saveProject({ ...project, wbsTasks: updated });
    setInlineEdit(null);
    setInlineValue('');
  };

  const levelColors: Record<WBSLevel, string> = {
    project: 'border-blue-500/30 bg-blue-500/5',
    phase: 'border-amber-500/30 bg-amber-500/5',
    deliverable: 'border-emerald-500/30 bg-emerald-500/5',
    task: 'border-zinc-500/30 bg-white/[0.02]',
    'sub-task': 'border-purple-500/30 bg-purple-500/5',
  };
  const levelLabels: Record<WBSLevel, string> = { project: 'PRJ', phase: 'PHS', deliverable: 'DEL', task: 'TSK', 'sub-task': 'SUB' };
  const nextLevelMap: Record<WBSLevel, WBSLevel> = { project: 'phase', phase: 'deliverable', deliverable: 'task', task: 'sub-task', 'sub-task': 'sub-task' };
  const renderTree = (tasks: WBSTask[], depth: number = 0): JSX.Element[] => {
    return tasks.flatMap(task => {
      const children = getChildren(task.id);
      const isCollapsed = collapsed.has(task.id);
      const hasChildren = children.length > 0;
      const isDragOver = dragOverItem === task.id;

      return [
        <div
          key={task.id}
          data-testid={`wbs-node-${task.id}`}
          draggable
          onDragStart={() => handleDragStart(task.id)}
          onDragOver={(e) => handleDragOver(e, task.id)}
          onDrop={() => handleDrop(task.id)}
          onDragEnd={() => { setDragItem(null); setDragOverItem(null); }}
          className={`rounded-lg border p-3 mb-1.5 ${levelColors[task.level]} transition-colors hover:bg-white/[0.04] ${isDragOver ? 'ring-1 ring-blue-500/50' : ''} ${dragItem === task.id ? 'opacity-50' : ''}`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <div className="flex items-center gap-2">
            <GripVertical size={12} className="text-zinc-600 cursor-grab flex-shrink-0" />
            {hasChildren ? (
              <button data-testid={`wbs-toggle-${task.id}`} onClick={() => toggleCollapse(task.id)} className="text-zinc-500 hover:text-zinc-300">
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            ) : (
              <span className="w-[14px]" />
            )}
            <span className="px-1.5 py-0.5 rounded text-[8px] font-mono text-zinc-500 bg-white/5 flex-shrink-0">{levelLabels[task.level]}</span>

            {inlineEdit?.id === task.id && inlineEdit.field === 'name' ? (
              <input autoFocus value={inlineValue} onChange={e => setInlineValue(e.target.value)}
                onBlur={commitInlineEdit} onKeyDown={e => e.key === 'Enter' && commitInlineEdit()}
                className="text-xs text-white font-medium flex-1 bg-white/10 px-1.5 py-0.5 rounded outline-none border border-blue-500/30" />
            ) : (
              <span className="text-xs text-white font-medium flex-1 cursor-pointer hover:text-blue-300 truncate"
                onDoubleClick={() => startInlineEdit(task.id, 'name', task.name)}>{task.name}</span>
            )}

            {inlineEdit?.id === task.id && inlineEdit.field === 'owner' ? (
              <input autoFocus value={inlineValue} onChange={e => setInlineValue(e.target.value)}
                onBlur={commitInlineEdit} onKeyDown={e => e.key === 'Enter' && commitInlineEdit()}
                className="text-[10px] text-zinc-300 w-20 bg-white/10 px-1 py-0.5 rounded outline-none border border-blue-500/30" />
            ) : (
              <span className="text-[10px] text-zinc-500 cursor-pointer hover:text-zinc-300 w-20 truncate"
                onDoubleClick={() => startInlineEdit(task.id, 'owner', task.owner)}>{task.owner || '—'}</span>
            )}

            <span className="text-[9px] text-zinc-600 font-mono flex-shrink-0">{task.startDate?.slice(5) || ''}</span>
            <span className="text-[9px] text-zinc-600 font-mono flex-shrink-0">{task.endDate?.slice(5) || ''}</span>

            <div className="w-16 flex-shrink-0">
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${task.progress}%` }} />
              </div>
            </div>

            {inlineEdit?.id === task.id && inlineEdit.field === 'progress' ? (
              <input autoFocus type="number" min="0" max="100" value={inlineValue} onChange={e => setInlineValue(e.target.value)}
                onBlur={commitInlineEdit} onKeyDown={e => e.key === 'Enter' && commitInlineEdit()}
                className="w-10 text-[10px] text-emerald-400 bg-white/10 px-1 py-0.5 rounded outline-none border border-blue-500/30 text-center" />
            ) : (
              <span className={`px-1.5 py-0.5 rounded text-[8px] cursor-pointer flex-shrink-0 ${task.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : task.status === 'on-track' ? 'bg-blue-500/15 text-blue-400' : task.status === 'delayed' ? 'bg-red-500/15 text-red-400' : 'bg-zinc-500/15 text-zinc-400'}`}
                onDoubleClick={() => startInlineEdit(task.id, 'progress', String(task.progress))}>
                {task.progress}%
              </span>
            )}

            <div className="flex gap-0.5 flex-shrink-0">
              <button data-testid={`wbs-edit-${task.id}`} onClick={() => openEditForm(task)} className="p-1 hover:bg-white/10 rounded text-zinc-500 hover:text-white">
                <Edit3 size={10} />
              </button>
              <button data-testid={`wbs-delete-${task.id}`} onClick={() => deleteTask(task.id)} className="p-1 hover:bg-white/10 rounded text-zinc-500 hover:text-red-400">
                <Trash2 size={10} />
              </button>
              <button data-testid={`wbs-add-child-${task.id}`} onClick={() => openAddForm(task.id, nextLevelMap[task.level])} className="p-1 hover:bg-white/10 rounded text-zinc-500 hover:text-emerald-400">
                <Plus size={10} />
              </button>
            </div>
          </div>
        </div>,
        ...(hasChildren && !isCollapsed ? renderTree(children, depth + 1) : []),
      ];
    });
  };

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Layers size={14} className="text-blue-400" />
          Work Breakdown Structure
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 rounded-lg p-0.5">
            <button
              data-testid="wbs-view-list"
              onClick={() => setWbsView('list')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${wbsView === 'list' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <ClipboardList size={11} />List View
            </button>
            <button
              data-testid="wbs-view-diagram"
              onClick={() => setWbsView('diagram')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${wbsView === 'diagram' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <GitBranch size={11} />Diagram View
            </button>
          </div>
          {wbsView === 'list' && (
            <>
              <button data-testid="button-add-phase" onClick={() => openAddForm(rootTasks[0]?.id || null, rootTasks.length > 0 ? 'phase' : 'project')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                <Plus size={12} />Add {rootTasks.length > 0 ? 'Phase' : 'Root'}
              </button>
              {rootTasks.length === 0 && (
                <button data-testid="button-add-root-wbs" onClick={() => openAddForm(null, 'project')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg">
                  <Plus size={12} />Add Root
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {wbsView === 'list' && (
        <>
          <div className="flex gap-3 mb-3 flex-wrap">
            {(['project', 'phase', 'deliverable', 'task', 'sub-task'] as const).map(level => (
              <div key={level} className="flex items-center gap-1.5 text-[10px]">
                <div className={`w-3 h-3 rounded border ${levelColors[level]}`} />
                <span className="text-zinc-500 capitalize">{level}</span>
              </div>
            ))}
            <span className="text-[9px] text-zinc-600 ml-auto">Double-click to edit inline • Drag to reorder</span>
          </div>

          {rootTasks.length > 0 ? (
            <div>{renderTree(rootTasks)}</div>
          ) : (
            <p className="text-xs text-zinc-500 text-center py-8">No WBS structure defined. Add a root node to start.</p>
          )}
        </>
      )}

      {wbsView === 'diagram' && (
        <WBSDiagram project={project} saveProject={saveProject} />
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="glass-strong rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{editTask ? 'Edit Element' : `Add ${(form.level || 'task').charAt(0).toUpperCase() + (form.level || 'task').slice(1)}`}</h3>
              <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input data-testid="input-wbs-name" placeholder="Name" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
              <textarea placeholder="Description" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none h-16 resize-none" />
              <input data-testid="input-wbs-owner" placeholder="Responsible Person" value={form.owner || ''} onChange={e => setForm({ ...form, owner: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500">Start Date</label>
                  <input data-testid="input-wbs-start" type="date" value={form.startDate || ''} onChange={e => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500">End Date</label>
                  <input data-testid="input-wbs-end" type="date" value={form.endDate || ''} onChange={e => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500">Progress (%)</label>
                  <input data-testid="input-wbs-progress" type="number" min="0" max="100" value={form.progress ?? 0} onChange={e => setForm({ ...form, progress: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500">Status</label>
                  <select data-testid="input-wbs-status" value={form.status || 'not-started'} onChange={e => setForm({ ...form, status: e.target.value as Status })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
                    <option value="not-started">Not Started</option>
                    <option value="on-track">On Track</option>
                    <option value="at-risk">At Risk</option>
                    <option value="delayed">Delayed</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              {editTask && (
                <div>
                  <label className="text-[10px] text-zinc-500">Level</label>
                  <select value={form.level || 'task'} onChange={e => setForm({ ...form, level: e.target.value as WBSLevel })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
                    {(['project', 'phase', 'deliverable', 'task', 'sub-task'] as const).map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-zinc-400">Cancel</button>
              <button data-testid="button-save-wbs" onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                <Save size={14} className="inline mr-1" />Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WBSDiagram({ project, saveProject }: { project: Project; saveProject: (p: Project) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [childForm, setChildForm] = useState<{ parentId: string; level: WBSLevel } | null>(null);
  const [childName, setChildName] = useState('');

  const tasks = project.wbsTasks;

  const NODE_W = 164;
  const NODE_H = 74;
  const H_GAP = 20;
  const V_GAP = 84;
  const PADDING = 24;

  const layout = useMemo(() => {
    const pos = new Map<string, { x: number; y: number; task: WBSTask }>();

    const getC = (pid: string | null) =>
      tasks.filter(t => t.parentId === pid).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    function lc(id: string): number {
      const ch = getC(id);
      return ch.length === 0 ? 1 : ch.reduce((s, c) => s + lc(c.id), 0);
    }

    function assign(pid: string | null, depth: number, left: number): void {
      const children = getC(pid);
      let consumed = 0;
      for (const child of children) {
        const span = lc(child.id) * (NODE_W + H_GAP);
        const cx = left + consumed + span / 2 - NODE_W / 2;
        const cy = depth * (NODE_H + V_GAP) + PADDING;
        pos.set(child.id, { x: cx, y: cy, task: child });
        assign(child.id, depth + 1, left + consumed);
        consumed += span;
      }
    }

    assign(null, 0, PADDING);

    let maxX = 500, maxY = 200;
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];

    pos.forEach(({ x, y, task: child }) => {
      maxX = Math.max(maxX, x + NODE_W + PADDING);
      maxY = Math.max(maxY, y + NODE_H + PADDING);
      if (child.parentId) {
        const par = pos.get(child.parentId);
        if (par) lines.push({ x1: par.x + NODE_W / 2, y1: par.y + NODE_H, x2: x + NODE_W / 2, y2: y });
      }
    });

    return { pos, canvasW: maxX, canvasH: maxY, lines };
  }, [tasks]);

  const { pos: positions, canvasW, canvasH, lines } = layout;

  const LEVEL_COLORS: Record<WBSLevel, { border: string; accent: string; bg: string; label: string }> = {
    project:     { border: '#3b82f6', accent: '#2563eb', bg: 'rgba(59,130,246,0.10)', label: 'PRJ' },
    phase:       { border: '#f59e0b', accent: '#d97706', bg: 'rgba(245,158,11,0.10)', label: 'PHS' },
    deliverable: { border: '#10b981', accent: '#059669', bg: 'rgba(16,185,129,0.10)', label: 'DEL' },
    task:        { border: '#71717a', accent: '#52525b', bg: 'rgba(113,113,122,0.10)', label: 'TSK' },
    'sub-task':  { border: '#a855f7', accent: '#9333ea', bg: 'rgba(168,85,247,0.10)', label: 'SUB' },
  };

  const nextLevel: Record<WBSLevel, WBSLevel> = {
    project: 'phase', phase: 'deliverable', deliverable: 'task', task: 'sub-task', 'sub-task': 'sub-task',
  };

  const handleDelete = (taskId: string) => {
    const ids = new Set<string>();
    const collect = (id: string) => { ids.add(id); tasks.filter(t => t.parentId === id).forEach(c => collect(c.id)); };
    collect(taskId);
    saveProject({ ...project, wbsTasks: tasks.filter(t => !ids.has(t.id)) });
    setSelected(null);
  };

  const commitRename = () => {
    if (!renaming || !renameValue.trim()) { setRenaming(null); return; }
    saveProject({ ...project, wbsTasks: tasks.map(t => t.id === renaming ? { ...t, name: renameValue.trim() } : t) });
    setRenaming(null);
  };

  const addChild = () => {
    if (!childForm || !childName.trim()) return;
    const newTask: WBSTask = {
      id: `wbs-${Date.now()}`, name: childName.trim(), description: '', owner: '',
      startDate: project.startDate, endDate: project.endDate, progress: 0,
      status: 'not-started', parentId: childForm.parentId, level: childForm.level,
      dependencies: [], dependencyLinks: [], order: tasks.filter(t => t.parentId === childForm.parentId).length,
    };
    saveProject({ ...project, wbsTasks: [...tasks, newTask] });
    setChildForm(null); setChildName('');
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <GitBranch size={36} className="text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-500 text-sm">No WBS structure yet. Switch to List View to add nodes.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-3 mb-3 flex-wrap">
        {(['project', 'phase', 'deliverable', 'task', 'sub-task'] as const).map(level => (
          <div key={level} className="flex items-center gap-1.5 text-[10px]">
            <div className="w-3 h-3 rounded" style={{ background: LEVEL_COLORS[level].bg, border: `1px solid ${LEVEL_COLORS[level].border}` }} />
            <span className="text-zinc-500 capitalize">{level}</span>
          </div>
        ))}
        <span className="text-[9px] text-zinc-600 ml-auto">Click to select • Double-click to rename</span>
      </div>

      <div
        className="overflow-auto rounded-lg border border-white/5 bg-black/20"
        style={{ maxHeight: 580 }}
        onClick={() => setSelected(null)}
      >
        <div style={{ position: 'relative', width: Math.max(canvasW, 500), height: Math.max(canvasH, 200), minWidth: '100%' }}>
          <svg
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            width={Math.max(canvasW, 500)}
            height={Math.max(canvasH, 200)}
          >
            {lines.map((ln, i) => {
              const midY = (ln.y1 + ln.y2) / 2;
              return (
                <path
                  key={i}
                  d={`M ${ln.x1} ${ln.y1} L ${ln.x1} ${midY} L ${ln.x2} ${midY} L ${ln.x2} ${ln.y2}`}
                  fill="none"
                  stroke="rgba(113,113,122,0.35)"
                  strokeWidth="1.5"
                />
              );
            })}
          </svg>

          {Array.from(positions.entries()).map(([id, { x, y, task }]) => {
            const col = LEVEL_COLORS[task.level];
            const isSel = selected === id;
            const isRen = renaming === id;

            return (
              <div
                key={id}
                data-testid={`diagram-node-${id}`}
                onClick={(e) => { e.stopPropagation(); setSelected(isSel ? null : id); }}
                style={{
                  position: 'absolute', left: x, top: y, width: NODE_W, height: NODE_H,
                  background: col.bg,
                  border: `${isSel ? 2 : 1}px solid ${isSel ? col.border : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 8,
                  boxShadow: isSel ? `0 0 0 3px ${col.border}30, 0 4px 16px rgba(0,0,0,0.4)` : '0 2px 8px rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  overflow: 'visible',
                }}
              >
                <div style={{ height: 4, borderRadius: '7px 7px 0 0', background: col.border }} />
                <div style={{ padding: '6px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 8, fontFamily: 'monospace', color: col.border,
                      background: `${col.border}22`, padding: '1px 5px', borderRadius: 3,
                      letterSpacing: '0.05em',
                    }}>
                      {col.label}
                    </span>
                    <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${task.progress}%`, background: col.border, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 9, color: 'rgba(161,161,170,0.7)', fontFamily: 'monospace' }}>{task.progress}%</span>
                  </div>

                  {isRen ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(null); }}
                      onClick={e => e.stopPropagation()}
                      style={{
                        width: '100%', fontSize: 11, fontWeight: 600,
                        background: 'rgba(255,255,255,0.08)', border: `1px solid ${col.border}`,
                        borderRadius: 4, padding: '2px 5px', color: '#fff', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <p
                      onDoubleClick={(e) => { e.stopPropagation(); setRenaming(id); setRenameValue(task.name); }}
                      style={{
                        fontSize: 11, color: '#e4e4e7', fontWeight: 600,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        lineHeight: 1.35,
                      }}
                    >
                      {task.name}
                    </p>
                  )}

                  {task.owner && (
                    <p style={{ fontSize: 9, color: 'rgba(161,161,170,0.65)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.owner}
                    </p>
                  )}
                </div>

                {isSel && !isRen && (
                  <div
                    style={{
                      position: 'absolute', top: -34, left: '50%', transform: 'translateX(-50%)',
                      display: 'flex', gap: 4, zIndex: 20, whiteSpace: 'nowrap',
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      data-testid={`diagram-add-${id}`}
                      onClick={() => { setChildForm({ parentId: id, level: nextLevel[task.level] }); setChildName(''); setSelected(null); }}
                      style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >+ Child</button>
                    <button
                      data-testid={`diagram-rename-${id}`}
                      onClick={() => { setRenaming(id); setRenameValue(task.name); }}
                      style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, background: 'rgba(255,255,255,0.12)', color: '#d4d4d8', border: 'none', cursor: 'pointer' }}
                    >Rename</button>
                    <button
                      data-testid={`diagram-delete-${id}`}
                      onClick={() => handleDelete(id)}
                      style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, background: 'rgba(239,68,68,0.2)', color: '#f87171', border: 'none', cursor: 'pointer' }}
                    >Delete</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {childForm && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
          onClick={() => setChildForm(null)}
        >
          <div className="glass-strong rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">Add Child Node</h3>
              <button onClick={() => setChildForm(null)} className="text-zinc-400 hover:text-white"><X size={16} /></button>
            </div>
            <input
              autoFocus
              data-testid="input-diagram-child-name"
              placeholder="Node name"
              value={childName}
              onChange={e => setChildName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addChild()}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setChildForm(null)} className="px-4 py-2 text-sm text-zinc-400">Cancel</button>
              <button onClick={addChild} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                <Save size={13} className="inline mr-1" />Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function flattenHierarchy(tasks: WBSTask[]): WBSTask[] {
  const getChildren = (parentId: string | null): WBSTask[] =>
    tasks.filter(t => t.parentId === parentId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const result: WBSTask[] = [];
  const traverse = (parentId: string | null) => {
    const children = getChildren(parentId);
    for (const child of children) {
      result.push(child);
      traverse(child.id);
    }
  };
  traverse(null);
  return result;
}

function GanttSection({ project, saveProject }: { project: Project; saveProject: (p: Project) => void }) {
  const [zoom, setZoom] = useState<'day' | 'week' | 'month'>('month');
  const [showDepForm, setShowDepForm] = useState(false);
  const [depForm, setDepForm] = useState<{ fromId: string; toId: string; type: DependencyType }>({ fromId: '', toId: '', type: 'FS' });
  const [dragging, setDragging] = useState<{ id: string; mode: 'move' | 'resize'; startX: number; origStart: string; origEnd: string } | null>(null);

  const tasks = project.wbsTasks;
  if (tasks.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <GanttChart size={40} className="text-zinc-600 mx-auto mb-3" />
        <p className="text-sm text-zinc-500">No tasks in WBS. Add tasks to see the Gantt timeline.</p>
      </div>
    );
  }

  const orderedTasks = flattenHierarchy(tasks);

  const allDates = tasks.flatMap(t => [new Date(t.startDate), new Date(t.endDate)]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

  const pad = zoom === 'day' ? 2 : zoom === 'week' ? 7 : 14;
  minDate.setDate(minDate.getDate() - pad);
  maxDate.setDate(maxDate.getDate() + pad);

  const totalDays = Math.max(Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)), 1);
  const dayWidth = zoom === 'day' ? 30 : zoom === 'week' ? 12 : 4;
  const chartWidth = totalDays * dayWidth;

  const getPosition = (dateStr: string) => {
    const d = new Date(dateStr);
    const dayOffset = (d.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    return (dayOffset / totalDays) * 100;
  };

  const getWidth = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const days = Math.max((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24), 1);
    return (days / totalDays) * 100;
  };

  const headers: { label: string; left: number; width: number }[] = [];
  const current = new Date(minDate);
  if (zoom === 'day') {
    while (current <= maxDate) {
      const left = getPosition(current.toISOString().slice(0, 10));
      headers.push({ label: current.getDate().toString(), left, width: (1 / totalDays) * 100 });
      current.setDate(current.getDate() + 1);
    }
  } else if (zoom === 'week') {
    current.setDate(current.getDate() - current.getDay() + 1);
    while (current <= maxDate) {
      const weekStart = new Date(Math.max(current.getTime(), minDate.getTime()));
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const left = getPosition(weekStart.toISOString().slice(0, 10));
      const right = getPosition(new Date(Math.min(weekEnd.getTime(), maxDate.getTime())).toISOString().slice(0, 10));
      headers.push({
        label: `S${Math.ceil((current.getTime() - new Date(current.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`,
        left, width: Math.max(right - left, 0.5),
      });
      current.setDate(current.getDate() + 7);
    }
  } else {
    current.setDate(1);
    while (current <= maxDate) {
      const monthStart = new Date(Math.max(current.getTime(), minDate.getTime()));
      const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      const monthEnd = new Date(Math.min(nextMonth.getTime() - 1, maxDate.getTime()));
      const left = getPosition(monthStart.toISOString().slice(0, 10));
      const right = getPosition(monthEnd.toISOString().slice(0, 10));
      headers.push({
        label: current.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        left, width: right - left,
      });
      current.setMonth(current.getMonth() + 1);
      current.setDate(1);
    }
  }

  const levelColors: Record<WBSLevel, string> = { project: '#3b82f6', phase: '#f59e0b', deliverable: '#10b981', task: '#8b5cf6', 'sub-task': '#a855f7' };
  const levelIndent: Record<WBSLevel, number> = { project: 0, phase: 12, deliverable: 24, task: 36, 'sub-task': 48 };
  const barHeight: Record<WBSLevel, number> = { project: 20, phase: 16, deliverable: 14, task: 12, 'sub-task': 10 };
  const ROW_HEIGHT = 28;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayPos = getPosition(todayStr);

  const handleBarMouseDown = (e: React.MouseEvent, taskId: string, mode: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    setDragging({ id: taskId, mode, startX: e.clientX, origStart: task.startDate, origEnd: task.endDate });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const container = e.currentTarget as HTMLElement;
    const dx = e.clientX - dragging.startX;
    const daysDelta = Math.round(dx / dayWidth);
    if (daysDelta === 0) return;

    const updated = tasks.map(t => {
      if (t.id !== dragging.id) return t;
      if (dragging.mode === 'move') {
        const newStart = new Date(dragging.origStart);
        const newEnd = new Date(dragging.origEnd);
        newStart.setDate(newStart.getDate() + daysDelta);
        newEnd.setDate(newEnd.getDate() + daysDelta);
        return { ...t, startDate: newStart.toISOString().slice(0, 10), endDate: newEnd.toISOString().slice(0, 10) };
      } else {
        const newEnd = new Date(dragging.origEnd);
        newEnd.setDate(newEnd.getDate() + daysDelta);
        if (newEnd <= new Date(dragging.origStart)) return t;
        return { ...t, endDate: newEnd.toISOString().slice(0, 10) };
      }
    });
    saveProject({ ...project, wbsTasks: updated });
  };

  const handleMouseUp = () => { setDragging(null); };

  const addDependency = () => {
    if (!depForm.fromId || !depForm.toId || depForm.fromId === depForm.toId) return;
    const updated = tasks.map(t => {
      if (t.id !== depForm.toId) return t;
      const links = t.dependencyLinks || [];
      if (links.some(l => l.taskId === depForm.fromId)) return t;
      return { ...t, dependencyLinks: [...links, { taskId: depForm.fromId, type: depForm.type }] };
    });
    saveProject({ ...project, wbsTasks: updated });
    setShowDepForm(false);
    setDepForm({ fromId: '', toId: '', type: 'FS' });
  };

  const taskIndexMap = new Map(orderedTasks.map((t, i) => [t.id, i]));

  const depLines = useMemo(() => {
    const lines: { fromIdx: number; toIdx: number; type: DependencyType; fromEnd: number; toStart: number }[] = [];
    for (const task of orderedTasks) {
      const toIdx = taskIndexMap.get(task.id);
      if (toIdx === undefined) continue;
      for (const link of (task.dependencyLinks || [])) {
        const fromIdx = taskIndexMap.get(link.taskId);
        if (fromIdx === undefined) continue;
        const fromTask = tasks.find(t => t.id === link.taskId);
        if (!fromTask) continue;
        lines.push({
          fromIdx, toIdx, type: link.type,
          fromEnd: link.type === 'SS' ? getPosition(fromTask.startDate) : getPosition(fromTask.endDate) + getWidth(fromTask.endDate, fromTask.endDate),
          toStart: link.type === 'FF' ? getPosition(task.endDate) + getWidth(task.endDate, task.endDate) : getPosition(task.startDate),
        });
      }
    }
    return lines;
  }, [orderedTasks, tasks]);

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <GanttChart size={14} className="text-blue-400" />
          Gantt Timeline
        </h3>
        <div className="flex gap-2 items-center">
          <button data-testid="button-add-dependency" onClick={() => setShowDepForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
            <Link2 size={12} />Add Dependency
          </button>
          <div className="flex gap-0.5 bg-white/5 rounded-lg p-0.5">
            {(['day', 'week', 'month'] as const).map(z => (
              <button key={z} data-testid={`gantt-zoom-${z}`} onClick={() => setZoom(z)}
                className={`px-3 py-1 rounded text-[10px] capitalize ${zoom === z ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>
                {z === 'day' ? 'Days' : z === 'week' ? 'Weeks' : 'Months'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <div className="w-52 flex-shrink-0 border-r border-white/5">
          <div className="flex items-center px-2 border-b border-white/5" style={{ height: ROW_HEIGHT }}>
            <span className="text-[10px] text-zinc-500 font-medium">Task</span>
          </div>
          {orderedTasks.map(task => (
            <div key={task.id} className="flex items-center px-2 border-b border-white/[0.03]"
              style={{ height: ROW_HEIGHT, paddingLeft: `${levelIndent[task.level] + 8}px` }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mr-1.5" style={{ backgroundColor: levelColors[task.level] }} />
              <span className="text-[10px] text-zinc-300 truncate">{task.name}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-x-auto">
          <div style={{ minWidth: `${chartWidth}px` }} className="relative">
            <div className="flex border-b border-white/5 relative" style={{ height: ROW_HEIGHT }}>
              {headers.map((h, i) => (
                <div key={i} className="absolute top-0 h-full flex items-center border-l border-white/5"
                  style={{ left: `${h.left}%`, width: `${h.width}%` }}>
                  <span className="text-[9px] text-zinc-500 px-1 font-mono whitespace-nowrap">{h.label}</span>
                </div>
              ))}
            </div>

            <div className="relative">
              {todayPos >= 0 && todayPos <= 100 && (
                <div className="absolute top-0 bottom-0 w-px bg-red-500/40 z-10" style={{ left: `${todayPos}%` }}>
                  <div className="absolute -top-0 -left-1.5 w-3 h-3 rounded-full bg-red-500" />
                </div>
              )}

              <svg className="absolute inset-0 w-full pointer-events-none" style={{ height: orderedTasks.length * ROW_HEIGHT, zIndex: 5 }}>
                {depLines.map((line, i) => {
                  const fromY = line.fromIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
                  const toY = line.toIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
                  const fromX = `${line.fromEnd}%`;
                  const toX = `${line.toStart}%`;
                  return (
                    <g key={i}>
                      <line x1={fromX} y1={fromY} x2={toX} y2={toY} stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.6" />
                      <circle cx={toX} cy={toY} r="3" fill="#3b82f6" opacity="0.8" />
                    </g>
                  );
                })}
              </svg>

              {orderedTasks.map((task, rowIdx) => {
                const left = getPosition(task.startDate);
                const width = getWidth(task.startDate, task.endDate);
                const color = levelColors[task.level];
                const h = barHeight[task.level];
                const isParent = tasks.some(t => t.parentId === task.id);

                return (
                  <div key={task.id} data-testid={`gantt-bar-${task.id}`} className="flex items-center border-b border-white/[0.03] relative"
                    style={{ height: ROW_HEIGHT }}>
                    <div
                      className={`absolute rounded-sm group ${dragging?.id === task.id ? 'ring-1 ring-blue-400' : ''}`}
                      style={{
                        left: `${left}%`, width: `${width}%`, height: h,
                        backgroundColor: `${color}${isParent ? '20' : '30'}`,
                        border: `1px solid ${color}50`,
                        cursor: 'grab',
                        zIndex: 6,
                      }}
                      onMouseDown={(e) => handleBarMouseDown(e, task.id, 'move')}
                    >
                      <div className="h-full rounded-sm transition-all" style={{ width: `${task.progress}%`, backgroundColor: color, opacity: 0.7 }} />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[7px] text-white font-mono font-bold drop-shadow">{task.progress}%</span>
                      </div>
                      {isParent && (
                        <>
                          <div className="absolute -bottom-0.5 left-0 w-1.5 h-1.5" style={{ backgroundColor: color, clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
                          <div className="absolute -bottom-0.5 right-0 w-1.5 h-1.5" style={{ backgroundColor: color, clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
                        </>
                      )}
                      <div
                        className="absolute top-0 right-0 w-2 h-full cursor-e-resize hover:bg-white/20 rounded-r-sm"
                        onMouseDown={(e) => handleBarMouseDown(e, task.id, 'resize')}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mt-3 pt-3 border-t border-white/5 flex-wrap">
        {(['project', 'phase', 'deliverable', 'task', 'sub-task'] as const).map(level => (
          <div key={level} className="flex items-center gap-1.5 text-[10px]">
            <div className="w-3 h-1.5 rounded-sm" style={{ backgroundColor: levelColors[level] }} />
            <span className="text-zinc-500 capitalize">{level}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-[10px]">
          <div className="w-4 border-t border-dashed border-blue-500" />
          <span className="text-zinc-500">Dependency</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] ml-auto">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-zinc-500">Today</span>
        </div>
      </div>

      {showDepForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowDepForm(false)}>
          <div className="glass-strong rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Link2 size={16} /> Add Dependency</h3>
              <button onClick={() => setShowDepForm(false)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-500">From Task</label>
                <select data-testid="select-dep-from" value={depForm.fromId} onChange={e => setDepForm({ ...depForm, fromId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
                  <option value="">Select...</option>
                  {tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500">To Task</label>
                <select data-testid="select-dep-to" value={depForm.toId} onChange={e => setDepForm({ ...depForm, toId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
                  <option value="">Select...</option>
                  {tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500">Type</label>
                <select data-testid="select-dep-type" value={depForm.type} onChange={e => setDepForm({ ...depForm, type: e.target.value as DependencyType })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
                  <option value="FS">Finish to Start</option>
                  <option value="SS">Start to Start</option>
                  <option value="FF">Finish to Finish</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowDepForm(false)} className="px-4 py-2 text-sm text-zinc-400">Cancel</button>
              <button data-testid="button-save-dependency" onClick={addDependency} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                <Save size={14} className="inline mr-1" />Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
