import { Link, useLocation } from 'wouter';
import type { Lang } from '@shared/schema';
import { useTranslate } from '@/lib/translations';
import {
  Shield, BarChart3, AlertTriangle, Lightbulb, GitBranch,
  FolderKanban, FileText, Upload, Settings, Globe
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
}

export default function AppSidebar({ lang, onLangChange }: AppSidebarProps) {
  const [location] = useLocation();
  const tr = useTranslate(lang);

  return (
    <aside
      data-testid="app-sidebar"
      className="w-64 h-screen flex flex-col glass-strong fixed left-0 top-0 z-40"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
            LN
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">{tr('app.title')}</h1>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">{tr('app.subtitle')}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.path || (item.path !== '/' && location.startsWith(item.path));
          const Icon = item.icon;
          return (
            <Link key={item.path} href={item.path}>
              <div
                data-testid={`nav-${item.path.replace('/', '') || 'warroom'}`}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg cursor-pointer transition-all duration-200 text-sm ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-blue-400' : 'text-zinc-500'} />
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
          className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
        >
          <Globe size={14} />
          <span>{lang === 'fr' ? 'العربية' : 'Français'}</span>
        </button>
        <div className="mt-2 px-3 text-[10px] text-zinc-600 font-mono">
          v2.0 • OPEX Platform
        </div>
      </div>
    </aside>
  );
}
