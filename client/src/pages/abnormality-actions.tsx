import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type {
  Lang, Action, Abnormality, SQDCMCategory, Dept, Priority, Status,
  A3Data, A3PDCAItem, A3PDCAPhase, A3ParetoEntry, A3IshikawaBone, A3TimelineEvent,
} from '@shared/schema';
import { SQDCM_LABELS, SQDCM_CATEGORIES, DEPARTMENTS } from '@shared/schema';
import { useTranslate } from '@/lib/translations';
import { storage } from '@/lib/storage';
import {
  AlertTriangle, Plus, X, Save, CheckCircle, Clock, AlertCircle,
  ChevronDown, ChevronRight, FileDown, Printer, Trash2, Edit2,
  Activity, BarChart2, Fish, HelpCircle, ClipboardList, LineChart,
  RefreshCw, Circle, CheckSquare, Download, Calendar, User,
} from 'lucide-react';
import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine,
  LineChart as RLineChart, PieChart, Pie,
} from 'recharts';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

interface AbnormalityActionsProps { lang: Lang; }

const PRIORITY_COLORS: Record<Priority, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/20',
  high:     'bg-amber-500/20 text-amber-400 border-amber-500/20',
  medium:   'bg-blue-500/20 text-blue-400 border-blue-500/20',
  low:      'bg-zinc-500/20 text-zinc-400 border-zinc-500/20',
};
const ABN_STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  open:          { color: 'text-red-400',     icon: AlertCircle },
  investigating: { color: 'text-amber-400',   icon: Clock },
  contained:     { color: 'text-blue-400',    icon: CheckCircle },
  closed:        { color: 'text-emerald-400', icon: CheckCircle },
};
const PDCA_COLORS: Record<A3PDCAPhase, string> = {
  Plan:  'border-blue-500/30 bg-blue-500/5',
  Do:    'border-amber-500/30 bg-amber-500/5',
  Check: 'border-purple-500/30 bg-purple-500/5',
  Act:   'border-emerald-500/30 bg-emerald-500/5',
};
const PDCA_BADGE: Record<A3PDCAPhase, string> = {
  Plan: 'bg-blue-500/20 text-blue-400',
  Do:   'bg-amber-500/20 text-amber-400',
  Check:'bg-purple-500/20 text-purple-400',
  Act:  'bg-emerald-500/20 text-emerald-400',
};
const TIMELINE_COLORS: Record<A3TimelineEvent['type'], string> = {
  detection: 'bg-red-400',
  update:    'bg-amber-400',
  action:    'bg-blue-400',
  closure:   'bg-emerald-400',
};
const ISHIKAWA_BONES: Array<{ key: keyof A3IshikawaBone; label: string; sub: string; color: string }> = [
  { key: 'man',         label: 'Homme (Man)',      sub: 'Opérateurs, compétences', color: '#3b82f6' },
  { key: 'machine',     label: 'Machine',          sub: 'Équipements, outils',     color: '#f59e0b' },
  { key: 'method',      label: 'Méthode',          sub: 'Procédures, instructions', color: '#8b5cf6' },
  { key: 'material',    label: 'Matière',          sub: 'Matériaux, composants',   color: '#10b981' },
  { key: 'measurement', label: 'Mesure',           sub: 'Contrôles, instruments',  color: '#ec4899' },
  { key: 'milieu',      label: 'Milieu',           sub: 'Environnement, conditions', color: '#06b6d4' },
];

const TOOLTIP_STYLE = {
  contentStyle: { background: '#27272a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#a1a1aa' }, itemStyle: { color: '#e4e4e7' },
};
const AXIS_TICK = { fill: '#71717a', fontSize: 10 };

function mkInput(value: string, onChange: (v: string) => void, placeholder: string, multiline = false, cls = '') {
  const base = `w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none focus:border-blue-500/40 transition-colors placeholder-zinc-600 ${cls}`;
  if (multiline) return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={2} className={`${base} resize-none`} />;
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={base} />;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/5 overflow-hidden">
      <div className="px-4 py-2 bg-white/[0.03] border-b border-white/5">
        <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">{label}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function QQOQCCPStep({ data, onChange }: { data: Partial<A3Data['qqoqccp']>; onChange: (d: Partial<A3Data['qqoqccp']>) => void }) {
  const f = data || {};
  const set = (k: string, v: string) => onChange({ ...f, [k]: v });
  return (
    <div className="space-y-4">
      <Section label="Qui — Who">
        <div className="grid grid-cols-3 gap-3">
          {mkInput(f.qui_operateur || '', v => set('qui_operateur', v), 'Opérateur impliqué')}
          {mkInput(f.qui_dept || '', v => set('qui_dept', v), 'Département')}
          {mkInput(f.qui_equipe || '', v => set('qui_equipe', v), 'Équipe responsable')}
        </div>
      </Section>
      <Section label="Quoi — What">
        <div className="space-y-2">
          {mkInput(f.quoi_desc || '', v => set('quoi_desc', v), 'Description de l\'anomalie', true)}
          <div className="grid grid-cols-2 gap-3">
            {mkInput(f.quoi_process || '', v => set('quoi_process', v), 'Processus affecté')}
            {mkInput(f.quoi_symptomes || '', v => set('quoi_symptomes', v), 'Symptômes visibles')}
          </div>
        </div>
      </Section>
      <Section label="Où — Where">
        <div className="grid grid-cols-3 gap-3">
          {mkInput(f.ou_ligne || '', v => set('ou_ligne', v), 'Ligne de production')}
          {mkInput(f.ou_poste || '', v => set('ou_poste', v), 'Poste de travail')}
          {mkInput(f.ou_machine || '', v => set('ou_machine', v), 'Machine')}
        </div>
      </Section>
      <Section label="Quand — When">
        <div className="grid grid-cols-3 gap-3">
          <input type="date" value={f.quand_date || ''} onChange={e => set('quand_date', e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
          <input type="time" value={f.quand_heure || ''} onChange={e => set('quand_heure', e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
          <select value={f.quand_poste || ''} onChange={e => set('quand_poste', e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none">
            <option value="">Poste...</option>
            <option value="Matin">Matin</option>
            <option value="Après-midi">Après-midi</option>
            <option value="Nuit">Nuit</option>
          </select>
        </div>
      </Section>
      <div className="grid grid-cols-2 gap-4">
        <Section label="Comment — How">
          <div className="space-y-2">
            {mkInput(f.comment_sequence || '', v => set('comment_sequence', v), 'Séquence des événements', true)}
            {mkInput(f.comment_conditions || '', v => set('comment_conditions', v), 'Conditions lors de l\'occurrence')}
          </div>
        </Section>
        <Section label="Combien — Impact">
          <div className="space-y-2">
            {mkInput(f.combien_rebut || '', v => set('combien_rebut', v), 'Quantité rebut / défauts')}
            {mkInput(f.combien_arret || '', v => set('combien_arret', v), 'Durée arrêt (min)')}
            {mkInput(f.combien_retard || '', v => set('combien_retard', v), 'Retard production (unités)')}
          </div>
        </Section>
      </div>
      <Section label="Pourquoi — Initial Hypothesis">
        <div className="grid grid-cols-2 gap-3">
          {mkInput(f.pourquoi_cause || '', v => set('pourquoi_cause', v), 'Cause supposée initiale', true)}
          {mkInput(f.pourquoi_obs || '', v => set('pourquoi_obs', v), 'Observations terrain', true)}
        </div>
      </Section>
    </div>
  );
}

function ParetoStep({ data, onChange }: { data: A3ParetoEntry[]; onChange: (d: A3ParetoEntry[]) => void }) {
  const [causeInput, setCauseInput] = useState('');
  const [countInput, setCountInput] = useState('');

  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.count - a.count);
    const total = sorted.reduce((s, e) => s + e.count, 0);
    let cumSum = 0;
    return sorted.map(e => {
      cumSum += e.count;
      return { ...e, cumulative: total > 0 ? Math.round((cumSum / total) * 100) : 0 };
    });
  }, [data]);

  const addEntry = () => {
    if (!causeInput.trim() || !countInput) return;
    onChange([...data, { cause: causeInput.trim(), count: Number(countInput) }]);
    setCauseInput(''); setCountInput('');
  };
  const remove = (idx: number) => { const d = [...data]; d.splice(idx, 1); onChange(d); };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-[10px] text-zinc-500 mb-1 block">Cause</label>
          <input data-testid="input-pareto-cause" value={causeInput} onChange={e => setCauseInput(e.target.value)}
            placeholder="Nom de la cause"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
        </div>
        <div className="w-28">
          <label className="text-[10px] text-zinc-500 mb-1 block">Fréquence</label>
          <input data-testid="input-pareto-count" type="number" min="1" value={countInput} onChange={e => setCountInput(e.target.value)}
            placeholder="Nb"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
        </div>
        <button data-testid="btn-pareto-add" onClick={addEntry}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs">
          <Plus size={12} />Ajouter
        </button>
      </div>

      {chartData.length > 0 ? (
        <>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="cause" tick={AXIS_TICK} />
                <YAxis yAxisId="left" tick={AXIS_TICK} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={AXIS_TICK} tickFormatter={v => `${v}%`} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                <ReferenceLine yAxisId="right" y={80} stroke="#f59e0b" strokeDasharray="5 3" label={{ value: '80%', fill: '#f59e0b', fontSize: 9 }} />
                <Bar yAxisId="left" dataKey="count" name="Fréquence" radius={[4, 4, 0, 0]} barSize={28}>
                  {chartData.map((e, i) => <Cell key={i} fill={e.cumulative <= 80 ? '#ef4444' : '#52525b'} fillOpacity={0.8} />)}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumulé (%)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {chartData.map((e, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-zinc-300">
                <span className="w-4 text-zinc-500 font-mono">{i + 1}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="h-1.5 rounded-full" style={{ width: `${(e.count / chartData[0].count) * 60}%`, background: e.cumulative <= 80 ? '#ef4444' : '#52525b', opacity: 0.7 }} />
                  <span className="text-zinc-300">{e.cause}</span>
                </div>
                <span className="font-mono text-zinc-400 w-6 text-right">{e.count}</span>
                <span className="font-mono text-amber-400 w-10 text-right">{e.cumulative}%</span>
                <button onClick={() => remove(i)} className="p-0.5 hover:bg-white/10 rounded text-zinc-600 hover:text-red-400">
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
          <BarChart2 size={28} className="mb-2 opacity-40" />
          <p className="text-xs">Ajoutez des causes pour générer le diagramme de Pareto</p>
        </div>
      )}
    </div>
  );
}

function BonePanel({ bone, causes, onAdd, onRemove }: { bone: typeof ISHIKAWA_BONES[0]; causes: string[]; onAdd: (c: string) => void; onRemove: (i: number) => void }) {
  const [inp, setInp] = useState('');
  const add = () => { if (!inp.trim()) return; onAdd(inp.trim()); setInp(''); };
  return (
    <div className="rounded-xl p-3 border" style={{ borderColor: `${bone.color}30`, background: `${bone.color}08` }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full" style={{ background: bone.color }} />
        <p className="text-xs font-semibold" style={{ color: bone.color }}>{bone.label}</p>
      </div>
      <p className="text-[10px] text-zinc-600 mb-2">{bone.sub}</p>
      <div className="space-y-1 min-h-[32px]">
        {causes.map((c, i) => (
          <div key={i} className="flex items-start gap-1.5 group">
            <span className="text-[10px] text-zinc-400 flex-1 leading-tight">• {c}</span>
            <button onClick={() => onRemove(i)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 text-zinc-600 flex-shrink-0">
              <X size={9} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-2">
        <input value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Ajouter une cause..." style={{ borderColor: `${bone.color}30` }}
          className="flex-1 px-2 py-1 rounded-lg bg-white/5 border text-[10px] text-zinc-300 outline-none placeholder-zinc-700" />
        <button onClick={add} className="px-2 py-1 rounded-lg text-[10px] text-white" style={{ background: `${bone.color}50` }}><Plus size={9} /></button>
      </div>
    </div>
  );
}

function IshikawaStep({ data, effectTitle, onChange }: { data: Partial<A3IshikawaBone>; effectTitle: string; onChange: (d: Partial<A3IshikawaBone>) => void }) {
  const addCause = (key: keyof A3IshikawaBone, cause: string) => onChange({ ...data, [key]: [...(data[key] || []), cause] });
  const removeCause = (key: keyof A3IshikawaBone, idx: number) => {
    const arr = [...(data[key] || [])]; arr.splice(idx, 1); onChange({ ...data, [key]: arr });
  };
  const top = ISHIKAWA_BONES.slice(0, 3);
  const bottom = ISHIKAWA_BONES.slice(3);
  return (
    <div className="space-y-3">
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-white/5" />
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Fish size={13} className="text-zinc-500" />
            Diagramme d'Ishikawa — 6M
          </div>
          <div className="flex-1 h-px bg-white/5" />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-px bg-zinc-700" style={{ background: 'linear-gradient(to right, transparent, #52525b)' }} />
          <div className="px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-500/10 text-xs text-red-300 font-medium max-w-[180px] text-center">
            {effectTitle || 'Effet / Problème'}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {top.map(bone => (
            <BonePanel key={bone.key} bone={bone} causes={data[bone.key] || []}
              onAdd={c => addCause(bone.key, c)} onRemove={i => removeCause(bone.key, i)} />
          ))}
        </div>
        <div className="w-px h-3 bg-zinc-700 mx-auto" />
        <div className="w-full h-px bg-zinc-700 mb-3" />
        <div className="grid grid-cols-3 gap-3">
          {bottom.map(bone => (
            <BonePanel key={bone.key} bone={bone} causes={data[bone.key] || []}
              onAdd={c => addCause(bone.key, c)} onRemove={i => removeCause(bone.key, i)} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {ISHIKAWA_BONES.map(bone => {
          const count = (data[bone.key] || []).length;
          return (
            <div key={bone.key} className="text-center text-[10px]" style={{ color: bone.color }}>
              <div className="text-lg font-bold font-mono">{count}</div>
              <div className="text-zinc-600">{bone.label.split(' ')[0]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FiveWhysStep({ data, onChange }: { data: Partial<A3Data['fiveWhys']>; onChange: (d: Partial<A3Data['fiveWhys']>) => void }) {
  const f = data || {};
  const whys = ['w1', 'w2', 'w3', 'w4', 'w5'] as const;
  const labels = ['Pourquoi 1 — Symptôme initial', 'Pourquoi 2 — Cause directe', 'Pourquoi 3 — Cause sous-jacente', 'Pourquoi 4 — Cause profonde', 'Pourquoi 5 — Cause racine'];
  return (
    <div className="space-y-3">
      {whys.map((key, i) => (
        <div key={key} className="relative">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-[10px] font-bold flex items-center justify-center">{i + 1}</div>
              <p className="text-[10px] text-zinc-400">{labels[i]}</p>
            </div>
            <textarea value={f[key] || ''} onChange={e => onChange({ ...f, [key]: e.target.value })}
              placeholder={`Parce que...`} rows={2}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none resize-none placeholder-zinc-600" />
          </div>
          {i < 4 && (
            <div className="flex justify-center my-1">
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-px h-3 bg-zinc-700" />
                <ChevronDown size={12} className="text-zinc-600" />
              </div>
            </div>
          )}
        </div>
      ))}
      <div className="rounded-xl border-2 border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle size={13} className="text-amber-400" />
          <p className="text-xs font-semibold text-amber-400">Cause Racine Identifiée</p>
        </div>
        <textarea value={f.rootCause || ''} onChange={e => onChange({ ...f, rootCause: e.target.value })}
          placeholder="Formuler la cause racine finale identifiée après les 5 pourquoi..." rows={2}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-amber-500/20 text-xs text-zinc-200 outline-none resize-none placeholder-zinc-600" />
      </div>
    </div>
  );
}

function PDCAStep({ data, onChange }: { data: A3PDCAItem[]; onChange: (d: A3PDCAItem[]) => void }) {
  const [form, setForm] = useState<Partial<A3PDCAItem>>({ phase: 'Plan', status: 'pending', progress: 0 });
  const [showForm, setShowForm] = useState(false);

  const save = () => {
    if (!form.action || !form.responsible) return;
    const item: A3PDCAItem = {
      id: `pdca-${Date.now()}`, phase: form.phase || 'Plan', action: form.action,
      responsible: form.responsible, deadline: form.deadline || '', status: form.status || 'pending', progress: form.progress || 0,
    };
    onChange([...data, item]);
    setForm({ phase: 'Plan', status: 'pending', progress: 0 }); setShowForm(false);
  };
  const remove = (id: string) => onChange(data.filter(d => d.id !== id));
  const updateProgress = (id: string, progress: number) => onChange(data.map(d => d.id === id ? { ...d, progress } : d));
  const updateStatus = (id: string, status: A3PDCAItem['status']) => onChange(data.map(d => d.id === id ? { ...d, status } : d));

  const phases: A3PDCAPhase[] = ['Plan', 'Do', 'Check', 'Act'];
  const phaseDesc: Record<A3PDCAPhase, string> = {
    Plan:  'Définir les mesures correctives',
    Do:    'Mettre en œuvre les actions',
    Check: 'Vérifier les résultats',
    Act:   'Standardiser les améliorations',
  };

  const completionRate = data.length > 0
    ? Math.round(data.filter(d => d.status === 'done').length / data.length * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm font-mono text-white">{completionRate}% complété</div>
          <div className="w-40 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${completionRate}%` }} />
          </div>
        </div>
        <button data-testid="btn-pdca-add" onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs">
          <Plus size={12} />Ajouter une action
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {phases.map(phase => {
          const phaseItems = data.filter(d => d.phase === phase);
          return (
            <div key={phase} className={`rounded-xl p-4 border ${PDCA_COLORS[phase]}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${PDCA_BADGE[phase]}`}>{phase}</span>
                <span className="text-[10px] text-zinc-500">{phaseDesc[phase]}</span>
                <span className="ml-auto text-[10px] text-zinc-600 font-mono">{phaseItems.length}</span>
              </div>
              <div className="space-y-2 mt-3">
                {phaseItems.map(item => (
                  <div key={item.id} className="rounded-lg p-2.5 bg-white/[0.03] border border-white/5 group">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-300 leading-tight">{item.action}</p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">{item.responsible} {item.deadline && `• ${item.deadline}`}</p>
                      </div>
                      <button onClick={() => remove(item.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400">
                        <X size={10} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input type="range" min="0" max="100" value={item.progress}
                        onChange={e => updateProgress(item.id, +e.target.value)}
                        className="flex-1 h-1 appearance-none bg-white/10 rounded-full accent-emerald-500" />
                      <span className="text-[10px] text-zinc-500 font-mono w-7">{item.progress}%</span>
                      <select value={item.status} onChange={e => updateStatus(item.id, e.target.value as A3PDCAItem['status'])}
                        className="text-[10px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-zinc-400 outline-none">
                        <option value="pending">En attente</option>
                        <option value="in-progress">En cours</option>
                        <option value="done">Terminé</option>
                      </select>
                    </div>
                  </div>
                ))}
                {phaseItems.length === 0 && (
                  <p className="text-[10px] text-zinc-700 text-center py-2">Aucune action</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="glass-strong rounded-xl p-5 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Ajouter une action PDCA</h3>
              <button onClick={() => setShowForm(false)}><X size={15} className="text-zinc-400" /></button>
            </div>
            <div className="space-y-3">
              <select value={form.phase} onChange={e => setForm({ ...form, phase: e.target.value as A3PDCAPhase })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none">
                {phases.map(p => <option key={p} value={p}>{p} — {phaseDesc[p]}</option>)}
              </select>
              <textarea value={form.action || ''} onChange={e => setForm({ ...form, action: e.target.value })}
                placeholder="Description de l'action" rows={2}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <input value={form.responsible || ''} onChange={e => setForm({ ...form, responsible: e.target.value })}
                  placeholder="Responsable"
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
                <input type="date" value={form.deadline || ''} onChange={e => setForm({ ...form, deadline: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-zinc-400">Annuler</button>
              <button data-testid="btn-pdca-save" onClick={save}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs">
                <Save size={12} />Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MonitoringStep({ abn, allAbnormalities }: { abn: Abnormality; allAbnormalities: Abnormality[] }) {
  const pdca = abn.a3?.pdca || [];
  const completionRate = pdca.length > 0 ? Math.round(pdca.filter(d => d.status === 'done').length / pdca.length * 100) : 0;
  const openPDCA = pdca.filter(d => d.status !== 'done').length;
  const detectedDate = new Date(abn.detectedDate);
  const daysSince = Math.max(0, Math.floor((Date.now() - detectedDate.getTime()) / 86400000));

  const trendData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    allAbnormalities.forEach(a => {
      const m = a.detectedDate?.slice(0, 7) || '';
      if (m) byMonth[m] = (byMonth[m] || 0) + 1;
    });
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([mois, count]) => ({ mois, count }));
  }, [allAbnormalities]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = { open: 0, investigating: 0, contained: 0, closed: 0 };
    allAbnormalities.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return [
      { name: 'Ouvertes', value: counts.open, fill: '#ef4444' },
      { name: 'Investigation', value: counts.investigating, fill: '#f59e0b' },
      { name: 'Contenues', value: counts.contained, fill: '#3b82f6' },
      { name: 'Clôturées', value: counts.closed, fill: '#10b981' },
    ].filter(d => d.value > 0);
  }, [allAbnormalities]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Jours écoulés', value: daysSince, unit: 'j', color: daysSince > 30 ? '#ef4444' : '#10b981' },
          { label: 'Actions PDCA', value: pdca.length, unit: 'tot.', color: '#3b82f6' },
          { label: 'Actions restantes', value: openPDCA, unit: 'open', color: openPDCA > 0 ? '#f59e0b' : '#10b981' },
          { label: 'Taux complétion', value: completionRate, unit: '%', color: completionRate >= 80 ? '#10b981' : '#f59e0b' },
        ].map((kpi, i) => (
          <div key={i} className="glass rounded-xl p-4">
            <p className="text-[10px] text-zinc-500 mb-1">{kpi.label}</p>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold font-mono" style={{ color: kpi.color }}>{kpi.value}</span>
              <span className="text-xs text-zinc-600 mb-0.5">{kpi.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-xl p-4">
          <p className="text-xs font-semibold text-white mb-3">Tendance des anomalies (6 mois)</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="mois" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Anomalies" radius={[3, 3, 0, 0]} fill="#3b82f6" fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs font-semibold text-white mb-3">Distribution par statut</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius="70%" innerRadius="35%"
                  dataKey="value" nameKey="name" paddingAngle={3}
                  label={({ name, value }) => `${value}`} labelLine={false}>
                  {statusData.map((e, i) => <Cell key={i} fill={e.fill} fillOpacity={0.8} />)}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10, color: '#a1a1aa' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        <p className="text-xs font-semibold text-white mb-3">Progression des actions PDCA</p>
        {pdca.length > 0 ? (
          <div className="space-y-2">
            {pdca.map(item => (
              <div key={item.id} className="flex items-center gap-3 text-[10px]">
                <span className={`px-1.5 py-0.5 rounded font-bold ${PDCA_BADGE[item.phase]}`}>{item.phase}</span>
                <span className="flex-1 text-zinc-400 truncate">{item.action}</span>
                <span className="text-zinc-500 w-16 text-right">{item.responsible}</span>
                <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.progress}%`, background: item.status === 'done' ? '#10b981' : '#3b82f6' }} />
                </div>
                <span className="font-mono text-zinc-400 w-7 text-right">{item.progress}%</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-700 text-center py-4">Aucune action PDCA définie</p>
        )}
      </div>
    </div>
  );
}

function TimelineStep({ data, abnDetectedDate, onChange }: { data: A3TimelineEvent[]; abnDetectedDate: string; onChange: (d: A3TimelineEvent[]) => void }) {
  const [form, setForm] = useState<Partial<A3TimelineEvent>>({ type: 'update' });
  const [showForm, setShowForm] = useState(false);

  const allEvents: A3TimelineEvent[] = useMemo(() => {
    const base: A3TimelineEvent = { id: 'detect-0', date: abnDetectedDate, event: 'Anomalie détectée', responsible: '', type: 'detection' };
    return [base, ...data].sort((a, b) => a.date.localeCompare(b.date));
  }, [data, abnDetectedDate]);

  const save = () => {
    if (!form.event || !form.date) return;
    const ev: A3TimelineEvent = { id: `ev-${Date.now()}`, date: form.date, event: form.event, responsible: form.responsible || '', type: form.type || 'update' };
    onChange([...data, ev]); setForm({ type: 'update' }); setShowForm(false);
  };

  return (
    <div className="space-y-3">
      <button data-testid="btn-timeline-add" onClick={() => setShowForm(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs">
        <Plus size={12} />Ajouter un événement
      </button>
      <div className="relative">
        <div className="absolute left-[88px] top-0 bottom-0 w-px bg-white/5" />
        <div className="space-y-3">
          {allEvents.map(ev => (
            <div key={ev.id} className="flex items-start gap-4 relative">
              <div className="text-[10px] text-zinc-600 font-mono w-20 text-right pt-0.5 flex-shrink-0">{ev.date}</div>
              <div className="relative flex-shrink-0 mt-1">
                <div className={`w-2.5 h-2.5 rounded-full ${TIMELINE_COLORS[ev.type]} ring-2 ring-zinc-900`} />
              </div>
              <div className="flex-1 glass rounded-lg px-3 py-2 group">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`text-[9px] uppercase tracking-wider font-bold mr-2 ${
                      ev.type === 'detection' ? 'text-red-400' : ev.type === 'action' ? 'text-blue-400' :
                      ev.type === 'closure' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>{ev.type}</span>
                    <span className="text-xs text-zinc-300">{ev.event}</span>
                  </div>
                  {ev.id !== 'detect-0' && (
                    <button onClick={() => onChange(data.filter(d => d.id !== ev.id))}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400"><X size={10} /></button>
                  )}
                </div>
                {ev.responsible && <p className="text-[10px] text-zinc-600 mt-0.5">{ev.responsible}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="glass-strong rounded-xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Nouvel événement</h3>
              <button onClick={() => setShowForm(false)}><X size={15} className="text-zinc-400" /></button>
            </div>
            <div className="space-y-3">
              <input type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
              <textarea value={form.event || ''} onChange={e => setForm({ ...form, event: e.target.value })}
                placeholder="Description de l'événement" rows={2}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none resize-none" />
              <input value={form.responsible || ''} onChange={e => setForm({ ...form, responsible: e.target.value })}
                placeholder="Responsable" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as A3TimelineEvent['type'] })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none">
                <option value="detection">Détection</option>
                <option value="update">Mise à jour</option>
                <option value="action">Action créée</option>
                <option value="closure">Clôture</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-zinc-400">Annuler</button>
              <button onClick={save} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs">
                <Save size={12} />Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type A3Step = 'qqoqccp' | 'pareto' | 'ishikawa' | '5why' | 'pdca' | 'monitoring' | 'timeline';

const A3_STEPS: Array<{ key: A3Step; label: string; icon: React.ElementType; short: string }> = [
  { key: 'qqoqccp',   label: 'QQOQCCP',           icon: ClipboardList, short: '1' },
  { key: 'pareto',    label: 'Pareto',             icon: BarChart2,     short: '2' },
  { key: 'ishikawa',  label: 'Ishikawa',           icon: Fish,          short: '3' },
  { key: '5why',      label: '5 Pourquoi',         icon: HelpCircle,    short: '4' },
  { key: 'pdca',      label: 'Plan PDCA',          icon: CheckSquare,   short: '5' },
  { key: 'monitoring',label: 'Monitoring',         icon: Activity,      short: '6' },
  { key: 'timeline',  label: 'Chronologie',        icon: Calendar,      short: '⊘' },
];

function InvestigationPanel({ abn, allAbnormalities, onSave }: {
  abn: Abnormality; allAbnormalities: Abnormality[]; onSave: (a: Abnormality) => void;
}) {
  const [step, setStep] = useState<A3Step>('qqoqccp');
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const a3 = abn.a3 || {};
  const updateA3 = useCallback((key: keyof A3Data, value: unknown) => {
    onSave({ ...abn, a3: { ...a3, [key]: value } });
  }, [abn, a3, onSave]);

  const exportReport = async (fmt: 'pdf' | 'print') => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const img = await toPng(reportRef.current, { pixelRatio: 3, backgroundColor: '#18181b', skipFonts: true });
      if (fmt === 'pdf') {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        doc.setFillColor(24, 24, 27); doc.rect(0, 0, 210, 297, 'F');
        doc.setFontSize(14); doc.setTextColor(228, 228, 231);
        doc.text(`Rapport A3 — ${abn.title}`, 10, 14);
        doc.setFontSize(8); doc.setTextColor(113, 113, 122);
        doc.text(`LEONI Menzel Hayet • ${abn.dept} • ${abn.detectedDate} • ${new Date().toLocaleString('fr-FR')}`, 10, 21);
        const ratio = reportRef.current.offsetWidth / reportRef.current.offsetHeight;
        const w = 190; const h = w / ratio;
        doc.addImage(img, 'PNG', 10, 27, w, Math.min(h, 257));
        doc.save(`A3-${abn.title.replace(/\s+/g, '-')}.pdf`);
      } else {
        const w = window.open('', '_blank', 'width=900,height=1200');
        if (!w) return;
        w.document.write(`<!DOCTYPE html><html><head><title>A3 — ${abn.title}</title><style>
          body{margin:0;background:#fff;display:flex;flex-direction:column;align-items:center;padding:20px;}
          h2{font-family:system-ui;font-size:15px;color:#111;margin-bottom:4px;}p{font-family:system-ui;font-size:10px;color:#666;margin:0 0 12px;}
          img{max-width:100%;box-shadow:0 2px 12px rgba(0,0,0,0.15);}@media print{body{padding:0;}}
        </style></head><body>
          <h2>Rapport A3 — ${abn.title}</h2>
          <p>LEONI Menzel Hayet • ${abn.dept} • ${new Date().toLocaleString('fr-FR')}</p>
          <img src="${img}" />
          <script>setTimeout(()=>{window.print();window.close();},600);<\/script>
        </body></html>`);
        w.document.close();
      }
    } finally { setExporting(false); }
  };

  return (
    <div className="border-t border-white/5 mt-0">
      <div className="px-4 pt-3 pb-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-blue-500" />
            <p className="text-xs font-semibold text-white">Investigation A3 — Résolution de Problème</p>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => exportReport('print')} disabled={exporting}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
              <Printer size={11} />Imprimer
            </button>
            <button data-testid="btn-a3-export-pdf" onClick={() => exportReport('pdf')} disabled={exporting}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] bg-blue-600 hover:bg-blue-700 text-white transition-colors">
              {exporting ? <RefreshCw size={11} className="animate-spin" /> : <FileDown size={11} />}
              PDF A3
            </button>
          </div>
        </div>

        <div className="flex gap-0.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {A3_STEPS.map(s => (
            <button key={s.key} data-testid={`tab-a3-${s.key}`} onClick={() => setStep(s.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-[10px] font-medium whitespace-nowrap transition-colors flex-shrink-0 border-b-2 ${
                step === s.key ? 'bg-white/[0.06] text-white border-blue-500' : 'text-zinc-500 hover:text-zinc-300 border-transparent'
              }`}>
              <s.icon size={10} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={reportRef} className="px-4 py-4 space-y-4">
        {step === 'qqoqccp' && (
          <QQOQCCPStep data={a3.qqoqccp || {}} onChange={v => updateA3('qqoqccp', v)} />
        )}
        {step === 'pareto' && (
          <ParetoStep data={a3.pareto || []} onChange={v => updateA3('pareto', v)} />
        )}
        {step === 'ishikawa' && (
          <IshikawaStep data={a3.ishikawa || {}} effectTitle={abn.title} onChange={v => updateA3('ishikawa', v)} />
        )}
        {step === '5why' && (
          <FiveWhysStep data={a3.fiveWhys || {}} onChange={v => updateA3('fiveWhys', v)} />
        )}
        {step === 'pdca' && (
          <PDCAStep data={a3.pdca || []} onChange={v => updateA3('pdca', v)} />
        )}
        {step === 'monitoring' && (
          <MonitoringStep abn={abn} allAbnormalities={allAbnormalities} />
        )}
        {step === 'timeline' && (
          <TimelineStep data={a3.timeline || []} abnDetectedDate={abn.detectedDate} onChange={v => updateA3('timeline', v)} />
        )}
      </div>
    </div>
  );
}

export default function AbnormalityActions({ lang }: AbnormalityActionsProps) {
  const tr = useTranslate(lang);
  const [tab, setTab] = useState<'abnormalities' | 'actions'>('abnormalities');
  const [abnormalities, setAbnormalities] = useState<Abnormality[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [showAbnForm, setShowAbnForm] = useState(false);
  const [showActForm, setShowActForm] = useState(false);
  const [abnForm, setAbnForm] = useState<Partial<Abnormality>>({});
  const [actForm, setActForm] = useState<Partial<Action>>({});
  const [expandedAbn, setExpandedAbn] = useState<string | null>(null);

  useEffect(() => {
    setAbnormalities(storage.getAbnormalities());
    setActions(storage.getActions());
  }, []);

  const saveAbn = () => {
    if (!abnForm.title || !abnForm.category || !abnForm.dept) return;
    const entry: Abnormality = {
      id: `abn-${Date.now()}`, title: abnForm.title, description: abnForm.description || '',
      category: abnForm.category as SQDCMCategory, dept: abnForm.dept as Dept,
      detectedBy: abnForm.detectedBy || '', detectedDate: new Date().toISOString().slice(0, 10),
      severity: (abnForm.severity || 'medium') as Priority, status: 'open', linkedActions: [],
    };
    const updated = [...abnormalities, entry];
    setAbnormalities(updated); storage.setAbnormalities(updated);
    setShowAbnForm(false); setAbnForm({});
  };

  const saveAct = () => {
    if (!actForm.title || !actForm.category || !actForm.dept) return;
    const entry: Action = {
      id: `act-${Date.now()}`, title: actForm.title, description: actForm.description || '',
      category: actForm.category as SQDCMCategory, dept: actForm.dept as Dept,
      owner: actForm.owner || '', dueDate: actForm.dueDate || '',
      status: 'not-started', priority: (actForm.priority || 'medium') as Priority,
      progress: 0, createdAt: new Date().toISOString().slice(0, 10),
    };
    const updated = [...actions, entry];
    setActions(updated); storage.setActions(updated);
    setShowActForm(false); setActForm({});
  };

  const updateAbnStatus = (id: string, status: Abnormality['status']) => {
    const updated = abnormalities.map(a => a.id === id ? { ...a, status } : a);
    setAbnormalities(updated); storage.setAbnormalities(updated);
  };

  const saveAbnormality = useCallback((updated: Abnormality) => {
    const all = abnormalities.map(a => a.id === updated.id ? updated : a);
    setAbnormalities(all); storage.setAbnormalities(all);
  }, [abnormalities]);

  const updateActStatus = (id: string, status: Status) => {
    const updated = actions.map(a => a.id === id ? { ...a, status } : a);
    setActions(updated); storage.setActions(updated);
  };
  const updateActProgress = (id: string, progress: number) => {
    const updated = actions.map(a => a.id === id ? { ...a, progress, status: progress >= 100 ? 'completed' as Status : a.status } : a);
    setActions(updated); storage.setActions(updated);
  };

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="text-abn-title" className="text-2xl font-bold text-white">{tr('abnormality.title')}</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Gestion des anomalies & résolution A3 — LEONI Menzel Hayet</p>
        </div>
        <div className="flex gap-2">
          <button data-testid="button-add-abnormality" onClick={() => setShowAbnForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-sm transition-colors">
            <AlertTriangle size={14} />{tr('abnormality.add')}
          </button>
          <button data-testid="button-add-action" onClick={() => setShowActForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
            <Plus size={14} />{tr('action.add')}
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('abnormalities')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${tab === 'abnormalities' ? 'bg-red-600/20 text-red-400 border border-red-500/20' : 'bg-white/5 text-zinc-400'}`}>
          <span className="flex items-center gap-2">
            <AlertTriangle size={14} />
            {tr('warroom.abnormalities')} ({abnormalities.filter(a => a.status !== 'closed').length})
          </span>
        </button>
        <button onClick={() => setTab('actions')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${tab === 'actions' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'bg-white/5 text-zinc-400'}`}>
          <span className="flex items-center gap-2">
            <CheckCircle size={14} />
            {tr('warroom.actions')} ({actions.filter(a => a.status !== 'completed').length})
          </span>
        </button>
      </div>

      {tab === 'abnormalities' && (
        <div className="grid grid-cols-4 gap-3">
          {(['open', 'investigating', 'contained', 'closed'] as const).map(s => {
            const cfg = ABN_STATUS_CONFIG[s];
            const Icon = cfg.icon;
            const count = abnormalities.filter(a => a.status === s).length;
            return (
              <div key={s} className="glass rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} className={cfg.color} />
                  <span className={`text-xs uppercase tracking-wider ${cfg.color}`}>{tr(`abnormality.${s}`)}</span>
                </div>
                <div className="text-2xl font-bold text-white font-mono">{count}</div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'abnormalities' ? (
        <div className="space-y-3">
          {abnormalities.map(abn => {
            const cfg = ABN_STATUS_CONFIG[abn.status];
            const isExpanded = expandedAbn === abn.id;
            const pdcaCount = (abn.a3?.pdca || []).length;
            const causeCount = Object.values(abn.a3?.ishikawa || {}).flat().length;
            return (
              <div key={abn.id} data-testid={`card-abn-${abn.id}`} className="glass rounded-xl overflow-hidden">
                <div className="p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpandedAbn(isExpanded ? null : abn.id)}>
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronRight size={14} className="text-zinc-500" />}
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold"
                      style={{ backgroundColor: `${SQDCM_LABELS[abn.category].color}20`, color: SQDCM_LABELS[abn.category].color }}>
                      {abn.category}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-zinc-200">{abn.title}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-[10px] text-zinc-500">{abn.dept} • {abn.detectedBy} • {abn.detectedDate}</p>
                        {pdcaCount > 0 && <span className="text-[10px] text-blue-400">{pdcaCount} action(s) PDCA</span>}
                        {causeCount > 0 && <span className="text-[10px] text-purple-400">{causeCount} cause(s) Ishikawa</span>}
                        {abn.a3?.fiveWhys?.rootCause && <span className="text-[10px] text-amber-400">Cause racine identifiée</span>}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] border ${PRIORITY_COLORS[abn.severity]}`}>
                      {tr(`priority.${abn.severity}`)}
                    </span>
                    <select value={abn.status} onChange={e => { e.stopPropagation(); updateAbnStatus(abn.id, e.target.value as Abnormality['status']); }}
                      className={`px-2 py-1 rounded text-xs bg-transparent border border-white/10 ${cfg.color} outline-none`}
                      onClick={e => e.stopPropagation()}>
                      <option value="open">Open</option>
                      <option value="investigating">Investigating</option>
                      <option value="contained">Contained</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
                {isExpanded && (
                  <>
                    {(abn.description || abn.rootCause || abn.containmentAction) && (
                      <div className="px-4 py-3 border-t border-white/5 bg-white/[0.01]">
                        {abn.description && <p className="text-xs text-zinc-400 mb-1">{abn.description}</p>}
                        {abn.rootCause && <p className="text-xs text-zinc-500"><span className="text-zinc-400 font-medium">Cause racine:</span> {abn.rootCause}</p>}
                        {abn.containmentAction && <p className="text-xs text-zinc-500 mt-0.5"><span className="text-zinc-400 font-medium">Confinement:</span> {abn.containmentAction}</p>}
                        {abn.correctiveAction && <p className="text-xs text-zinc-500 mt-0.5"><span className="text-zinc-400 font-medium">Correctif:</span> {abn.correctiveAction}</p>}
                      </div>
                    )}
                    <InvestigationPanel abn={abn} allAbnormalities={abnormalities} onSave={saveAbnormality} />
                  </>
                )}
              </div>
            );
          })}
          {abnormalities.length === 0 && (
            <div className="glass rounded-xl p-12 text-center">
              <AlertTriangle size={32} className="text-zinc-700 mx-auto mb-3 opacity-40" />
              <p className="text-zinc-500 text-sm">Aucune anomalie enregistrée</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {actions.map(action => {
            const statusColors: Record<string, string> = { 'on-track': 'bg-emerald-500', 'at-risk': 'bg-amber-500', 'delayed': 'bg-red-500', 'completed': 'bg-blue-500', 'not-started': 'bg-zinc-500' };
            return (
              <div key={action.id} data-testid={`card-action-${action.id}`} className="glass rounded-xl p-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-12 rounded-full ${statusColors[action.status]}`} />
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold"
                    style={{ backgroundColor: `${SQDCM_LABELS[action.category].color}20`, color: SQDCM_LABELS[action.category].color }}>
                    {action.category}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-zinc-200">{action.title}</p>
                    <p className="text-[10px] text-zinc-500">{action.dept} • {action.owner} • Due: {action.dueDate}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] border ${PRIORITY_COLORS[action.priority]}`}>
                    {tr(`priority.${action.priority}`)}
                  </span>
                  <div className="flex items-center gap-2 w-32">
                    <input type="range" min="0" max="100" value={action.progress}
                      onChange={e => updateActProgress(action.id, parseInt(e.target.value))}
                      className="flex-1 h-1 appearance-none bg-white/10 rounded-full accent-blue-500" />
                    <span className="text-[10px] text-zinc-400 font-mono w-8">{action.progress}%</span>
                  </div>
                  <select value={action.status} onChange={e => updateActStatus(action.id, e.target.value as Status)}
                    className="px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-zinc-300 outline-none">
                    <option value="not-started">Not Started</option>
                    <option value="on-track">On Track</option>
                    <option value="at-risk">At Risk</option>
                    <option value="delayed">Delayed</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            );
          })}
          {actions.length === 0 && (
            <div className="glass rounded-xl p-12 text-center">
              <CheckCircle size={32} className="text-zinc-700 mx-auto mb-3 opacity-40" />
              <p className="text-zinc-500 text-sm">Aucune action enregistrée</p>
            </div>
          )}
        </div>
      )}

      {showAbnForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowAbnForm(false)}>
          <div className="glass-strong rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{tr('abnormality.add')}</h3>
              <button onClick={() => setShowAbnForm(false)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input data-testid="input-abn-title" placeholder="Titre" value={abnForm.title || ''} onChange={e => setAbnForm({ ...abnForm, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
              <textarea data-testid="input-abn-description" placeholder="Description" value={abnForm.description || ''} onChange={e => setAbnForm({ ...abnForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none h-20 resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <select data-testid="select-abn-category" value={abnForm.category || ''} onChange={e => setAbnForm({ ...abnForm, category: e.target.value as SQDCMCategory })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
                  <option value="">Catégorie</option>
                  {SQDCM_CATEGORIES.map(c => <option key={c} value={c}>{c} - {SQDCM_LABELS[c].fr}</option>)}
                </select>
                <select data-testid="select-abn-dept" value={abnForm.dept || ''} onChange={e => setAbnForm({ ...abnForm, dept: e.target.value as Dept })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
                  <option value="">Département</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input data-testid="input-abn-detected-by" placeholder="Détecté par" value={abnForm.detectedBy || ''} onChange={e => setAbnForm({ ...abnForm, detectedBy: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
                <select data-testid="select-abn-severity" value={abnForm.severity || 'medium'} onChange={e => setAbnForm({ ...abnForm, severity: e.target.value as Priority })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
                  <option value="critical">Critique</option>
                  <option value="high">Haute</option>
                  <option value="medium">Moyenne</option>
                  <option value="low">Basse</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAbnForm(false)} className="px-4 py-2 text-sm text-zinc-400">{tr('common.cancel')}</button>
              <button data-testid="button-save-abnormality" onClick={saveAbn} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">
                <Save size={14} />{tr('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showActForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowActForm(false)}>
          <div className="glass-strong rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{tr('action.add')}</h3>
              <button onClick={() => setShowActForm(false)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input data-testid="input-act-title" placeholder="Titre" value={actForm.title || ''} onChange={e => setActForm({ ...actForm, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
              <textarea data-testid="input-act-description" placeholder="Description" value={actForm.description || ''} onChange={e => setActForm({ ...actForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none h-20 resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <select data-testid="select-act-category" value={actForm.category || ''} onChange={e => setActForm({ ...actForm, category: e.target.value as SQDCMCategory })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
                  <option value="">Catégorie</option>
                  {SQDCM_CATEGORIES.map(c => <option key={c} value={c}>{c} - {SQDCM_LABELS[c].fr}</option>)}
                </select>
                <select data-testid="select-act-dept" value={actForm.dept || ''} onChange={e => setActForm({ ...actForm, dept: e.target.value as Dept })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
                  <option value="">Département</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input data-testid="input-act-owner" placeholder="Responsable" value={actForm.owner || ''} onChange={e => setActForm({ ...actForm, owner: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
                <input data-testid="input-act-due-date" type="date" value={actForm.dueDate || ''} onChange={e => setActForm({ ...actForm, dueDate: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
              </div>
              <select data-testid="select-act-priority" value={actForm.priority || 'medium'} onChange={e => setActForm({ ...actForm, priority: e.target.value as Priority })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
                <option value="critical">Critique</option>
                <option value="high">Haute</option>
                <option value="medium">Moyenne</option>
                <option value="low">Basse</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowActForm(false)} className="px-4 py-2 text-sm text-zinc-400">{tr('common.cancel')}</button>
              <button data-testid="button-save-action" onClick={saveAct} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                <Save size={14} />{tr('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
