import { useState, useEffect, useMemo } from 'react';
import type { Lang, KPIEntry, Action, Abnormality, SQDCMCategory, ComputedKPI } from '@shared/schema';
import { SQDCM_LABELS, SQDCM_CATEGORIES } from '@shared/schema';
import { useTranslate } from '@/lib/translations';
import { storage } from '@/lib/storage';
import { runAIEngine } from '@/lib/ai-engine';
import AIInsightCard from '@/components/ai-insight-card';
import {
  Shield, CheckCircle, Clock, DollarSign, Users,
  TrendingUp, TrendingDown, AlertTriangle, Activity, Target, BarChart3
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Cell, RadialBarChart, RadialBar } from 'recharts';

const CATEGORY_ICONS: Record<SQDCMCategory, typeof Shield> = {
  S: Shield, Q: CheckCircle, D: Clock, C: DollarSign, M: Users,
};

function computeKPI(kpi: KPIEntry): ComputedKPI {
  const isLowerBetter = ['ppm', '%', 'k€', 'kWh/pcs', 'h', 'TF'].includes(kpi.unit) && kpi.name !== 'First Pass Yield' && kpi.name !== 'OTD Client' && kpi.name !== 'OEE Global' && kpi.name !== 'Productivité main d\'oeuvre' && kpi.name !== 'Suggestions améliorations' && kpi.name !== 'Heures formation' && kpi.name !== 'Jours sans accident' && kpi.name !== 'Near Miss reportés';
  let achievement: number;
  if (isLowerBetter) {
    achievement = kpi.target === 0 ? (kpi.actual === 0 ? 100 : 0) : Math.max(0, (1 - (kpi.actual - kpi.target) / kpi.target) * 100);
  } else {
    achievement = kpi.target === 0 ? 100 : (kpi.actual / kpi.target) * 100;
  }
  const gap = kpi.actual - kpi.target;
  const status = achievement >= 95 ? 'green' : achievement >= 80 ? 'yellow' : 'red';
  return { ...kpi, achievement: Math.min(achievement, 150), gap, status };
}

interface WarRoomProps {
  lang: Lang;
  onOpenAI?: () => void;
}

export default function WarRoom({ lang, onOpenAI }: WarRoomProps) {
  const tr = useTranslate(lang);
  const [kpis, setKpis] = useState<KPIEntry[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [abnormalities, setAbnormalities] = useState<Abnormality[]>([]);
  const aiOutput = useMemo(() => runAIEngine(), []);

  useEffect(() => {
    setKpis(storage.getKPIs());
    setActions(storage.getActions());
    setAbnormalities(storage.getAbnormalities());
  }, []);

  const computed = useMemo(() => kpis.map(computeKPI), [kpis]);

  const categoryMetrics = useMemo(() => {
    return SQDCM_CATEGORIES.map(cat => {
      const catKPIs = computed.filter(k => k.category === cat);
      const avg = catKPIs.length > 0
        ? catKPIs.reduce((s, k) => s + k.achievement, 0) / catKPIs.length
        : 0;
      const catActions = actions.filter(a => a.category === cat);
      const catAbnormalities = abnormalities.filter(a => a.category === cat);
      return {
        category: cat,
        label: SQDCM_LABELS[cat],
        avgAchievement: Math.round(avg),
        kpiCount: catKPIs.length,
        actionCount: catActions.length,
        openAbnormalities: catAbnormalities.filter(a => a.status !== 'closed').length,
        kpis: catKPIs,
        status: avg >= 95 ? 'green' : avg >= 80 ? 'yellow' : 'red',
      };
    });
  }, [computed, actions, abnormalities]);

  const overallScore = useMemo(() => {
    const scores = categoryMetrics.map(c => c.avgAchievement);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }, [categoryMetrics]);

  const activeActions = actions.filter(a => a.status !== 'completed').length;
  const openAbn = abnormalities.filter(a => a.status !== 'closed').length;

  const statusColor = (s: string) => s === 'green' ? '#10b981' : s === 'yellow' ? '#f59e0b' : '#ef4444';

  const radialData = categoryMetrics.map(c => ({
    name: c.label.fr,
    value: c.avgAchievement,
    fill: SQDCM_LABELS[c.category].color,
  }));

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <AIInsightCard module="warroom" output={aiOutput} onOpenCopilot={onOpenAI} />
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="text-warroom-title" className="text-2xl font-bold text-white tracking-tight">
            {tr('warroom.title')}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">{tr('warroom.overview')}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass rounded-xl px-4 py-2 flex items-center gap-3">
            <Activity size={16} className="text-blue-400" />
            <span className="text-sm text-zinc-300 font-mono">{new Date().toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-FR')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="glass rounded-xl p-5 col-span-1 flex flex-col items-center justify-center">
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={overallScore >= 90 ? '#10b981' : overallScore >= 75 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8"
                strokeDasharray={`${overallScore * 2.64} 264`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white font-mono">{overallScore}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Score</span>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-3 text-center">Performance Globale OPEX</p>
        </div>

        <div className="glass rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <Target size={14} />
            <span className="text-xs uppercase tracking-wider">{tr('warroom.kpis')}</span>
          </div>
          <div className="text-3xl font-bold text-white font-mono mt-2">{kpis.length}</div>
          <div className="flex gap-2 mt-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
              {computed.filter(k => k.status === 'green').length} ✓
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
              {computed.filter(k => k.status === 'yellow').length} ⚠
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
              {computed.filter(k => k.status === 'red').length} ✗
            </span>
          </div>
        </div>

        <div className="glass rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <AlertTriangle size={14} />
            <span className="text-xs uppercase tracking-wider">{tr('warroom.abnormalities')}</span>
          </div>
          <div className="text-3xl font-bold text-white font-mono mt-2">{openAbn}</div>
          <div className="flex gap-2 mt-2">
            {['open', 'investigating', 'contained'].map(s => {
              const count = abnormalities.filter(a => a.status === s).length;
              return count > 0 ? (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-400">
                  {s}: {count}
                </span>
              ) : null;
            })}
          </div>
        </div>

        <div className="glass rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <Activity size={14} />
            <span className="text-xs uppercase tracking-wider">{tr('warroom.actions')}</span>
          </div>
          <div className="text-3xl font-bold text-white font-mono mt-2">{activeActions}</div>
          <div className="flex gap-2 mt-2">
            {(['on-track', 'at-risk', 'delayed'] as const).map(s => {
              const count = actions.filter(a => a.status === s).length;
              const colorMap: Record<string, string> = {
                'on-track': 'bg-emerald-500/10 text-emerald-400',
                'at-risk': 'bg-amber-500/10 text-amber-400',
                'delayed': 'bg-red-500/10 text-red-400',
              };
              return count > 0 ? (
                <span key={s} className={`text-[10px] px-2 py-0.5 rounded-full ${colorMap[s]}`}>
                  {count}
                </span>
              ) : null;
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {categoryMetrics.map(metric => {
          const Icon = CATEGORY_ICONS[metric.category];
          return (
            <div
              key={metric.category}
              data-testid={`card-sqdcm-${metric.category}`}
              className="glass rounded-xl p-4 hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${SQDCM_LABELS[metric.category].color}20` }}
                  >
                    <Icon size={16} style={{ color: SQDCM_LABELS[metric.category].color }} />
                  </div>
                  <span className="text-sm font-semibold text-white">{metric.label[lang]}</span>
                </div>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: statusColor(metric.status) }}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold font-mono text-white">{metric.avgAchievement}%</span>
                  <span className="text-[10px] text-zinc-500">{tr('warroom.achievement')}</span>
                </div>

                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(metric.avgAchievement, 100)}%`,
                      backgroundColor: statusColor(metric.status),
                    }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-zinc-500 mt-2">
                  <span>KPIs: {metric.kpiCount}</span>
                  <span>Actions: {metric.actionCount}</span>
                </div>
              </div>

              {metric.kpis.length > 0 && (
                <div className="mt-3 h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metric.kpis[0].trend.map((v, i) => ({ v, i }))}>
                      <defs>
                        <linearGradient id={`grad-${metric.category}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={SQDCM_LABELS[metric.category].color} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={SQDCM_LABELS[metric.category].color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke={SQDCM_LABELS[metric.category].color}
                        fill={`url(#grad-${metric.category})`}
                        strokeWidth={1.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <CategoryChartIcon />
            Performance par catégorie
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={radialData} layout="vertical">
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={70} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#e4e4e7' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                  {radialData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Actions récentes</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {actions.slice(0, 5).map(action => {
              const priorityColors: Record<string, string> = { critical: 'text-red-400', high: 'text-amber-400', medium: 'text-blue-400', low: 'text-zinc-400' };
              const statusColors: Record<string, string> = { 'on-track': 'bg-emerald-500', 'at-risk': 'bg-amber-500', 'delayed': 'bg-red-500', 'completed': 'bg-blue-500', 'not-started': 'bg-zinc-500' };
              return (
                <div key={action.id} data-testid={`row-action-${action.id}`} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <div className={`w-1.5 h-8 rounded-full ${statusColors[action.status]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 truncate">{action.title}</p>
                    <p className="text-[10px] text-zinc-500">{action.dept} • {action.owner}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${action.progress}%` }} />
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono w-8 text-right">{action.progress}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">KPI Détails - Top Indicateurs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-2 px-3 text-zinc-500 font-medium">Cat.</th>
                <th className="text-left py-2 px-3 text-zinc-500 font-medium">KPI</th>
                <th className="text-left py-2 px-3 text-zinc-500 font-medium">{tr('kpi.dept')}</th>
                <th className="text-right py-2 px-3 text-zinc-500 font-medium">{tr('warroom.target')}</th>
                <th className="text-right py-2 px-3 text-zinc-500 font-medium">{tr('warroom.actual')}</th>
                <th className="text-right py-2 px-3 text-zinc-500 font-medium">{tr('warroom.gap')}</th>
                <th className="text-right py-2 px-3 text-zinc-500 font-medium">{tr('warroom.achievement')}</th>
                <th className="py-2 px-3 text-zinc-500 font-medium">{tr('warroom.trend')}</th>
              </tr>
            </thead>
            <tbody>
              {computed.map(kpi => (
                <tr key={kpi.id} data-testid={`row-kpi-${kpi.id}`} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="py-2 px-3">
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold"
                      style={{ backgroundColor: `${SQDCM_LABELS[kpi.category].color}20`, color: SQDCM_LABELS[kpi.category].color }}
                    >
                      {kpi.category}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-zinc-300">{kpi.name}</td>
                  <td className="py-2 px-3 text-zinc-400">{kpi.dept}</td>
                  <td className="py-2 px-3 text-right text-zinc-400 font-mono">{kpi.target} {kpi.unit}</td>
                  <td className="py-2 px-3 text-right text-zinc-300 font-mono">{kpi.actual} {kpi.unit}</td>
                  <td className="py-2 px-3 text-right font-mono">
                    <span className={kpi.gap <= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {kpi.gap > 0 ? '+' : ''}{kpi.gap.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className={`font-mono ${kpi.status === 'green' ? 'text-emerald-400' : kpi.status === 'yellow' ? 'text-amber-400' : 'text-red-400'}`}>
                      {kpi.achievement.toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-2 px-3 w-20">
                    <div className="h-6 w-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={kpi.trend.map((v, i) => ({ v, i }))}>
                          <Area
                            type="monotone"
                            dataKey="v"
                            stroke={SQDCM_LABELS[kpi.category].color}
                            fill="transparent"
                            strokeWidth={1}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CategoryChartIcon() {
  return <BarChart3 size={14} className="text-blue-400" />;
}
