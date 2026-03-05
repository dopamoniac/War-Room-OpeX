import { Link, useLocation } from 'wouter';
import type { Lang } from '@shared/schema';
import { useTranslate } from '@/lib/translations';
import {
  Shield, BarChart3, AlertTriangle, Lightbulb, GitBranch,
  FolderKanban, FileText, Upload, Settings, Globe, X
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', key: 'nav.warroom', icon: Shield },
  { path: '/kpi', key: 'nav.kpi', icon: BarChart3 },
  { path: '/abnormality', key: 'nav.abnormality', icon: AlertTriangle },
  { path: '/ci', key: 'nav.ci', icon: Lightbulb },
  { path: '/vsm', key: 'nav.vsm', icon: GitBranch },
  { path: '/portfolio', key: 'nav.portfolio', icon: FolderKanban },
  { path: '/reports', key: 'nav.reports', icon: FileText },
  { path: '/files', key: 'nav.files', icon: Upload },
  { path: '/admin', key: 'nav.admin', icon: Settings },
];

interface AppSidebarProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function AppSidebar({ lang, onLangChange, isOpen, onClose }: AppSidebarProps) {
  const [location] = useLocation();
  const tr = useTranslate(lang);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        data-testid="app-sidebar"
        className={`w-64 h-screen glass-strong fixed left-0 top-0 z-40 transition-transform duration-300
          ${isOpen ? 'flex flex-col translate-x-0' : 'hidden md:flex md:flex-col md:translate-x-0'}`}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
              LN
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white tracking-wide truncate">{tr('app.title')}</h1>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">{tr('app.subtitle')}</p>
            </div>
          </div>
          <button
            data-testid="button-close-sidebar"
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors shrink-0"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.path || (item.path !== '/' && location.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path} onClick={onClose}>
                <div
                  data-testid={`nav-${item.path.replace('/', '') || 'warroom'}`}
                  className={`flex items-center gap-3 px-4 py-3 md:py-2.5 mx-2 rounded-lg cursor-pointer transition-all duration-200 text-sm ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-blue-400 shrink-0' : 'text-zinc-500 shrink-0'} />
                  <span className="truncate">{tr(item.key)}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/5">
          <button
            data-testid="toggle-lang"
            onClick={() => onLangChange(lang === 'fr' ? 'ar' : 'fr')}
            className="flex items-center gap-2 px-3 py-2.5 md:py-2 w-full rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
          >
            <Globe size={14} />
            <span>{lang === 'fr' ? 'العربية' : 'Français'}</span>
          </button>
          <div className="mt-2 px-3 text-[10px] text-zinc-600 font-mono">
            v2.0 • OPEX Platform
          </div>
        </div>
      </aside>
    </>
  );
}
