import { useState, useEffect } from 'react';
import type { Lang, SharedFile, Dept } from '@shared/schema';
import { DEPARTMENTS } from '@shared/schema';
import { useTranslate } from '@/lib/translations';
import { storage } from '@/lib/storage';
import { Upload, Download, Trash2, File, FileText, Image, FileSpreadsheet, Search, FolderOpen } from 'lucide-react';

interface FileSharingProps {
  lang: Lang;
}

const FILE_CATEGORIES = ['Procédures', 'Standards', 'Formations', 'Audits', 'Projets', 'Rapports', 'Autre'];

const FILE_ICONS: Record<string, typeof File> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  png: Image,
  jpg: Image,
  jpeg: Image,
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileSharing({ lang }: FileSharingProps) {
  const tr = useTranslate(lang);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterCat, setFilterCat] = useState<string>('all');

  useEffect(() => {
    setFiles(storage.getFiles());
  }, []);

  const filtered = files.filter(f => {
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterDept !== 'all' && f.dept !== filterDept) return false;
    if (filterCat !== 'all' && f.category !== filterCat) return false;
    return true;
  });

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (!target.files) return;
      const newFiles: SharedFile[] = Array.from(target.files).map(f => ({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: f.name,
        type: f.name.split('.').pop() || 'unknown',
        size: f.size,
        dept: (filterDept !== 'all' ? filterDept : 'P1') as Dept,
        uploadedBy: 'Admin',
        uploadedAt: new Date().toISOString(),
        category: filterCat !== 'all' ? filterCat : 'Autre',
        tags: [],
      }));
      const updated = [...newFiles, ...files];
      setFiles(updated);
      storage.setFiles(updated);
    };
    input.click();
  };

  const handleDelete = (id: string) => {
    const updated = files.filter(f => f.id !== id);
    setFiles(updated);
    storage.setFiles(updated);
  };

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="text-files-title" className="text-2xl font-bold text-white">{tr('files.title')}</h1>
          <p className="text-sm text-zinc-500 mt-1">{files.length} fichiers • {formatSize(files.reduce((s, f) => s + f.size, 0))}</p>
        </div>
        <button data-testid="button-upload" onClick={handleUpload}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
          <Upload size={14} />
          {tr('files.upload')}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input data-testid="input-search-files" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={tr('common.search')}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none focus:border-blue-500" />
        </div>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          className="px-3 py-2 rounded-lg text-xs bg-white/5 text-zinc-300 border border-white/10 outline-none">
          <option value="all">{tr('common.all')} Depts</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="px-3 py-2 rounded-lg text-xs bg-white/5 text-zinc-300 border border-white/10 outline-none">
          <option value="all">{tr('common.all')} Catégories</option>
          {FILE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <FolderOpen size={40} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">{tr('common.no_data')}</p>
          <button onClick={handleUpload} className="mt-3 text-xs text-blue-400 hover:text-blue-300">
            {tr('files.upload')}
          </button>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">Fichier</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">{tr('kpi.dept')}</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">Catégorie</th>
                <th className="text-right py-3 px-4 text-zinc-500 font-medium">{tr('files.size')}</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">Date</th>
                <th className="py-3 px-4 text-zinc-500 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(file => {
                const Icon = FILE_ICONS[file.type] || File;
                return (
                  <tr key={file.id} data-testid={`row-file-${file.id}`} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className="text-blue-400" />
                        <span className="text-zinc-300">{file.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{file.dept}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-zinc-400">{file.category}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-400 font-mono">{formatSize(file.size)}</td>
                    <td className="py-3 px-4 text-zinc-500">{new Date(file.uploadedAt).toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-FR')}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-blue-400"><Download size={12} /></button>
                        <button onClick={() => handleDelete(file.id)} className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-red-400"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
