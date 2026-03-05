import { useState } from 'react';
import { X, Bell, CheckCircle, Clock, AlertTriangle, User, ChevronDown, ChevronUp } from 'lucide-react';
import { runAIEngine } from '@/lib/ai-engine';
import type { AIAlert } from '@/lib/ai-engine';

interface AIAlertsCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const LEVEL_CONFIG: Record<string, { bg: string; border: string; dot: string; label: string }> = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500', label: 'Critique' },
  high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-500', label: 'Élevé' },
  medium: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-500', label: 'Moyen' },
  low: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-400', label: 'Bas' },
};

const MODULE_LABELS: Record<string, string> = {
  warroom: 'War Room',
  kpi: 'KPI Studio',
  abnormality: 'Abnormalités',
  ci: 'CI / Kaizen',
  vsm: 'VSM Studio',
  portfolio: 'Portfolio',
  reports: 'Rapports',
};

function AlertCard({ alert, onAcknowledge, onSnooze, onAssign }: {
  alert: AIAlert;
  onAcknowledge: (id: string) => void;
  onSnooze: (id: string) => void;
  onAssign: (id: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignName, setAssignName] = useState('');
  const cfg = LEVEL_CONFIG[alert.level];

  return (
    <div
      data-testid={`alert-card-${alert.id}`}
      className={`rounded-xl p-4 border ${cfg.bg} ${cfg.border} transition-all duration-200`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${cfg.dot} animate-pulse`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white leading-tight">{alert.title}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${cfg.bg} ${
                  alert.level === 'critical' ? 'text-red-400' :
                  alert.level === 'high' ? 'text-orange-400' :
                  alert.level === 'medium' ? 'text-amber-400' : 'text-blue-400'
                }`}>{cfg.label}</span>
                <span className="text-[9px] text-zinc-600">{MODULE_LABELS[alert.module] || alert.module}</span>
                {alert.assignedTo && (
                  <span className="flex items-center gap-1 text-[9px] text-zinc-500">
                    <User size={8} />
                    {alert.assignedTo}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-zinc-600 hover:text-zinc-400 flex-shrink-0 mt-0.5 transition-colors"
              data-testid={`button-expand-${alert.id}`}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {expanded && (
            <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
              <div>
                <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">Raison</p>
                <p className="text-[11px] text-zinc-400">{alert.reason}</p>
              </div>
              <div>
                <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">Impact</p>
                <p className="text-[11px] text-zinc-400">{alert.impact}</p>
              </div>
              <div>
                <p className="text-[9px] text-emerald-500 uppercase tracking-wider mb-0.5">Action recommandée</p>
                <p className="text-[11px] text-emerald-400">{alert.recommendedAction}</p>
              </div>
              {alert.owner && (
                <div>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">Responsable suggéré</p>
                  <p className="text-[11px] text-zinc-400">{alert.owner}</p>
                </div>
              )}

              {assigning && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    value={assignName}
                    onChange={e => setAssignName(e.target.value)}
                    placeholder="Nom du responsable..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500/50"
                    data-testid={`input-assign-${alert.id}`}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && assignName) {
                        onAssign(alert.id, assignName);
                        setAssigning(false);
                        setAssignName('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (assignName) {
                        onAssign(alert.id, assignName);
                        setAssigning(false);
                        setAssignName('');
                      }
                    }}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                    data-testid={`button-confirm-assign-${alert.id}`}
                  >
                    OK
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button
              onClick={() => onAcknowledge(alert.id)}
              data-testid={`button-ack-${alert.id}`}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <CheckCircle size={10} />
              Acquitter
            </button>
            <button
              onClick={() => onSnooze(alert.id)}
              data-testid={`button-snooze-${alert.id}`}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 transition-colors"
            >
              <Clock size={10} />
              Snooze 1h
            </button>
            <button
              onClick={() => setAssigning(a => !a)}
              data-testid={`button-assign-${alert.id}`}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 transition-colors"
            >
              <User size={10} />
              Assigner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AIAlertsCenter({ isOpen, onClose }: AIAlertsCenterProps) {
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [snoozed, setSnoozed] = useState<Set<string>>(new Set());
  const [assigned, setAssigned] = useState<Record<string, string>>({});
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterModule, setFilterModule] = useState<string>('all');

  if (!isOpen) return null;

  const output = runAIEngine();
  const allAlerts = output.alerts.filter(a => !acknowledged.has(a.id) && !snoozed.has(a.id));

  const filteredAlerts = allAlerts.filter(a => {
    if (filterLevel !== 'all' && a.level !== filterLevel) return false;
    if (filterModule !== 'all' && a.module !== filterModule) return false;
    return true;
  }).map(a => ({
    ...a,
    assignedTo: assigned[a.id] || a.assignedTo,
  }));

  const counts = {
    critical: allAlerts.filter(a => a.level === 'critical').length,
    high: allAlerts.filter(a => a.level === 'high').length,
    medium: allAlerts.filter(a => a.level === 'medium').length,
    low: allAlerts.filter(a => a.level === 'low').length,
  };

  const handleAck = (id: string) => setAcknowledged(prev => new Set([...prev, id]));
  const handleSnooze = (id: string) => setSnoozed(prev => new Set([...prev, id]));
  const handleAssign = (id: string, name: string) => setAssigned(prev => ({ ...prev, [id]: name }));

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div
        data-testid="ai-alerts-center"
        className="fixed inset-y-0 right-0 w-full max-w-xl z-50 flex flex-col"
        style={{ background: 'rgba(9,9,11,0.98)', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell size={20} className="text-zinc-300" />
              {allAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {allAlerts.length}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Centre d'Alertes IA</h2>
              <p className="text-[10px] text-zinc-500">Alertes actives générées par l'IA OPEX</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-2 rounded-lg hover:bg-white/5 transition-colors"
            data-testid="button-close-alerts"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 p-4 border-b border-white/5 flex-shrink-0">
          {[
            { key: 'critical', label: 'Critique', count: counts.critical, color: 'text-red-400 bg-red-500/10' },
            { key: 'high', label: 'Élevé', count: counts.high, color: 'text-orange-400 bg-orange-500/10' },
            { key: 'medium', label: 'Moyen', count: counts.medium, color: 'text-amber-400 bg-amber-500/10' },
            { key: 'low', label: 'Bas', count: counts.low, color: 'text-blue-400 bg-blue-500/10' },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setFilterLevel(filterLevel === item.key ? 'all' : item.key)}
              data-testid={`filter-level-${item.key}`}
              className={`rounded-xl p-3 text-center border transition-colors ${
                filterLevel === item.key
                  ? `${item.color} border-current/30`
                  : 'glass border-transparent hover:border-white/10'
              }`}
            >
              <p className={`text-xl font-bold font-mono ${filterLevel === item.key ? item.color.split(' ')[0] : 'text-white'}`}>
                {item.count}
              </p>
              <p className="text-[9px] text-zinc-500 mt-0.5">{item.label}</p>
            </button>
          ))}
        </div>

        <div className="px-4 py-2 border-b border-white/5 flex-shrink-0 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-zinc-600">Module:</span>
          {['all', 'warroom', 'kpi', 'abnormality', 'vsm', 'portfolio'].map(mod => (
            <button
              key={mod}
              onClick={() => setFilterModule(mod)}
              data-testid={`filter-module-${mod}`}
              className={`text-[10px] px-2 py-1 rounded-lg transition-colors ${
                filterModule === mod
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/5'
              }`}
            >
              {mod === 'all' ? 'Tous' : MODULE_LABELS[mod]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
              <p className="text-sm text-zinc-300 font-semibold">Aucune alerte</p>
              <p className="text-xs text-zinc-600 mt-1">
                {allAlerts.length > 0 ? 'Modifiez les filtres pour voir les alertes.' : 'Toutes les alertes ont été traitées.'}
              </p>
            </div>
          ) : (
            filteredAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAck}
                onSnooze={handleSnooze}
                onAssign={handleAssign}
              />
            ))
          )}
        </div>

        <div className="p-3 border-t border-white/5 flex-shrink-0 flex items-center justify-between">
          <p className="text-[9px] text-zinc-700 font-mono">
            {acknowledged.size} acquittée(s) • {snoozed.size} en snooze
          </p>
          <button
            onClick={() => { setAcknowledged(new Set()); setSnoozed(new Set()); }}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
            data-testid="button-reset-alerts"
          >
            Réinitialiser
          </button>
        </div>
      </div>
    </>
  );
}
