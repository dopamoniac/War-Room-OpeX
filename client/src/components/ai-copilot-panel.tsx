import { useState, useEffect, useRef } from 'react';
import { Bot, X, ChevronRight, Lightbulb, AlertTriangle, FileText, Zap, CheckCircle, Clock, TrendingUp, Copy, RefreshCw } from 'lucide-react';
import { runAIEngine, generateQQOQCCPDraft, generateKaizenDraft, generateReportDraft } from '@/lib/ai-engine';
import type { AIEngineOutput, AIInsight, AIRecommendation, AIKaizenCandidate } from '@/lib/ai-engine';
import { storage } from '@/lib/storage';

type Tab = 'insights' | 'recommendations' | 'drafts' | 'alerts';

interface AICopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentModule?: string;
}

const LEVEL_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  low: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

const LEVEL_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-500',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'text-emerald-400',
  medium: 'text-amber-400',
  low: 'text-zinc-500',
};

const INSIGHT_ICONS: Record<string, typeof Lightbulb> = {
  summary: Zap,
  anomaly: AlertTriangle,
  trend: TrendingUp,
  risk: AlertTriangle,
  opportunity: Lightbulb,
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-0.5 rounded hover:bg-white/5"
      data-testid="button-ai-copy"
    >
      {copied ? <CheckCircle size={10} className="text-emerald-400" /> : <Copy size={10} />}
      {copied ? 'Copié!' : 'Copier'}
    </button>
  );
}

function InsightsTab({ output }: { output: AIEngineOutput }) {
  return (
    <div className="space-y-3">
      <div className="glass rounded-xl p-4 border border-amber-500/20">
        <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest mb-2">Synthèse du jour</p>
        <p className="text-sm text-zinc-300 leading-relaxed">{output.dailySummary}</p>
        <div className="flex justify-end mt-2">
          <CopyButton text={output.dailySummary} />
        </div>
      </div>

      <div className="glass rounded-xl p-4 border border-red-500/20">
        <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-3">Top 3 Risques du Jour</p>
        <div className="space-y-2">
          {output.topThreeRisks.map((risk, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                i === 0 ? 'bg-red-500/20 text-red-400' : i === 1 ? 'bg-orange-500/20 text-orange-400' : 'bg-amber-500/20 text-amber-400'
              }`}>{i + 1}</span>
              <p className="text-xs text-zinc-300 leading-relaxed">{risk}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-xl p-4 border border-blue-500/20">
        <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-3">Support Décision</p>
        <div className="space-y-3">
          <div>
            <p className="text-[10px] text-zinc-500 mb-1">Si aucune action...</p>
            <p className="text-xs text-zinc-400 leading-relaxed italic">{output.decisionSupport.doNothing}</p>
          </div>
          <div className="border-t border-white/5 pt-3">
            <p className="text-[10px] text-emerald-400 mb-1">Action recommandée</p>
            <p className="text-xs text-zinc-300 leading-relaxed">{output.decisionSupport.recommended}</p>
          </div>
        </div>
        <div className="flex justify-end mt-2">
          <CopyButton text={`SI AUCUNE ACTION:\n${output.decisionSupport.doNothing}\n\nRECOMMANDATION:\n${output.decisionSupport.recommended}`} />
        </div>
      </div>

      <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest px-1">Insights Détaillés</p>
      {output.insights.map((insight, i) => {
        const Icon = INSIGHT_ICONS[insight.type] || Lightbulb;
        return (
          <div key={i} className="glass rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                <Icon size={13} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-semibold text-white truncate">{insight.title}</p>
                  <span className={`text-[9px] font-mono flex-shrink-0 ${CONFIDENCE_COLORS[insight.confidence]}`}>
                    {insight.confidence === 'high' ? '● HI' : insight.confidence === 'medium' ? '● MED' : '● LOW'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{insight.body}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecommendationsTab({ output }: { output: AIEngineOutput }) {
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setAccepted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="glass rounded-xl p-3 border border-blue-500/10">
        <p className="text-[10px] text-zinc-500 leading-relaxed">
          L'IA propose des actions basées sur l'analyse des données. Vous pouvez accepter ou ignorer chaque suggestion.
          <span className="text-blue-400"> Toute décision reste sous votre contrôle.</span>
        </p>
      </div>
      {output.recommendations.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle size={32} className="text-emerald-400 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">Aucune recommandation urgente.</p>
          <p className="text-xs text-zinc-600 mt-1">La situation est globalement sous contrôle.</p>
        </div>
      ) : output.recommendations.map((rec) => (
        <div
          key={rec.id}
          className={`glass rounded-xl p-4 border transition-colors ${
            accepted.has(rec.id) ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5'
          }`}
        >
          <div className="flex items-start gap-3">
            <button
              onClick={() => toggle(rec.id)}
              data-testid={`button-ai-accept-${rec.id}`}
              className={`w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                accepted.has(rec.id) ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 hover:border-white/40'
              }`}
            >
              {accepted.has(rec.id) && <CheckCircle size={12} className="text-white" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white mb-1">{rec.action}</p>
              <p className="text-[11px] text-zinc-400 leading-relaxed mb-2">{rec.rationale}</p>
              <div className="flex items-center gap-3 flex-wrap">
                {rec.lean_principle && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-mono">
                    {rec.lean_principle}
                  </span>
                )}
                {rec.deadline && (
                  <span className="flex items-center gap-1 text-[9px] text-amber-400">
                    <Clock size={9} />
                    {rec.deadline}
                  </span>
                )}
                {rec.owner && (
                  <span className="text-[9px] text-zinc-500">{rec.owner}</span>
                )}
              </div>
            </div>
          </div>
          {accepted.has(rec.id) && (
            <div className="mt-2 pt-2 border-t border-emerald-500/20">
              <p className="text-[10px] text-emerald-400">Recommandation acceptée — À transférer dans le plan d'actions.</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

type DraftType = 'qqoqccp' | 'kaizen' | 'report-daily' | 'report-weekly' | 'report-monthly';

function DraftsTab({ output }: { output: AIEngineOutput }) {
  const [selectedDraft, setSelectedDraft] = useState<DraftType | null>(null);
  const [draftContent, setDraftContent] = useState<Record<string, string> | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, string> | null>(null);

  const generateDraft = (type: DraftType) => {
    const abnormalities = storage.getAbnormalities();
    const kpis = storage.getKPIs();
    const actions = storage.getActions();
    const projects = storage.getProjects();

    let content: Record<string, string> = {};
    if (type === 'qqoqccp') {
      const openAbn = abnormalities.find(a => a.status !== 'closed');
      if (openAbn) {
        content = generateQQOQCCPDraft(openAbn);
      } else {
        content = { message: 'Aucune abnormalité ouverte trouvée. Sélectionnez une abnormalité d\'abord.' };
      }
    } else if (type === 'kaizen') {
      const candidate = output.kaizenCandidates[0];
      if (candidate) {
        content = generateKaizenDraft(candidate);
      } else {
        content = { message: 'Aucun candidat Kaizen identifié pour le moment.' };
      }
    } else if (type === 'report-daily') {
      content = generateReportDraft('daily', kpis, actions, abnormalities, projects);
    } else if (type === 'report-weekly') {
      content = generateReportDraft('weekly', kpis, actions, abnormalities, projects);
    } else if (type === 'report-monthly') {
      content = generateReportDraft('monthly', kpis, actions, abnormalities, projects);
    }

    setSelectedDraft(type);
    setDraftContent(content);
    setEditedContent({ ...content });
  };

  const DRAFTS = [
    { type: 'qqoqccp' as DraftType, label: 'Brouillon QQOQCCP', desc: 'Auto-génère un formulaire QQOQCCP à partir d\'une abnormalité ouverte', icon: FileText, color: 'text-orange-400' },
    { type: 'kaizen' as DraftType, label: 'Brouillon Kaizen', desc: 'Génère une fiche Kaizen basée sur les gaspillages et KPIs détectés', icon: Lightbulb, color: 'text-blue-400' },
    { type: 'report-daily' as DraftType, label: 'Rapport Quotidien', desc: 'Rapport DPM quotidien avec synthèse IA des KPIs et abnormalités', icon: FileText, color: 'text-emerald-400' },
    { type: 'report-weekly' as DraftType, label: 'Rapport Hebdomadaire', desc: 'Rapport OPEX hebdomadaire avec recommandations pour la semaine suivante', icon: FileText, color: 'text-purple-400' },
    { type: 'report-monthly' as DraftType, label: 'Rapport Mensuel', desc: 'Rapport de management mensuel avec bilan portfolio et Kaizen', icon: FileText, color: 'text-zinc-300' },
  ];

  if (selectedDraft && editedContent) {
    const fullText = Object.entries(editedContent)
      .map(([k, v]) => `${k.replace(/_/g, ' ').toUpperCase()}:\n${v}`)
      .join('\n\n');

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSelectedDraft(null); setDraftContent(null); setEditedContent(null); }}
            className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
            data-testid="button-ai-back-drafts"
          >
            ← Retour
          </button>
          <span className="text-xs text-zinc-600">|</span>
          <p className="text-xs text-zinc-300 font-semibold">{DRAFTS.find(d => d.type === selectedDraft)?.label}</p>
        </div>

        <div className="glass rounded-xl p-3 border border-blue-500/10">
          <p className="text-[10px] text-zinc-500">Brouillon généré par l'IA — Modifiable avant utilisation. Aucun contenu n'est enregistré automatiquement.</p>
        </div>

        <div className="space-y-2">
          {Object.entries(editedContent).map(([key, value]) => (
            <div key={key} className="glass rounded-lg p-3">
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">
                {key.replace(/_/g, ' ')}
              </p>
              <textarea
                value={value}
                onChange={(e) => setEditedContent(prev => ({ ...prev!, [key]: e.target.value }))}
                className="w-full bg-transparent text-xs text-zinc-300 resize-none outline-none leading-relaxed min-h-[40px]"
                rows={Math.max(1, value.split('\n').length)}
                data-testid={`input-ai-draft-${key}`}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <CopyButton text={fullText} />
          <button
            onClick={() => generateDraft(selectedDraft)}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-0.5 rounded hover:bg-white/5"
            data-testid="button-ai-regenerate"
          >
            <RefreshCw size={10} />
            Regénérer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="glass rounded-xl p-3 border border-blue-500/10">
        <p className="text-[10px] text-zinc-500 leading-relaxed">
          L'IA génère des brouillons basés sur les données actuelles. Chaque brouillon est <span className="text-zinc-300">éditable</span> avant utilisation.
        </p>
      </div>
      {DRAFTS.map((draft) => {
        const Icon = draft.icon;
        return (
          <button
            key={draft.type}
            onClick={() => generateDraft(draft.type)}
            data-testid={`button-ai-draft-${draft.type}`}
            className="w-full glass rounded-xl p-4 text-left hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 group"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-white/10 transition-colors">
                <Icon size={14} className={draft.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white mb-1">{draft.label}</p>
                <p className="text-[11px] text-zinc-500 leading-relaxed">{draft.desc}</p>
              </div>
              <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0 mt-0.5" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function AlertsTab({ output }: { output: AIEngineOutput }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleAlerts = output.alerts.filter(a => !dismissed.has(a.id));
  const criticals = visibleAlerts.filter(a => a.level === 'critical');
  const others = visibleAlerts.filter(a => a.level !== 'critical');

  if (visibleAlerts.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle size={36} className="text-emerald-400 mx-auto mb-3" />
        <p className="text-sm text-zinc-300 font-semibold">Aucune alerte active</p>
        <p className="text-xs text-zinc-500 mt-1">Toutes les alertes ont été traitées.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {criticals.length > 0 && (
        <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest px-1">{criticals.length} Alerte(s) Critique(s)</p>
      )}
      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`glass rounded-xl p-4 border ${LEVEL_COLORS[alert.level]}`}
          data-testid={`alert-${alert.id}`}
        >
          <div className="flex items-start gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${LEVEL_DOT[alert.level]}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white leading-tight">{alert.title}</p>
              <span className={`text-[9px] font-mono uppercase ${
                alert.level === 'critical' ? 'text-red-400' : alert.level === 'high' ? 'text-orange-400' : 'text-amber-400'
              }`}>{alert.module} • {alert.level}</span>
            </div>
            <button
              onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
              className="text-zinc-600 hover:text-zinc-400 flex-shrink-0"
              data-testid={`button-dismiss-${alert.id}`}
            >
              <X size={12} />
            </button>
          </div>
          <div className="space-y-1.5 ml-4">
            <div>
              <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Raison: </span>
              <span className="text-[11px] text-zinc-400">{alert.reason}</span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Impact: </span>
              <span className="text-[11px] text-zinc-400">{alert.impact}</span>
            </div>
            <div>
              <span className="text-[9px] text-emerald-600 uppercase tracking-wider">Action: </span>
              <span className="text-[11px] text-emerald-400">{alert.recommendedAction}</span>
            </div>
            {alert.owner && (
              <div>
                <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Responsable: </span>
                <span className="text-[11px] text-zinc-400">{alert.owner}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AICopilotPanel({ isOpen, onClose, currentModule }: AICopilotPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('insights');
  const [output, setOutput] = useState<AIEngineOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !output) {
      setLoading(true);
      setTimeout(() => {
        setOutput(runAIEngine());
        setLoading(false);
      }, 600);
    }
  }, [isOpen]);

  const refresh = () => {
    setLoading(true);
    setTimeout(() => {
      setOutput(runAIEngine());
      setLoading(false);
    }, 400);
  };

  if (!isOpen) return null;

  const TABS: { key: Tab; label: string; icon: typeof Bot }[] = [
    { key: 'insights', label: 'Insights', icon: Zap },
    { key: 'recommendations', label: 'Actions', icon: ChevronRight },
    { key: 'drafts', label: 'Brouillons', icon: FileText },
    { key: 'alerts', label: 'Alertes', icon: AlertTriangle },
  ];

  const alertCount = output?.alerts.length ?? 0;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        data-testid="ai-copilot-panel"
        className="fixed right-0 top-0 h-screen w-96 z-50 flex flex-col"
        style={{ background: 'rgba(9,9,11,0.97)', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">AI Co-Pilot</p>
              <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">OPEX Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              data-testid="button-ai-refresh"
              title="Actualiser l'analyse"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              data-testid="button-ai-close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex border-b border-white/5 flex-shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                data-testid={`tab-ai-${tab.key}`}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-mono uppercase tracking-wider transition-colors relative ${
                  activeTab === tab.key ? 'text-blue-400' : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                <Icon size={12} />
                <span>{tab.label}</span>
                {tab.key === 'alerts' && alertCount > 0 && (
                  <span className="absolute top-1.5 right-2 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center font-bold">
                    {alertCount}
                  </span>
                )}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-blue-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-4">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <div className="space-y-1 text-center">
                <p className="text-xs text-zinc-400">Analyse en cours...</p>
                <p className="text-[10px] text-zinc-600">L'IA analyse vos données OPEX</p>
              </div>
            </div>
          ) : output ? (
            <>
              {activeTab === 'insights' && <InsightsTab output={output} />}
              {activeTab === 'recommendations' && <RecommendationsTab output={output} />}
              {activeTab === 'drafts' && <DraftsTab output={output} />}
              {activeTab === 'alerts' && <AlertsTab output={output} />}
            </>
          ) : null}
        </div>

        <div className="p-3 border-t border-white/5 flex-shrink-0">
          <p className="text-[9px] text-zinc-700 text-center font-mono">
            IA OPEX Co-Pilot • Propose, ne décide pas • Validation humaine requise
          </p>
        </div>
      </div>
    </>
  );
}
