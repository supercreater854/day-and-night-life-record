import { useEffect, useRef } from 'react';
import { minutesToTime, timeMinutes } from './model';

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = [0, 15, 30, 45];
const ITEM_HEIGHT = 48;

function WheelColumn({ label, values, value, onChange }) {
  const ref = useRef(null);
  const timer = useRef(null);
  useEffect(() => {
    const element = ref.current;
    if (element) element.scrollTop = values.indexOf(value) * ITEM_HEIGHT;
  }, [value, values]);
  function settle() {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const index = Math.max(0, Math.min(values.length - 1, Math.round(ref.current.scrollTop / ITEM_HEIGHT)));
      ref.current.scrollTo({ top: index * ITEM_HEIGHT });
      onChange(values[index]);
    }, 80);
  }
  function keyboard(event) {
    const direction = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    const index = Math.max(0, Math.min(values.length - 1, values.indexOf(value) + direction));
    onChange(values[index]);
  }
  return <div className="wheel-column-wrap">
    <span>{label}</span>
    <div ref={ref} className="wheel-column" tabIndex="0" role="listbox" aria-label={label} onScroll={settle} onKeyDown={keyboard}>
      <i aria-hidden="true" />
      {values.map(item => <button type="button" role="option" aria-selected={item === value} key={item} onClick={() => onChange(item)}>{String(item).padStart(2, '0')}</button>)}
      <i aria-hidden="true" />
    </div>
  </div>;
}

export default function TimeWheel({ label, value, onChange, onClose }) {
  const total = timeMinutes(value) ?? 0;
  const hour = Math.floor(total / 60), minute = total % 60;
  const update = (nextHour, nextMinute) => onChange(minutesToTime(nextHour * 60 + nextMinute));
  return <div className="time-wheel-layer" role="dialog" aria-modal="true" aria-label={`${label}时间选择`}>
    <button className="time-wheel-shade" aria-label="关闭时间选择" onClick={onClose} />
    <section className="time-wheel-sheet">
      <header><div><small>{label}</small><strong>{value}</strong></div><button type="button" onClick={onClose}>完成</button></header>
      <div className="wheel-picker"><div className="wheel-selection" aria-hidden="true" />
        <WheelColumn label="小时" values={HOURS} value={hour} onChange={next => update(next, minute)} />
        <span className="wheel-colon" aria-hidden="true">:</span>
        <WheelColumn label="分钟" values={MINUTES} value={minute} onChange={next => update(hour, next)} />
      </div>
    </section>
  </div>;
}
