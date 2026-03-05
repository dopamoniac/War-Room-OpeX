import { useState } from 'react';
import type { Lang } from '@shared/schema';
import { DEPARTMENTS, SQDCM_CATEGORIES, SQDCM_LABELS } from '@shared/schema';
import { useTranslate } from '@/lib/translations';
import { storage } from '@/lib/storage';
import { Settings, Database, Trash2, Download, Upload, Users, Building2, Shield, RefreshCw } from 'lucide-react';

interface AdminProps {
  lang: Lang;
}

export default function Admin({ lang }: AdminProps) {
  const tr = useTranslate(lang);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleExport = () => {
    const data = {
      kpis: storage.getKPIs(),
      actions: storage.getActions(),
      abnormalities: storage.getAbnormalities(),
      ciProjects: storage.getCIProjects(),
      vsmCurrent: storage.getVSMCurrent(),
      vsmFuture: storage.getVSMFuture(),
      vsmContext: storage.getVSMContext(),
      projects: storage.getProjects(),
      files: storage.getFiles(),
      reports: storage.getReports(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leoni-opex-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (!target.files?.length) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.kpis) storage.setKPIs(data.kpis);
          if (data.actions) storage.setActions(data.actions);
          if (data.abnormalities) storage.setAbnormalities(data.abnormalities);
          if (data.ciProjects) storage.setCIProjects(data.ciProjects);
          if (data.vsmCurrent) storage.setVSMCurrent(data.vsmCurrent);
          if (data.vsmFuture) storage.setVSMFuture(data.vsmFuture);
          if (data.vsmContext) storage.setVSMContext(data.vsmContext);
          if (data.projects) storage.setProjects(data.projects);
          if (data.files) storage.setFiles(data.files);
          if (data.reports) storage.setReports(data.reports);
          window.location.reload();
        } catch {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(target.files[0]);
    };
    input.click();
  };

  const handleReset = () => {
    storage.clearAll();
    window.location.reload();
  };

  const dataStats = [
    { label: 'KPIs', count: storage.getKPIs().length, icon: Shield },
    { label: 'Actions', count: storage.getActions().length, icon: RefreshCw },
    { label: 'Abnormalités', count: storage.getAbnormalities().length, icon: Shield },
    { label: 'Projets CI', count: storage.getCIProjects().length, icon: Database },
    { label: 'VSM Steps', count: storage.getVSMCurrent().length, icon: Database },
    { label: 'Projets', count: storage.getProjects().length, icon: Building2 },
    { label: 'Fichiers', count: storage.getFiles().length, icon: Database },
    { label: 'Rapports', count: storage.getReports().length, icon: Database },
  ];

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div>
        <h1 data-testid="text-admin-title" className="text-2xl font-bold text-white">{tr('admin.title')}</h1>
        <p className="text-sm text-zinc-500 mt-1">{tr('admin.data_management')}</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {dataStats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className="text-zinc-500" />
                <span className="text-xs text-zinc-400">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold text-white font-mono">{stat.count}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <Building2 size={14} className="text-blue-400" />
            {tr('admin.departments')}
          </h3>
          <p className="text-xs text-zinc-500 mb-3">Départements configurés dans le système</p>
          <div className="flex flex-wrap gap-2">
            {DEPARTMENTS.map(dept => (
              <span key={dept} className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-zinc-300 border border-white/5">
                {dept}
              </span>
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <Shield size={14} className="text-blue-400" />
            Catégories SQDCM
          </h3>
          <p className="text-xs text-zinc-500 mb-3">Framework d'excellence opérationnelle</p>
          <div className="flex flex-wrap gap-2">
            {SQDCM_CATEGORIES.map(cat => (
              <span key={cat} className="px-3 py-1.5 rounded-lg text-xs border"
                style={{ borderColor: `${SQDCM_LABELS[cat].color}30`, color: SQDCM_LABELS[cat].color, backgroundColor: `${SQDCM_LABELS[cat].color}10` }}>
                {cat} - {SQDCM_LABELS[cat].fr}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Database size={14} className="text-blue-400" />
          {tr('admin.data_management')}
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <button data-testid="button-export" onClick={handleExport}
            className="flex items-center gap-3 p-4 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-colors">
            <Download size={18} className="text-emerald-400" />
            <div className="text-left">
              <p className="text-sm text-white">{tr('admin.export')}</p>
              <p className="text-[10px] text-zinc-500">Exporter toutes les données en JSON</p>
            </div>
          </button>
          <button data-testid="button-import" onClick={handleImport}
            className="flex items-center gap-3 p-4 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-colors">
            <Upload size={18} className="text-blue-400" />
            <div className="text-left">
              <p className="text-sm text-white">{tr('admin.import')}</p>
              <p className="text-[10px] text-zinc-500">Importer depuis un fichier JSON</p>
            </div>
          </button>
          <button data-testid="button-reset" onClick={() => setConfirmReset(true)}
            className="flex items-center gap-3 p-4 rounded-lg bg-white/[0.03] hover:bg-red-500/10 border border-white/5 transition-colors">
            <Trash2 size={18} className="text-red-400" />
            <div className="text-left">
              <p className="text-sm text-white">{tr('admin.reset')}</p>
              <p className="text-[10px] text-zinc-500">Réinitialiser toutes les données</p>
            </div>
          </button>
        </div>
      </div>

      {confirmReset && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setConfirmReset(false)}>
          <div className="glass-strong rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">{tr('common.confirm')}</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Êtes-vous sûr de vouloir réinitialiser toutes les données ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmReset(false)} className="px-4 py-2 text-sm text-zinc-400">{tr('common.cancel')}</button>
              <button data-testid="button-confirm-reset" onClick={handleReset}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors">
                {tr('admin.reset')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
