import type { KPIEntry, Action, Abnormality, CIProject, VSMStep, VSMContext, Project, KaizenCard } from '@shared/schema';
import { storage } from './storage';

export type AlertLevel = 'critical' | 'high' | 'medium' | 'low';
export type AlertModule = 'warroom' | 'kpi' | 'abnormality' | 'ci' | 'vsm' | 'portfolio' | 'reports';

export interface AIAlert {
  id: string;
  level: AlertLevel;
  module: AlertModule;
  title: string;
  reason: string;
  impact: string;
  recommendedAction: string;
  owner?: string;
  deadline?: string;
  acknowledged: boolean;
  snoozedUntil?: string;
  assignedTo?: string;
  kpiId?: string;
  abnormalityId?: string;
  projectId?: string;
}

export interface AIInsight {
  type: 'summary' | 'anomaly' | 'trend' | 'risk' | 'opportunity';
  title: string;
  body: string;
  confidence: 'high' | 'medium' | 'low';
  priority: number;
}

export interface AIRecommendation {
  id: string;
  action: string;
  rationale: string;
  module: AlertModule;
  owner?: string;
  deadline?: string;
  lean_principle?: string;
  accepted?: boolean;
}

export interface AIKPIInsight {
  kpiId: string;
  kpiName: string;
  category: string;
  status: 'green' | 'yellow' | 'red';
  trendDirection: 'improving' | 'stable' | 'deteriorating';
  anomaly: boolean;
  insight: string;
  recommendation: string;
  bestChartType: 'line' | 'bar' | 'area' | 'radial';
  suggestedAggregation: 'daily' | 'weekly' | 'monthly';
}

export interface AIVSMWaste {
  stepId: string;
  stepName: string;
  wasteType: 'inventory' | 'waiting' | 'bottleneck' | 'defects' | 'uptime';
  severity: 'critical' | 'high' | 'medium';
  description: string;
  suggestion: string;
  lean_tool: string;
}

export interface AIProjectRisk {
  projectId: string;
  projectName: string;
  riskType: 'schedule' | 'resource' | 'dependency' | 'budget';
  severity: 'critical' | 'high' | 'medium';
  description: string;
  mitigation: string;
}

export interface AIKaizenCandidate {
  title: string;
  area: string;
  problemStatement: string;
  expectedBenefit: string;
  suggestedTools: string[];
  basedOn: string;
}

export interface AIRootCauseConfidence {
  abnormalityId: string;
  level: 'low' | 'medium' | 'high';
  reason: string;
  missingEvidence: string[];
}

export interface AIEngineOutput {
  alerts: AIAlert[];
  insights: AIInsight[];
  recommendations: AIRecommendation[];
  kpiInsights: AIKPIInsight[];
  vsmWastes: AIVSMWaste[];
  projectRisks: AIProjectRisk[];
  kaizenCandidates: AIKaizenCandidate[];
  rootCauseConfidences: AIRootCauseConfidence[];
  dailySummary: string;
  topThreeRisks: string[];
  decisionSupport: { doNothing: string; recommended: string };
}

function computeAchievement(kpi: KPIEntry): number {
  const isLowerBetter = ['ppm', '%', 'k€', 'kWh/pcs', 'h', 'TF'].includes(kpi.unit)
    && !['First Pass Yield', 'OTD Client', 'OEE Global', 'Productivité main d\'oeuvre',
         'Suggestions améliorations', 'Heures formation', 'Jours sans accident', 'Near Miss reportés'].includes(kpi.name);
  if (isLowerBetter) {
    return kpi.target === 0 ? (kpi.actual === 0 ? 100 : 0) : Math.max(0, (1 - (kpi.actual - kpi.target) / kpi.target) * 100);
  }
  return kpi.target === 0 ? 100 : (kpi.actual / kpi.target) * 100;
}

function getTrend(trend: number[], isLowerBetter: boolean): 'improving' | 'stable' | 'deteriorating' {
  if (trend.length < 2) return 'stable';
  const last = trend[trend.length - 1];
  const prev = trend[trend.length - 2];
  const diff = ((last - prev) / Math.abs(prev || 1)) * 100;
  if (Math.abs(diff) < 2) return 'stable';
  return (isLowerBetter ? diff < 0 : diff > 0) ? 'improving' : 'deteriorating';
}

function detectSpike(trend: number[]): boolean {
  if (trend.length < 3) return false;
  const avg = trend.slice(0, -1).reduce((a, b) => a + b, 0) / (trend.length - 1);
  const last = trend[trend.length - 1];
  return Math.abs(last - avg) > avg * 0.25;
}

let _cachedOutput: AIEngineOutput | null = null;
let _cacheKey = '';

export function runAIEngine(
  overrides?: {
    acknowledgedIds?: string[];
    snoozedIds?: string[];
    assignedMap?: Record<string, string>;
  }
): AIEngineOutput {
  const kpis = storage.getKPIs();
  const actions = storage.getActions();
  const abnormalities = storage.getAbnormalities();
  const ciProjects = storage.getCIProjects();
  const vsmSteps = storage.getVSMCurrent();
  const vsmCtx = storage.getVSMContext();
  const projects = storage.getProjects();
  const kaizenCards = storage.getKaizenCards();

  const alerts: AIAlert[] = [];
  const insights: AIInsight[] = [];
  const recommendations: AIRecommendation[] = [];
  const kpiInsights: AIKPIInsight[] = [];
  const vsmWastes: AIVSMWaste[] = [];
  const projectRisks: AIProjectRisk[] = [];
  const kaizenCandidates: AIKaizenCandidate[] = [];
  const rootCauseConfidences: AIRootCauseConfidence[] = [];

  const acknowledgedIds = new Set(overrides?.acknowledgedIds ?? []);
  const snoozedIds = new Set(overrides?.snoozedIds ?? []);
  const assignedMap = overrides?.assignedMap ?? {};

  let alertCounter = 0;
  function makeAlert(
    level: AlertLevel,
    module: AlertModule,
    title: string,
    reason: string,
    impact: string,
    recommendedAction: string,
    extra?: Partial<AIAlert>
  ): AIAlert {
    alertCounter++;
    const id = `alert-${alertCounter}`;
    return {
      id,
      level,
      module,
      title,
      reason,
      impact,
      recommendedAction,
      acknowledged: acknowledgedIds.has(id),
      snoozedUntil: snoozedIds.has(id) ? new Date(Date.now() + 3600000).toISOString() : undefined,
      assignedTo: assignedMap[id],
      ...extra,
    };
  }

  // === KPI Analysis ===
  const today = new Date();
  const redKPIs: KPIEntry[] = [];
  const yellowKPIs: KPIEntry[] = [];

  for (const kpi of kpis) {
    const achievement = computeAchievement(kpi);
    const status: 'green' | 'yellow' | 'red' = achievement >= 95 ? 'green' : achievement >= 80 ? 'yellow' : 'red';
    const isLowerBetter = ['ppm', '%', 'k€', 'kWh/pcs', 'h', 'TF'].includes(kpi.unit)
      && !['First Pass Yield', 'OTD Client', 'OEE Global', 'Productivité main d\'oeuvre',
           'Suggestions améliorations', 'Heures formation', 'Jours sans accident', 'Near Miss reportés'].includes(kpi.name);
    const trendDir = getTrend(kpi.trend, isLowerBetter);
    const spike = detectSpike(kpi.trend);
    const gap = kpi.actual - kpi.target;
    const gapPct = kpi.target !== 0 ? Math.abs(gap / kpi.target * 100).toFixed(1) : '0';

    let insight = '';
    let recommendation = '';

    if (status === 'red') {
      redKPIs.push(kpi);
      insight = `${kpi.name} est en écart critique de ${gapPct}% par rapport à l'objectif (${kpi.actual} ${kpi.unit} vs cible ${kpi.target} ${kpi.unit}).`;
      recommendation = `Déclencher une réunion QRQC sur ${kpi.name} dans ${kpi.dept}. Analyser les causes via 5-Pourquoi et définir une action de confinement immédiate.`;
      alerts.push(makeAlert(
        'critical', 'kpi',
        `KPI ${kpi.name} hors cible critique`,
        `Écart de ${gapPct}% — Réalisé: ${kpi.actual} ${kpi.unit}, Cible: ${kpi.target} ${kpi.unit}`,
        `Risque d'escalade client si non traité dans 48h. Impact estimé sur SQDCM-${kpi.category}.`,
        `Ouvrir une abnormalité pour ${kpi.name} dans ${kpi.dept}. Désigner un responsable et fixer une date de clôture.`,
        { kpiId: kpi.id, owner: `Responsable ${kpi.dept}` }
      ));
    } else if (status === 'yellow') {
      yellowKPIs.push(kpi);
      insight = `${kpi.name} est en alerte (${gapPct}% d'écart). Tendance ${trendDir === 'improving' ? 'positive mais insuffisante' : trendDir === 'deteriorating' ? 'défavorable' : 'stable'}.`;
      recommendation = `Renforcer le suivi quotidien de ${kpi.name}. Si pas d'amélioration sous 5 jours, escalader au niveau managérial.`;
      if (trendDir === 'deteriorating') {
        alerts.push(makeAlert(
          'high', 'kpi',
          `${kpi.name} en dégradation`,
          `Tendance à la baisse sur les 5 dernières mesures, risque de passage en rouge`,
          `Perte de performance dans ${kpi.dept} avec impact direct sur les objectifs SQDCM-${kpi.category}`,
          `Engager une action corrective préventive sur ${kpi.name} avant passage en rouge`,
          { kpiId: kpi.id }
        ));
      }
    } else {
      insight = `${kpi.name} est conforme aux objectifs (${achievement.toFixed(0)}% de réalisation). ${trendDir === 'improving' ? 'La tendance est positive.' : 'La tendance est stable.'}`;
      recommendation = `Maintenir les bonnes pratiques actuelles et documenter les facteurs de succès pour ${kpi.name}.`;
    }

    if (spike) {
      alerts.push(makeAlert(
        'medium', 'kpi',
        `Spike détecté sur ${kpi.name}`,
        `Variation anormale de plus de 25% par rapport à la moyenne historique`,
        `Nécessite investigation pour distinguer cause réelle d'une erreur de mesure`,
        `Vérifier la source de données pour ${kpi.name} et investiguer l'événement déclencheur`,
        { kpiId: kpi.id }
      ));
    }

    const bestChartType: 'line' | 'bar' | 'area' | 'radial' =
      kpi.trend.length >= 5 ? 'area' :
      kpi.unit === '%' ? 'radial' : 'bar';

    kpiInsights.push({
      kpiId: kpi.id,
      kpiName: kpi.name,
      category: kpi.category,
      status,
      trendDirection: trendDir,
      anomaly: spike || (trendDir === 'deteriorating' && status !== 'green'),
      insight,
      recommendation,
      bestChartType,
      suggestedAggregation: 'weekly',
    });
  }

  // === Abnormality Analysis ===
  const openAbns = abnormalities.filter(a => a.status !== 'closed');
  const criticalAbns = openAbns.filter(a => a.severity === 'critical');
  const overdueActions = actions.filter(a => {
    const due = new Date(a.dueDate);
    return due < today && a.status !== 'completed';
  });

  for (const abn of openAbns) {
    if (abn.severity === 'critical' || abn.severity === 'high') {
      alerts.push(makeAlert(
        abn.severity === 'critical' ? 'critical' : 'high',
        'abnormality',
        `Abnormalité ouverte: ${abn.title}`,
        `Détectée le ${abn.detectedDate} par ${abn.detectedBy}. Statut: ${abn.status}.`,
        `Impact potentiel sur ${abn.category === 'Q' ? 'qualité et satisfaction client' : abn.category === 'S' ? 'sécurité des opérateurs' : 'performance opérationnelle'}`,
        abn.containmentAction
          ? `Vérifier l'efficacité de l'action de confinement: "${abn.containmentAction}"`
          : `Définir immédiatement une action de confinement et désigner un responsable analyse`,
        { abnormalityId: abn.id }
      ));
    }

    const hasRootCause = !!abn.rootCause;
    const hasContainment = !!abn.containmentAction;
    const hasA3 = abn.a3 && Object.keys(abn.a3).length > 0;
    const missing: string[] = [];
    if (!hasRootCause) missing.push('Cause racine non identifiée');
    if (!hasContainment) missing.push('Action de confinement manquante');
    if (!hasA3) missing.push('Analyse A3/QQOQCCP non démarrée');
    if (!abn.linkedActions.length) missing.push('Aucune action corrective liée');

    const evidenceScore = [hasRootCause, hasContainment, hasA3, abn.linkedActions.length > 0].filter(Boolean).length;
    const confidence: 'low' | 'medium' | 'high' = evidenceScore >= 3 ? 'high' : evidenceScore >= 2 ? 'medium' : 'low';

    rootCauseConfidences.push({
      abnormalityId: abn.id,
      level: confidence,
      reason: confidence === 'high'
        ? 'Bonne couverture d\'analyse: cause racine identifiée, confinement en place, actions liées.'
        : confidence === 'medium'
        ? 'Analyse partielle en cours. Quelques éléments manquants pour une résolution complète.'
        : 'Analyse insuffisante. La cause racine n\'est pas encore clairement établie.',
      missingEvidence: missing,
    });

    const similar = abnormalities.filter(a =>
      a.id !== abn.id &&
      a.category === abn.category &&
      a.dept === abn.dept &&
      a.status === 'closed'
    );
    if (similar.length > 0) {
      recommendations.push({
        id: `rec-abn-${abn.id}`,
        action: `Vérifier la récurrence pour "${abn.title}"`,
        rationale: `${similar.length} abnormalité(s) similaire(s) détectée(s) dans ${abn.dept} (même catégorie ${abn.category}). Réutiliser les solutions déjà appliquées.`,
        module: 'abnormality',
        lean_principle: 'PDCA - Act: standardiser les solutions efficaces',
      });
    }
  }

  for (const action of overdueActions) {
    alerts.push(makeAlert(
      'high',
      'warroom',
      `Action en retard: ${action.title}`,
      `Date limite dépassée: ${action.dueDate}. Progression actuelle: ${action.progress}%.`,
      `Risque d'escalade si non résolu. Impact sur objectif ${action.category} du département ${action.dept}.`,
      `Contacter ${action.owner} pour mise à jour. Si bloqué, escalader au responsable de département.`,
      { owner: action.owner }
    ));
  }

  // === VSM Analysis ===
  const taktTime = vsmCtx.taktTime;
  for (const step of vsmSteps) {
    if (step.wip > 100) {
      vsmWastes.push({
        stepId: step.id,
        stepName: step.name,
        wasteType: 'inventory',
        severity: step.wip > 200 ? 'critical' : 'high',
        description: `WIP excessif: ${step.wip} pièces avant l'étape "${step.name}". Représente un risque de surstock et de cash immobilisé.`,
        suggestion: `Implémenter un système Kanban pour limiter le WIP à max ${Math.round(taktTime * 2)} pièces avant "${step.name}". Réduire les tailles de lots.`,
        lean_tool: 'Kanban / One-Piece Flow',
      });
    }
    if (step.cycleTime > taktTime) {
      vsmWastes.push({
        stepId: step.id,
        stepName: step.name,
        wasteType: 'bottleneck',
        severity: step.cycleTime > taktTime * 1.3 ? 'critical' : 'high',
        description: `Goulot d'étranglement: Temps de cycle ${step.cycleTime}s > Takt Time ${taktTime}s à l'étape "${step.name}".`,
        suggestion: `Équilibrage de ligne: déplacer des tâches vers des postes sous-chargés, ou ajouter une ressource. Réduire le CT de ${Math.round(step.cycleTime - taktTime)}s minimum.`,
        lean_tool: 'Line Balancing / SMED',
      });
      alerts.push(makeAlert(
        'high',
        'vsm',
        `Goulot VSM: ${step.name}`,
        `CT=${step.cycleTime}s dépasse le Takt Time de ${taktTime}s`,
        `Risque de non-respect des livraisons client et accumulation de WIP amont`,
        `Lancer un chantier d'équilibrage de ligne ou SMED sur "${step.name}"`,
      ));
    }
    if (step.uptime < 85) {
      vsmWastes.push({
        stepId: step.id,
        stepName: step.name,
        wasteType: 'uptime',
        severity: step.uptime < 75 ? 'critical' : 'high',
        description: `Disponibilité machine insuffisante: ${step.uptime}% à l'étape "${step.name}". Impact direct sur l'OEE.`,
        suggestion: `Déployer la TPM sur l'équipement "${step.name}": maintenance autonome, lubrification, check-lists opérateur.`,
        lean_tool: 'TPM / OEE Improvement',
      });
    }
    if ((step.scrapRate ?? 0) > 2) {
      vsmWastes.push({
        stepId: step.id,
        stepName: step.name,
        wasteType: 'defects',
        severity: 'high',
        description: `Taux de rebut élevé (${step.scrapRate}%) à l'étape "${step.name}".`,
        suggestion: `Implémenter Poka-Yoke ou SPC sur "${step.name}". Analyser les causes via Pareto et 5-Pourquoi.`,
        lean_tool: 'Poka-Yoke / SPC',
      });
    }
  }

  // === Project Risk Analysis ===
  for (const project of projects) {
    if (project.health === 'red' || project.health === 'orange') {
      const endDate = new Date(project.endDate);
      const daysLeft = Math.round((endDate.getTime() - today.getTime()) / 86400000);
      const progressGap = project.progress - (100 - (daysLeft / 180 * 100));

      projectRisks.push({
        projectId: project.id,
        projectName: project.name,
        riskType: 'schedule',
        severity: project.health === 'red' ? 'critical' : 'high',
        description: `Projet "${project.name}" est ${project.health === 'red' ? 'en retard critique' : 'à risque'}. Avancement: ${project.progress}%, ${daysLeft} jours restants.`,
        mitigation: `Organiser un point de pilotage exceptionnel avec ${project.owner}. Revoir le planning et identifier les tâches bloquantes.`,
      });

      alerts.push(makeAlert(
        project.health === 'red' ? 'critical' : 'high',
        'portfolio',
        `Projet à risque: ${project.name}`,
        `Santé: ${project.health.toUpperCase()} — Avancement ${project.progress}% — Délai: ${project.endDate}`,
        `Risque de non-réalisation des gains attendus (${project.expectedSavings.toLocaleString('fr-FR')}€)`,
        `Réunion de pilotage urgente avec ${project.owner}. Replanifier les jalons critiques.`,
        { projectId: project.id, owner: project.owner }
      ));
    }

    const highRisks = project.risks?.filter(r => r.level === 'High') ?? [];
    for (const risk of highRisks) {
      projectRisks.push({
        projectId: project.id,
        projectName: project.name,
        riskType: 'dependency',
        severity: 'high',
        description: `Risque élevé détecté dans "${project.name}": ${risk.description}`,
        mitigation: risk.countermeasure,
      });
    }

    const openActions = project.actions?.filter(a => a.status === 'Open') ?? [];
    const overdueProjectActions = openActions.filter(a => new Date(a.dueDate) < today);
    if (overdueProjectActions.length > 0) {
      projectRisks.push({
        projectId: project.id,
        projectName: project.name,
        riskType: 'schedule',
        severity: 'medium',
        description: `${overdueProjectActions.length} action(s) en retard dans "${project.name}".`,
        mitigation: `Relancer les responsables: ${overdueProjectActions.map(a => a.responsible).join(', ')}.`,
      });
    }
  }

  // === Kaizen Candidates (from recurring abnormalities + VSM bottlenecks) ===
  if (vsmWastes.filter(w => w.wasteType === 'bottleneck').length > 0) {
    const bottleneck = vsmWastes.find(w => w.wasteType === 'bottleneck')!;
    kaizenCandidates.push({
      title: `Réduction CT Goulot: ${bottleneck.stepName}`,
      area: bottleneck.stepName,
      problemStatement: `Le temps de cycle de l'étape "${bottleneck.stepName}" dépasse le Takt Time, créant un goulot d'étranglement et de l'attente.`,
      expectedBenefit: 'Réduction des en-cours, meilleur respect du Takt Time, livraison client améliorée.',
      suggestedTools: ['SMED', 'Équilibrage de ligne', 'Standard Work'],
      basedOn: 'Détection VSM: CT > Takt Time',
    });
  }
  if (criticalAbns.length > 0) {
    const abn = criticalAbns[0];
    kaizenCandidates.push({
      title: `Élimination récurrence: ${abn.title}`,
      area: abn.dept,
      problemStatement: `L'abnormalité critique "${abn.title}" indique un problème systémique dans ${abn.dept} qui nécessite une solution pérenne.`,
      expectedBenefit: 'Élimination définitive du problème, réduction coût qualité, libération temps d\'analyse.',
      suggestedTools: ['Poka-Yoke', 'PDCA', 'Mise à jour SOP'],
      basedOn: `Abnormalité critique ouverte (${abn.category})`,
    });
  }
  if (redKPIs.length > 0) {
    const kpi = redKPIs[0];
    kaizenCandidates.push({
      title: `Amélioration rapide: ${kpi.name}`,
      area: kpi.dept,
      problemStatement: `Le KPI "${kpi.name}" est en dessous de l'objectif. Un chantier Kaizen ciblé pourrait générer une amélioration rapide.`,
      expectedBenefit: `Amélioration de ${kpi.name} vers l'objectif de ${kpi.target} ${kpi.unit}. Impact direct sur le score SQDCM-${kpi.category}.`,
      suggestedTools: ['5S', 'Standard Work', 'Visual Management'],
      basedOn: `KPI ${kpi.name} en rouge (${kpi.actual} vs ${kpi.target} ${kpi.unit})`,
    });
  }

  // === Daily Summary ===
  const redCount = redKPIs.length;
  const yellowCount = yellowKPIs.length;
  const greenCount = kpis.length - redCount - yellowCount;
  const criticalAlertCount = alerts.filter(a => a.level === 'critical').length;

  const dailySummary = `Situation du ${today.toLocaleDateString('fr-FR')}: `
    + `${greenCount} KPI(s) verts, ${yellowCount} en alerte, ${redCount} hors cible. `
    + `${openAbns.length} abnormalité(s) ouverte(s), dont ${criticalAbns.length} critique(s). `
    + `${overdueActions.length} action(s) en retard. `
    + `${criticalAlertCount} alerte(s) critique(s) requièrent une décision immédiate.`;

  // === Top 3 Risks ===
  const topThreeRisks = [
    ...(criticalAbns.length > 0 ? [`Abnormalité critique "${criticalAbns[0].title}" non résolue dans ${criticalAbns[0].dept}`] : []),
    ...(redKPIs.length > 0 ? [`KPI "${redKPIs[0].name}" à ${redKPIs[0].actual} ${redKPIs[0].unit} vs objectif ${redKPIs[0].target} ${redKPIs[0].unit}`] : []),
    ...(projects.filter(p => p.health === 'red').length > 0
      ? [`Projet "${projects.filter(p => p.health === 'red')[0].name}" en retard critique`]
      : overdueActions.length > 0 ? [`${overdueActions.length} action(s) en retard nécessitent une relance`] : []),
    ...(vsmWastes.filter(w => w.severity === 'critical').length > 0
      ? [`Goulot critique VSM: "${vsmWastes.filter(w => w.severity === 'critical')[0].stepName}"`]
      : []),
  ].slice(0, 3);

  while (topThreeRisks.length < 3) {
    topThreeRisks.push('Aucun risque majeur supplémentaire identifié à ce stade.');
  }

  // === Decision Support ===
  const worstKPI = [...kpis].sort((a, b) => computeAchievement(a) - computeAchievement(b))[0];
  const decisionSupport = {
    doNothing: redKPIs.length > 0
      ? `Si aucune action n'est prise sur les KPIs hors cible (notamment "${worstKPI?.name}"), le risque est une escalade client dans les 5 à 10 jours, avec impact direct sur la livraison et la relation fournisseur.`
      : `La situation est globalement sous contrôle. Sans vigilance, le risque est un glissement progressif vers la zone d'alerte.`,
    recommended: redKPIs.length > 0
      ? `Prioriser l'analyse de "${worstKPI?.name}" avec l'équipe ${worstKPI?.dept}. Déclencher une revue SQDCM focalisée et ouvrir une action corrective avec délai maximal de 5 jours.`
      : `Consolider les bonnes pratiques, partager les succès actuels et préparer les objectifs du prochain cycle.`,
  };

  // === Global Recommendations ===
  if (redKPIs.length > 0) {
    recommendations.push({
      id: 'rec-kpi-red',
      action: `Organiser une revue QRQC sur les ${redKPIs.length} KPI(s) hors cible`,
      rationale: `Les KPIs rouges (${redKPIs.map(k => k.name).join(', ')}) requièrent une analyse structurée rapide.`,
      module: 'kpi',
      lean_principle: 'PDCA - Plan: identifier la cause racine avant d\'agir',
    });
  }
  if (overdueActions.length > 0) {
    recommendations.push({
      id: 'rec-overdue',
      action: `Relancer ${overdueActions.length} action(s) en retard`,
      rationale: `Actions dépassées dont: ${overdueActions.slice(0, 2).map(a => `"${a.title}" (${a.owner})`).join(', ')}`,
      module: 'warroom',
      deadline: 'Aujourd\'hui',
      lean_principle: 'PDCA - Check: vérifier l\'avancement et corriger les dérives',
    });
  }
  if (vsmWastes.filter(w => w.severity === 'critical').length > 0) {
    recommendations.push({
      id: 'rec-vsm',
      action: `Lancer un chantier d'amélioration sur le goulot VSM critique`,
      rationale: `Le goulot "${vsmWastes.find(w => w.severity === 'critical')?.stepName}" bloque le flux et génère des retards livraison.`,
      module: 'vsm',
      lean_principle: 'Lean Flow: éliminer les goulots pour améliorer le débit',
    });
  }

  // === Module Insights ===
  insights.push({
    type: 'summary',
    title: 'Synthèse War Room',
    body: dailySummary,
    confidence: 'high',
    priority: 1,
  });
  if (redKPIs.length > 0) {
    insights.push({
      type: 'anomaly',
      title: `${redKPIs.length} KPI(s) en zone rouge`,
      body: `Les indicateurs suivants sont hors cible et nécessitent une attention immédiate: ${redKPIs.map(k => `${k.name} (${k.actual} vs ${k.target} ${k.unit})`).join('; ')}`,
      confidence: 'high',
      priority: 2,
    });
  }
  if (vsmWastes.length > 0) {
    const worst = vsmWastes.filter(w => w.severity === 'critical')[0] || vsmWastes[0];
    insights.push({
      type: 'risk',
      title: 'Gaspillages VSM détectés',
      body: `${vsmWastes.length} gaspillage(s) identifié(s) dans le flux de valeur. Le plus critique: ${worst.description}`,
      confidence: 'high',
      priority: 3,
    });
  }
  if (projects.filter(p => p.health !== 'green').length > 0) {
    insights.push({
      type: 'risk',
      title: 'Projets Portfolio à surveiller',
      body: `${projects.filter(p => p.health === 'red').length} projet(s) en retard critique, ${projects.filter(p => p.health === 'orange').length} à risque. Gains potentiels en jeu: ${projects.filter(p => p.health !== 'green').reduce((s, p) => s + p.expectedSavings - p.realizedSavings, 0).toLocaleString('fr-FR')}€.`,
      confidence: 'high',
      priority: 4,
    });
  }
  if (kaizenCards.filter(k => k.status === 'Best Kaizen').length > 0) {
    insights.push({
      type: 'opportunity',
      title: 'Kaizens Best Practice à répliquer',
      body: `${kaizenCards.filter(k => k.status === 'Best Kaizen').length} Kaizen(s) "Best Kaizen" identifié(s). Opportunité de réplication dans d'autres zones pour maximiser les gains.`,
      confidence: 'medium',
      priority: 5,
    });
  }

  return {
    alerts: alerts.filter(a => !a.acknowledged),
    insights,
    recommendations,
    kpiInsights,
    vsmWastes,
    projectRisks,
    kaizenCandidates,
    rootCauseConfidences,
    dailySummary,
    topThreeRisks,
    decisionSupport,
  };
}

export function generateQQOQCCPDraft(abn: Abnormality): Record<string, string> {
  const date = new Date().toLocaleDateString('fr-FR');
  return {
    qui_operateur: 'À compléter',
    qui_dept: abn.dept,
    qui_equipe: `Équipe ${abn.dept}`,
    quoi_desc: abn.description || abn.title,
    quoi_process: `Process ${abn.dept}`,
    quoi_symptomes: abn.title,
    ou_ligne: abn.dept,
    ou_poste: 'À identifier',
    ou_machine: 'À identifier',
    quand_date: abn.detectedDate,
    quand_heure: '08:00',
    quand_poste: 'Matin',
    comment_sequence: 'Détection lors du contrôle routine',
    comment_conditions: 'Conditions normales de production',
    combien_rebut: abn.category === 'Q' ? 'À quantifier' : 'N/A',
    combien_arret: abn.category === 'D' ? 'À quantifier (min)' : 'N/A',
    combien_retard: abn.category === 'D' ? 'À quantifier (h)' : 'N/A',
    pourquoi_cause: abn.rootCause || 'Cause racine à déterminer via 5-Pourquoi',
    pourquoi_obs: `Détecté par: ${abn.detectedBy}`,
  };
}

export function generateKaizenDraft(candidate: AIKaizenCandidate): Record<string, string> {
  return {
    title: candidate.title,
    area: candidate.area,
    category: 'Productivity',
    problemDescription: candidate.problemStatement,
    solutionDescription: `[À compléter] Approche suggérée: ${candidate.suggestedTools.join(', ')}`,
    expectedBenefit: candidate.expectedBenefit,
    cycleTimeBefore: 'À mesurer',
    cycleTimeAfter: 'À mesurer après amélioration',
    responsiblePerson: 'À désigner',
    implementationDate: new Date(Date.now() + 30 * 86400000).toLocaleDateString('fr-FR'),
    basedOn: candidate.basedOn,
  };
}

export function generateReportDraft(
  reportType: 'daily' | 'weekly' | 'monthly',
  kpis: KPIEntry[],
  actions: Action[],
  abnormalities: Abnormality[],
  projects: Project[]
): Record<string, string> {
  const today = new Date();
  const aiOutput = runAIEngine();
  const redKPIs = aiOutput.kpiInsights.filter(k => k.status === 'red');
  const criticalAbns = abnormalities.filter(a => a.severity === 'critical' && a.status !== 'closed');
  const atRiskProjects = projects.filter(p => p.health !== 'green');

  const executiveSummary = `La performance OPEX du ${today.toLocaleDateString('fr-FR')} montre ${redKPIs.length} indicateur(s) hors cible. `
    + `${criticalAbns.length > 0 ? `${criticalAbns.length} abnormalité(s) critique(s) requièrent une attention immédiate. ` : ''}`
    + `${atRiskProjects.length > 0 ? `${atRiskProjects.length} projet(s) du portfolio sont à risque. ` : ''}`
    + `Score OPEX global: ${Math.round(aiOutput.kpiInsights.reduce((s, k) => s + (k.status === 'green' ? 100 : k.status === 'yellow' ? 85 : 60), 0) / Math.max(1, aiOutput.kpiInsights.length))}%.`;

  const keyNumbers = `KPIs verts: ${aiOutput.kpiInsights.filter(k => k.status === 'green').length} | `
    + `KPIs en alerte: ${aiOutput.kpiInsights.filter(k => k.status === 'yellow').length} | `
    + `KPIs hors cible: ${redKPIs.length} | `
    + `Abnormalités ouvertes: ${abnormalities.filter(a => a.status !== 'closed').length} | `
    + `Actions en retard: ${actions.filter(a => new Date(a.dueDate) < today && a.status !== 'completed').length}`;

  const recommendations = aiOutput.recommendations.slice(0, 3).map((r, i) => `${i + 1}. ${r.action}`).join('\n');

  const actionFollowups = actions.filter(a => a.status !== 'completed')
    .slice(0, 5)
    .map(a => `• ${a.title} — ${a.owner} — Échéance: ${a.dueDate} — ${a.progress}%`)
    .join('\n');

  return {
    type: reportType,
    date: today.toLocaleDateString('fr-FR'),
    executiveSummary,
    keyNumbers,
    kpiHighlights: redKPIs.slice(0, 3).map(k => `• ${k.kpiName}: ${k.insight}`).join('\n') || 'Tous les KPIs sont conformes.',
    majorAbnormalities: criticalAbns.slice(0, 3).map(a => `• [${a.severity.toUpperCase()}] ${a.title} — ${a.dept} — ${a.status}`).join('\n') || 'Aucune abnormalité critique.',
    kaizenAchievements: `${projects.filter(p => p.category === 'Quality' || p.impactType.includes('Kaizen')).length} projets Kaizen en cours. Gains réalisés: ${projects.reduce((s, p) => s + p.realizedSavings, 0).toLocaleString('fr-FR')}€.`,
    portfolioProgress: atRiskProjects.length > 0
      ? `Projets à risque: ${atRiskProjects.map(p => p.name).join(', ')}`
      : 'Tous les projets sont conformes au planning.',
    recommendations,
    actionFollowups,
  };
}
