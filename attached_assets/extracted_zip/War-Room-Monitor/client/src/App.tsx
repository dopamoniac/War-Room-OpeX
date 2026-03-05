import { useState, useEffect } from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Lang } from '@shared/schema';
import { storage } from '@/lib/storage';
import { initializeData } from '@/lib/initial-data';
import AppSidebar from '@/components/app-sidebar';
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

initializeData();

function App() {
  const [lang, setLang] = useState<Lang>(storage.getLang());

  useEffect(() => {
    storage.setLang(lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="flex min-h-screen bg-background">
          <AppSidebar lang={lang} onLangChange={setLang} />
          <main className="flex-1 ml-64 p-6 overflow-y-auto">
            <Switch>
              <Route path="/">
                <WarRoom lang={lang} />
              </Route>
              <Route path="/kpi">
                <KPIStudio lang={lang} />
              </Route>
              <Route path="/abnormality">
                <AbnormalityActions lang={lang} />
              </Route>
              <Route path="/ci">
                <CIHub lang={lang} />
              </Route>
              <Route path="/ci/kaizen/:id">
                {(params) => <KaizenCardDetail id={params.id} lang={lang} />}
              </Route>
              <Route path="/vsm">
                <VSMStudio lang={lang} />
              </Route>
              <Route path="/portfolio">
                <ProjectPortfolio lang={lang} />
              </Route>
              <Route path="/portfolio/:id">
                {(params) => <ProjectDetail id={params.id} lang={lang} />}
              </Route>
              <Route path="/reports">
                <ReportCenter lang={lang} />
              </Route>
              <Route path="/files">
                <FileSharing lang={lang} />
              </Route>
              <Route path="/admin">
                <Admin lang={lang} />
              </Route>
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
