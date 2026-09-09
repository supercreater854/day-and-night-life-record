import { useRef, useState } from 'react';
import { formatDuration, minutesToTime, sleepMinutes, sleepScoreFor, starPoints, timeMinutes } from './model';
import { Moon } from './Clock';

const CENTER = 130, RADIUS = 91;
function point(minutes) {
  const angle = minutes / 1440 * Math.PI * 2;
  return { x: CENTER + Math.sin(angle) * RADIUS, y: CENTER - Math.cos(angle) * RADIUS };
}
function arc(start, end) {
  const duration = sleepMinutes(start, end);
  if (!duration) return '';
  const a = point(timeMinutes(start)), b = point(timeMinutes(end));
  return `M${a.x} ${a.y} A${RADIUS} ${RADIUS} 0 ${duration > 720 ? 1 : 0} 1 ${b.x} ${b.y}`;
}
function snap(value) { return Math.round(value / 15) * 15; }
function eventMinutes(event, svg) {
  const rect = svg.getBoundingClientRect();
  const x = event.clientX - rect.left - rect.width / 2;
  const y = event.clientY - rect.top - rect.height / 2;
  return ((Math.atan2(x, -y) / (Math.PI * 2) * 1440) + 1440) % 1440;
}

export default function SleepRangePicker({ start, end, onChange, onEdit }) {
  const svg = useRef(null);
  const drag = useRef(null);
  const [active, setActive] = useState('');
  const duration = sleepMinutes(start, end);
  const startPoint = point(timeMinutes(start)), endPoint = point(timeMinutes(end));
  function begin(event, kind) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { kind, initial: eventMinutes(event, svg.current), start: timeMinutes(start), end: timeMinutes(end) };
    setActive(kind);
  }
  function move(event) {
    if (!drag.current) return;
    const current = snap(eventMinutes(event, svg.current));
    if (drag.current.kind === 'start') onChange(minutesToTime(current), end);
    else if (drag.current.kind === 'end') onChange(start, minutesToTime(current));
    else {
      let delta = current - drag.current.initial;
      if (delta > 720) delta -= 1440;
      if (delta < -720) delta += 1440;
      delta = snap(delta);
      onChange(minutesToTime(drag.current.start + delta), minutesToTime(drag.current.end + delta));
    }
  }
  function stop() { drag.current = null; setActive(''); }
  return <div className="sleep-range-picker">
    <svg ref={svg} viewBox="0 0 260 260" onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} aria-label={`入睡 ${start}，起床 ${end}，睡眠 ${formatDuration(duration)}`}>
      <circle cx={CENTER} cy={CENTER} r={RADIUS} className="sleep-ring-track" />
      {[0, 6, 12, 18].map(hour => { const p = point(hour * 60); return <text key={hour} x={p.x} y={p.y} className="sleep-ring-hour">{hour}</text>; })}
      <path d={arc(start, end)} className={`sleep-ring-range ${active === 'range' ? 'is-active' : ''}`} onPointerDown={event => begin(event, 'range')} />
      <g className={`sleep-handle ${active === 'start' ? 'is-active' : ''}`} transform={`translate(${startPoint.x} ${startPoint.y})`} onPointerDown={event => begin(event, 'start')}>
        <circle r="22" className="sleep-handle-hit" /><Moon transform="scale(.25) rotate(-20)" fill="#334f77" stroke="#191c21" strokeWidth="10" />
      </g>
      <g className={`sleep-handle ${active === 'end' ? 'is-active' : ''}`} transform={`translate(${endPoint.x} ${endPoint.y})`} onPointerDown={event => begin(event, 'end')}>
        <circle r="22" className="sleep-handle-hit" /><polygon points={starPoints(0, 0, 13, .76, 10)} fill="#ffd45c" stroke="#191c21" strokeWidth="2" /><circle r="8" fill="#ffdc70" stroke="#191c21" strokeWidth="2" />
      </g>
      <text x="130" y="126" className="sleep-duration">{duration === null ? '—' : `${Math.floor(duration / 60)}小时${duration % 60 ? `${duration % 60}分` : ''}`}</text>
      <text x="130" y="149" className="sleep-score">睡眠 {duration === null ? '—' : sleepScoreFor(duration)} / 5</text>
    </svg>
    <div className="sleep-time-buttons"><button type="button" onClick={() => onEdit('start')}><span>入睡</span><strong>{start}</strong></button><span>→</span><button type="button" onClick={() => onEdit('end')}><span>起床</span><strong>{end}</strong></button></div>
  </div>;
}
