import { periodFor, shiftPeriod } from './model';

export default function PeriodControls({ scale, anchor, onScale, onAnchor, today, preserveAnchor = false }) {
  const period = periodFor(scale, anchor);
  const unit = { week: '周', month: '月', year: '年' }[scale];
  return <header className="period-controls">
    <div className="scale-options" role="group" aria-label="观察尺度">
      {Object.entries({ week: '周', month: '月', year: '年' }).map(([value, label]) => <button key={value} aria-pressed={scale === value} onClick={() => { onScale(value); if (!preserveAnchor) onAnchor(today); }}>{label}</button>)}
    </div>
    <div className="period-navigation">
      <button aria-label={`上一${unit}`} onClick={() => onAnchor(shiftPeriod(scale, anchor, -1))}>‹</button>
      <span aria-live="polite">{period.label}</span>
      <button aria-label={`下一${unit}`} onClick={() => onAnchor(shiftPeriod(scale, anchor, 1))}>›</button>
    </div>
  </header>;
}
