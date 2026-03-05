import { useState, useEffect, useMemo } from 'react';
import { runAIEngine } from '@/lib/ai-engine';
import AIInsightCard from '@/components/ai-insight-card';
import type { Lang, ReportRecord } from '@shared/schema';
import { SQDCM_CATEGORIES, SQDCM_LABELS, DEPARTMENTS } from '@shared/schema';
import { useTranslate } from '@/lib/translations';
import { storage } from '@/lib/storage';
import { FileText, Download, Clock, Filter } from 'lucide-react';

interface ReportCenterProps {
  lang: Lang;
  onOpenAI?: () => void;
}

const REPORT_TYPES = [
  { key: 'sqdcm-summary', label: 'SQDCM Summary', desc: 'Vue d\'ensemble de tous les KPIs SQDCM' },
  { key: 'action-tracker', label: 'Action Tracker', desc: 'Suivi de toutes les actions correctives' },
  { key: 'abnormality-log', label: 'Abnormality Log', desc: 'Journal des abnormalités' },
  { key: 'ci-progress', label: 'CI Progress', desc: 'Progrès des projets d\'amélioration continue' },
  { key: 'vsm-analysis', label: 'VSM Analysis', desc: 'Analyse du Value Stream Mapping' },
  { key: 'project-status', label: 'Project Status', desc: 'Statut du portefeuille projets' },
];

export default function ReportCenter({ lang, onOpenAI }: ReportCenterProps) {
  const tr = useTranslate(lang);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const aiOutput = useMemo(() => runAIEngine(), []);

  useEffect(() => {
    setReports(storage.getReports());
  }, []);

  const generateReport = (type: string) => {
    const record: ReportRecord = {
      id: `rpt-${Date.now()}`,
      type,
      generatedAt: new Date().toISOString(),
      generatedBy: 'Admin',
      format: 'PDF',
      filters: { dept: selectedDept },
    };
    const updated = [record, ...reports];
    setReports(updated);
    storage.setReports(updated);
  };

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <AIInsightCard module="reports" output={aiOutput} onOpenCopilot={onOpenAI} />
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="text-reports-title" className="text-2xl font-bold text-white">{tr('reports.title')}</h1>
          <p className="text-sm text-zinc-500 mt-1">Génération et historique des rapports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map(rt => (
          <button
            key={rt.key}
            data-testid={`button-report-${rt.key}`}
            onClick={() => generateReport(rt.key)}
            className="glass rounded-xl p-5 text-left hover:bg-white/[0.04] transition-colors group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText size={16} className="text-blue-400" />
              </div>
              <Download size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </div>
            <div className="text-sm font-semibold text-white mb-1">{rt.label}</div>
            <div className="text-xs text-zinc-500">{rt.desc}</div>
          </button>
        ))}
      </div>

      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-3 mb-4">
          <Filter size={14} className="text-zinc-500" />
          <span className="text-sm text-zinc-400">Filtres</span>
          <select
            data-testid="select-filter-dept"
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="ml-auto px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-300 outline-none"
          >
            <option value="all">Tous les départements</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Clock size={14} className="text-zinc-500" />
          Historique des rapports générés
        </h3>
        {reports.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-8">Aucun rapport généré</p>
        ) : (
          <div className="space-y-2">
            {reports.map(r => (
              <div key={r.id} data-testid={`row-report-${r.id}`} className="flex items-center justify-between p-3 rounded-lg bg-white/3 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText size={14} className="text-blue-400" />
                  <div>
                    <div className="text-sm text-white">{REPORT_TYPES.find(rt => rt.key === r.type)?.label || r.type}</div>
                    <div className="text-xs text-zinc-500">{new Date(r.generatedAt).toLocaleString('fr-FR')} • {r.generatedBy}</div>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/10">{r.format}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
