import { useState } from 'react';
import { Bot, ChevronDown, ChevronUp, X, Lightbulb, AlertTriangle, TrendingUp, Zap, CheckCircle } from 'lucide-react';
import type { AIEngineOutput, AlertModule } from '@/lib/ai-engine';

interface AIInsightCardProps {
  module: AlertModule;
  output: AIEngineOutput;
  onOpenCopilot?: () => void;
}

const MODULE_FOCUS: Record<AlertModule, { title: string; getContent: (output: AIEngineOutput) => { insights: string[]; alerts: string[]; recommendations: string[] } }> = {
  warroom: {
    title: 'War Room',
    getContent: (output) => ({
      insights: output.insights.slice(0, 2).map(i => i.body),
      alerts: output.alerts.filter(a => a.module === 'warroom' || a.level === 'critical').slice(0, 2).map(a => a.title),
      recommendations: output.recommendations.filter(r => r.module === 'warroom').slice(0, 2).map(r => r.action),
    }),
  },
  kpi: {
    title: 'KPI Studio',
    getContent: (output) => ({
      insights: output.kpiInsights.filter(k => k.anomaly).slice(0, 2).map(k => k.insight),
      alerts: output.alerts.filter(a => a.module === 'kpi').slice(0, 2).map(a => a.title),
      recommendations: output.kpiInsights.filter(k => k.status !== 'green').slice(0, 2).map(k => k.recommendation),
    }),
  },
  abnormality: {
    title: 'Abnormalités',
    getContent: (output) => ({
      insights: output.rootCauseConfidences.slice(0, 2).map(r => r.reason),
      alerts: output.alerts.filter(a => a.module === 'abnormality').slice(0, 2).map(a => a.title),
      recommendations: output.recommendations.filter(r => r.module === 'abnormality').slice(0, 2).map(r => r.action),
    }),
  },
  ci: {
    title: 'CI / Kaizen Hub',
    getContent: (output) => ({
      insights: output.kaizenCandidates.slice(0, 2).map(k => `Candidat Kaizen: ${k.title} — ${k.problemStatement.slice(0, 80)}...`),
      alerts: output.alerts.filter(a => a.module === 'ci').slice(0, 2).map(a => a.title),
      recommendations: output.kaizenCandidates.slice(0, 2).map(k => `Lancer Kaizen "${k.title}" — Outils: ${k.suggestedTools.join(', ')}`),
    }),
  },
  vsm: {
    title: 'VSM Studio',
    getContent: (output) => ({
      insights: output.vsmWastes.slice(0, 2).map(w => w.description),
      alerts: output.alerts.filter(a => a.module === 'vsm').slice(0, 2).map(a => a.title),
      recommendations: output.vsmWastes.slice(0, 2).map(w => w.suggestion),
    }),
  },
  portfolio: {
    title: 'Portfolio Projets',
    getContent: (output) => ({
      insights: output.projectRisks.slice(0, 2).map(r => r.description),
      alerts: output.alerts.filter(a => a.module === 'portfolio').slice(0, 2).map(a => a.title),
      recommendations: output.projectRisks.slice(0, 2).map(r => r.mitigation),
    }),
  },
  reports: {
    title: 'Rapports',
    getContent: (output) => ({
      insights: [output.dailySummary.slice(0, 150) + '...'],
      alerts: output.alerts.filter(a => a.level === 'critical').slice(0, 2).map(a => a.title),
      recommendations: ['Générer le rapport quotidien avec synthèse IA', 'Planifier le rapport hebdomadaire OPEX'],
    }),
  },
};

export default function AIInsightCard({ module, output, onOpenCopilot }: AIInsightCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const config = MODULE_FOCUS[module];
  const content = config.getContent(output);

  const moduleAlerts = output.alerts.filter(a => a.module === module || a.level === 'critical');
  const criticalCount = moduleAlerts.filter(a => a.level === 'critical').length;
  const highCount = moduleAlerts.filter(a => a.level === 'high').length;
  const totalAlerts = moduleAlerts.length;

  const hasContent = content.insights.length > 0 || content.alerts.length > 0 || content.recommendations.length > 0;
  if (!hasContent && totalAlerts === 0) return null;

  return (
    <div
      data-testid={`ai-insight-card-${module}`}
      className={`rounded-xl border transition-all duration-300 overflow-hidden ${
        criticalCount > 0
          ? 'bg-red-500/5 border-red-500/20'
          : highCount > 0
          ? 'bg-orange-500/5 border-orange-500/20'
          : 'bg-blue-500/5 border-blue-500/15'
      }`}
    >
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
          criticalCount > 0 ? 'bg-red-500/20' : highCount > 0 ? 'bg-orange-500/20' : 'bg-blue-600/20'
        }`}>
          <Bot size={13} className={
            criticalCount > 0 ? 'text-red-400' : highCount > 0 ? 'text-orange-400' : 'text-blue-400'
          } />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-[10px] font-mono uppercase tracking-widest ${
              criticalCount > 0 ? 'text-red-400' : highCount > 0 ? 'text-orange-400' : 'text-blue-400'
            }`}>AI Co-Pilot • {config.title}</p>
            {criticalCount > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-mono">
                {criticalCount} critique
              </span>
            )}
            {highCount > 0 && criticalCount === 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-mono">
                {highCount} alerte
              </span>
            )}
          </div>
          {!expanded && content.insights[0] && (
            <p className="text-[11px] text-zinc-500 truncate mt-0.5">{content.insights[0]}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(ex => !ex); }}
            className="text-zinc-600 hover:text-zinc-400 p-1 transition-colors"
            data-testid={`button-expand-ai-${module}`}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
            className="text-zinc-700 hover:text-zinc-500 p-1 transition-colors"
            data-testid={`button-dismiss-ai-${module}`}
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
          {content.alerts.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-mono text-red-400 uppercase tracking-widest flex items-center gap-1">
                <AlertTriangle size={9} /> Alertes Actives
              </p>
              {content.alerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                  <p className="text-[11px] text-zinc-300">{alert}</p>
                </div>
              ))}
            </div>
          )}

          {content.insights.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-mono text-blue-400 uppercase tracking-widest flex items-center gap-1">
                <Zap size={9} /> Insights
              </p>
              {content.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          )}

          {content.recommendations.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                <CheckCircle size={9} /> Recommandations
              </p>
              {content.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          )}

          {onOpenCopilot && (
            <button
              onClick={onOpenCopilot}
              data-testid={`button-open-copilot-${module}`}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-xs transition-colors border border-blue-500/20 mt-2"
            >
              <Bot size={12} />
              Ouvrir AI Co-Pilot complet
            </button>
          )}
        </div>
      )}
    </div>
  );
}
