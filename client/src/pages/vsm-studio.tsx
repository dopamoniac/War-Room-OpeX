import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { runAIEngine } from '@/lib/ai-engine';
import AIInsightCard from '@/components/ai-insight-card';
import type { Lang, VSMStep, VSMContext, Dept } from '@shared/schema';
import { DEPARTMENTS } from '@shared/schema';
import { useTranslate } from '@/lib/translations';
import { storage } from '@/lib/storage';
import { Plus, X, Save, ArrowRight, Users, Settings, Printer, ZoomIn, ZoomOut, Maximize2, Trash2, RotateCcw, AlertTriangle, TrendingDown, Package, Wrench, Lightbulb, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface VSMStudioProps {
  lang: Lang;
  onOpenAI?: () => void;
}

interface PosterStep {
  id: string;
  name: string;
  cycleTime: number;
  operators: number;
  wip: number;
  scrapRate: number;
  leadTime: number;
  valueAddedTime: number;
}

interface PosterLane {
  id: string;
  label: string;
  zoneName: string;
  color: string;
  headerColor: string;
  steps: PosterStep[];
  hasRedOutline: boolean;
  hasQG: boolean;
}

interface PosterLegendItem {
  id: string;
  label: string;
  color: string;
}

interface VSMPosterData {
  title: string;
  supplierName: string;
  clientName: string;
  productionControlTitle: string;
  controlSystem1: string;
  controlSystem2: string;
  planningLabels: string[];
  lanes: PosterLane[];
  legend: PosterLegendItem[];
  magasinLabel: string;
}

const DEFAULT_POSTER: VSMPosterData = {
  title: 'VSM Production VOWA MEB Asuve (Ligne 5)',
  supplierName: 'Fournisseur',
  clientName: 'Client',
  productionControlTitle: 'Production Contrôle',
  controlSystem1: 'Système ERP',
  controlSystem2: 'Dents De Scie',
  planningLabels: ['Planning', 'Planning', 'Planning', 'Planning'],
  lanes: [
    {
      id: 'lane-1',
      label: 'Ligne Encliquetage & Lancement',
      zoneName: 'Zone Encliquetage et Lancement',
      color: '#3498db',
      headerColor: '#2471a3',
      hasRedOutline: false,
      hasQG: false,
      steps: [
        { id: 'e1', name: 'Coupe', cycleTime: 2.15, operators: 1, wip: 5, scrapRate: 0.5, leadTime: 8.0, valueAddedTime: 2.15 },
        { id: 'e2', name: 'Dénud.', cycleTime: 1.85, operators: 2, wip: 8, scrapRate: 0.3, leadTime: 6.5, valueAddedTime: 1.85 },
        { id: 'e3', name: 'Sertiss.1', cycleTime: 2.40, operators: 1, wip: 3, scrapRate: 0.8, leadTime: 7.0, valueAddedTime: 2.40 },
        { id: 'e4', name: 'Sertiss.2', cycleTime: 3.10, operators: 2, wip: 12, scrapRate: 0.6, leadTime: 9.5, valueAddedTime: 3.10 },
        { id: 'e5', name: 'Encliqu.1', cycleTime: 1.95, operators: 1, wip: 6, scrapRate: 0.4, leadTime: 5.5, valueAddedTime: 1.95 },
        { id: 'e6', name: 'Encliqu.2', cycleTime: 2.65, operators: 1, wip: 4, scrapRate: 0.5, leadTime: 7.5, valueAddedTime: 2.65 },
        { id: 'e7', name: 'Encliqu.3', cycleTime: 2.30, operators: 2, wip: 9, scrapRate: 0.3, leadTime: 8.0, valueAddedTime: 2.30 },
        { id: 'e8', name: 'Encliqu.4', cycleTime: 1.70, operators: 1, wip: 7, scrapRate: 0.2, leadTime: 5.0, valueAddedTime: 1.70 },
        { id: 'e9', name: 'Encliqu.5', cycleTime: 2.55, operators: 2, wip: 11, scrapRate: 0.7, leadTime: 8.5, valueAddedTime: 2.55 },
        { id: 'e10', name: 'Encliqu.6', cycleTime: 3.05, operators: 1, wip: 3, scrapRate: 0.4, leadTime: 9.0, valueAddedTime: 3.05 },
        { id: 'e11', name: 'Lancement', cycleTime: 2.20, operators: 1, wip: 8, scrapRate: 0.3, leadTime: 7.0, valueAddedTime: 2.20 },
        { id: 'e12', name: 'Pré-assy', cycleTime: 1.90, operators: 2, wip: 5, scrapRate: 0.5, leadTime: 6.0, valueAddedTime: 1.90 },
        { id: 'e13', name: 'Vérif.', cycleTime: 2.75, operators: 1, wip: 10, scrapRate: 0.6, leadTime: 8.5, valueAddedTime: 2.75 },
        { id: 'e14', name: 'Marquage', cycleTime: 2.45, operators: 2, wip: 6, scrapRate: 0.2, leadTime: 7.5, valueAddedTime: 2.45 },
      ],
    },
    {
      id: 'lane-2',
      label: 'Ligne Bondage',
      zoneName: 'Zone Bondage',
      color: '#e67e22',
      headerColor: '#d35400',
      hasRedOutline: false,
      hasQG: true,
      steps: [
        { id: 'b1', name: 'Bond.1', cycleTime: 2.80, operators: 2, wip: 7, scrapRate: 0.4, leadTime: 8.0, valueAddedTime: 2.80 },
        { id: 'b2', name: 'Bond.2', cycleTime: 3.25, operators: 1, wip: 4, scrapRate: 0.6, leadTime: 9.5, valueAddedTime: 3.25 },
        { id: 'b3', name: 'Bond.3', cycleTime: 2.10, operators: 2, wip: 10, scrapRate: 0.3, leadTime: 6.5, valueAddedTime: 2.10 },
        { id: 'b4', name: 'Bond.4', cycleTime: 1.95, operators: 1, wip: 6, scrapRate: 0.5, leadTime: 5.5, valueAddedTime: 1.95 },
        { id: 'b5', name: 'Bond.5', cycleTime: 2.50, operators: 1, wip: 8, scrapRate: 0.4, leadTime: 7.5, valueAddedTime: 2.50 },
        { id: 'b6', name: 'Bond.6', cycleTime: 3.40, operators: 2, wip: 3, scrapRate: 0.7, leadTime: 10.0, valueAddedTime: 3.40 },
        { id: 'b7', name: 'Bond.7', cycleTime: 2.70, operators: 1, wip: 9, scrapRate: 0.3, leadTime: 8.0, valueAddedTime: 2.70 },
        { id: 'b8', name: 'Bond.8', cycleTime: 1.80, operators: 2, wip: 5, scrapRate: 0.2, leadTime: 5.0, valueAddedTime: 1.80 },
        { id: 'b9', name: 'Bond.9', cycleTime: 2.35, operators: 1, wip: 11, scrapRate: 0.5, leadTime: 7.0, valueAddedTime: 2.35 },
        { id: 'b10', name: 'Bond.10', cycleTime: 3.15, operators: 2, wip: 4, scrapRate: 0.6, leadTime: 9.5, valueAddedTime: 3.15 },
        { id: 'b11', name: 'Bond.11', cycleTime: 2.60, operators: 1, wip: 7, scrapRate: 0.4, leadTime: 7.5, valueAddedTime: 2.60 },
        { id: 'b12', name: 'Bond.12', cycleTime: 2.05, operators: 1, wip: 6, scrapRate: 0.3, leadTime: 6.0, valueAddedTime: 2.05 },
      ],
    },
    {
      id: 'lane-3',
      label: 'Ligne Montage Clips & Circuit',
      zoneName: 'Zone Montage de clips et QG',
      color: '#27ae60',
      headerColor: '#1e8449',
      hasRedOutline: true,
      hasQG: false,
      steps: [
        { id: 'm1', name: 'Clip.1', cycleTime: 2.45, operators: 1, wip: 6, scrapRate: 0.4, leadTime: 7.5, valueAddedTime: 2.45 },
        { id: 'm2', name: 'Clip.2', cycleTime: 1.90, operators: 2, wip: 9, scrapRate: 0.3, leadTime: 6.0, valueAddedTime: 1.90 },
        { id: 'm3', name: 'Clip.3', cycleTime: 3.05, operators: 1, wip: 4, scrapRate: 0.6, leadTime: 9.0, valueAddedTime: 3.05 },
        { id: 'm4', name: 'Clip.4', cycleTime: 2.20, operators: 1, wip: 8, scrapRate: 0.5, leadTime: 7.0, valueAddedTime: 2.20 },
        { id: 'm5', name: 'Clip.5', cycleTime: 2.75, operators: 2, wip: 5, scrapRate: 0.4, leadTime: 8.5, valueAddedTime: 2.75 },
        { id: 'm6', name: 'Mont.1', cycleTime: 1.85, operators: 1, wip: 10, scrapRate: 0.3, leadTime: 5.5, valueAddedTime: 1.85 },
        { id: 'm7', name: 'Mont.2', cycleTime: 2.60, operators: 2, wip: 3, scrapRate: 0.7, leadTime: 8.0, valueAddedTime: 2.60 },
        { id: 'm8', name: 'Mont.3', cycleTime: 3.30, operators: 1, wip: 7, scrapRate: 0.5, leadTime: 10.0, valueAddedTime: 3.30 },
        { id: 'm9', name: 'Circuit.1', cycleTime: 2.15, operators: 1, wip: 11, scrapRate: 0.4, leadTime: 6.5, valueAddedTime: 2.15 },
        { id: 'm10', name: 'Circuit.2', cycleTime: 2.50, operators: 2, wip: 6, scrapRate: 0.6, leadTime: 7.5, valueAddedTime: 2.50 },
        { id: 'm11', name: 'Circuit.3', cycleTime: 1.95, operators: 1, wip: 4, scrapRate: 0.3, leadTime: 6.0, valueAddedTime: 1.95 },
      ],
    },
  ],
  legend: [
    { id: 'leg-1', label: 'Zone Encliquetage et Lancement', color: '#3498db' },
    { id: 'leg-2', label: 'Zone Bondage', color: '#e67e22' },
    { id: 'leg-3', label: 'Zone Montage de clips et QG', color: '#27ae60' },
    { id: 'leg-4', label: 'Zone Circuit', color: '#8e44ad' },
  ],
  magasinLabel: 'Magasin Export',
};

function InlineEdit({ value, onChange, type = 'text', style, className }: {
  value: string | number;
  onChange: (val: string) => void;
  type?: 'text' | 'number';
  style?: React.CSSProperties;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(String(value)); }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.select(); }, [editing]);

  if (!editing) {
    return (
      <span
        data-testid="inline-edit-display"
        onDoubleClick={() => setEditing(true)}
        style={{ ...style, cursor: 'pointer', borderBottom: '1px dashed rgba(0,0,0,0.2)', minWidth: '20px', display: 'inline-block' }}
        className={className}
        title="Double-click to edit"
      >
        {value}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      data-testid="inline-edit-input"
      type={type}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { onChange(draft); setEditing(false); }}
      onKeyDown={e => { if (e.key === 'Enter') { onChange(draft); setEditing(false); } if (e.key === 'Escape') setEditing(false); }}
      style={{
        ...style,
        background: '#fff8dc',
        border: '2px solid #3498db',
        borderRadius: '3px',
        outline: 'none',
        padding: '0 3px',
        width: type === 'number' ? '50px' : `${Math.max(60, String(draft).length * 8)}px`,
        fontFamily: 'inherit',
        fontSize: 'inherit',
        fontWeight: 'inherit',
        color: 'inherit',
      }}
    />
  );
}

function VSMPoster() {
  const posterRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.55);
  const [data, setData] = useState<VSMPosterData>(() => {
    const saved = storage.getVSMPoster();
    return saved || { ...DEFAULT_POSTER };
  });
  const [dragState, setDragState] = useState<{ laneId: string; stepIdx: number } | null>(null);
  const [selectedStep, setSelectedStep] = useState<{ laneId: string; stepId: string } | null>(null);
  const [showAddLane, setShowAddLane] = useState(false);
  const [newLaneForm, setNewLaneForm] = useState({ label: '', color: '#3498db' });

  const save = useCallback((updated: VSMPosterData) => {
    setData(updated);
    storage.setVSMPoster(updated);
  }, []);

  const updateField = useCallback(<K extends keyof VSMPosterData>(key: K, val: VSMPosterData[K]) => {
    save({ ...data, [key]: val });
  }, [data, save]);

  const updateLane = useCallback((laneId: string, updates: Partial<PosterLane>) => {
    save({ ...data, lanes: data.lanes.map(l => l.id === laneId ? { ...l, ...updates } : l) });
  }, [data, save]);

  const updateStep = useCallback((laneId: string, stepId: string, updates: Partial<PosterStep>) => {
    save({
      ...data,
      lanes: data.lanes.map(l => l.id === laneId ? {
        ...l,
        steps: l.steps.map(s => s.id === stepId ? { ...s, ...updates } : s)
      } : l)
    });
  }, [data, save]);

  const deleteStep = useCallback((laneId: string, stepId: string) => {
    save({
      ...data,
      lanes: data.lanes.map(l => l.id === laneId ? {
        ...l,
        steps: l.steps.filter(s => s.id !== stepId)
      } : l)
    });
    setSelectedStep(null);
  }, [data, save]);

  const addStep = useCallback((laneId: string) => {
    const lane = data.lanes.find(l => l.id === laneId);
    if (!lane) return;
    const newStep: PosterStep = {
      id: `step-${Date.now()}`,
      name: 'New Step',
      cycleTime: 2.0,
      operators: 1,
      wip: 5,
      scrapRate: 0.5,
      leadTime: 6.0,
      valueAddedTime: 2.0,
    };
    save({
      ...data,
      lanes: data.lanes.map(l => l.id === laneId ? { ...l, steps: [...l.steps, newStep] } : l)
    });
  }, [data, save]);

  const deleteLane = useCallback((laneId: string) => {
    save({ ...data, lanes: data.lanes.filter(l => l.id !== laneId) });
  }, [data, save]);

  const addLane = () => {
    if (!newLaneForm.label.trim()) return;
    const newLane: PosterLane = {
      id: `lane-${Date.now()}`,
      label: newLaneForm.label,
      zoneName: newLaneForm.label,
      color: newLaneForm.color,
      headerColor: newLaneForm.color,
      hasRedOutline: false,
      hasQG: false,
      steps: [],
    };
    const updated = { ...data, lanes: [...data.lanes, newLane] };
    setData(updated);
    storage.setVSMPoster(updated);
    setShowAddLane(false);
    setNewLaneForm({ label: '', color: '#3498db' });
  };

  const handleDragStart = (laneId: string, stepIdx: number) => {
    setDragState({ laneId, stepIdx });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (laneId: string, targetIdx: number) => {
    if (!dragState) return;
    const sourceLane = data.lanes.find(l => l.id === dragState.laneId);
    if (!sourceLane) return;
    const step = sourceLane.steps[dragState.stepIdx];
    if (!step) return;

    if (dragState.laneId === laneId) {
      const newSteps = [...sourceLane.steps];
      newSteps.splice(dragState.stepIdx, 1);
      newSteps.splice(targetIdx, 0, step);
      updateLane(laneId, { steps: newSteps });
    } else {
      const targetLane = data.lanes.find(l => l.id === laneId);
      if (!targetLane) return;
      const srcSteps = sourceLane.steps.filter((_, i) => i !== dragState.stepIdx);
      const tgtSteps = [...targetLane.steps];
      tgtSteps.splice(targetIdx, 0, step);
      save({
        ...data,
        lanes: data.lanes.map(l => {
          if (l.id === dragState.laneId) return { ...l, steps: srcSteps };
          if (l.id === laneId) return { ...l, steps: tgtSteps };
          return l;
        })
      });
    }
    setDragState(null);
  };

  const resetPoster = () => {
    save({ ...DEFAULT_POSTER });
    setSelectedStep(null);
  };

  const metrics = useMemo(() => {
    const allSteps = data.lanes.flatMap(l => l.steps);
    const totalProcessTime = allSteps.reduce((s, st) => s + st.cycleTime, 0);
    const totalLeadTime = allSteps.reduce((s, st) => s + st.leadTime, 0);
    const totalVA = allSteps.reduce((s, st) => s + st.valueAddedTime, 0);
    const totalNVA = totalLeadTime - totalVA;
    const totalWIP = allSteps.reduce((s, st) => s + st.wip, 0);
    const efficiency = totalLeadTime > 0 ? (totalVA / totalLeadTime) * 100 : 0;
    return { totalProcessTime, totalLeadTime, totalVA, totalNVA, totalWIP, efficiency };
  }, [data]);

  const updateLegend = useCallback((idx: number, updates: Partial<PosterLegendItem>) => {
    const updated = [...data.legend];
    updated[idx] = { ...updated[idx], ...updates };
    updateField('legend', updated);
  }, [data.legend, updateField]);

  const handlePrint = () => {
    const el = posterRef.current;
    if (!el) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-testid="inline-edit-display"]').forEach(span => {
      (span as HTMLElement).style.borderBottom = 'none';
      (span as HTMLElement).style.cursor = 'default';
    });
    clone.querySelectorAll('.step-actions').forEach(el => (el as HTMLElement).style.display = 'none');
    clone.querySelectorAll('.drag-handle').forEach(el => (el as HTMLElement).style.display = 'none');
    clone.querySelectorAll('.lane-actions').forEach(el => (el as HTMLElement).style.display = 'none');
    printWindow.document.write(`<!DOCTYPE html>
<html><head><title>${data.title}</title>
<style>
  @page { size: A3 landscape; margin: 5mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#fff; }
</style></head><body>${clone.outerHTML}</body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 600);
  };

  const selStep = selectedStep
    ? data.lanes.find(l => l.id === selectedStep.laneId)?.steps.find(s => s.id === selectedStep.stepId)
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button data-testid="button-zoom-out" onClick={() => setZoom(z => Math.max(z - 0.1, 0.2))} className="p-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg transition-colors"><ZoomOut size={16} /></button>
          <span className="text-xs text-zinc-400 font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button data-testid="button-zoom-in" onClick={() => setZoom(z => Math.min(z + 0.1, 1.5))} className="p-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg transition-colors"><ZoomIn size={16} /></button>
          <button data-testid="button-zoom-fit" onClick={() => setZoom(0.55)} className="p-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg transition-colors"><Maximize2 size={16} /></button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button data-testid="button-add-lane" onClick={() => setShowAddLane(true)} className="flex items-center gap-1 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-xs transition-colors">
            <Plus size={12} /> Add Lane
          </button>
          <button data-testid="button-reset-vsm" onClick={resetPoster} className="flex items-center gap-1 px-3 py-2 bg-white/5 hover:bg-white/10 text-zinc-400 rounded-lg text-xs transition-colors">
            <RotateCcw size={12} /> Reset
          </button>
        </div>
        <button data-testid="button-print-vsm" onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
          <Printer size={14} /> Imprimer / PDF
        </button>
      </div>

      {/* Auto-calculated metrics bar */}
      <div className="grid grid-cols-6 gap-2">
        {[
          { label: 'Total Lead Time', val: `${metrics.totalLeadTime.toFixed(1)} min`, color: 'text-blue-400' },
          { label: 'Processing Time', val: `${metrics.totalProcessTime.toFixed(1)} min`, color: 'text-white' },
          { label: 'Value Added', val: `${metrics.totalVA.toFixed(1)} min`, color: 'text-emerald-400' },
          { label: 'Non Value Added', val: `${metrics.totalNVA.toFixed(1)} min`, color: 'text-amber-400' },
          { label: 'Total WIP', val: `${metrics.totalWIP} pcs`, color: 'text-white' },
          { label: 'Efficiency', val: `${metrics.efficiency.toFixed(2)}%`, color: metrics.efficiency > 15 ? 'text-emerald-400' : 'text-red-400' },
        ].map(m => (
          <div key={m.label} className="glass rounded-lg p-3 text-center">
            <div className="text-[10px] text-zinc-500 mb-1">{m.label}</div>
            <div className={`text-sm font-bold font-mono ${m.color}`}>{m.val}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        {/* Main poster canvas */}
        <div className="flex-1 overflow-auto rounded-xl border border-white/10 bg-zinc-900/50" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100 / zoom}%` }}>
            <div ref={posterRef} style={{
              width: '1600px',
              minHeight: '1050px',
              background: '#ffffff',
              fontFamily: "'Segoe UI', Arial, sans-serif",
              color: '#222',
              border: '4px solid #1a5276',
              position: 'relative',
              overflow: 'hidden',
            }}>

              {/* HEADER */}
              <div style={{
                background: 'linear-gradient(135deg, #1a5276 0%, #2471a3 40%, #1a5276 100%)',
                padding: '12px 30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '3px solid #154360',
              }}>
                <div style={{ background: 'white', borderRadius: '24px', padding: '6px 20px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: '#1a5276', letterSpacing: '3px' }}>OPE</span>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: '#e74c3c', letterSpacing: '3px' }}>X</span>
                  <span style={{ fontSize: '8px', color: '#1a5276', marginLeft: '6px', fontStyle: 'italic', maxWidth: '60px', lineHeight: '1.1' }}>Our way to Excellence</span>
                </div>
                <InlineEdit
                  value={data.title}
                  onChange={v => updateField('title', v)}
                  style={{ fontSize: '24px', fontWeight: 800, color: 'white', letterSpacing: '3px', textAlign: 'center' }}
                />
                <span style={{ fontSize: '30px', fontWeight: 800, color: 'white', letterSpacing: '4px' }}>LEONI</span>
              </div>

              {/* SUPPLIER / CLIENT / PRODUCTION CONTROL */}
              <div style={{ position: 'relative', height: '130px', padding: '12px 30px 0 30px' }}>
                <div style={{ position: 'absolute', left: '30px', top: '12px', width: '110px' }}>
                  <div style={{ background: '#2471a3', color: 'white', padding: '8px 10px', borderRadius: '4px', textAlign: 'center', fontSize: '11px', fontWeight: 700 }}>
                    <div style={{ fontSize: '16px', marginBottom: '2px' }}>🏭</div>
                    <InlineEdit value={data.supplierName} onChange={v => updateField('supplierName', v)} style={{ color: 'white', fontSize: '11px', fontWeight: 700 }} />
                  </div>
                  <div style={{ width: '2px', height: '50px', background: '#2471a3', margin: '0 auto' }} />
                  <div style={{ width: '0', height: '0', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '8px solid #2471a3', margin: '0 auto' }} />
                </div>

                <div style={{ position: 'absolute', right: '30px', top: '12px', width: '110px' }}>
                  <div style={{ background: '#2471a3', color: 'white', padding: '8px 10px', borderRadius: '4px', textAlign: 'center', fontSize: '11px', fontWeight: 700 }}>
                    <div style={{ fontSize: '16px', marginBottom: '2px' }}>🏭</div>
                    <InlineEdit value={data.clientName} onChange={v => updateField('clientName', v)} style={{ color: 'white', fontSize: '11px', fontWeight: 700 }} />
                  </div>
                  <div style={{ width: '2px', height: '50px', background: '#2471a3', margin: '0 auto' }} />
                  <div style={{ width: '0', height: '0', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '8px solid #2471a3', margin: '0 auto' }} />
                </div>

                <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '10px', width: '320px', border: '2px solid #1a5276', borderRadius: '6px', background: '#f8f9fa', overflow: 'hidden' }}>
                  <div style={{ background: '#1a5276', color: 'white', padding: '5px 12px', fontSize: '11px', fontWeight: 700, textAlign: 'center' }}>
                    <InlineEdit value={data.productionControlTitle} onChange={v => updateField('productionControlTitle', v)} style={{ color: 'white', fontSize: '11px', fontWeight: 700 }} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', padding: '8px 12px' }}>
                    <div style={{ flex: 1, border: '1px solid #bbb', borderRadius: '4px', padding: '6px', textAlign: 'center', fontSize: '10px', fontWeight: 600, background: 'white' }}>
                      <InlineEdit value={data.controlSystem1} onChange={v => updateField('controlSystem1', v)} style={{ fontSize: '10px', fontWeight: 600 }} />
                    </div>
                    <div style={{ flex: 1, border: '1px solid #bbb', borderRadius: '4px', padding: '6px', textAlign: 'center', fontSize: '10px', fontWeight: 600, background: 'white' }}>
                      <InlineEdit value={data.controlSystem2} onChange={v => updateField('controlSystem2', v)} style={{ fontSize: '10px', fontWeight: 600 }} />
                    </div>
                  </div>
                </div>

                <div style={{ position: 'absolute', top: '38px', left: '145px', right: '145px', height: '1px', background: '#e8b4b8' }} />
                {data.planningLabels.map((label, i) => {
                  const positions = [
                    { left: '180px' },
                    { left: '350px' },
                    { right: '350px' },
                    { right: '180px' },
                  ];
                  return (
                    <div key={i} style={{ position: 'absolute', top: '33px', ...positions[i], fontSize: '9px', color: '#c0392b', fontWeight: 600, fontStyle: 'italic', transform: 'rotate(-8deg)' }}>
                      <InlineEdit value={label} onChange={v => {
                        const labels = [...data.planningLabels];
                        labels[i] = v;
                        updateField('planningLabels', labels);
                      }} style={{ fontSize: '9px', color: '#c0392b', fontWeight: 600, fontStyle: 'italic' }} />
                    </div>
                  );
                })}

                <div style={{ position: 'absolute', left: '50%', top: '78px', width: '2px', height: '52px', background: '#1a5276' }} />
                <div style={{ position: 'absolute', left: 'calc(50% - 5px)', top: '126px', width: '0', height: '0', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '8px solid #1a5276' }} />
              </div>

              {/* LANES */}
              <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.lanes.map((lane) => (
                  <div key={lane.id} style={{ position: 'relative' }}>
                    <div style={{
                      border: lane.hasRedOutline ? '3px solid #c0392b' : '2px solid #bdc3c7',
                      borderRadius: '8px',
                      padding: '6px 8px',
                      background: '#fdfdfd',
                      position: 'relative',
                    }}>
                      {/* Lane label + actions */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <InlineEdit value={lane.label} onChange={v => updateLane(lane.id, { label: v })} style={{ fontSize: '9px', fontWeight: 700, color: lane.headerColor, letterSpacing: '1px' }} />
                        <div className="lane-actions" style={{ display: 'flex', gap: '4px' }}>
                          <button
                            data-testid={`button-add-step-${lane.id}`}
                            onClick={() => addStep(lane.id)}
                            style={{ background: lane.color, color: 'white', border: 'none', borderRadius: '3px', padding: '2px 8px', fontSize: '8px', fontWeight: 700, cursor: 'pointer' }}
                          >+ Step</button>
                          <button
                            onClick={() => updateLane(lane.id, { hasRedOutline: !lane.hasRedOutline })}
                            style={{ background: lane.hasRedOutline ? '#c0392b' : '#eee', color: lane.hasRedOutline ? 'white' : '#666', border: 'none', borderRadius: '3px', padding: '2px 6px', fontSize: '8px', cursor: 'pointer' }}
                          >Red</button>
                          <button
                            onClick={() => updateLane(lane.id, { hasQG: !lane.hasQG })}
                            style={{ background: lane.hasQG ? '#27ae60' : '#eee', color: lane.hasQG ? 'white' : '#666', border: 'none', borderRadius: '3px', padding: '2px 6px', fontSize: '8px', cursor: 'pointer' }}
                          >QG</button>
                          <input type="color" value={lane.color} onChange={e => updateLane(lane.id, { color: e.target.value, headerColor: e.target.value })} style={{ width: '18px', height: '18px', border: 'none', cursor: 'pointer', padding: 0 }} />
                          <button
                            data-testid={`button-delete-lane-${lane.id}`}
                            onClick={() => deleteLane(lane.id)}
                            style={{ background: '#e74c3c', color: 'white', border: 'none', borderRadius: '3px', padding: '2px 6px', fontSize: '8px', cursor: 'pointer' }}
                          >✕</button>
                        </div>
                      </div>

                      {/* Process blocks row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '3px', overflowX: 'auto', minHeight: '90px' }}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(lane.id, lane.steps.length)}
                      >
                        {lane.steps.map((step, stepIdx) => (
                          <div
                            key={step.id}
                            draggable
                            onDragStart={() => handleDragStart(lane.id, stepIdx)}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={(e) => { e.stopPropagation(); handleDrop(lane.id, stepIdx); }}
                            onClick={() => setSelectedStep({ laneId: lane.id, stepId: step.id })}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              minWidth: '72px',
                              flex: '1',
                              cursor: 'grab',
                              opacity: dragState?.laneId === lane.id && dragState?.stepIdx === stepIdx ? 0.4 : 1,
                              outline: selectedStep?.stepId === step.id ? '2px solid #3498db' : 'none',
                              outlineOffset: '2px',
                              borderRadius: '4px',
                              position: 'relative',
                            }}
                          >
                            {/* Drag handle */}
                            <div className="drag-handle" style={{ fontSize: '8px', color: '#bbb', marginBottom: '1px', cursor: 'grab' }}>⋮⋮</div>

                            {/* WIP triangle */}
                            <div style={{ position: 'relative', marginBottom: '3px' }}>
                              <div style={{ width: '0', height: '0', borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: '14px solid #f39c12' }} />
                              <span style={{ position: 'absolute', top: '4px', left: '50%', transform: 'translateX(-50%)', fontSize: '6px', fontWeight: 700, color: '#7d6608' }}>
                                <InlineEdit value={step.wip} onChange={v => updateStep(lane.id, step.id, { wip: Number(v) || 0 })} type="number" style={{ fontSize: '6px', fontWeight: 700, color: '#7d6608' }} />
                              </span>
                            </div>

                            {/* Process block card */}
                            <div style={{ width: '68px', background: '#d6eaf8', border: `1px solid ${lane.color}`, borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ background: lane.headerColor, color: 'white', fontSize: '7px', fontWeight: 700, padding: '2px 4px', textAlign: 'center' }}>
                                <InlineEdit value={step.name} onChange={v => updateStep(lane.id, step.id, { name: v })} style={{ fontSize: '7px', fontWeight: 700, color: 'white' }} />
                              </div>
                              <div style={{ padding: '3px', fontSize: '7px', lineHeight: '1.4', color: '#333' }}>
                                <div>C/T: <InlineEdit value={step.cycleTime} onChange={v => { const n = Number(v) || 0; updateStep(lane.id, step.id, { cycleTime: n, valueAddedTime: n }); }} type="number" style={{ fontSize: '7px' }} />min</div>
                                <div>Op: <InlineEdit value={step.operators} onChange={v => updateStep(lane.id, step.id, { operators: Number(v) || 1 })} type="number" style={{ fontSize: '7px' }} /></div>
                                <div style={{ color: '#c0392b' }}>Scr: <InlineEdit value={step.scrapRate} onChange={v => updateStep(lane.id, step.id, { scrapRate: Number(v) || 0 })} type="number" style={{ fontSize: '7px', color: '#c0392b' }} />%</div>
                              </div>
                            </div>

                            {/* Timeline box */}
                            <div style={{ marginTop: '3px', background: '#fff', border: '1px solid #aaa', borderRadius: '2px', padding: '1px 4px', fontSize: '7px', fontWeight: 600, color: '#555', textAlign: 'center' }}>
                              LT: <InlineEdit value={step.leadTime} onChange={v => updateStep(lane.id, step.id, { leadTime: Number(v) || 0 })} type="number" style={{ fontSize: '7px', fontWeight: 600 }} />m
                            </div>

                            {/* Delete button */}
                            <button
                              className="step-actions"
                              onClick={(e) => { e.stopPropagation(); deleteStep(lane.id, step.id); }}
                              style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '50%', width: '14px', height: '14px', fontSize: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                            >✕</button>
                          </div>
                        ))}

                        {lane.hasQG && (
                          <div style={{ minWidth: '60px', background: '#27ae60', color: 'white', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', alignSelf: 'center', padding: '10px 8px' }}>QG</div>
                        )}

                        <div style={{ minWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="36" height="50" viewBox="0 0 36 50">
                            <path d="M4 8 L4 42 Q4 48 10 48 L26 48 Q32 48 32 42 L32 8" fill="none" stroke={lane.color} strokeWidth="2.5" />
                            <polygon points="28,10 32,2 36,10" fill={lane.color} />
                          </svg>
                        </div>
                      </div>

                      <div style={{ marginTop: '4px', height: '3px', background: `linear-gradient(to right, ${lane.color}, ${lane.headerColor})`, borderRadius: '2px', opacity: 0.5 }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* MAGASIN */}
              <div style={{ position: 'absolute', right: '30px', bottom: '200px', background: '#2471a3', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                <InlineEdit value={data.magasinLabel} onChange={v => updateField('magasinLabel', v)} style={{ color: 'white', fontSize: '10px', fontWeight: 700 }} />
              </div>

              {/* BOTTOM: LEGEND + METRICS */}
              <div style={{ display: 'flex', padding: '16px 30px 12px 30px', gap: '30px', marginTop: '10px' }}>
                <div style={{ border: '1.5px solid #bbb', borderRadius: '6px', padding: '10px 16px', minWidth: '300px', background: '#fafafa' }}>
                  <div style={{ fontWeight: 800, fontSize: '11px', color: '#1a5276', marginBottom: '8px', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>LÉGENDE</div>
                  {data.legend.map((item, i) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <input type="color" value={item.color} onChange={e => updateLegend(i, { color: e.target.value })} style={{ width: '40px', height: '10px', border: 'none', cursor: 'pointer', padding: 0 }} />
                      <InlineEdit value={item.label} onChange={v => updateLegend(i, { label: v })} style={{ fontSize: '10px', color: '#333' }} />
                    </div>
                  ))}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ border: '1.5px solid #bbb', borderRadius: '6px', padding: '8px 16px', background: '#fafafa', flex: 1 }}>
                      <div style={{ fontSize: '9px', color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Temps de séjour (Lead Time)</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#1a5276' }}>{metrics.totalLeadTime.toFixed(1)} min</div>
                    </div>
                    <div style={{ border: '1.5px solid #bbb', borderRadius: '6px', padding: '8px 16px', background: '#fafafa', flex: 1 }}>
                      <div style={{ fontSize: '9px', color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Valeur Ajoutée</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#27ae60' }}>{metrics.totalVA.toFixed(1)} min</div>
                    </div>
                    <div style={{ border: '1.5px solid #bbb', borderRadius: '6px', padding: '8px 16px', background: '#fafafa', flex: 1 }}>
                      <div style={{ fontSize: '9px', color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Non Valeur Ajoutée</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#e67e22' }}>{metrics.totalNVA.toFixed(1)} min</div>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#1a5276', color: 'white', borderRadius: '6px', padding: '12px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '200px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Efficacité</div>
                  <div style={{ fontSize: '32px', fontWeight: 900 }}>{metrics.efficiency.toFixed(2)}%</div>
                </div>
              </div>

              <div style={{ background: 'linear-gradient(135deg, #1a5276, #2471a3)', height: '6px' }} />
            </div>
          </div>
        </div>

        {/* SIDE PANEL: selected step editor */}
        {selectedStep && selStep && (
          <div className="w-64 flex-shrink-0 glass rounded-xl p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Edit Step</h3>
              <button onClick={() => setSelectedStep(null)} className="text-zinc-400 hover:text-white"><X size={14} /></button>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-zinc-500 block mb-1">Name</label>
                <input data-testid="panel-step-name" value={selStep.name} onChange={e => updateStep(selectedStep.laneId, selectedStep.stepId, { name: e.target.value })}
                  className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Cycle Time (min)</label>
                  <input data-testid="panel-step-ct" type="number" step="0.01" value={selStep.cycleTime} onChange={e => { const n = Number(e.target.value) || 0; updateStep(selectedStep.laneId, selectedStep.stepId, { cycleTime: n, valueAddedTime: n }); }}
                    className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Operators</label>
                  <input type="number" value={selStep.operators} onChange={e => updateStep(selectedStep.laneId, selectedStep.stepId, { operators: Number(e.target.value) || 1 })}
                    className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">WIP</label>
                  <input type="number" value={selStep.wip} onChange={e => updateStep(selectedStep.laneId, selectedStep.stepId, { wip: Number(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Scrap Rate (%)</label>
                  <input type="number" step="0.1" value={selStep.scrapRate} onChange={e => updateStep(selectedStep.laneId, selectedStep.stepId, { scrapRate: Number(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Lead Time (min)</label>
                  <input type="number" step="0.1" value={selStep.leadTime} onChange={e => updateStep(selectedStep.laneId, selectedStep.stepId, { leadTime: Number(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">VA Time (min)</label>
                  <input type="number" step="0.1" value={selStep.valueAddedTime} onChange={e => updateStep(selectedStep.laneId, selectedStep.stepId, { valueAddedTime: Number(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
                </div>
              </div>
              <button data-testid="button-delete-selected-step" onClick={() => deleteStep(selectedStep.laneId, selectedStep.stepId)}
                className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs transition-colors mt-2">
                <Trash2 size={12} /> Delete Step
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Lane Modal */}
      {showAddLane && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowAddLane(false)}>
          <div className="glass-strong rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Add New Lane</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400">Lane Name</label>
                <input data-testid="input-new-lane-name" value={newLaneForm.label} onChange={e => setNewLaneForm({ ...newLaneForm, label: e.target.value })}
                  placeholder="e.g. Zone Finition" className="w-full px-3 py-2 mt-1 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Color</label>
                <input type="color" value={newLaneForm.color} onChange={e => setNewLaneForm({ ...newLaneForm, color: e.target.value })}
                  className="w-full h-10 mt-1 rounded-lg border border-white/10 cursor-pointer" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAddLane(false)} className="px-4 py-2 text-sm text-zinc-400">Cancel</button>
              <button data-testid="button-confirm-add-lane" onClick={addLane} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">
                <Plus size={14} /> Add Lane
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface WasteItem {
  type: 'bottleneck' | 'excess-wip' | 'low-uptime' | 'high-scrap';
  stepName: string;
  detail: string;
  severity: 'high' | 'medium';
}

interface Suggestion {
  icon: typeof Wrench;
  title: string;
  detail: string;
}

function detectWastes(steps: VSMStep[], taktTime: number): WasteItem[] {
  const wastes: WasteItem[] = [];
  const avgWip = steps.length > 0 ? steps.reduce((s, st) => s + st.wip, 0) / steps.length : 0;

  for (const step of steps) {
    if (taktTime > 0 && step.cycleTime > taktTime) {
      wastes.push({ type: 'bottleneck', stepName: step.name, detail: `C/T ${step.cycleTime}s > Takt ${taktTime}s`, severity: 'high' });
    }
    if (step.wip > avgWip * 1.8 && step.wip > 5) {
      wastes.push({ type: 'excess-wip', stepName: step.name, detail: `WIP ${step.wip} (avg ${Math.round(avgWip)})`, severity: 'medium' });
    }
    if (step.uptime < 85) {
      wastes.push({ type: 'low-uptime', stepName: step.name, detail: `Uptime ${step.uptime}%`, severity: step.uptime < 70 ? 'high' : 'medium' });
    }
    if ((step.scrapRate ?? 0) > 3) {
      wastes.push({ type: 'high-scrap', stepName: step.name, detail: `Scrap ${step.scrapRate}%`, severity: (step.scrapRate ?? 0) > 5 ? 'high' : 'medium' });
    }
  }
  return wastes;
}

function generateSuggestions(wastes: WasteItem[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const types = new Set(wastes.map(w => w.type));

  if (types.has('excess-wip')) {
    suggestions.push({ icon: Package, title: 'Réduire le WIP avec Kanban', detail: 'Implémenter un système Kanban entre les étapes à WIP élevé pour limiter l\'en-cours et améliorer le flux.' });
  }
  if (types.has('bottleneck')) {
    suggestions.push({ icon: Wrench, title: 'Diviser le processus goulot', detail: 'Répartir les opérations du goulot sur 2 postes ou réduire le temps de cycle par l\'amélioration des outils.' });
    suggestions.push({ icon: Users, title: 'Équilibrer la charge de ligne', detail: 'Redistribuer les tâches entre opérateurs pour aligner les temps de cycle sur le Takt Time.' });
  }
  if (types.has('low-uptime')) {
    suggestions.push({ icon: Wrench, title: 'Réduire les temps de changement', detail: 'Appliquer la méthode SMED pour réduire les changements de série et augmenter le TRS.' });
  }
  if (types.has('high-scrap')) {
    suggestions.push({ icon: AlertTriangle, title: 'Réduire le taux de rebut', detail: 'Analyser les causes racines (Ishikawa/5 Pourquoi) et mettre en place des Poka-Yoke.' });
  }
  if (suggestions.length === 0) {
    suggestions.push({ icon: Lightbulb, title: 'Optimisation continue', detail: 'Aucun problème critique détecté. Continuer le suivi des indicateurs et chercher des gains incrémentaux.' });
  }
  return suggestions;
}

function getStepWastes(stepName: string, wastes: WasteItem[]): WasteItem[] {
  return wastes.filter(w => w.stepName === stepName);
}

const wasteIcons: Record<WasteItem['type'], { icon: typeof AlertTriangle; color: string; label: string }> = {
  'bottleneck': { icon: TrendingDown, color: 'text-red-400', label: 'Goulot' },
  'excess-wip': { icon: Package, color: 'text-amber-400', label: 'WIP excessif' },
  'low-uptime': { icon: Wrench, color: 'text-orange-400', label: 'TRS faible' },
  'high-scrap': { icon: AlertTriangle, color: 'text-red-400', label: 'Rebut élevé' },
};

export default function VSMStudio({ lang, onOpenAI }: VSMStudioProps) {
  const tr = useTranslate(lang);
  const [view, setView] = useState<'current' | 'future' | 'poster'>('poster');
  const aiOutput = useMemo(() => runAIEngine(), []);
  const [currentSteps, setCurrentSteps] = useState<VSMStep[]>([]);
  const [futureSteps, setFutureSteps] = useState<VSMStep[]>([]);
  const [context, setContext] = useState<VSMContext>(storage.getVSMContext());
  const [showForm, setShowForm] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [form, setForm] = useState<Partial<VSMStep>>({});
  const [editingFutureStep, setEditingFutureStep] = useState<string | null>(null);

  useEffect(() => {
    setCurrentSteps(storage.getVSMCurrent());
    setFutureSteps(storage.getVSMFuture());
  }, []);

  const steps = view === 'current' ? currentSteps : futureSteps;
  const setSteps = view === 'current' ? setCurrentSteps : setFutureSteps;
  const saveSteps = view === 'current' ? storage.setVSMCurrent : storage.setVSMFuture;

  const totalLeadTime = useMemo(() => steps.reduce((s, step) => s + step.leadTime, 0), [steps]);
  const totalProcessTime = useMemo(() => steps.reduce((s, step) => s + step.processTime, 0), [steps]);
  const pceRatio = totalLeadTime > 0 ? ((totalProcessTime / totalLeadTime) * 100).toFixed(1) : '0';

  const currentTotalLeadTime = useMemo(() => currentSteps.reduce((s, step) => s + step.leadTime, 0), [currentSteps]);
  const currentTotalProcessTime = useMemo(() => currentSteps.reduce((s, step) => s + step.processTime, 0), [currentSteps]);
  const currentPceRatio = currentTotalLeadTime > 0 ? ((currentTotalProcessTime / currentTotalLeadTime) * 100).toFixed(1) : '0';

  const futureTotalLeadTime = useMemo(() => futureSteps.reduce((s, step) => s + step.leadTime, 0), [futureSteps]);
  const futureTotalProcessTime = useMemo(() => futureSteps.reduce((s, step) => s + step.processTime, 0), [futureSteps]);
  const futurePceRatio = futureTotalLeadTime > 0 ? ((futureTotalProcessTime / futureTotalLeadTime) * 100).toFixed(1) : '0';

  const wastes = useMemo(() => detectWastes(currentSteps, context.taktTime), [currentSteps, context.taktTime]);
  const suggestions = useMemo(() => generateSuggestions(wastes), [wastes]);

  const handleSave = () => {
    if (!form.name) return;
    const entry: VSMStep = {
      id: `vsm-${Date.now()}`,
      name: form.name || '',
      cycleTime: Number(form.cycleTime) || 0,
      changeoverTime: Number(form.changeoverTime) || 0,
      uptime: Number(form.uptime) || 95,
      operators: Number(form.operators) || 1,
      wip: Number(form.wip) || 0,
      leadTime: Number(form.leadTime) || 0,
      processTime: Number(form.processTime) || 0,
      dept: (form.dept || 'P1') as Dept,
      scrapRate: Number(form.scrapRate) || 0,
    };
    const updated = [...steps, entry];
    setSteps(updated);
    saveSteps(updated);
    setShowForm(false);
    setForm({});
  };

  const removeStep = (id: string) => {
    const updated = steps.filter(s => s.id !== id);
    setSteps(updated);
    saveSteps(updated);
  };

  const updateFutureStep = (id: string, field: keyof VSMStep, value: number) => {
    const updated = futureSteps.map(s => s.id === id ? { ...s, [field]: value } : s);
    setFutureSteps(updated);
    storage.setVSMFuture(updated);
  };

  const copyCurrentToFuture = () => {
    const copied = currentSteps.map(s => ({ ...s, id: `vsm-f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }));
    setFutureSteps(copied);
    storage.setVSMFuture(copied);
  };

  const saveContext = () => {
    storage.setVSMContext(context);
    setShowContext(false);
  };

  const renderStepCard = (step: VSMStep, idx: number, isFuture: boolean) => {
    const stepWastes = view === 'current' ? getStepWastes(step.name, wastes) : [];
    const isEditing = isFuture && editingFutureStep === step.id;

    return (
      <div key={step.id} className="flex items-start gap-1">
        <div data-testid={`card-vsm-step-${step.id}`} className="flex flex-col items-center">
          {stepWastes.length > 0 && (
            <div className="flex gap-1 mb-1" data-testid={`waste-indicators-${step.id}`}>
              {stepWastes.map((w, wi) => {
                const info = wasteIcons[w.type];
                const Icon = info.icon;
                return (
                  <div key={wi} className={`group relative flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-medium ${w.severity === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    <Icon size={8} />
                    <span>{info.label}</span>
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-zinc-800 text-[9px] text-zinc-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {w.detail}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="relative">
            <div className="w-8 h-6 bg-amber-500/30 clip-triangle mx-auto mb-1" />
            <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[8px] text-amber-300 font-mono">{step.wip}</span>
          </div>

          <div className={`rounded-lg p-3 w-36 ${isFuture ? 'border border-emerald-500/20 bg-emerald-500/5' : stepWastes.some(w => w.severity === 'high') ? 'bg-red-500/[0.04] border border-red-500/20' : 'bg-white/[0.03] border border-white/5'}`}
            onClick={() => isFuture && setEditingFutureStep(isEditing ? null : step.id)}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white truncate">{step.name}</span>
              <button onClick={(e) => { e.stopPropagation(); removeStep(step.id); }} className="text-zinc-500 hover:text-red-400 text-[10px]">
                <X size={10} />
              </button>
            </div>
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">C/T:</span>
                {isEditing ? (
                  <input data-testid={`input-future-ct-${step.id}`} type="number" value={step.cycleTime} onChange={e => updateFutureStep(step.id, 'cycleTime', Number(e.target.value))}
                    className="w-14 px-1 py-0 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] text-right outline-none" onClick={e => e.stopPropagation()} />
                ) : (
                  <span className="text-zinc-300 font-mono">{step.cycleTime}s</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">C/O:</span>
                <span className="text-zinc-300 font-mono">{step.changeoverTime}min</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Uptime:</span>
                <span className="text-zinc-300 font-mono">{step.uptime}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 flex items-center gap-0.5"><Users size={8} /></span>
                {isEditing ? (
                  <input data-testid={`input-future-ops-${step.id}`} type="number" value={step.operators} onChange={e => updateFutureStep(step.id, 'operators', Number(e.target.value))}
                    className="w-14 px-1 py-0 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] text-right outline-none" onClick={e => e.stopPropagation()} />
                ) : (
                  <span className="text-zinc-300 font-mono">{step.operators}</span>
                )}
              </div>
              {(step.scrapRate ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Scrap:</span>
                  <span className={`font-mono ${(step.scrapRate ?? 0) > 3 ? 'text-red-400' : 'text-zinc-300'}`}>{step.scrapRate}%</span>
                </div>
              )}
            </div>
            <div className="mt-2 pt-2 border-t border-white/5 text-[10px]">
              <span className="text-zinc-500">{step.dept}</span>
            </div>
            {isFuture && !isEditing && (
              <div className="mt-1 text-[8px] text-emerald-500/60 text-center">cliquer pour éditer</div>
            )}
          </div>

          <div className="mt-2 text-center">
            <div className="text-[10px] text-zinc-500">LT: {isEditing ? (
              <input data-testid={`input-future-lt-${step.id}`} type="number" value={step.leadTime} onChange={e => updateFutureStep(step.id, 'leadTime', Number(e.target.value))}
                className="w-12 px-1 py-0 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] text-right outline-none inline" />
            ) : (
              <span className="text-zinc-300 font-mono">{step.leadTime}m</span>
            )}</div>
            <div className="text-[10px] text-zinc-500">PT: {isEditing ? (
              <input data-testid={`input-future-pt-${step.id}`} type="number" value={step.processTime} onChange={e => updateFutureStep(step.id, 'processTime', Number(e.target.value))}
                className="w-12 px-1 py-0 rounded bg-emerald-500/10 border border-emerald-500/30 text-blue-400 font-mono text-[10px] text-right outline-none inline" />
            ) : (
              <span className="text-blue-400 font-mono">{step.processTime}m</span>
            )}</div>
            {isEditing && (
              <div className="text-[10px] text-zinc-500 mt-1">WIP: <input data-testid={`input-future-wip-${step.id}`} type="number" value={step.wip} onChange={e => updateFutureStep(step.id, 'wip', Number(e.target.value))}
                className="w-12 px-1 py-0 rounded bg-emerald-500/10 border border-emerald-500/30 text-amber-300 font-mono text-[10px] text-right outline-none inline" /></div>
            )}
          </div>
        </div>
        {idx < steps.length - 1 && <ArrowRight size={16} className="text-zinc-600 mt-12 flex-shrink-0" />}
      </div>
    );
  };

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <AIInsightCard module="vsm" output={aiOutput} onOpenCopilot={onOpenAI} />
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="text-vsm-title" className="text-2xl font-bold text-white">{tr('vsm.title')}</h1>
          <p className="text-sm text-zinc-500 mt-1">{context.productFamily} • {context.shiftPattern}</p>
        </div>
        <div className="flex gap-2">
          {view !== 'poster' && (
            <>
              <button onClick={() => setShowContext(true)} className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg text-sm transition-colors">
                <Settings size={14} />
              </button>
              {view === 'future' && futureSteps.length === 0 && currentSteps.length > 0 && (
                <button data-testid="button-copy-current" onClick={copyCurrentToFuture}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm transition-colors">
                  Copier État Actuel
                </button>
              )}
              <button data-testid="button-add-vsm" onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
                <Plus size={14} />
                {tr('vsm.add_step')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button data-testid="tab-vsm-poster" onClick={() => setView('poster')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${view === 'poster' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'bg-white/5 text-zinc-400'}`}>
          VSM Poster
        </button>
        <button data-testid="tab-vsm-current" onClick={() => setView('current')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${view === 'current' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'bg-white/5 text-zinc-400'}`}>
          {tr('vsm.current')}
        </button>
        <button data-testid="tab-vsm-future" onClick={() => setView('future')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${view === 'future' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-zinc-400'}`}>
          {tr('vsm.future')}
        </button>
      </div>

      {view === 'poster' ? (
        <VSMPoster />
      ) : (
        <>
          {view === 'future' && currentSteps.length > 0 && futureSteps.length > 0 && (
            <div data-testid="comparison-summary" className="glass rounded-xl p-4">
              <div className="text-xs font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                <TrendingDown size={14} />
                Comparaison État Actuel → État Futur
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-[10px] text-zinc-500 mb-1">Lead Time</div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-zinc-400 font-mono">{currentTotalLeadTime}min</span>
                    <ArrowRight size={12} className="text-zinc-600" />
                    <span className="text-sm text-emerald-400 font-mono font-bold">{futureTotalLeadTime}min</span>
                  </div>
                  {currentTotalLeadTime > 0 && (
                    <div className={`text-[10px] font-mono mt-1 flex items-center justify-center gap-0.5 ${futureTotalLeadTime < currentTotalLeadTime ? 'text-emerald-400' : 'text-red-400'}`}>
                      {futureTotalLeadTime < currentTotalLeadTime ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                      {Math.abs(((futureTotalLeadTime - currentTotalLeadTime) / currentTotalLeadTime) * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-zinc-500 mb-1">Process Time</div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-zinc-400 font-mono">{currentTotalProcessTime}min</span>
                    <ArrowRight size={12} className="text-zinc-600" />
                    <span className="text-sm text-emerald-400 font-mono font-bold">{futureTotalProcessTime}min</span>
                  </div>
                  {currentTotalProcessTime > 0 && (
                    <div className={`text-[10px] font-mono mt-1 flex items-center justify-center gap-0.5 ${futureTotalProcessTime < currentTotalProcessTime ? 'text-emerald-400' : 'text-red-400'}`}>
                      {futureTotalProcessTime < currentTotalProcessTime ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                      {Math.abs(((futureTotalProcessTime - currentTotalProcessTime) / currentTotalProcessTime) * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-zinc-500 mb-1">PCE Ratio</div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-zinc-400 font-mono">{currentPceRatio}%</span>
                    <ArrowRight size={12} className="text-zinc-600" />
                    <span className="text-sm text-emerald-400 font-mono font-bold">{futurePceRatio}%</span>
                  </div>
                  {Number(currentPceRatio) > 0 && (
                    <div className={`text-[10px] font-mono mt-1 flex items-center justify-center gap-0.5 ${Number(futurePceRatio) > Number(currentPceRatio) ? 'text-emerald-400' : 'text-red-400'}`}>
                      {Number(futurePceRatio) > Number(currentPceRatio) ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      {Math.abs(Number(futurePceRatio) - Number(currentPceRatio)).toFixed(1)}pts
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className={`flex gap-4 ${view === 'current' ? '' : ''}`}>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">{tr('vsm.takt_time')}</div>
                  <div className="text-xl font-bold text-blue-400 font-mono">{context.taktTime}s</div>
                </div>
                <div className="glass rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">{tr('vsm.lead_time')}</div>
                  <div className="text-xl font-bold text-white font-mono">{totalLeadTime}min</div>
                </div>
                <div className="glass rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">Process Time</div>
                  <div className="text-xl font-bold text-white font-mono">{totalProcessTime}min</div>
                </div>
                <div className="glass rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">PCE Ratio</div>
                  <div className={`text-xl font-bold font-mono ${Number(pceRatio) > 25 ? 'text-emerald-400' : 'text-amber-400'}`}>{pceRatio}%</div>
                </div>
              </div>

              <div className="glass rounded-xl p-6 overflow-x-auto">
                <div className="flex items-start gap-1 min-w-max">
                  <div className="glass rounded-lg p-3 w-24 flex-shrink-0 text-center">
                    <div className="text-[10px] text-zinc-500 mb-1">Client</div>
                    <div className="text-xs text-white font-mono">{context.customerDemand}/j</div>
                  </div>

                  <ArrowRight size={16} className="text-zinc-600 mt-6 flex-shrink-0" />

                  {steps.map((step, idx) => renderStepCard(step, idx, view === 'future'))}

                  <ArrowRight size={16} className="text-zinc-600 mt-6 flex-shrink-0" />

                  <div className="glass rounded-lg p-3 w-24 flex-shrink-0 text-center">
                    <div className="text-[10px] text-zinc-500 mb-1">Client</div>
                    <div className="text-xs text-white">Expédition</div>
                  </div>
                </div>

                {steps.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-white/5">
                    <div className="flex gap-1 h-6">
                      {steps.map((step) => (
                        <div key={step.id} className="flex gap-0.5" style={{ flex: step.leadTime || 1 }}>
                          <div className="bg-white/5 rounded-sm flex-1 relative group">
                            <div className="absolute bottom-full mb-1 left-0 text-[8px] text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {step.name}: {step.leadTime}min
                            </div>
                          </div>
                          <div className={`${view === 'future' ? 'bg-emerald-500/30' : 'bg-blue-500/30'} rounded-sm`} style={{ flex: `0 0 ${step.leadTime > 0 ? (step.processTime / step.leadTime) * 100 : 0}%` }} />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-zinc-500">
                      <span>Lead Time: {totalLeadTime}min</span>
                      <span className={view === 'future' ? 'text-emerald-400' : 'text-blue-400'}>Process Time: {totalProcessTime}min</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {view === 'current' && (
              <div className="w-72 flex-shrink-0 space-y-4" data-testid="panel-waste-detection">
                <div className="glass rounded-xl p-4">
                  <div className="text-xs font-semibold text-red-400 mb-3 flex items-center gap-2">
                    <AlertTriangle size={14} />
                    Détection de Gaspillages
                  </div>
                  {wastes.length === 0 ? (
                    <div className="text-[11px] text-zinc-500 text-center py-4">Aucun gaspillage détecté. Ajoutez des étapes pour démarrer l'analyse.</div>
                  ) : (
                    <div className="space-y-2">
                      {wastes.map((w, i) => {
                        const info = wasteIcons[w.type];
                        const Icon = info.icon;
                        return (
                          <div key={i} data-testid={`waste-item-${i}`} className={`rounded-lg p-2.5 ${w.severity === 'high' ? 'bg-red-500/10 border border-red-500/15' : 'bg-amber-500/10 border border-amber-500/15'}`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Icon size={10} className={info.color} />
                              <span className={`text-[10px] font-semibold ${info.color}`}>{info.label}</span>
                            </div>
                            <div className="text-[10px] text-zinc-300">{w.stepName}</div>
                            <div className="text-[9px] text-zinc-500 mt-0.5">{w.detail}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="glass rounded-xl p-4" data-testid="panel-lean-suggestions">
                  <div className="text-xs font-semibold text-blue-400 mb-3 flex items-center gap-2">
                    <Lightbulb size={14} />
                    Suggestions Lean
                  </div>
                  <div className="space-y-2">
                    {suggestions.map((s, i) => {
                      const Icon = s.icon;
                      return (
                        <div key={i} data-testid={`suggestion-item-${i}`} className="rounded-lg p-2.5 bg-blue-500/5 border border-blue-500/10">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon size={10} className="text-blue-400" />
                            <span className="text-[10px] font-semibold text-blue-300">{s.title}</span>
                          </div>
                          <div className="text-[9px] text-zinc-400 leading-relaxed">{s.detail}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="glass-strong rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{tr('vsm.add_step')}</h3>
              <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input data-testid="input-vsm-name" placeholder="Nom de l'étape" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500">Cycle Time (s)</label>
                  <input data-testid="input-vsm-ct" type="number" value={form.cycleTime || ''} onChange={e => setForm({ ...form, cycleTime: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500">Changeover (min)</label>
                  <input data-testid="input-vsm-co" type="number" value={form.changeoverTime || ''} onChange={e => setForm({ ...form, changeoverTime: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500">Uptime (%)</label>
                  <input type="number" value={form.uptime || 95} onChange={e => setForm({ ...form, uptime: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500">Opérateurs</label>
                  <input type="number" value={form.operators || 1} onChange={e => setForm({ ...form, operators: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500">WIP</label>
                  <input type="number" value={form.wip || 0} onChange={e => setForm({ ...form, wip: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500">Scrap Rate (%)</label>
                  <input data-testid="input-vsm-scrap" type="number" value={form.scrapRate || 0} onChange={e => setForm({ ...form, scrapRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500">{tr('kpi.dept')}</label>
                  <select value={form.dept || 'P1'} onChange={e => setForm({ ...form, dept: e.target.value as Dept })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none">
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500">Lead Time (min)</label>
                  <input type="number" value={form.leadTime || ''} onChange={e => setForm({ ...form, leadTime: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500">Process Time (min)</label>
                  <input type="number" value={form.processTime || ''} onChange={e => setForm({ ...form, processTime: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-zinc-400">{tr('common.cancel')}</button>
              <button data-testid="button-save-vsm" onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                <Save size={14} />
                {tr('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showContext && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowContext(false)}>
          <div className="glass-strong rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Contexte VSM</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400">Demande client (pcs/jour)</label>
                <input type="number" value={context.customerDemand} onChange={e => setContext({ ...context, customerDemand: Number(e.target.value) })}
                  className="w-full px-3 py-2 mt-1 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Takt Time (s)</label>
                <input type="number" value={context.taktTime} onChange={e => setContext({ ...context, taktTime: Number(e.target.value) })}
                  className="w-full px-3 py-2 mt-1 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Famille produit</label>
                <input value={context.productFamily} onChange={e => setContext({ ...context, productFamily: e.target.value })}
                  className="w-full px-3 py-2 mt-1 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Rotation</label>
                <input value={context.shiftPattern} onChange={e => setContext({ ...context, shiftPattern: e.target.value })}
                  className="w-full px-3 py-2 mt-1 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowContext(false)} className="px-4 py-2 text-sm text-zinc-400">{tr('common.cancel')}</button>
              <button onClick={saveContext} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                <Save size={14} className="inline mr-1" />
                {tr('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
