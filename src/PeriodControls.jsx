import { periodFor, shiftPeriod } from './model';

export default function PeriodControls({ scale, anchor, onScale, onAnchor, today, preserveAnchor = false, lockedScales = [], navigationLocked = false, onLocked }) {
  const period = periodFor(scale, anchor);
  const unit = { week: '周', month: '月', year: '年' }[scale];
  return <header className="period-controls">
    <div className="scale-options" role="group" aria-label="观察尺度">
      {Object.entries({ week: '周', month: '月', year: '年' }).map(([value, label]) => {
        const locked = lockedScales.includes(value);
        return <button key={value} className={locked ? 'is-locked' : ''} aria-pressed={scale === value} aria-label={locked ? `${label}，Pro 功能` : label} onClick={() => { if (locked) { onLocked?.(); return; } onScale(value); if (!preserveAnchor) onAnchor(today); }}>{label}{locked && <span aria-hidden="true">🔒</span>}</button>;
      })}
    </div>
    <div className="period-navigation">
      <button className={navigationLocked ? 'is-locked' : ''} aria-label={navigationLocked ? `历史${unit}，Pro 功能` : `上一${unit}`} onClick={() => navigationLocked ? onLocked?.() : onAnchor(shiftPeriod(scale, anchor, -1))}>‹</button>
      <span aria-live="polite">{period.label}</span>
      <button className={navigationLocked ? 'is-locked' : ''} aria-label={navigationLocked ? `历史${unit}，Pro 功能` : `下一${unit}`} onClick={() => navigationLocked ? onLocked?.() : onAnchor(shiftPeriod(scale, anchor, 1))}>›</button>
    </div>
  </header>;
}
