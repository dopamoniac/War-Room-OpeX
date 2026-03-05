import { useState, useMemo, useRef, useCallback } from 'react';
import type { KPIEntry, SQDCMCategory, Dept } from '@shared/schema';
import { SQDCM_LABELS, SQDCM_CATEGORIES, DEPARTMENTS } from '@shared/schema';
import {
  ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Scatter, Cell,
  LineChart,
} from 'recharts';
import {
  TrendingUp, BarChart2, Activity, Calendar, Filter, Download,
  Settings, RefreshCw, ChevronDown, ArrowLeftRight, AlertTriangle,
  Target, Minus, GitCompare, Palette, Eye, EyeOff,
} from 'lucide-react';
import { toPng, toSvg } from 'html-to-image';
import jsPDF from 'jspdf';

type Timescale = 'jour' | 'semaine' | 'mois';
type TrackChartType = 'line' | 'bar' | 'area';

const SHIFTS = ['Tous', 'Matin', 'Après-midi', 'Nuit'];
const LINES  = ['Toutes', 'Ligne 1', 'Ligne 2', 'Ligne 3', 'Coupe C1', 'Coupe C2'];

const TRACK_PALETTES: Record<string, { label: string; primary: string; compare: string; ma: string; alert: string }> = {
  blue:   { label: 'Bleu',       primary: '#3b82f6', compare: '#f59e0b', ma: '#10b981', alert: '#ef4444' },
  emerald:{ label: 'Emeraude',   primary: '#10b981', compare: '#8b5cf6', ma: '#3b82f6', alert: '#ef4444' },
  violet: { label: 'Violet',     primary: '#8b5cf6', compare: '#f97316', ma: '#06b6d4', alert: '#ef4444' },
  amber:  { label: 'Ambre',      primary: '#f59e0b', compare: '#3b82f6', ma: '#10b981', alert: '#ef4444' },
  mono:   { label: 'Mono',       primary: '#e4e4e7', compare: '#71717a', ma: '#a1a1aa', alert: '#ef4444' },
};

const TOOLTIP_STYLE = {
  contentStyle: { background: '#27272a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#a1a1aa' },
  itemStyle: { color: '#e4e4e7' },
};
const AXIS_TICK = { fill: '#71717a', fontSize: 10 };
const GRID_STROKE = 'rgba(255,255,255,0.04)';

function seededNoise(seed: number): number {
  let x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function generateDaily(kpi: KPIEntry, fromDate: Date, toDate: Date): Array<{ label: string; value: number; date: Date }> {
  const trend = kpi.trend && kpi.trend.length > 0 ? [...kpi.trend] : [kpi.previousMonth, kpi.actual];
  const result: Array<{ label: string; value: number; date: Date }> = [];
  const days = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;
  const clampedDays = Math.min(Math.max(days, 1), 120);
  const idHash = kpi.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  for (let i = 0; i < clampedDays; i++) {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + i);
    const t = i / Math.max(clampedDays - 1, 1);
    const segLen = trend.length - 1;
    const seg = Math.floor(t * segLen);
    const segT = (t * segLen) - seg;
    const v0 = trend[Math.min(seg, segLen)];
    const v1 = trend[Math.min(seg + 1, segLen)];
    const interp = v0 + (v1 - v0) * segT;
    const noise = (seededNoise(idHash * 100 + i) - 0.5) * (Math.abs(interp) * 0.06 + 0.3);
    const value = Math.max(0, +(interp + noise).toFixed(2));
    result.push({ label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), value, date: d });
  }
  return result;
}

function generateWeekly(kpi: KPIEntry, fromDate: Date, toDate: Date): Array<{ label: string; value: number; date: Date }> {
  const trend = kpi.trend && kpi.trend.length > 0 ? [...kpi.trend] : [kpi.previousMonth, kpi.actual];
  const idHash = kpi.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const result: Array<{ label: string; value: number; date: Date }> = [];
  const ms = toDate.getTime() - fromDate.getTime();
  const weeks = Math.round(ms / (7 * 86400000)) + 1;
  const clampedWeeks = Math.min(Math.max(weeks, 1), 52);

  for (let i = 0; i < clampedWeeks; i++) {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + i * 7);
    const t = i / Math.max(clampedWeeks - 1, 1);
    const segLen = trend.length - 1;
    const seg = Math.floor(t * segLen);
    const segT = (t * segLen) - seg;
    const v0 = trend[Math.min(seg, segLen)];
    const v1 = trend[Math.min(seg + 1, segLen)];
    const interp = v0 + (v1 - v0) * segT;
    const noise = (seededNoise(idHash * 50 + i) - 0.5) * (Math.abs(interp) * 0.04 + 0.3);
    const value = Math.max(0, +(interp + noise).toFixed(2));
    const weekNum = Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7);
    result.push({ label: `S${weekNum} ${d.toLocaleDateString('fr-FR', { month: 'short' })}`, value, date: d });
  }
  return result;
}

function generateMonthly(kpi: KPIEntry, fromDate: Date, toDate: Date): Array<{ label: string; value: number; date: Date }> {
  const trend = kpi.trend && kpi.trend.length > 0 ? [...kpi.trend] : [kpi.previousMonth, kpi.actual];
  const result: Array<{ label: string; value: number; date: Date }> = [];
  let cur = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  const end = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
  let month = 0;
  const totalMonths = (end.getFullYear() - cur.getFullYear()) * 12 + end.getMonth() - cur.getMonth() + 1;
  const clampedTotal = Math.min(Math.max(totalMonths, 1), 36);

  while (cur <= end && month < clampedTotal) {
    const t = month / Math.max(clampedTotal - 1, 1);
    const segLen = trend.length - 1;
    const seg = Math.floor(t * segLen);
    const segT = (t * segLen) - seg;
    const v0 = trend[Math.min(seg, segLen)];
    const v1 = trend[Math.min(seg + 1, segLen)];
    const value = Math.max(0, +(v0 + (v1 - v0) * segT).toFixed(2));
    result.push({ label: cur.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }), value, date: new Date(cur) });
    cur.setMonth(cur.getMonth() + 1);
    month++;
  }
  return result;
}

function movingAverage(data: number[], window: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < window - 1) return null;
    const slice = data.slice(i - window + 1, i + 1);
    return +(slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2);
  });
}

function detectSpikes(values: number[]): boolean[] {
  if (values.length < 3) return values.map(() => false);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  return values.map(v => Math.abs(v - mean) > 2 * std);
}

function buildChartData(
  kpi: KPIEntry,
  timescale: Timescale,
  fromDate: Date,
  toDate: Date,
  compKpi: KPIEntry | null,
  compFrom: Date,
  compTo: Date,
  showComparison: boolean,
) {
  const raw = timescale === 'jour'
    ? generateDaily(kpi, fromDate, toDate)
    : timescale === 'semaine'
    ? generateWeekly(kpi, fromDate, toDate)
    : generateMonthly(kpi, fromDate, toDate);

  const values = raw.map(r => r.value);
  const maWindow = timescale === 'jour' ? 7 : timescale === 'semaine' ? 4 : 3;
  const ma = movingAverage(values, maWindow);
  const spikes = detectSpikes(values);

  let compRaw: typeof raw = [];
  if (showComparison && compKpi) {
    compRaw = timescale === 'jour'
      ? generateDaily(compKpi, compFrom, compTo)
      : timescale === 'semaine'
      ? generateWeekly(compKpi, compFrom, compTo)
      : generateMonthly(compKpi, compFrom, compTo);
  }

  const maxLen = Math.max(raw.length, compRaw.length);
  return Array.from({ length: maxLen }, (_, i) => ({
    label: raw[i]?.label ?? compRaw[i]?.label ?? '',
    value: raw[i]?.value ?? null,
    compare: compRaw[i]?.value ?? null,
    ma: ma[i] ?? null,
    spike: spikes[i] ? raw[i]?.value : null,
    isSpike: spikes[i],
  }));
}

function computeStats(data: ReturnType<typeof buildChartData>, target: number) {
  const vals = data.map(d => d.value).filter((v): v is number => v !== null);
  if (!vals.length) return { min: 0, max: 0, avg: 0, last: 0, spikes: 0, aboveTarget: 0 };
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const last = vals[vals.length - 1];
  const spikes = data.filter(d => d.isSpike).length;
  const aboveTarget = target > 0 ? Math.round((vals.filter(v => v >= target).length / vals.length) * 100) : 0;
  return { min: +min.toFixed(2), max: +max.toFixed(2), avg: +avg.toFixed(2), last: +last.toFixed(2), spikes, aboveTarget };
}

async function exportChart(el: HTMLElement, title: string, fmt: 'png' | 'svg' | 'pdf' | 'print') {
  if (fmt === 'png') {
    const url = await toPng(el, { pixelRatio: 3, backgroundColor: '#18181b', skipFonts: true });
    const a = document.createElement('a'); a.href = url; a.download = `${title.replace(/\s+/g, '-')}.png`; a.click();
  } else if (fmt === 'svg') {
    const url = await toSvg(el, { backgroundColor: '#18181b', skipFonts: true });
    const a = document.createElement('a'); a.href = url; a.download = `${title.replace(/\s+/g, '-')}.svg`; a.click();
  } else if (fmt === 'pdf') {
    const img = await toPng(el, { pixelRatio: 3, backgroundColor: '#18181b', skipFonts: true });
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFillColor(24, 24, 27); doc.rect(0, 0, 297, 210, 'F');
    doc.setFontSize(13); doc.setTextColor(228, 228, 231); doc.text(title, 10, 14);
    doc.setFontSize(8); doc.setTextColor(113, 113, 122);
    doc.text(`LEONI OPEX — ${new Date().toLocaleString('fr-FR')}`, 10, 21);
    doc.addImage(img, 'PNG', 10, 27, 277, 163);
    doc.save(`${title.replace(/\s+/g, '-')}.pdf`);
  } else {
    const img = await toPng(el, { pixelRatio: 3, backgroundColor: '#18181b', skipFonts: true });
    const w = window.open('', '_blank', 'width=1200,height=800');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>body{margin:0;background:#fff;display:flex;flex-direction:column;align-items:center;padding:20px;}
    h2{font-family:system-ui;font-size:16px;color:#111;}img{max-width:100%;}@media print{img{max-width:297mm;}}</style>
    </head><body><h2>${title}</h2><p style="font-family:system-ui;font-size:11px;color:#666">LEONI OPEX — ${new Date().toLocaleString('fr-FR')}</p>
    <img src="${img}"/><script>setTimeout(()=>{window.print();window.close();},600);<\/script></body></html>`);
    w.document.close();
  }
}

function CustomDot(props: any) {
  const { cx, cy, payload, color } = props;
  if (!payload.isSpike) return null;
  return <polygon points={`${cx},${cy - 8} ${cx + 6},${cy + 4} ${cx - 6},${cy + 4}`} fill="#ef4444" fillOpacity={0.9} />;
}

interface KPITimeTrackerProps {
  kpis: KPIEntry[];
}

export default function KPITimeTracker({ kpis }: KPITimeTrackerProps) {
  const today = new Date();
  const defaultFrom = new Date(today); defaultFrom.setMonth(today.getMonth() - 2);

  const [selectedKpiId, setSelectedKpiId] = useState<string>(kpis[0]?.id ?? '');
  const [timescale, setTimescale] = useState<Timescale>('mois');
  const [chartType, setChartType] = useState<TrackChartType>('line');
  const [fromDate, setFromDate] = useState(defaultFrom.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));
  const [showComparison, setShowComparison] = useState(false);
  const [compKpiId, setCompKpiId] = useState<string>('');
  const [compFrom, setCompFrom] = useState(new Date(defaultFrom.getFullYear(), defaultFrom.getMonth() - 3, 1).toISOString().slice(0, 10));
  const [compTo, setCompTo] = useState(new Date(today.getFullYear(), today.getMonth() - 2, 1).toISOString().slice(0, 10));
  const [filterDept, setFilterDept] = useState<Dept | 'all'>('all');
  const [filterShift, setFilterShift] = useState('Tous');
  const [filterLine, setFilterLine] = useState('Toutes');
  const [showMovingAvg, setShowMovingAvg] = useState(true);
  const [showTargetLine, setShowTargetLine] = useState(true);
  const [showAlertMarkers, setShowAlertMarkers] = useState(true);
  const [showSpikeHighlight, setShowSpikeHighlight] = useState(true);
  const [chartTitle, setChartTitle] = useState('');
  const [palKey, setPalKey] = useState('blue');
  const [yLabel, setYLabel] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const palette = TRACK_PALETTES[palKey];

  const filteredKpis = useMemo(() => {
    return kpis.filter(k => filterDept === 'all' || k.dept === filterDept);
  }, [kpis, filterDept]);

  const kpi = useMemo(() => kpis.find(k => k.id === selectedKpiId) ?? kpis[0], [kpis, selectedKpiId]);
  const compKpi = useMemo(() => {
    if (!showComparison || !compKpiId) return null;
    return kpis.find(k => k.id === compKpiId) ?? null;
  }, [kpis, showComparison, compKpiId]);

  const parsedFrom = useMemo(() => new Date(fromDate + 'T00:00:00'), [fromDate]);
  const parsedTo   = useMemo(() => new Date(toDate + 'T00:00:00'), [toDate]);
  const parsedCompFrom = useMemo(() => new Date(compFrom + 'T00:00:00'), [compFrom]);
  const parsedCompTo   = useMemo(() => new Date(compTo + 'T00:00:00'), [compTo]);

  const chartData = useMemo(() => {
    if (!kpi) return [];
    return buildChartData(kpi, timescale, parsedFrom, parsedTo, compKpi, parsedCompFrom, parsedCompTo, showComparison);
  }, [kpi, timescale, parsedFrom, parsedTo, compKpi, parsedCompFrom, parsedCompTo, showComparison]);

  const stats = useMemo(() => kpi ? computeStats(chartData, kpi.target) : null, [chartData, kpi]);

  const displayTitle = chartTitle || (kpi ? `${kpi.name} — ${kpi.unit}` : '');

  const handleExport = useCallback(async (fmt: 'png' | 'svg' | 'pdf' | 'print') => {
    if (!chartRef.current) return;
    setExporting(true); setShowExport(false);
    try { await exportChart(chartRef.current, displayTitle, fmt); }
    finally { setExporting(false); }
  }, [displayTitle]);

  const maWindow = timescale === 'jour' ? 7 : timescale === 'semaine' ? 4 : 3;

  if (!kpi) {
    return <div className="glass rounded-xl p-16 text-center text-zinc-500 text-sm">Aucun KPI disponible. Ajoutez des KPIs dans l'onglet "Données KPI".</div>;
  }

  const achievementPct = kpi.target > 0 ? Math.round((stats?.last ?? kpi.actual) / kpi.target * 100) : 100;
  const statusColor = achievementPct >= 95 ? '#10b981' : achievementPct >= 80 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_auto] gap-4 items-start">

        <div className="glass rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] text-zinc-500 mb-1 block uppercase tracking-wider">KPI sélectionné</label>
              <select
                data-testid="select-tracker-kpi"
                value={selectedKpiId}
                onChange={e => setSelectedKpiId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none focus:border-blue-500/50"
              >
                {filteredKpis.map(k => (
                  <option key={k.id} value={k.id}>
                    [{k.category}] {k.name} ({k.dept})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 mb-1 block uppercase tracking-wider">Échelle temps</label>
              <div className="flex bg-white/5 rounded-lg p-0.5 gap-0.5">
                {(['jour', 'semaine', 'mois'] as Timescale[]).map(ts => (
                  <button
                    key={ts}
                    data-testid={`btn-timescale-${ts}`}
                    onClick={() => setTimescale(ts)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${timescale === ts ? 'bg-blue-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    {ts.charAt(0).toUpperCase() + ts.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 mb-1 block uppercase tracking-wider">Type</label>
              <div className="flex bg-white/5 rounded-lg p-0.5 gap-0.5">
                {[
                  { key: 'line' as TrackChartType, Icon: TrendingUp, label: 'Courbe' },
                  { key: 'bar'  as TrackChartType, Icon: BarChart2,  label: 'Barres' },
                  { key: 'area' as TrackChartType, Icon: Activity,   label: 'Aire'   },
                ].map(({ key, Icon, label }) => (
                  <button
                    key={key}
                    data-testid={`btn-chart-type-${key}`}
                    title={label}
                    onClick={() => setChartType(key)}
                    className={`p-1.5 rounded-md transition-colors ${chartType === key ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <Icon size={13} />
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <label className="text-[10px] text-zinc-500 mb-1 block uppercase tracking-wider">Exporter</label>
              <button
                data-testid="btn-tracker-export"
                onClick={() => setShowExport(v => !v)}
                disabled={exporting}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors text-xs"
              >
                {exporting ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
                <ChevronDown size={9} />
              </button>
              {showExport && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowExport(false)} />
                  <div className="absolute right-0 top-11 z-30 glass-strong rounded-xl overflow-hidden shadow-2xl border border-white/10 w-40">
                    {[
                      { fmt: 'png' as const, label: 'PNG (HD 300dpi)' },
                      { fmt: 'svg' as const, label: 'SVG Vectoriel' },
                      { fmt: 'pdf' as const, label: 'PDF A4' },
                      { fmt: 'print' as const, label: 'Imprimer' },
                    ].map(({ fmt, label }) => (
                      <button key={fmt} data-testid={`tracker-export-${fmt}`} onClick={() => handleExport(fmt)}
                        className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors">
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 mb-1 block uppercase tracking-wider">Réglages</label>
              <button
                data-testid="btn-tracker-settings"
                onClick={() => setShowSettings(v => !v)}
                className={`p-2 rounded-lg transition-colors text-xs ${showSettings ? 'bg-blue-600/20 text-blue-400' : 'bg-white/5 hover:bg-white/10 text-zinc-400'}`}
              >
                <Settings size={14} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-[10px] text-zinc-500 mb-1 block uppercase tracking-wider flex items-center gap-1">
                <Calendar size={9} />Du
              </label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                data-testid="input-date-from"
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none focus:border-blue-500/50" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 mb-1 block uppercase tracking-wider">Au</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                data-testid="input-date-to"
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none focus:border-blue-500/50" />
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 mb-1 block uppercase tracking-wider">Département</label>
              <select value={filterDept} onChange={e => setFilterDept(e.target.value as Dept | 'all')}
                data-testid="select-tracker-dept"
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none">
                <option value="all">Tous les depts</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 mb-1 block uppercase tracking-wider">Poste</label>
              <select value={filterShift} onChange={e => setFilterShift(e.target.value)}
                data-testid="select-tracker-shift"
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none">
                {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 mb-1 block uppercase tracking-wider">Ligne</label>
              <select value={filterLine} onChange={e => setFilterLine(e.target.value)}
                data-testid="select-tracker-line"
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none">
                {LINES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <button
              data-testid="btn-compare-toggle"
              onClick={() => setShowComparison(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${showComparison ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-white/5 hover:bg-white/10 text-zinc-400'}`}
            >
              <GitCompare size={12} />
              {showComparison ? 'Comparaison ON' : 'Comparer'}
            </button>
          </div>

          {showComparison && (
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 flex flex-wrap gap-3 items-end">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 mr-1">
                <ArrowLeftRight size={12} />
                <span className="font-medium">Période de comparaison</span>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">KPI à comparer</label>
                <select value={compKpiId} onChange={e => setCompKpiId(e.target.value)}
                  data-testid="select-comp-kpi"
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none">
                  <option value="">Même KPI</option>
                  {kpis.map(k => <option key={k.id} value={k.id}>[{k.category}] {k.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">Du</label>
                <input type="date" value={compFrom} onChange={e => setCompFrom(e.target.value)}
                  data-testid="input-comp-from"
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">Au</label>
                <input type="date" value={compTo} onChange={e => setCompTo(e.target.value)}
                  data-testid="input-comp-to"
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {[
            { label: 'Valeur actuelle', value: `${stats?.last ?? kpi.actual} ${kpi.unit}`, color: statusColor },
            { label: 'Réalisation', value: `${achievementPct}%`, color: statusColor },
            { label: 'Moyenne période', value: `${stats?.avg ?? kpi.actual} ${kpi.unit}`, color: '#a1a1aa' },
            { label: 'Min / Max', value: `${stats?.min} / ${stats?.max}`, color: '#71717a' },
            { label: 'Pics anormaux', value: `${stats?.spikes ?? 0}`, color: (stats?.spikes ?? 0) > 0 ? '#ef4444' : '#10b981' },
            { label: '% au-dessus cible', value: `${stats?.aboveTarget ?? 0}%`, color: '#a1a1aa' },
          ].map(s => (
            <div key={s.label} className="glass rounded-lg px-3 py-2 min-w-[130px]">
              <p className="text-[10px] text-zinc-500 mb-0.5">{s.label}</p>
              <p className="text-sm font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {showSettings && (
        <div className="glass rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Settings size={13} className="text-blue-400" />
            <span className="text-sm font-semibold text-white">Réglages du graphique</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 mb-1 block">Titre du graphique</label>
              <input value={chartTitle} onChange={e => setChartTitle(e.target.value)}
                placeholder={kpi.name}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none focus:border-blue-500/50" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 mb-1 block">Étiquette axe Y</label>
              <input value={yLabel} onChange={e => setYLabel(e.target.value)}
                placeholder={kpi.unit}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none focus:border-blue-500/50" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 mb-1 block flex items-center gap-1"><Palette size={9} />Palette</label>
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(TRACK_PALETTES).map(([key, pal]) => (
                  <button key={key} onClick={() => setPalKey(key)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-colors ${palKey === key ? 'border-blue-500/50 text-white' : 'border-white/10 text-zinc-500 hover:border-white/20'}`}>
                    <div className="flex gap-0.5">
                      {[pal.primary, pal.compare, pal.ma].map((c, i) => (
                        <div key={i} style={{ background: c, width: 8, height: 8, borderRadius: 2 }} />
                      ))}
                    </div>
                    {pal.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 pt-2 border-t border-white/5">
            {[
              { key: 'showMovingAvg', label: `Moyenne mobile (${maWindow} pts)`, val: showMovingAvg, set: setShowMovingAvg },
              { key: 'showTargetLine', label: 'Ligne cible', val: showTargetLine, set: setShowTargetLine },
              { key: 'showAlertMarkers', label: 'Marqueurs alerte', val: showAlertMarkers, set: setShowAlertMarkers },
              { key: 'showSpikeHighlight', label: 'Pics anormaux', val: showSpikeHighlight, set: setShowSpikeHighlight },
            ].map(opt => (
              <label key={opt.key} className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer hover:text-zinc-200 transition-colors">
                <input type="checkbox" checked={opt.val} onChange={e => opt.set(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-blue-500" />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-sm font-semibold text-white">{displayTitle}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-2">
              <span>{fromDate} → {toDate}</span>
              {filterShift !== 'Tous' && <span>• {filterShift}</span>}
              {filterLine !== 'Toutes' && <span>• {filterLine}</span>}
              {filterDept !== 'all' && <span>• {filterDept}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {showMovingAvg && <span className="text-[10px] flex items-center gap-1" style={{ color: palette.ma }}><Minus size={10} />MM{maWindow}</span>}
            {showTargetLine && kpi.target > 0 && <span className="text-[10px] flex items-center gap-1 text-emerald-400"><Target size={10} />Cible {kpi.target}</span>}
            {showAlertMarkers && (stats?.spikes ?? 0) > 0 && <span className="text-[10px] flex items-center gap-1 text-red-400"><AlertTriangle size={10} />{stats!.spikes} pic{stats!.spikes > 1 ? 's' : ''}</span>}
            {showComparison && <span className="text-[10px] flex items-center gap-1" style={{ color: palette.compare }}><ArrowLeftRight size={10} />Comparaison</span>}
          </div>
        </div>

        <div ref={chartRef} className="rounded-lg" style={{ height: 340, background: 'rgba(255,255,255,0.01)', padding: '8px 4px 8px 8px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
              <defs>
                <linearGradient id="trackAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={palette.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={palette.primary} stopOpacity={0.02} />
                </linearGradient>
                {showComparison && (
                  <linearGradient id="compAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={palette.compare} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={palette.compare} stopOpacity={0.02} />
                  </linearGradient>
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis
                dataKey="label"
                tick={{ ...AXIS_TICK, fontSize: chartData.length > 30 ? 8 : 10 }}
                interval={chartData.length > 60 ? Math.floor(chartData.length / 20) : chartData.length > 30 ? 2 : 0}
              />
              <YAxis
                tick={AXIS_TICK}
                label={yLabel || kpi.unit ? { value: yLabel || kpi.unit, angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 10, offset: 5 } : undefined}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value: any, name: string) => {
                  if (name === 'value') return [`${value} ${kpi.unit}`, kpi.name];
                  if (name === 'compare') return [`${value} ${compKpi?.unit ?? kpi.unit}`, compKpi ? compKpi.name : 'Comparaison'];
                  if (name === 'ma') return [`${value} ${kpi.unit}`, `Moy. mobile (${maWindow})`];
                  if (name === 'spike') return [`${value} ${kpi.unit}`, '⚠ Pic anormal'];
                  return [value, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />

              {showTargetLine && kpi.target > 0 && (
                <ReferenceLine y={kpi.target} stroke="#22c55e" strokeDasharray="5 3"
                  label={{ value: `Cible: ${kpi.target}`, fill: '#22c55e', fontSize: 9, position: 'insideTopRight' }} />
              )}
              {showAlertMarkers && kpi.target > 0 && (
                <ReferenceLine y={kpi.target * 0.8} stroke="#f59e0b" strokeDasharray="3 3"
                  label={{ value: 'Seuil alerte', fill: '#f59e0b', fontSize: 9, position: 'insideBottomRight' }} />
              )}

              {chartType === 'bar' ? (
                <Bar dataKey="value" name={kpi.name} radius={[3, 3, 0, 0]} barSize={chartData.length > 30 ? 6 : 14}>
                  {chartData.map((d, i) => (
                    <Cell key={i}
                      fill={showSpikeHighlight && d.isSpike ? '#ef4444' : palette.primary}
                      fillOpacity={showSpikeHighlight && d.isSpike ? 1 : 0.8}
                    />
                  ))}
                </Bar>
              ) : chartType === 'area' ? (
                <Area dataKey="value" name={kpi.name} type="monotone"
                  stroke={palette.primary} strokeWidth={2}
                  fill="url(#trackAreaGrad)"
                  dot={showSpikeHighlight ? (props: any) => <CustomDot {...props} color={palette.primary} /> : false}
                  activeDot={{ r: 4, fill: palette.primary }} />
              ) : (
                <Line dataKey="value" name={kpi.name} type="monotone"
                  stroke={palette.primary} strokeWidth={2}
                  dot={showSpikeHighlight ? (props: any) => <CustomDot {...props} color={palette.primary} /> : { r: 2, fill: palette.primary, strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: palette.primary }} />
              )}

              {showComparison && !compKpiId && chartType === 'line' && (
                <Line dataKey="compare" name="Comparaison" type="monotone"
                  stroke={palette.compare} strokeWidth={2} strokeDasharray="6 3"
                  dot={{ r: 2, fill: palette.compare, strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: palette.compare }} />
              )}
              {showComparison && !compKpiId && chartType === 'area' && (
                <Area dataKey="compare" name="Comparaison" type="monotone"
                  stroke={palette.compare} strokeWidth={2} strokeDasharray="6 3"
                  fill="url(#compAreaGrad)" />
              )}
              {showComparison && !compKpiId && chartType === 'bar' && (
                <Bar dataKey="compare" name="Comparaison" radius={[3, 3, 0, 0]} fill={palette.compare} fillOpacity={0.6} barSize={chartData.length > 30 ? 4 : 10} />
              )}

              {showMovingAvg && (
                <Line dataKey="ma" name={`Moy. mobile (${maWindow})`} type="monotone"
                  stroke={palette.ma} strokeWidth={1.5} strokeDasharray="4 2"
                  dot={false} activeDot={{ r: 3 }} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {showSpikeHighlight && (stats?.spikes ?? 0) > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {chartData.map((d, i) => d.isSpike ? (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                <AlertTriangle size={8} />{d.label}: {d.value} {kpi.unit}
              </span>
            ) : null)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-xl p-4">
          <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-1.5">
            <Activity size={12} className="text-blue-400" />
            Profil du KPI
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Catégorie', value: `${kpi.category} — ${SQDCM_LABELS[kpi.category as SQDCMCategory]?.fr ?? kpi.category}`, color: SQDCM_LABELS[kpi.category as SQDCMCategory]?.color ?? '#a1a1aa' },
              { label: 'Département', value: kpi.dept, color: '#a1a1aa' },
              { label: 'Unité', value: kpi.unit, color: '#71717a' },
              { label: 'Cible', value: `${kpi.target} ${kpi.unit}`, color: '#22c55e' },
              { label: 'Actuel', value: `${kpi.actual} ${kpi.unit}`, color: statusColor },
              { label: 'Mois précédent', value: `${kpi.previousMonth} ${kpi.unit}`, color: '#71717a' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-1 border-b border-white/[0.03]">
                <span className="text-[11px] text-zinc-500">{row.label}</span>
                <span className="text-[11px] font-mono font-semibold" style={{ color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-4">
          <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-1.5">
            <TrendingUp size={12} className="text-emerald-400" />
            Tous les KPIs — Résumé
          </h3>
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {kpis.map(k => {
              const ach = k.target > 0 ? Math.round((k.actual / k.target) * 100) : 100;
              const col = ach >= 95 ? '#10b981' : ach >= 80 ? '#f59e0b' : '#ef4444';
              const catColor = SQDCM_LABELS[k.category as SQDCMCategory]?.color ?? '#a1a1aa';
              return (
                <button
                  key={k.id}
                  data-testid={`tracker-kpi-row-${k.id}`}
                  onClick={() => setSelectedKpiId(k.id)}
                  className={`w-full flex items-center gap-2 p-1.5 rounded-lg text-left transition-colors ${k.id === selectedKpiId ? 'bg-blue-600/10 border border-blue-500/20' : 'hover:bg-white/5'}`}
                >
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded min-w-[18px] text-center"
                    style={{ background: `${catColor}20`, color: catColor }}>{k.category}</span>
                  <span className="text-[10px] text-zinc-300 flex-1 truncate">{k.name}</span>
                  <span className="text-[10px] font-mono font-semibold" style={{ color: col }}>{ach}%</span>
                  <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(ach, 100)}%`, background: col }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
