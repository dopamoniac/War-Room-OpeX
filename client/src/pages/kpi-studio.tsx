import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { runAIEngine } from '@/lib/ai-engine';
import AIInsightCard from '@/components/ai-insight-card';
import KPITimeTracker from '@/components/kpi-time-tracker';
import type { Lang, KPIEntry, SQDCMCategory, Dept } from '@shared/schema';
import { SQDCM_LABELS, SQDCM_CATEGORIES, DEPARTMENTS } from '@shared/schema';
import { useTranslate } from '@/lib/translations';
import { storage } from '@/lib/storage';
import {
  BarChart3, Plus, Filter, Trash2, Edit2, X, Save,
  TrendingUp, PieChart as PieIcon, Activity, Layers,
  Settings, Download, Printer, FileText, ChevronDown, BarChart2,
  ClipboardList, FileDown, Palette, RefreshCw, CheckSquare, Square,
  LayoutGrid, AlertCircle, CalendarRange
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, PieChart, Pie, ReferenceLine
} from 'recharts';
import { toPng, toSvg } from 'html-to-image';
import jsPDF from 'jspdf';

interface KPIStudioProps { lang: Lang; onOpenAI?: () => void; }

type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'stacked';

interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  categories: SQDCMCategory[];
  dept: Dept | 'all';
  aggregation: 'achievement' | 'absolute' | 'trend';
  palette: string[];
  showLegend: boolean;
  showTarget: boolean;
  xLabel: string;
  yLabel: string;
}

const PALETTES: Record<string, { label: string; colors: string[] }> = {
  industrial: { label: 'SQDCM', colors: ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'] },
  blue:       { label: 'Bleu',  colors: ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'] },
  warm:       { label: 'Chaud', colors: ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e'] },
  mono:       { label: 'Mono',  colors: ['#e4e4e7', '#a1a1aa', '#71717a', '#52525b', '#3f3f46'] },
  vivid:      { label: 'Vif',   colors: ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'] },
};

const DEFAULT_CHARTS: ChartConfig[] = [
  {
    id: 'default-bar', type: 'bar', title: 'Performance SQDCM — Actuel vs Cible',
    categories: [...SQDCM_CATEGORIES], dept: 'all', aggregation: 'absolute',
    palette: PALETTES.industrial.colors, showLegend: true, showTarget: false,
    xLabel: 'Catégorie SQDCM', yLabel: 'Valeur',
  },
  {
    id: 'default-line', type: 'line', title: 'Tendance Mensuelle (%)',
    categories: [...SQDCM_CATEGORIES], dept: 'all', aggregation: 'trend',
    palette: PALETTES.industrial.colors, showLegend: true, showTarget: true,
    xLabel: 'Mois', yLabel: '% Réalisation',
  },
  {
    id: 'default-pie', type: 'pie', title: 'Distribution par Catégorie SQDCM',
    categories: [...SQDCM_CATEGORIES], dept: 'all', aggregation: 'achievement',
    palette: PALETTES.industrial.colors, showLegend: true, showTarget: false,
    xLabel: '', yLabel: '',
  },
];

function buildBarData(kpis: KPIEntry[], cfg: ChartConfig) {
  return cfg.categories.map(cat => {
    const list = kpis.filter(k => k.category === cat && (cfg.dept === 'all' || k.dept === cfg.dept));
    if (!list.length) return { name: SQDCM_LABELS[cat].fr, Actuel: 0, Cible: 0, Réalisé: 0 };
    const actual = list.reduce((s, k) => s + k.actual, 0) / list.length;
    const target = list.reduce((s, k) => s + k.target, 0) / list.length;
    const ach = target > 0 ? (actual / target) * 100 : 100;
    if (cfg.aggregation === 'achievement') return { name: SQDCM_LABELS[cat].fr, 'Réalisé (%)': Math.round(ach) };
    return { name: SQDCM_LABELS[cat].fr, Actuel: +actual.toFixed(1), Cible: +target.toFixed(1) };
  });
}

function buildTrendData(kpis: KPIEntry[], cfg: ChartConfig) {
  const filtered = kpis.filter(k => cfg.categories.includes(k.category) && (cfg.dept === 'all' || k.dept === cfg.dept));
  const maxLen = Math.max(...filtered.map(k => (k.trend || []).length), 1);
  const len = Math.min(maxLen, 7);
  const labels = Array.from({ length: len }, (_, i) => i === len - 1 ? 'Actuel' : `M-${len - 1 - i}`);
  return labels.map((label, idx) => {
    const point: Record<string, number | string> = { mois: label };
    cfg.categories.forEach(cat => {
      const list = filtered.filter(k => k.category === cat);
      if (!list.length) { point[SQDCM_LABELS[cat].fr] = 0; return; }
      const avg = list.reduce((s, k) => {
        const t = k.trend || [];
        const tIdx = t.length - len + idx;
        const val = tIdx >= 0 ? t[tIdx] : k.actual;
        return s + (k.target > 0 ? (val / k.target) * 100 : 100);
      }, 0) / list.length;
      point[SQDCM_LABELS[cat].fr] = Math.round(avg);
    });
    return point;
  });
}

function buildPieData(kpis: KPIEntry[], cfg: ChartConfig) {
  return cfg.categories.map(cat => {
    const list = kpis.filter(k => k.category === cat && (cfg.dept === 'all' || k.dept === cfg.dept));
    const ach = list.length > 0
      ? list.reduce((s, k) => s + (k.target > 0 ? (k.actual / k.target) * 100 : 100), 0) / list.length : 0;
    return { name: SQDCM_LABELS[cat].fr, value: Math.round(ach), fill: SQDCM_LABELS[cat].color };
  });
}

function buildStackedData(kpis: KPIEntry[], cfg: ChartConfig) {
  const filtered = kpis.filter(k => cfg.categories.includes(k.category) && (cfg.dept === 'all' || k.dept === cfg.dept));
  const depts = cfg.dept !== 'all' ? [cfg.dept] : [...new Set(filtered.map(k => k.dept))].slice(0, 7);
  return depts.map(d => {
    const dKPIs = filtered.filter(k => k.dept === d);
    const point: Record<string, number | string> = { dept: d };
    cfg.categories.forEach(cat => {
      const list = dKPIs.filter(k => k.category === cat);
      const avg = list.length > 0
        ? list.reduce((s, k) => s + (k.target > 0 ? (k.actual / k.target) * 100 : 100), 0) / list.length : 0;
      point[SQDCM_LABELS[cat].fr] = Math.round(avg);
    });
    return point;
  });
}

async function doExportPNG(el: HTMLElement, title: string) {
  const url = await toPng(el, { pixelRatio: 3, backgroundColor: '#18181b', skipFonts: true });
  const a = document.createElement('a'); a.href = url;
  a.download = `${title.replace(/\s+/g, '-')}.png`; a.click();
}
async function doExportSVG(el: HTMLElement, title: string) {
  const url = await toSvg(el, { backgroundColor: '#18181b', skipFonts: true });
  const a = document.createElement('a'); a.href = url;
  a.download = `${title.replace(/\s+/g, '-')}.svg`; a.click();
}
async function doExportPDF(el: HTMLElement, title: string) {
  const img = await toPng(el, { pixelRatio: 3, backgroundColor: '#18181b', skipFonts: true });
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFillColor(24, 24, 27); doc.rect(0, 0, 297, 210, 'F');
  doc.setFontSize(13); doc.setTextColor(228, 228, 231);
  doc.text(title, 10, 14);
  doc.setFontSize(8); doc.setTextColor(113, 113, 122);
  doc.text(`LEONI OPEX War Room — Menzel Hayet — ${new Date().toLocaleString('fr-FR')}`, 10, 21);
  doc.addImage(img, 'PNG', 10, 27, 277, 163);
  doc.save(`${title.replace(/\s+/g, '-')}.pdf`);
}
async function doPrint(el: HTMLElement, title: string) {
  const img = await toPng(el, { pixelRatio: 3, backgroundColor: '#18181b', skipFonts: true });
  const w = window.open('', '_blank', 'width=1200,height=800');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
    body{margin:0;background:#fff;display:flex;flex-direction:column;align-items:center;padding:20px;}
    h2{font-family:system-ui;font-size:16px;color:#111;margin-bottom:6px;}
    p{font-family:system-ui;font-size:11px;color:#666;margin:0 0 14px;}
    img{max-width:100%;box-shadow:0 2px 12px rgba(0,0,0,0.2);}
    @media print{body{padding:0;}img{max-width:297mm;}}
  </style></head><body>
    <h2>${title}</h2>
    <p>LEONI OPEX War Room — Menzel Hayet — ${new Date().toLocaleString('fr-FR')}</p>
    <img src="${img}" />
    <script>setTimeout(()=>{window.print();window.close();},600);<\/script>
  </body></html>`);
  w.document.close();
}

const TOOLTIP_STYLE = {
  contentStyle: { background: '#27272a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#a1a1aa' }, itemStyle: { color: '#e4e4e7' },
};
const AXIS_TICK = { fill: '#71717a', fontSize: 10 };
const GRID_STROKE = 'rgba(255,255,255,0.04)';
const LEGEND_STYLE = { wrapperStyle: { fontSize: 11, color: '#a1a1aa' } };

function ChartRenderer({ cfg, kpis }: { cfg: ChartConfig; kpis: KPIEntry[] }) {
  const data = useMemo(() => {
    if (cfg.type === 'bar') return buildBarData(kpis, cfg);
    if (cfg.type === 'line' || cfg.type === 'area') return buildTrendData(kpis, cfg);
    if (cfg.type === 'pie') return buildPieData(kpis, cfg);
    return buildStackedData(kpis, cfg);
  }, [cfg, kpis]);

  const margin = { top: 8, right: 24, bottom: cfg.xLabel ? 28 : 8, left: 8 };
  const axisProps = (key: string, angle?: number) => ({
    label: key ? { value: key, position: angle ? 'insideLeft' : 'insideBottom', fill: '#52525b', fontSize: 10, offset: angle ? -5 : -4, angle } : undefined,
  });

  if (cfg.type === 'bar') {
    const isAch = cfg.aggregation === 'achievement';
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="name" tick={AXIS_TICK} {...axisProps(cfg.xLabel)} />
          <YAxis tick={AXIS_TICK} {...axisProps(cfg.yLabel, -90)} />
          <Tooltip {...TOOLTIP_STYLE} />
          {cfg.showLegend && <Legend {...LEGEND_STYLE} />}
          {cfg.showTarget && <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="5 3" label={{ value: '100%', fill: '#22c55e', fontSize: 9, position: 'insideTopRight' }} />}
          {isAch ? (
            <Bar dataKey="Réalisé (%)" radius={[4, 4, 0, 0]} barSize={36}>
              {data.map((_, i) => <Cell key={i} fill={cfg.palette[i % cfg.palette.length]} fillOpacity={0.85} />)}
            </Bar>
          ) : (
            <>
              <Bar dataKey="Actuel" radius={[4, 4, 0, 0]} fill={cfg.palette[0]} fillOpacity={0.85} barSize={22} />
              <Bar dataKey="Cible" radius={[4, 4, 0, 0]} fill={cfg.palette[1]} fillOpacity={0.4} barSize={22} />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (cfg.type === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="mois" tick={AXIS_TICK} {...axisProps(cfg.xLabel)} />
          <YAxis domain={[0, 120]} tick={AXIS_TICK} {...axisProps(cfg.yLabel, -90)} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, '']} />
          {cfg.showLegend && <Legend {...LEGEND_STYLE} />}
          {cfg.showTarget && <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="5 3" label={{ value: 'Cible', fill: '#22c55e', fontSize: 9, position: 'insideTopRight' }} />}
          {cfg.categories.map((cat, i) => (
            <Line key={cat} type="monotone" dataKey={SQDCM_LABELS[cat].fr}
              stroke={cfg.palette[i % cfg.palette.length]} strokeWidth={2}
              dot={{ r: 3, fill: cfg.palette[i % cfg.palette.length], strokeWidth: 0 }}
              activeDot={{ r: 5 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (cfg.type === 'area') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={margin}>
          <defs>
            {cfg.categories.map((cat, i) => (
              <linearGradient key={cat} id={`ag-${cfg.id}-${cat}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={cfg.palette[i % cfg.palette.length]} stopOpacity={0.35} />
                <stop offset="95%" stopColor={cfg.palette[i % cfg.palette.length]} stopOpacity={0.03} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="mois" tick={AXIS_TICK} {...axisProps(cfg.xLabel)} />
          <YAxis domain={[0, 120]} tick={AXIS_TICK} {...axisProps(cfg.yLabel, -90)} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, '']} />
          {cfg.showLegend && <Legend {...LEGEND_STYLE} />}
          {cfg.showTarget && <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="5 3" />}
          {cfg.categories.map((cat, i) => (
            <Area key={cat} type="monotone" dataKey={SQDCM_LABELS[cat].fr}
              stroke={cfg.palette[i % cfg.palette.length]}
              fill={`url(#ag-${cfg.id}-${cat})`} strokeWidth={2} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (cfg.type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="46%" outerRadius="68%" innerRadius="30%"
            dataKey="value" nameKey="name" paddingAngle={2}
            label={({ name, value }) => `${name}: ${value}%`}
            labelLine={{ stroke: '#52525b', strokeWidth: 1 }}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={(entry as any).fill || cfg.palette[i % cfg.palette.length]} fillOpacity={0.85} />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Performance']} />
          {cfg.showLegend && <Legend {...LEGEND_STYLE} />}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={margin}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="dept" tick={AXIS_TICK} {...axisProps(cfg.xLabel)} />
        <YAxis tick={AXIS_TICK} {...axisProps(cfg.yLabel, -90)} />
        <Tooltip {...TOOLTIP_STYLE} />
        {cfg.showLegend && <Legend {...LEGEND_STYLE} />}
        {cfg.categories.map((cat, i) => (
          <Bar key={cat} dataKey={SQDCM_LABELS[cat].fr} stackId="s"
            fill={cfg.palette[i % cfg.palette.length]} fillOpacity={0.85}
            radius={i === cfg.categories.length - 1 ? [4, 4, 0, 0] : undefined} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function ConfigModal({ cfg, onSave, onClose }: { cfg: ChartConfig; onSave: (c: ChartConfig) => void; onClose: () => void }) {
  const [local, setLocal] = useState<ChartConfig>({ ...cfg });
  const toggleCat = (cat: SQDCMCategory) => {
    setLocal(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }));
  };
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="glass-strong rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Settings size={14} className="text-blue-400" />Configuration du graphique
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Titre</label>
            <input value={local.title} onChange={e => setLocal({ ...local, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none focus:border-blue-500/50" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Étiquette axe X</label>
              <input value={local.xLabel} onChange={e => setLocal({ ...local, xLabel: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Étiquette axe Y</label>
              <input value={local.yLabel} onChange={e => setLocal({ ...local, yLabel: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Catégories affichées</label>
            <div className="flex flex-wrap gap-2">
              {SQDCM_CATEGORIES.map(cat => {
                const active = local.categories.includes(cat);
                return (
                  <button key={cat} onClick={() => toggleCat(cat)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs border transition-colors ${active ? 'border-transparent' : 'border-white/10 text-zinc-500'}`}
                    style={active ? { background: `${SQDCM_LABELS[cat].color}20`, color: SQDCM_LABELS[cat].color, borderColor: `${SQDCM_LABELS[cat].color}40` } : {}}>
                    {active ? <CheckSquare size={11} /> : <Square size={11} />}
                    {cat} — {SQDCM_LABELS[cat].fr}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Département</label>
              <select value={local.dept} onChange={e => setLocal({ ...local, dept: e.target.value as Dept | 'all' })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
                <option value="all">Tous</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Agrégation</label>
              <select value={local.aggregation} onChange={e => setLocal({ ...local, aggregation: e.target.value as ChartConfig['aggregation'] })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
                <option value="absolute">Valeurs absolues</option>
                <option value="achievement">% Réalisation</option>
                <option value="trend">Tendance mensuelle</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block flex items-center gap-1.5"><Palette size={11} />Palette de couleurs</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(PALETTES).map(([key, pal]) => (
                <button key={key} onClick={() => setLocal({ ...local, palette: pal.colors })}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${JSON.stringify(local.palette) === JSON.stringify(pal.colors) ? 'border-blue-500/50 text-white' : 'border-white/10 text-zinc-500 hover:border-white/20'}`}>
                  <div className="flex gap-0.5">
                    {pal.colors.slice(0, 4).map((c, i) => <div key={i} style={{ background: c, width: 10, height: 10, borderRadius: 2 }} />)}
                  </div>
                  {pal.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
              <input type="checkbox" checked={local.showLegend} onChange={e => setLocal({ ...local, showLegend: e.target.checked })}
                className="w-3.5 h-3.5 rounded accent-blue-500" />
              Afficher la légende
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
              <input type="checkbox" checked={local.showTarget} onChange={e => setLocal({ ...local, showTarget: e.target.checked })}
                className="w-3.5 h-3.5 rounded accent-blue-500" />
              Ligne cible 100%
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Annuler</button>
          <button onClick={() => onSave(local)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
            <Save size={13} />Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}

const CHART_TYPE_OPTS: { key: ChartType; Icon: React.ElementType; label: string }[] = [
  { key: 'bar',     Icon: BarChart2,  label: 'Barres' },
  { key: 'line',    Icon: TrendingUp, label: 'Courbes' },
  { key: 'pie',     Icon: PieIcon,    label: 'Camembert' },
  { key: 'area',    Icon: Activity,   label: 'Aire' },
  { key: 'stacked', Icon: Layers,     label: 'Empilé' },
];

function ChartCard({ cfg, kpis, onUpdate, onRemove }: {
  cfg: ChartConfig; kpis: KPIEntry[];
  onUpdate: (c: ChartConfig) => void; onRemove: (id: string) => void;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [showExport, setShowExport] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleExport = useCallback(async (fmt: 'png' | 'svg' | 'pdf' | 'print') => {
    if (!chartRef.current) return;
    setLoading(true); setShowExport(false);
    try {
      if (fmt === 'png') await doExportPNG(chartRef.current, cfg.title);
      else if (fmt === 'svg') await doExportSVG(chartRef.current, cfg.title);
      else if (fmt === 'pdf') await doExportPDF(chartRef.current, cfg.title);
      else await doPrint(chartRef.current, cfg.title);
    } finally { setLoading(false); }
  }, [cfg.title]);

  return (
    <div data-testid={`chart-card-${cfg.id}`} className="glass rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <input
          data-testid={`input-chart-title-${cfg.id}`}
          value={cfg.title}
          onChange={e => onUpdate({ ...cfg, title: e.target.value })}
          className="flex-1 min-w-0 text-sm font-semibold text-white bg-transparent outline-none border-b border-transparent hover:border-white/10 focus:border-blue-500/50 transition-colors truncate py-0.5"
        />
        <div className="flex gap-0.5 bg-white/5 rounded-lg p-0.5 flex-shrink-0">
          {CHART_TYPE_OPTS.map(({ key, Icon, label }) => (
            <button key={key} title={label}
              data-testid={`btn-chart-type-${cfg.id}-${key}`}
              onClick={() => onUpdate({ ...cfg, type: key })}
              className={`p-1.5 rounded-md transition-colors ${cfg.type === key ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <Icon size={12} />
            </button>
          ))}
        </div>
        <button onClick={() => setShowConfig(true)} data-testid={`btn-chart-config-${cfg.id}`}
          className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0" title="Configurer">
          <Settings size={13} />
        </button>
        <div className="relative flex-shrink-0">
          <button onClick={() => setShowExport(!showExport)} disabled={loading}
            data-testid={`btn-chart-export-${cfg.id}`}
            className="flex items-center gap-0.5 p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors" title="Exporter">
            {loading ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
            <ChevronDown size={9} />
          </button>
          {showExport && (
            <div className="absolute right-0 top-9 z-30 glass-strong rounded-xl overflow-hidden shadow-2xl border border-white/10 w-40">
              {[
                { fmt: 'png' as const, label: 'PNG (HD 300dpi)' },
                { fmt: 'svg' as const, label: 'SVG Vectoriel' },
                { fmt: 'pdf' as const, label: 'PDF A4' },
                { fmt: 'print' as const, label: 'Imprimer' },
              ].map(({ fmt, label }) => (
                <button key={fmt} onClick={() => handleExport(fmt)}
                  data-testid={`export-${cfg.id}-${fmt}`}
                  className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors">
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => onRemove(cfg.id)} data-testid={`btn-chart-remove-${cfg.id}`}
          className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0">
          <X size={12} />
        </button>
      </div>

      <div ref={chartRef} className="rounded-lg" style={{ height: 248, background: 'rgba(255,255,255,0.01)', padding: 8 }}>
        <ChartRenderer cfg={cfg} kpis={kpis} />
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] text-zinc-600">
        {cfg.categories.map(cat => (
          <span key={cat} style={{ color: `${SQDCM_LABELS[cat].color}99` }}>● {SQDCM_LABELS[cat].fr}</span>
        ))}
        {cfg.dept !== 'all' && <span className="ml-auto">Dept: {cfg.dept}</span>}
      </div>

      {showConfig && <ConfigModal cfg={cfg} onSave={updated => { onUpdate(updated); setShowConfig(false); }} onClose={() => setShowConfig(false)} />}
      {showExport && <div className="fixed inset-0 z-20" onClick={() => setShowExport(false)} />}
    </div>
  );
}

export default function KPIStudio({ lang, onOpenAI }: KPIStudioProps) {
  const tr = useTranslate(lang);
  const [kpis, setKpis] = useState<KPIEntry[]>([]);
  const [tab, setTab] = useState<'overview' | 'tracking' | 'studio' | 'data' | 'report'>('overview');
  const aiOutput = useMemo(() => runAIEngine(), []);
  const [filterCat, setFilterCat] = useState<SQDCMCategory | 'all'>('all');
  const [filterDept, setFilterDept] = useState<Dept | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<KPIEntry>>({});
  const [charts, setCharts] = useState<ChartConfig[]>(() => {
    try { const s = localStorage.getItem('opex-chart-studio'); return s ? JSON.parse(s) : DEFAULT_CHARTS; } catch { return DEFAULT_CHARTS; }
  });
  const reportRef = useRef<HTMLDivElement>(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => { setKpis(storage.getKPIs()); }, []);
  useEffect(() => { localStorage.setItem('opex-chart-studio', JSON.stringify(charts)); }, [charts]);

  const filtered = useMemo(() => kpis.filter(k => {
    if (filterCat !== 'all' && k.category !== filterCat) return false;
    if (filterDept !== 'all' && k.dept !== filterDept) return false;
    return true;
  }), [kpis, filterCat, filterDept]);

  const overviewBarData = useMemo(() => SQDCM_CATEGORIES.map(cat => {
    const list = kpis.filter(k => k.category === cat);
    const avg = list.length > 0 ? list.reduce((s, k) => s + (k.target > 0 ? (k.actual / k.target) * 100 : 100), 0) / list.length : 0;
    return { name: SQDCM_LABELS[cat].fr, value: Math.round(avg), fill: SQDCM_LABELS[cat].color };
  }), [kpis]);

  const radarData = useMemo(() => SQDCM_CATEGORIES.map(cat => {
    const list = kpis.filter(k => k.category === cat);
    const avg = list.length > 0 ? list.reduce((s, k) => s + (k.target > 0 ? (k.actual / k.target) * 100 : 100), 0) / list.length : 0;
    return { subject: SQDCM_LABELS[cat].fr, A: Math.round(avg), fullMark: 120 };
  }), [kpis]);

  const handleSave = () => {
    if (!form.name || !form.category || !form.dept) return;
    const entry: KPIEntry = {
      id: editId || `kpi-${Date.now()}`, name: form.name, category: form.category as SQDCMCategory,
      unit: form.unit || '%', target: Number(form.target) || 0, actual: Number(form.actual) || 0,
      previousMonth: Number(form.previousMonth) || 0, dept: form.dept as Dept,
      trend: form.trend || [0], date: new Date().toISOString().slice(0, 7),
    };
    const updated = editId ? kpis.map(k => k.id === editId ? entry : k) : [...kpis, entry];
    setKpis(updated); storage.setKPIs(updated);
    setShowForm(false); setEditId(null); setForm({});
  };

  const updateChart = (updated: ChartConfig) => setCharts(prev => prev.map(c => c.id === updated.id ? updated : c));
  const removeChart = (id: string) => setCharts(prev => prev.filter(c => c.id !== id));
  const addChart = () => {
    const nc: ChartConfig = {
      id: `chart-${Date.now()}`, type: 'bar', title: 'Nouveau Graphique',
      categories: [...SQDCM_CATEGORIES], dept: 'all', aggregation: 'achievement',
      palette: PALETTES.industrial.colors, showLegend: true, showTarget: false,
      xLabel: '', yLabel: '',
    };
    setCharts(prev => [...prev, nc]);
  };

  const generateReport = async (fmt: 'pdf' | 'print') => {
    if (!reportRef.current) return;
    setReportLoading(true);
    try {
      if (fmt === 'pdf') await doExportPDF(reportRef.current, 'Rapport KPI SQDCM — LEONI Menzel Hayet');
      else await doPrint(reportRef.current, 'Rapport KPI SQDCM — LEONI Menzel Hayet');
    } finally { setReportLoading(false); }
  };

  return (
    <div className="space-y-5" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <AIInsightCard module="kpi" output={aiOutput} onOpenCopilot={onOpenAI} />
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="text-kpi-title" className="text-2xl font-bold text-white">{tr('kpi.title')}</h1>
          <p className="text-sm text-zinc-500 mt-1">{tr('kpi.performance')} SQDCM — Menzel Hayet</p>
        </div>
        <div className="flex gap-2">
          {tab === 'data' && (
            <button data-testid="button-add-kpi"
              onClick={() => { setShowForm(true); setEditId(null); setForm({}); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
              <Plus size={14} />{tr('kpi.add')}
            </button>
          )}
          {tab === 'studio' && (
            <button data-testid="button-add-chart" onClick={addChart}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
              <Plus size={14} />Ajouter un graphique
            </button>
          )}
        </div>
      </div>

      <div className="flex bg-white/5 rounded-xl p-0.5 w-fit">
        {[
          { key: 'overview' as const,  label: 'Vue d\'ensemble',  icon: BarChart3 },
          { key: 'tracking' as const,  label: 'Suivi Temporel',   icon: CalendarRange },
          { key: 'studio' as const,    label: 'Studio Graphique', icon: LayoutGrid },
          { key: 'data' as const,      label: 'Données KPI',      icon: ClipboardList },
          { key: 'report' as const,    label: 'Rapport',          icon: FileDown },
        ].map(t => (
          <button key={t.key} data-testid={`tab-kpi-${t.key}`} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-200'}`}>
            <t.icon size={13} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {SQDCM_CATEGORIES.map(cat => {
              const list = kpis.filter(k => k.category === cat);
              const ach = list.length > 0 ? list.reduce((s, k) => s + (k.target > 0 ? (k.actual / k.target) * 100 : 100), 0) / list.length : 0;
              const color = SQDCM_LABELS[cat].color;
              return (
                <div key={cat} data-testid={`card-sqdcm-${cat}`} className="glass rounded-xl p-4 flex flex-col gap-2" style={{ borderTop: `2px solid ${color}50` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">{SQDCM_LABELS[cat].fr}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${color}15`, color }}>{cat}</span>
                  </div>
                  <div className="text-2xl font-bold" style={{ color }}>{Math.round(ach)}%</div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(ach, 100)}%`, background: color }} />
                  </div>
                  <p className="text-[10px] text-zinc-600">{list.length} KPI{list.length !== 1 ? 's' : ''}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Performance par catégorie</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overviewBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="name" tick={AXIS_TICK} />
                    <YAxis domain={[0, 120]} tick={AXIS_TICK} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Performance']} />
                    <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="5 3" />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={36}>
                      {overviewBarData.map((e, i) => <Cell key={i} fill={e.fill} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Radar SQDCM</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.06)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fill: '#71717a', fontSize: 9 }} domain={[0, 120]} />
                    <Radar name="Performance" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'tracking' && (
        <KPITimeTracker kpis={kpis} />
      )}

      {tab === 'studio' && (
        <>
          {charts.length === 0 ? (
            <div className="glass rounded-xl p-16 text-center">
              <LayoutGrid size={36} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm mb-4">Aucun graphique. Cliquez sur "Ajouter un graphique" pour commencer.</p>
              <button onClick={addChart} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm mx-auto">
                <Plus size={14} />Ajouter un graphique
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {charts.map(cfg => (
                <ChartCard key={cfg.id} cfg={cfg} kpis={kpis} onUpdate={updateChart} onRemove={removeChart} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'data' && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <Filter size={13} className="text-zinc-500" />
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setFilterCat('all')}
                className={`px-3 py-1 rounded-lg text-xs transition-colors ${filterCat === 'all' ? 'bg-blue-600/20 text-blue-400' : 'bg-white/5 text-zinc-400 hover:text-zinc-200'}`}>
                {tr('common.all')}
              </button>
              {SQDCM_CATEGORIES.map(cat => (
                <button key={cat} data-testid={`filter-cat-${cat}`} onClick={() => setFilterCat(cat)}
                  className={`px-3 py-1 rounded-lg text-xs transition-colors ${filterCat === cat ? 'text-white' : 'bg-white/5 text-zinc-400 hover:text-zinc-200'}`}
                  style={filterCat === cat ? { backgroundColor: `${SQDCM_LABELS[cat].color}25`, color: SQDCM_LABELS[cat].color } : {}}>
                  {cat} — {SQDCM_LABELS[cat].fr}
                </button>
              ))}
            </div>
            <select data-testid="select-dept" value={filterDept} onChange={e => setFilterDept(e.target.value as Dept | 'all')}
              className="px-3 py-1 rounded-lg text-xs bg-white/5 text-zinc-300 border border-white/10 outline-none">
              <option value="all">{tr('common.all')} Depts</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Détail KPIs ({filtered.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-2 px-3 text-zinc-500">Cat.</th>
                    <th className="text-left py-2 px-3 text-zinc-500">{tr('kpi.name')}</th>
                    <th className="text-left py-2 px-3 text-zinc-500">{tr('kpi.dept')}</th>
                    <th className="text-right py-2 px-3 text-zinc-500">{tr('kpi.unit')}</th>
                    <th className="text-right py-2 px-3 text-zinc-500">{tr('kpi.target')}</th>
                    <th className="text-right py-2 px-3 text-zinc-500">{tr('kpi.actual')}</th>
                    <th className="text-right py-2 px-3 text-zinc-500">% Réal.</th>
                    <th className="text-center py-2 px-3 text-zinc-500">Tendance</th>
                    <th className="py-2 px-3 text-zinc-500 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(kpi => {
                    const ach = kpi.target !== 0 ? (kpi.actual / kpi.target) * 100 : 100;
                    const delta = kpi.actual - kpi.previousMonth;
                    return (
                      <tr key={kpi.id} data-testid={`row-kpi-detail-${kpi.id}`} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="py-2 px-3">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold"
                            style={{ backgroundColor: `${SQDCM_LABELS[kpi.category].color}20`, color: SQDCM_LABELS[kpi.category].color }}>
                            {kpi.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-zinc-300">{kpi.name}</td>
                        <td className="py-2 px-3 text-zinc-400">{kpi.dept}</td>
                        <td className="py-2 px-3 text-right text-zinc-400 font-mono">{kpi.unit}</td>
                        <td className="py-2 px-3 text-right text-zinc-400 font-mono">{kpi.target}</td>
                        <td className="py-2 px-3 text-right text-zinc-300 font-mono">{kpi.actual}</td>
                        <td className="py-2 px-3 text-right font-mono">
                          <span className={ach >= 95 ? 'text-emerald-400' : ach >= 80 ? 'text-amber-400' : 'text-red-400'}>
                            {ach.toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-[10px]">
                          <span className={delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-zinc-600'}>
                            {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button data-testid={`button-edit-kpi-${kpi.id}`} onClick={() => { setForm(kpi); setEditId(kpi.id); setShowForm(true); }}
                              className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-zinc-200">
                              <Edit2 size={12} />
                            </button>
                            <button data-testid={`button-delete-kpi-${kpi.id}`} onClick={() => { const u = kpis.filter(k => k.id !== kpi.id); setKpis(u); storage.setKPIs(u); }}
                              className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-red-400">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && <p className="text-xs text-zinc-500 text-center py-8">Aucun KPI correspondant aux filtres</p>}
            </div>
          </div>
        </>
      )}

      {tab === 'report' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400">Rapport de performance KPI — Tous les graphiques du Studio</p>
            <div className="flex gap-2">
              <button data-testid="btn-report-print" onClick={() => generateReport('print')} disabled={reportLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-lg transition-colors">
                <Printer size={14} />Imprimer
              </button>
              <button data-testid="btn-report-pdf" onClick={() => generateReport('pdf')} disabled={reportLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                {reportLoading ? <RefreshCw size={14} className="animate-spin" /> : <FileDown size={14} />}
                Télécharger PDF
              </button>
            </div>
          </div>

          <div ref={reportRef} className="space-y-4 rounded-xl p-6" style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Rapport KPI SQDCM</h2>
                <p className="text-xs text-zinc-500 mt-0.5">LEONI Menzel Hayet — OPEX War Room</p>
              </div>
              <div className="text-right text-xs text-zinc-500">
                <p>Généré le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                <p className="mt-0.5">{kpis.length} KPIs enregistrés</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {SQDCM_CATEGORIES.map(cat => {
                const list = kpis.filter(k => k.category === cat);
                const ach = list.length > 0 ? list.reduce((s, k) => s + (k.target > 0 ? (k.actual / k.target) * 100 : 100), 0) / list.length : 0;
                return (
                  <div key={cat} className="rounded-lg p-3 text-center" style={{ background: `${SQDCM_LABELS[cat].color}10`, border: `1px solid ${SQDCM_LABELS[cat].color}30` }}>
                    <p className="text-[10px] text-zinc-500 mb-1">{SQDCM_LABELS[cat].fr}</p>
                    <p className="text-xl font-bold" style={{ color: SQDCM_LABELS[cat].color }}>{Math.round(ach)}%</p>
                    <p className="text-[9px] text-zinc-600 mt-0.5">{list.length} KPI(s)</p>
                  </div>
                );
              })}
            </div>

            {charts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {charts.map(cfg => (
                  <div key={cfg.id} className="rounded-xl p-4" style={{ background: '#27272a', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xs font-semibold text-white mb-3">{cfg.title}</p>
                    <div style={{ height: 200 }}>
                      <ChartRenderer cfg={cfg} kpis={kpis} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-600 text-sm">
                <AlertCircle size={24} className="mx-auto mb-2 opacity-40" />
                Aucun graphique dans le Studio. Ajoutez des graphiques dans l'onglet "Studio Graphique".
              </div>
            )}

            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <table className="w-full text-[10px]">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                    {['Cat.', 'KPI', 'Dépt.', 'Cible', 'Actuel', '% Réal.'].map(h => (
                      <th key={h} className="py-2 px-3 text-left text-zinc-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kpis.slice(0, 20).map(kpi => {
                    const ach = kpi.target > 0 ? (kpi.actual / kpi.target) * 100 : 100;
                    return (
                      <tr key={kpi.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td className="py-1.5 px-3"><span className="font-mono font-bold text-[9px]" style={{ color: SQDCM_LABELS[kpi.category].color }}>{kpi.category}</span></td>
                        <td className="py-1.5 px-3 text-zinc-300">{kpi.name}</td>
                        <td className="py-1.5 px-3 text-zinc-500">{kpi.dept}</td>
                        <td className="py-1.5 px-3 text-zinc-400 font-mono">{kpi.target} {kpi.unit}</td>
                        <td className="py-1.5 px-3 text-zinc-300 font-mono">{kpi.actual} {kpi.unit}</td>
                        <td className="py-1.5 px-3 font-mono font-semibold" style={{ color: ach >= 95 ? '#10b981' : ach >= 80 ? '#f59e0b' : '#ef4444' }}>
                          {ach.toFixed(0)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {kpis.length > 20 && <p className="text-[10px] text-zinc-600 text-center py-2">+{kpis.length - 20} KPIs supplémentaires</p>}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="glass-strong rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{editId ? tr('kpi.edit') : tr('kpi.add')}</h3>
              <button data-testid="button-close-form" onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400">{tr('kpi.name')}</label>
                <input data-testid="input-kpi-name" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 mt-1 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400">{tr('kpi.category')}</label>
                  <select data-testid="select-kpi-category" value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value as SQDCMCategory })}
                    className="w-full px-3 py-2 mt-1 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
                    <option value="">--</option>
                    {SQDCM_CATEGORIES.map(c => <option key={c} value={c}>{c} — {SQDCM_LABELS[c].fr}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400">{tr('kpi.dept')}</label>
                  <select data-testid="select-kpi-dept" value={form.dept || ''} onChange={e => setForm({ ...form, dept: e.target.value as Dept })}
                    className="w-full px-3 py-2 mt-1 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
                    <option value="">--</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-zinc-400">{tr('kpi.unit')}</label>
                  <input data-testid="input-kpi-unit" value={form.unit || ''} onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 mt-1 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">{tr('kpi.target')}</label>
                  <input data-testid="input-kpi-target" type="number" value={form.target ?? ''} onChange={e => setForm({ ...form, target: Number(e.target.value) })}
                    className="w-full px-3 py-2 mt-1 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">{tr('kpi.actual')}</label>
                  <input data-testid="input-kpi-actual" type="number" value={form.actual ?? ''} onChange={e => setForm({ ...form, actual: Number(e.target.value) })}
                    className="w-full px-3 py-2 mt-1 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button data-testid="button-cancel-kpi" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">
                {tr('kpi.cancel')}
              </button>
              <button data-testid="button-save-kpi" onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
                <Save size={14} />{tr('kpi.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
