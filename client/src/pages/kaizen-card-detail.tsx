import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import type { Lang, KaizenCard, KaizenCategory, KaizenStatus, KaizenImpactLevel } from '@shared/schema';
import { KAIZEN_CATEGORIES, KAIZEN_STATUSES, KAIZEN_CATEGORY_COLORS, KAIZEN_STATUS_COLORS } from '@shared/schema';
import { storage } from '@/lib/storage';
import {
  ArrowLeft, Save, Upload, Camera, Star, Award, CheckCircle, Circle,
  FileDown, Image, Printer, Users, Calendar, MapPin, Wrench,
  TrendingUp, DollarSign, Shield, Heart, Clock, X
} from 'lucide-react';

interface KaizenCardDetailProps {
  id: string;
  lang: Lang;
}

function emptyCard(): KaizenCard {
  return {
    id: `kz-${Date.now()}`,
    title: '',
    plantName: 'LEONI Menzel Hayet',
    plantManager: 'M. Directeur Usine',
    opexTeam: [],
    submissionDate: new Date().toISOString().slice(0, 10),
    category: 'Productivity',
    area: '',
    ideaOwner: '',
    problemDescription: '',
    beforePhoto: '',
    cycleTimeBefore: 0,
    solutionDescription: '',
    afterPhoto: '',
    cycleTimeAfter: 0,
    timeSaving: 0,
    productivityGain: 0,
    qualityImprovement: '',
    ergonomicImprovement: '',
    costSaving: 0,
    implementationDate: '',
    responsiblePerson: '',
    teamMembers: [],
    areaAffected: '',
    equipmentUsed: '',
    supervisorApproval: false,
    opexApproval: false,
    plantManagerValidation: false,
    status: 'Submitted',
    impactLevel: 'Small',
    points: 10,
    comments: '',
  };
}

export default function KaizenCardDetail({ id, lang }: KaizenCardDetailProps) {
  const [, navigate] = useLocation();
  const isNew = id === 'new';
  const [card, setCard] = useState<KaizenCard | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [teamInput, setTeamInput] = useState('');
  const [opexInput, setOpexInput] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isNew) {
      setCard(emptyCard());
    } else {
      const all = storage.getKaizenCards();
      const found = all.find(k => k.id === id);
      setCard(found || null);
    }
  }, [id, isNew]);

  const updateField = <K extends keyof KaizenCard>(field: K, value: KaizenCard[K]) => {
    if (!card) return;
    setCard({ ...card, [field]: value });
    setDirty(true);
  };

  const saveCard = () => {
    if (!card || !card.title) return;
    const all = storage.getKaizenCards();
    if (isNew) {
      storage.setKaizenCards([...all, card]);
    } else {
      storage.setKaizenCards(all.map(k => k.id === card.id ? card : k));
    }
    setDirty(false);
    if (isNew) {
      navigate(`/ci/kaizen/${card.id}`);
    }
  };

  const handlePhotoUpload = (field: 'beforePhoto' | 'afterPhoto') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        updateField(field, reader.result as string);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const addTeamMember = () => {
    if (!teamInput.trim() || !card) return;
    updateField('teamMembers', [...card.teamMembers, teamInput.trim()]);
    setTeamInput('');
  };

  const removeTeamMember = (idx: number) => {
    if (!card) return;
    updateField('teamMembers', card.teamMembers.filter((_, i) => i !== idx));
  };

  const addOpexMember = () => {
    if (!opexInput.trim() || !card) return;
    updateField('opexTeam', [...card.opexTeam, opexInput.trim()]);
    setOpexInput('');
  };

  const exportText = () => {
    if (!card) return;
    const content = `
══════════════════════════════════════════════════════
  KAIZEN CARD
══════════════════════════════════════════════════════

Plant: ${card.plantName}
Plant Manager: ${card.plantManager}
OPEX Team: ${card.opexTeam.join(', ')}
Submission Date: ${card.submissionDate}

TITLE: ${card.title}
Category: ${card.category}
Area: ${card.area}
Idea Owner: ${card.ideaOwner}

── PROBLEM (BEFORE) ──
${card.problemDescription}
Cycle Time: ${card.cycleTimeBefore} min

── SOLUTION (AFTER) ──
${card.solutionDescription}
Cycle Time: ${card.cycleTimeAfter} min

── IMPACT MEASUREMENT ──
Time Saving: ${card.timeSaving} min
Productivity Gain: ${card.productivityGain}%
Quality: ${card.qualityImprovement}
Ergonomic: ${card.ergonomicImprovement}
Cost Saving: ${card.costSaving.toLocaleString()}€

── IMPLEMENTATION ──
Date: ${card.implementationDate}
Responsible: ${card.responsiblePerson}
Team: ${card.teamMembers.join(', ')}
Area Affected: ${card.areaAffected}
Equipment: ${card.equipmentUsed}

── VALIDATION ──
Supervisor: ${card.supervisorApproval ? '✓ Approved' : '○ Pending'}
OPEX: ${card.opexApproval ? '✓ Approved' : '○ Pending'}
Plant Manager: ${card.plantManagerValidation ? '✓ Approved' : '○ Pending'}
Status: ${card.status}

── REWARD ──
Impact Level: ${card.impactLevel}
Points: ${card.points}

${card.comments ? `── COMMENTS ──\n${card.comments}` : ''}

Generated: ${new Date().toLocaleString()}
══════════════════════════════════════════════════════`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kaizen-card-${card.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPrint = () => {
    if (!card) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const bulletsBefore = card.problemDescription
      ? card.problemDescription.split('\n').filter(l => l.trim()).map(l => `<div class="bullet"><span class="dot">•</span><span>${l.trim()}</span></div>`).join('')
      : '<div class="bullet"><span class="dot">•</span><span class="placeholder-line"></span></div><div class="bullet"><span class="dot">•</span><span class="placeholder-line"></span></div><div class="bullet"><span class="dot">•</span><span class="placeholder-line"></span></div>';

    const bulletsAfter = card.solutionDescription
      ? `<div class="bullet"><span class="dot">•</span><span><b>Implemented solution:</b></span></div>` +
        card.solutionDescription.split('\n').filter(l => l.trim()).map(l => `<div class="bullet"><span class="dot">•</span><span>${l.trim()}</span></div>`).join('')
      : '<div class="bullet"><span class="dot">•</span><span><b>Implemented solution:</b></span></div><div class="bullet"><span class="dot">•</span><span class="placeholder-line"></span></div><div class="bullet"><span class="dot">•</span><span class="placeholder-line"></span></div>';

    printWindow.document.write(`<!DOCTYPE html>
<html><head><title>KAIZEN CARD - ${card.title || 'Template'}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #333; width: 297mm; height: 210mm; overflow: hidden; }

  .card { width: 100%; height: 100%; display: flex; flex-direction: column; border: 2px solid #1a5276; }

  /* ─── BLUE HEADER ─── */
  .top-header {
    background: linear-gradient(135deg, #1a5276 0%, #2471a3 50%, #1a5276 100%);
    color: white;
    padding: 8px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 52px;
  }
  .top-header .opex-logo {
    background: white;
    color: #1a5276;
    font-weight: 900;
    font-size: 16px;
    padding: 4px 14px;
    border-radius: 20px;
    letter-spacing: 2px;
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .top-header .opex-logo .x { color: #e74c3c; }
  .top-header .title {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: 3px;
    text-transform: uppercase;
  }
  .top-header .leoni-text {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: 2px;
  }

  /* ─── META INFO BAR ─── */
  .meta-bar {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    border-bottom: 2px solid #1a5276;
    font-size: 11px;
  }
  .meta-bar .left, .meta-bar .right {
    padding: 8px 16px;
  }
  .meta-bar .right {
    border-left: 1px solid #ddd;
  }
  .meta-row {
    display: flex;
    align-items: baseline;
    margin-bottom: 3px;
    gap: 4px;
  }
  .meta-row .label {
    font-weight: 700;
    color: #1a5276;
    white-space: nowrap;
    min-width: 90px;
  }
  .meta-row .value {
    flex: 1;
    border-bottom: 1px solid #bbb;
    min-height: 14px;
    padding-bottom: 1px;
    font-size: 11px;
  }
  .meta-row .value.has-content {
    border-bottom-color: #333;
    color: #222;
  }

  /* ─── BEFORE / AFTER MAIN AREA ─── */
  .comparison {
    display: flex;
    flex: 1;
    gap: 0;
    padding: 8px 12px;
    min-height: 0;
  }
  .comparison .col {
    flex: 1;
    display: flex;
    flex-direction: column;
    margin: 0 4px;
  }
  .section-header {
    text-align: center;
    padding: 5px 0;
    font-size: 13px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 2px;
    border-radius: 4px 4px 0 0;
  }
  .section-header.before { background: #c0392b; color: white; }
  .section-header.after { background: #27ae60; color: white; }

  .section-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 6px 10px 8px 10px;
  }
  .section-body.before { border: 2.5px solid #c0392b; border-top: none; }
  .section-body.after { border: 2.5px solid #27ae60; border-top: none; }

  .photo-placeholder {
    width: 100%;
    height: 110px;
    background: #e8edf1;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #95a5a6;
    font-size: 10px;
    margin-bottom: 8px;
    overflow: hidden;
  }
  .photo-placeholder img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 4px;
  }

  .bullet {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 3px;
    font-size: 10.5px;
    line-height: 1.5;
  }
  .bullet .dot {
    font-size: 12px;
    color: #555;
    flex-shrink: 0;
  }
  .placeholder-line {
    display: inline-block;
    width: 90%;
    border-bottom: 1px solid #bbb;
    height: 12px;
  }

  .cycle-time {
    margin-top: auto;
    padding-top: 6px;
    font-size: 11px;
    font-weight: 700;
  }
  .cycle-time.before { color: #c0392b; }
  .cycle-time.after { color: #27ae60; }
  .cycle-time .val {
    display: inline-block;
    min-width: 40px;
    border-bottom: 1px solid #999;
    text-align: center;
    font-size: 12px;
  }

  /* ─── IMPACT RESULTS BAR ─── */
  .impact-bar {
    border-top: 2px solid #1a5276;
  }
  .impact-title {
    background: linear-gradient(135deg, #1a5276, #2471a3);
    color: white;
    text-align: center;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 2px;
    padding: 4px 0;
    text-transform: uppercase;
  }
  .impact-metrics {
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 6px 12px;
    border-bottom: 1px solid #ddd;
    font-size: 10px;
  }
  .impact-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .impact-icon {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: white;
    font-weight: bold;
    flex-shrink: 0;
  }
  .impact-item .label { font-weight: 700; color: #1a5276; }
  .impact-item .val {
    display: inline-block;
    min-width: 35px;
    border-bottom: 1px solid #999;
    text-align: center;
  }

  /* ─── FOOTER: IMPLEMENTATION + VALIDATION ─── */
  .footer-row {
    display: flex;
    min-height: 80px;
  }
  .footer-left, .footer-right {
    flex: 1;
    padding: 8px 14px;
    font-size: 10.5px;
  }
  .footer-right {
    border-left: 2px solid #1a5276;
  }
  .footer-section-title {
    font-weight: 800;
    font-size: 12px;
    color: #1a5276;
    margin-bottom: 5px;
    border-bottom: 1px solid #ddd;
    padding-bottom: 3px;
  }
  .footer-field {
    display: flex;
    align-items: baseline;
    gap: 4px;
    margin-bottom: 3px;
  }
  .footer-field .label {
    font-weight: 700;
    color: #555;
    white-space: nowrap;
  }
  .footer-field .val {
    flex: 1;
    border-bottom: 1px solid #bbb;
    min-height: 13px;
    font-size: 10px;
  }
  .footer-field .val.filled { border-bottom-color: #333; color: #222; }

  .validation-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
    font-size: 10.5px;
  }
  .validation-row .name { font-weight: 700; color: #1a5276; min-width: 90px; }
  .checkbox {
    width: 12px;
    height: 12px;
    border: 1.5px solid #999;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    margin-right: 2px;
  }
  .checkbox.checked { background: #27ae60; border-color: #27ae60; color: white; }
  .check-label { font-size: 10px; color: #555; margin-right: 10px; }

  /* ─── BOTTOM STRIP ─── */
  .bottom-strip {
    background: linear-gradient(135deg, #1a5276, #2471a3);
    color: white;
    text-align: center;
    font-size: 8px;
    padding: 3px 0;
    letter-spacing: 1px;
  }

  @media print {
    body { width: auto; height: auto; }
    .card { border: none; page-break-inside: avoid; }
  }
</style></head><body>
<div class="card">

  <div class="top-header">
    <div class="opex-logo">OPE<span class="x">X</span></div>
    <div class="title">KAIZEN CARD</div>
    <div class="leoni-text">LEONI</div>
  </div>

  <div class="meta-bar">
    <div class="left">
      <div class="meta-row">
        <span class="label">Plant:</span>
        <span class="value ${card.plantName ? 'has-content' : ''}">${card.plantName || ''}</span>
      </div>
      <div class="meta-row">
        <span class="label">Area / Line:</span>
        <span class="value ${card.area ? 'has-content' : ''}">${card.area || ''}</span>
      </div>
      <div style="display:flex;gap:12px;">
        <div class="meta-row" style="flex:1">
          <span class="label">Owner:</span>
          <span class="value ${card.ideaOwner ? 'has-content' : ''}">${card.ideaOwner || ''}</span>
        </div>
        <div class="meta-row" style="flex:1">
          <span class="label">Date:</span>
          <span class="value ${card.submissionDate ? 'has-content' : ''}">${card.submissionDate || ''}</span>
        </div>
      </div>
    </div>
    <div class="right">
      <div class="meta-row">
        <span class="label">Process / Machine:</span>
        <span class="value ${card.equipmentUsed ? 'has-content' : ''}">${card.equipmentUsed || ''}</span>
      </div>
      <div class="meta-row">
        <span class="label">Team Members:</span>
        <span class="value ${card.teamMembers.length > 0 ? 'has-content' : ''}">${card.teamMembers.join(', ') || ''}</span>
      </div>
      <div class="meta-row">
        <span class="label">Category:</span>
        <span class="value has-content" style="font-weight:600;">${card.category || ''}</span>
      </div>
    </div>
  </div>

  <div class="comparison">
    <div class="col">
      <div class="section-header before">CURRENT SITUATION (BEFORE)</div>
      <div class="section-body before">
        <div class="photo-placeholder">
          ${card.beforePhoto
            ? `<img src="${card.beforePhoto}" alt="Before" />`
            : '<span>[ Before Photo ]</span>'}
        </div>
        ${bulletsBefore}
        <div class="cycle-time before">
          Cycle Time Before: <span class="val">${card.cycleTimeBefore > 0 ? card.cycleTimeBefore : '______'}</span> min
        </div>
      </div>
    </div>
    <div class="col">
      <div class="section-header after">IMPROVEMENT (AFTER)</div>
      <div class="section-body after">
        <div class="photo-placeholder">
          ${card.afterPhoto
            ? `<img src="${card.afterPhoto}" alt="After" />`
            : '<span>[ After Photo ]</span>'}
        </div>
        ${bulletsAfter}
        <div class="cycle-time after">
          Cycle Time After: <span class="val">${card.cycleTimeAfter > 0 ? card.cycleTimeAfter : '______'}</span> min
        </div>
      </div>
    </div>
  </div>

  <div class="impact-bar">
    <div class="impact-title">IMPACT RESULTS</div>
    <div class="impact-metrics">
      <div class="impact-item">
        <div class="impact-icon" style="background:#2471a3;">⏱</div>
        <span class="label">Time Saving:</span>
        <span class="val">${card.timeSaving > 0 ? card.timeSaving : '____'}</span>
        <span>min</span>
      </div>
      <div class="impact-item">
        <div class="impact-icon" style="background:#c0392b;">📊</div>
        <span class="label">Productivity Gain:</span>
        <span class="val">${card.productivityGain > 0 ? card.productivityGain : '____'}</span>
        <span>%</span>
      </div>
      <div class="impact-item">
        <div class="impact-icon" style="background:#27ae60;">✓</div>
        <span class="label">Quality:</span>
        <span class="val">${card.qualityImprovement || '____________'}</span>
      </div>
      <div class="impact-item">
        <div class="impact-icon" style="background:#8e44ad;">♿</div>
        <span class="label">Ergonomic:</span>
        <span class="val">${card.ergonomicImprovement || '____________'}</span>
      </div>
      <div class="impact-item">
        <div class="impact-icon" style="background:#27ae60;">€</div>
        <span class="label">Cost Saving:</span>
        <span class="val">${card.costSaving > 0 ? card.costSaving.toLocaleString() + '€' : '______'}</span>
      </div>
    </div>
  </div>

  <div class="footer-row">
    <div class="footer-left">
      <div class="footer-section-title">Implementation Details</div>
      <div class="footer-field">
        <span class="label">Responsible:</span>
        <span class="val ${card.responsiblePerson ? 'filled' : ''}">${card.responsiblePerson || ''}</span>
      </div>
      <div class="footer-field">
        <span class="label">Implementation Date:</span>
        <span class="val ${card.implementationDate ? 'filled' : ''}">${card.implementationDate || ''}</span>
      </div>
      <div style="height:4px;"></div>
      <div class="footer-field">
        <span class="label">Tools / Equipment:</span>
        <span class="val ${card.equipmentUsed ? 'filled' : ''}">${card.equipmentUsed || ''}</span>
      </div>
      <div class="footer-field">
        <span class="dot" style="margin-left:2px;color:#555;">•</span>
        <span class="val ${card.areaAffected ? 'filled' : ''}">${card.areaAffected || ''}</span>
      </div>
    </div>
    <div class="footer-right">
      <div class="footer-section-title">Validation</div>
      <div class="validation-row">
        <span class="name">• Supervisor:</span>
        <span class="checkbox ${card.supervisorApproval ? 'checked' : ''}">${card.supervisorApproval ? '✓' : ''}</span>
        <span class="check-label">Approved</span>
        <span class="checkbox ${!card.supervisorApproval ? 'checked' : ''}">${!card.supervisorApproval ? '✓' : ''}</span>
        <span class="check-label">Pending</span>
      </div>
      <div class="validation-row">
        <span class="name">• OPEX:</span>
        <span class="checkbox ${card.opexApproval ? 'checked' : ''}">${card.opexApproval ? '✓' : ''}</span>
        <span class="check-label">Approved</span>
        <span class="checkbox ${!card.opexApproval ? 'checked' : ''}">${!card.opexApproval ? '✓' : ''}</span>
        <span class="check-label">Pending</span>
      </div>
      <div class="validation-row">
        <span class="name">• Plant Manager:</span>
        <span class="checkbox ${card.plantManagerValidation ? 'checked' : ''}">${card.plantManagerValidation ? '✓' : ''}</span>
        <span class="check-label">Approved</span>
        <span class="checkbox ${!card.plantManagerValidation ? 'checked' : ''}">${!card.plantManagerValidation ? '✓' : ''}</span>
        <span class="check-label">Pending</span>
      </div>
    </div>
  </div>

  <div class="bottom-strip">Generated by: OPEX Continuous Improvement System</div>

</div>
</body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  if (!card) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-zinc-500 mb-4">Kaizen card not found</p>
        <button onClick={() => navigate('/ci')} className="text-emerald-400 text-sm hover:underline">← Back to CI Hub</button>
      </div>
    );
  }

  const impactPoints: Record<KaizenImpactLevel, number> = { Small: 10, Medium: 30, Major: 75 };

  return (
    <div className="space-y-4" dir={lang === 'ar' ? 'rtl' : 'ltr'} ref={cardRef}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button data-testid="button-back-kaizen" onClick={() => navigate('/ci')} className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 data-testid="text-kaizen-title" className="text-xl font-bold text-white flex items-center gap-2">
              {card.status === 'Best Kaizen' && <Star size={18} className="text-yellow-400" />}
              {isNew ? 'New Kaizen Card' : card.title || 'Untitled'}
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">Digital Kaizen Card System</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="button-export-kaizen" onClick={() => setShowExport(!showExport)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
            <FileDown size={12} />
            Export
          </button>
          <button data-testid="button-save-kaizen" onClick={saveCard}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg transition-colors ${
              dirty ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-white/5 text-zinc-500'
            }`}>
            <Save size={14} />
            {isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>

      {showExport && (
        <div className="glass rounded-xl p-4 flex items-center gap-3">
          <span className="text-xs text-zinc-400">Export as:</span>
          <button onClick={exportPrint} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg">
            <Printer size={12} />
            Print / PDF (A4)
          </button>
          <button onClick={exportText} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg">
            <FileDown size={12} />
            Text Export
          </button>
        </div>
      )}

      <div className="p-1.5 rounded-xl flex items-center justify-between" style={{ backgroundColor: `${KAIZEN_STATUS_COLORS[card.status]}12`, border: `1px solid ${KAIZEN_STATUS_COLORS[card.status]}30` }}>
        <div className="flex items-center gap-3 px-3">
          <span className="text-sm font-bold" style={{ color: KAIZEN_STATUS_COLORS[card.status] }}>
            {card.status === 'Best Kaizen' ? '★ ' : ''}{card.status}
          </span>
          <span className="text-[10px] text-zinc-500">|</span>
          <span className="px-2 py-0.5 rounded text-[10px] border"
            style={{ borderColor: `${KAIZEN_CATEGORY_COLORS[card.category]}30`, color: KAIZEN_CATEGORY_COLORS[card.category] }}>
            {card.category}
          </span>
          <div className="flex items-center gap-1">
            <Award size={12} className="text-yellow-400" />
            <span className="text-xs text-yellow-400 font-mono">{card.points} pts</span>
          </div>
        </div>
        <select
          data-testid="select-kaizen-status"
          value={card.status}
          onChange={e => updateField('status', e.target.value as KaizenStatus)}
          className="px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-zinc-300 outline-none mr-2"
        >
          {KAIZEN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 space-y-3">
          <h3 className="text-xs text-zinc-500 uppercase tracking-wider flex items-center gap-1.5"><MapPin size={10} />Card Information</h3>
          <div>
            <label className="text-[10px] text-zinc-600">Title</label>
            <input data-testid="input-kaizen-title" value={card.title} onChange={e => updateField('title', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-600">Category</label>
              <select data-testid="select-kaizen-category" value={card.category} onChange={e => updateField('category', e.target.value as KaizenCategory)}
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none">
                {KAIZEN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-zinc-600">Area / Line</label>
              <input value={card.area} onChange={e => updateField('area', e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-600">Idea Owner</label>
              <input data-testid="input-kaizen-owner" value={card.ideaOwner} onChange={e => updateField('ideaOwner', e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-600">Submission Date</label>
              <input type="date" value={card.submissionDate} onChange={e => updateField('submissionDate', e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-600">Plant</label>
            <input value={card.plantName} onChange={e => updateField('plantName', e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-600">OPEX Team</label>
            <div className="flex flex-wrap gap-1 mb-1">
              {card.opexTeam.map((m, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-zinc-300 flex items-center gap-1">
                  {m}
                  <button onClick={() => updateField('opexTeam', card.opexTeam.filter((_, idx) => idx !== i))} className="text-zinc-500 hover:text-red-400"><X size={8} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input value={opexInput} onChange={e => setOpexInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOpexMember()}
                placeholder="Add member" className="flex-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-zinc-200 outline-none" />
              <button onClick={addOpexMember} className="px-2 py-1 bg-white/5 text-zinc-400 rounded text-[10px]">+</button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <h3 className="text-xs text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-500/20 flex items-center justify-center text-[8px] text-red-400">B</span>
              Problem Description (BEFORE)
            </h3>
            <textarea
              data-testid="input-kaizen-problem"
              value={card.problemDescription}
              onChange={e => updateField('problemDescription', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/10 text-xs text-zinc-300 outline-none h-20 resize-none"
              placeholder="Describe the problem / current situation..."
            />
            <div className="mt-2">
              <label className="text-[10px] text-zinc-600">Cycle Time Before (min)</label>
              <input type="number" step="0.1" value={card.cycleTimeBefore || ''} onChange={e => updateField('cycleTimeBefore', Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
            </div>
            <div className="mt-2">
              {card.beforePhoto ? (
                <div className="relative">
                  <img src={card.beforePhoto} alt="Before" className="w-full h-28 object-cover rounded-lg border border-red-500/20" />
                  <button onClick={() => updateField('beforePhoto', '')} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded text-zinc-400 hover:text-red-400"><X size={12} /></button>
                </div>
              ) : (
                <button data-testid="button-upload-before" onClick={() => handlePhotoUpload('beforePhoto')}
                  className="w-full h-20 rounded-lg border border-dashed border-red-500/20 flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-red-400 hover:border-red-500/40 transition-colors">
                  <Camera size={16} />
                  <span className="text-[10px]">Upload Before Photo</span>
                </button>
              )}
            </div>
          </div>

          <div className="glass rounded-xl p-4">
            <h3 className="text-xs text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500/20 flex items-center justify-center text-[8px] text-emerald-400">A</span>
              Improvement Solution (AFTER)
            </h3>
            <textarea
              data-testid="input-kaizen-solution"
              value={card.solutionDescription}
              onChange={e => updateField('solutionDescription', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-xs text-zinc-300 outline-none h-20 resize-none"
              placeholder="Describe the improvement / solution..."
            />
            <div className="mt-2">
              <label className="text-[10px] text-zinc-600">Cycle Time After (min)</label>
              <input type="number" step="0.1" value={card.cycleTimeAfter || ''} onChange={e => updateField('cycleTimeAfter', Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
            </div>
            <div className="mt-2">
              {card.afterPhoto ? (
                <div className="relative">
                  <img src={card.afterPhoto} alt="After" className="w-full h-28 object-cover rounded-lg border border-emerald-500/20" />
                  <button onClick={() => updateField('afterPhoto', '')} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded text-zinc-400 hover:text-red-400"><X size={12} /></button>
                </div>
              ) : (
                <button data-testid="button-upload-after" onClick={() => handlePhotoUpload('afterPhoto')}
                  className="w-full h-20 rounded-lg border border-dashed border-emerald-500/20 flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors">
                  <Camera size={16} />
                  <span className="text-[10px]">Upload After Photo</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <TrendingUp size={10} />
              Impact Measurement
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded bg-white/[0.02] text-center">
                <p className="text-lg font-bold text-blue-400 font-mono">{card.timeSaving}</p>
                <p className="text-[8px] text-zinc-500 uppercase">min saved</p>
              </div>
              <div className="p-2 rounded bg-white/[0.02] text-center">
                <p className="text-lg font-bold text-emerald-400 font-mono">{card.productivityGain}%</p>
                <p className="text-[8px] text-zinc-500 uppercase">productivity</p>
              </div>
            </div>
            <div className="p-2 rounded bg-white/[0.02] text-center mt-2">
              <p className="text-lg font-bold text-yellow-400 font-mono">{card.costSaving.toLocaleString()}€</p>
              <p className="text-[8px] text-zinc-500 uppercase">cost saving</p>
            </div>
            <div className="space-y-2 mt-3">
              <div>
                <label className="text-[10px] text-zinc-600">Time Saving (min)</label>
                <input type="number" step="0.1" value={card.timeSaving || ''} onChange={e => updateField('timeSaving', Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-600">Productivity Gain (%)</label>
                <input type="number" step="0.1" value={card.productivityGain || ''} onChange={e => updateField('productivityGain', Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-600">Cost Saving (€)</label>
                <input type="number" value={card.costSaving || ''} onChange={e => updateField('costSaving', Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-600">Quality Improvement</label>
                <input value={card.qualityImprovement} onChange={e => updateField('qualityImprovement', e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" placeholder="e.g. Defects reduced by 15%" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-600">Ergonomic Improvement</label>
                <input value={card.ergonomicImprovement} onChange={e => updateField('ergonomicImprovement', e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" placeholder="e.g. Reduced strain" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4">
          <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Wrench size={10} />
            Implementation Details
          </h3>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-zinc-600">Implementation Date</label>
              <input type="date" value={card.implementationDate} onChange={e => updateField('implementationDate', e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-600">Responsible Person</label>
              <input value={card.responsiblePerson} onChange={e => updateField('responsiblePerson', e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-600">Area Affected</label>
              <input value={card.areaAffected} onChange={e => updateField('areaAffected', e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-600">Equipment Used</label>
              <input value={card.equipmentUsed} onChange={e => updateField('equipmentUsed', e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-600">Team Members</label>
              <div className="flex flex-wrap gap-1 mb-1">
                {card.teamMembers.map((m, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-zinc-300 flex items-center gap-1">
                    {m}
                    <button onClick={() => removeTeamMember(i)} className="text-zinc-500 hover:text-red-400"><X size={8} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <input data-testid="input-kaizen-team" value={teamInput} onChange={e => setTeamInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTeamMember()}
                  placeholder="Add member" className="flex-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-zinc-200 outline-none" />
                <button onClick={addTeamMember} className="px-2 py-1 bg-white/5 text-zinc-400 rounded text-[10px]">+</button>
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-4">
          <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Shield size={10} />
            Validation & Approval
          </h3>
          <div className="space-y-3">
            <button
              data-testid="button-supervisor-approval"
              onClick={() => updateField('supervisorApproval', !card.supervisorApproval)}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              {card.supervisorApproval ? (
                <CheckCircle size={16} className="text-emerald-400" />
              ) : (
                <Circle size={16} className="text-zinc-600" />
              )}
              <div className="text-left">
                <p className={`text-xs ${card.supervisorApproval ? 'text-emerald-400' : 'text-zinc-400'}`}>Supervisor Approval</p>
                <p className="text-[10px] text-zinc-600">{card.supervisorApproval ? 'Approved' : 'Pending'}</p>
              </div>
            </button>
            <button
              data-testid="button-opex-approval"
              onClick={() => updateField('opexApproval', !card.opexApproval)}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              {card.opexApproval ? (
                <CheckCircle size={16} className="text-emerald-400" />
              ) : (
                <Circle size={16} className="text-zinc-600" />
              )}
              <div className="text-left">
                <p className={`text-xs ${card.opexApproval ? 'text-emerald-400' : 'text-zinc-400'}`}>OPEX Approval</p>
                <p className="text-[10px] text-zinc-600">{card.opexApproval ? 'Approved' : 'Pending'}</p>
              </div>
            </button>
            <button
              data-testid="button-pm-validation"
              onClick={() => updateField('plantManagerValidation', !card.plantManagerValidation)}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              {card.plantManagerValidation ? (
                <CheckCircle size={16} className="text-emerald-400" />
              ) : (
                <Circle size={16} className="text-zinc-600" />
              )}
              <div className="text-left">
                <p className={`text-xs ${card.plantManagerValidation ? 'text-emerald-400' : 'text-zinc-400'}`}>Plant Manager Validation</p>
                <p className="text-[10px] text-zinc-600">{card.plantManagerValidation ? 'Validated' : 'Pending'}</p>
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Award size={10} className="text-yellow-400" />
              Reward System
            </h3>
            <div>
              <label className="text-[10px] text-zinc-600">Impact Level</label>
              <select
                data-testid="select-impact-level"
                value={card.impactLevel}
                onChange={e => {
                  const level = e.target.value as KaizenImpactLevel;
                  updateField('impactLevel', level);
                  updateField('points', impactPoints[level]);
                }}
                className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-xs text-zinc-200 outline-none"
              >
                <option value="Small">Small Improvement (10 pts)</option>
                <option value="Medium">Medium Improvement (30 pts)</option>
                <option value="Major">Major Improvement (75 pts)</option>
              </select>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10 text-center">
              <Award size={20} className="text-yellow-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-yellow-400 font-mono">{card.points}</p>
              <p className="text-[8px] text-zinc-500 uppercase">Kaizen Points</p>
            </div>
          </div>

          <div className="glass rounded-xl p-4">
            <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Comments</h3>
            <textarea
              data-testid="input-kaizen-comments"
              value={card.comments}
              onChange={e => updateField('comments', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-300 outline-none h-20 resize-none"
              placeholder="Management comments, validation notes..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
