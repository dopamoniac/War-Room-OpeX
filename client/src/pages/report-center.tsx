import { useState, useEffect } from 'react';
import type { Lang, ReportRecord } from '@shared/schema';
import { SQDCM_CATEGORIES, SQDCM_LABELS, DEPARTMENTS } from '@shared/schema';
import { useTranslate } from '@/lib/translations';
import { storage } from '@/lib/storage';
import { FileText, Download, Clock, Filter } from 'lucide-react';

interface ReportCenterProps {
  lang: Lang;
}

const REPORT_TYPES = [
  { key: 'sqdcm-summary', label: 'SQDCM Summary', desc: 'Vue d\'ensemble de tous les KPIs SQDCM' },
  { key: 'action-tracker', label: 'Action Tracker', desc: 'Suivi de toutes les actions correctives' },
  { key: 'abnormality-log', label: 'Abnormality Log', desc: 'Journal des abnormalités' },
  { key: 'ci-progress', label: 'CI Progress', desc: 'Progrès des projets d\'amélioration continue' },
  { key: 'vsm-analysis', label: 'VSM Analysis', desc: 'Analyse du Value Stream Mapping' },
  { key: 'project-status', label: 'Project Status', desc: 'Statut du portefeuille projets' },
];

export default function ReportCenter({ lang }: ReportCenterProps) {
  const tr = useTranslate(lang);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');

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
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="text-reports-title" className="text-2xl font-bold text-white">{tr('reports.title')}</h1>
          <p className="text-sm text-zinc-500 mt-1">Génération et historique des rapports</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {REPORT_TYPES.map(rt => (
          <button
            key={rt.key}
            data-testid={`button-report-${rt.key}`}
            onClick={() => generateReport(rt.key)}
            className="glass rounded-xl p-5 text-left hover:bg-white/[0.04] transition-colors group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
                <FileText size={18} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{rt.label}</h3>
                <p className="text-[10px] text-zinc-500">{rt.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-blue-400">
              <Download size={10} />
              <span>{tr('reports.generate')}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Filter size={14} className="text-zinc-500" />
        <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-zinc-300 border border-white/10 outline-none">
          <option value="all">{tr('common.all')} Depts</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Clock size={14} className="text-zinc-400" />
          Historique des rapports
        </h3>
        {reports.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-8">{tr('common.no_data')}</p>
        ) : (
          <div className="space-y-2">
            {reports.map(report => {
              const rt = REPORT_TYPES.find(r => r.key === report.type);
              return (
                <div key={report.id} data-testid={`row-report-${report.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <FileText size={14} className="text-blue-400" />
                  <div className="flex-1">
                    <p className="text-xs text-zinc-300">{rt?.label || report.type}</p>
                    <p className="text-[10px] text-zinc-500">
                      {new Date(report.generatedAt).toLocaleString(lang === 'ar' ? 'ar-TN' : 'fr-FR')} • {report.generatedBy}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-zinc-400">{report.format}</span>
                  <button className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-blue-400">
                    <Download size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
