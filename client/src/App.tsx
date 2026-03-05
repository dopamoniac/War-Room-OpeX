import { useState, useEffect } from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Lang } from '@shared/schema';
import { storage } from '@/lib/storage';
import { initializeData } from '@/lib/initial-data';
import { runAIEngine } from '@/lib/ai-engine';
import { auth } from '@/lib/auth';
import AppSidebar from '@/components/app-sidebar';
import AICopilotPanel from '@/components/ai-copilot-panel';
import AIAlertsCenter from '@/components/ai-alerts-center';
import Login from '@/pages/login';
import WarRoom from '@/pages/war-room';
import KPIStudio from '@/pages/kpi-studio';
import AbnormalityActions from '@/pages/abnormality-actions';
import CIHub from '@/pages/ci-hub';
import KaizenCardDetail from '@/pages/kaizen-card-detail';
import VSMStudio from '@/pages/vsm-studio';
import ProjectPortfolio from '@/pages/project-portfolio';
import ProjectDetail from '@/pages/project-detail';
import ReportCenter from '@/pages/report-center';
import FileSharing from '@/pages/file-sharing';
import Admin from '@/pages/admin';
import NotFound from "@/pages/not-found";
import { Bot, Bell, LogOut, User } from 'lucide-react';

initializeData();

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => auth.isAuthenticated());
  const [lang, setLang] = useState<Lang>(storage.getLang());
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [alertsCenterOpen, setAlertsCenterOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    storage.setLang(lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const updateAlerts = () => {
      const output = runAIEngine();
      setAlertCount(output.alerts.filter(a => a.level === 'critical' || a.level === 'high').length);
    };
    updateAlerts();
    const interval = setInterval(updateAlerts, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    auth.logout();
    setIsAuthenticated(false);
    setAiPanelOpen(false);
    setAlertsCenterOpen(false);
  };

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Login onLogin={handleLogin} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  const session = auth.getSession();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="flex min-h-screen bg-background">
          <AppSidebar lang={lang} onLangChange={setLang} />
          <main className="flex-1 ml-64 overflow-y-auto">
            <div className="sticky top-0 z-30 flex items-center justify-end gap-2 px-6 py-2 border-b border-white/5"
              style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)' }}>

              {session && (
                <div className="flex items-center gap-1.5 mr-1">
                  <User size={12} className="text-zinc-600" />
                  <span data-testid="text-logged-user" className="text-xs text-zinc-500 font-medium">{session.username}</span>
                </div>
              )}

              <button
                data-testid="button-ai-alerts"
                onClick={() => setAlertsCenterOpen(true)}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
              >
                <Bell size={14} />
                <span className="hidden sm:inline">Alertes</span>
                {alertCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                    {alertCount}
                  </span>
                )}
              </button>

              <button
                data-testid="button-ai-copilot"
                onClick={() => setAiPanelOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 transition-colors text-xs"
              >
                <Bot size={14} />
                <span>AI Co-Pilot</span>
              </button>

              <button
                data-testid="button-logout"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-colors border border-white/5 hover:border-red-500/20"
                title="Déconnexion"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>

            <div className="p-6">
              <Switch>
                <Route path="/">
                  <WarRoom lang={lang} onOpenAI={() => setAiPanelOpen(true)} />
                </Route>
                <Route path="/kpi">
                  <KPIStudio lang={lang} onOpenAI={() => setAiPanelOpen(true)} />
                </Route>
                <Route path="/abnormality">
                  <AbnormalityActions lang={lang} onOpenAI={() => setAiPanelOpen(true)} />
                </Route>
                <Route path="/ci">
                  <CIHub lang={lang} onOpenAI={() => setAiPanelOpen(true)} />
                </Route>
                <Route path="/ci/kaizen/:id">
                  {(params) => <KaizenCardDetail id={params.id} lang={lang} />}
                </Route>
                <Route path="/vsm">
                  <VSMStudio lang={lang} onOpenAI={() => setAiPanelOpen(true)} />
                </Route>
                <Route path="/portfolio">
                  <ProjectPortfolio lang={lang} onOpenAI={() => setAiPanelOpen(true)} />
                </Route>
                <Route path="/portfolio/:id">
                  {(params) => <ProjectDetail id={params.id} lang={lang} onOpenAI={() => setAiPanelOpen(true)} />}
                </Route>
                <Route path="/reports">
                  <ReportCenter lang={lang} onOpenAI={() => setAiPanelOpen(true)} />
                </Route>
                <Route path="/files">
                  <FileSharing lang={lang} />
                </Route>
                <Route path="/admin">
                  <Admin lang={lang} />
                </Route>
                <Route component={NotFound} />
              </Switch>
            </div>
          </main>
        </div>

        <AICopilotPanel
          isOpen={aiPanelOpen}
          onClose={() => setAiPanelOpen(false)}
        />
        <AIAlertsCenter
          isOpen={alertsCenterOpen}
          onClose={() => setAlertsCenterOpen(false)}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
