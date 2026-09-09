import { useEffect, useMemo, useState } from 'react';
import { annualPositions, calculateDayScore, deriveStarAppearance, hasData, localDate, periodFor, starPoints } from './model';
import PeriodControls from './PeriodControls';
import { useMapCamera } from './motion';
import SpaceEffects from './SpaceEffects';

function crop(points) {
  const left = Math.min(...points.map(p => p.x)) - 38, top = Math.min(...points.map(p => p.y)) - 46;
  const width = Math.max(160, Math.max(...points.map(p => p.x)) - left + 38);
  const height = Math.max(185, Math.max(...points.map(p => p.y)) - top + 60);
  return `${left} ${top} ${width} ${height}`;
}

export default function StarMap({ records, today, onDay, initialScale = 'year', arrivalDate = null, returned, effectsPaused }) {
  const [scale, setScale] = useState(initialScale);
  const [anchor, setAnchor] = useState(today);
  const [highlight, setHighlight] = useState(true);
  const [returnHighlight, setReturnHighlight] = useState(null);
  useEffect(() => {
    if (!returned) return;
    setReturnHighlight(returned.date);
    document.querySelector(`[data-date="${returned.date}"]`)?.focus({ preventScroll: true });
    const timer = setTimeout(() => setReturnHighlight(null), 1400);
    return () => clearTimeout(timer);
  }, [returned]);
  useEffect(() => { const timer = setTimeout(() => setHighlight(false), 6000); return () => clearTimeout(timer); }, [anchor, scale]);
  const period = useMemo(() => periodFor(scale, anchor), [scale, anchor]);
  const yearPositions = useMemo(() => annualPositions(localDate(anchor).getFullYear()), [anchor]);
  const positions = useMemo(() => {
    if (scale === 'year') return yearPositions;
    const years = [...new Set(period.days.map(date => localDate(date).getFullYear()))];
    return years.flatMap(annualPositions).filter(p => p.date >= period.start && p.date <= period.end);
  }, [period, scale, yearPositions]);
  const viewBox = scale === 'year' ? '0 0 640 960' : crop(positions);
  const camera = useMapCamera(viewBox);
  const scores = useMemo(() => Object.fromEntries(Object.entries(records).map(([date, record]) => [date, calculateDayScore(record)])), [records]);
  const connections = useMemo(() => positions.flatMap((p, index) => {
    if (!index || index % 2 !== 0) return [];
    const near = positions.slice(0, index).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    return near && Math.hypot(near.x - p.x, near.y - p.y) < 130 ? [{ a: near, b: p }] : [];
  }), [positions]);
  const arrivalConnection = useMemo(() => {
    if (!arrivalDate || scores[arrivalDate]?.dayScore == null) return null;
    const current = positions.find(point => point.date === arrivalDate);
    const previous = [...positions].reverse().find(point => point.date < arrivalDate && scores[point.date]?.dayScore != null);
    return current && previous ? { a: previous, b: current } : null;
  }, [arrivalDate, positions, scores]);
  function activate(date, direct = true) {
    if (scale === 'week' || (direct && hasData(records[date]))) onDay(date);
    else { setAnchor(date); setScale(scale === 'year' ? 'month' : 'week'); setHighlight(true); }
  }
  function nearby(event) {
    if (scale === 'week') return;
    const svg = event.currentTarget, matrix = svg.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const available = positions.filter(p => p.date <= today);
    const nearest = available.sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y))[0];
    if (nearest && Math.hypot(nearest.x - point.x, nearest.y - point.y) < (scale === 'year' ? 80 : 50)) activate(nearest.date, false);
  }
  function locateToday() { setAnchor(today); setScale('week'); setHighlight(true); }
  return <>
    <PeriodControls scale={scale} anchor={anchor} preserveAnchor onScale={value => { setScale(value); setHighlight(true); }} onAnchor={setAnchor} today={today} />
    <main className={`map-main map-${scale}`} aria-label={`${period.label}星图`}>
      <SpaceEffects paused={effectsPaused} />
      <svg ref={camera} className="star-map" viewBox={viewBox} onClick={nearby} aria-label={`${period.days.length} 个每日星位`}>
        <g stroke="#b8c9e2" strokeWidth=".7">
          {connections.map(({ a, b }) => {
            const first = scores[a.date]?.dayScore, second = scores[b.date]?.dayScore;
            const opacity = first != null && second != null ? .12 + ((first + second) / 2) / 100 * .3 : .035;
            return <line key={b.date} x1={a.x} y1={a.y} x2={b.x} y2={b.y} opacity={opacity} />;
          })}
          {arrivalConnection && <line className="new-connection" x1={arrivalConnection.a.x} y1={arrivalConnection.a.y} x2={arrivalConnection.b.x} y2={arrivalConnection.b.y} opacity=".5" pathLength="1" />}
        </g>
        {positions.map(p => {
          const record = records[p.date];
          const day = scores[p.date] ?? calculateDayScore(record);
          const appearance = deriveStarAppearance(day.dayScore, day.completeness);
          const lit = appearance.complete;
          const canOpen = p.date <= today;
          const base = scale === 'year' ? 11 : scale === 'month' ? 8 : 9;
          const radius = lit ? base * appearance.size : scale === 'week' ? 7 : 3.4;
          const action = hasData(record) ? '日记' : scale === 'year' ? '放大月份' : scale === 'month' ? '放大这一周' : '日记';
          const phase = (localDate(p.date).getDate() * 137) % 1000;
          return <g key={p.date} data-date={p.date} data-lit={String(lit)} data-score={day.dayScore ?? ''} data-completeness={day.completeness}
            role={canOpen ? 'button' : undefined} tabIndex={canOpen ? 0 : undefined} aria-label={canOpen ? `${p.date} ${action}` : undefined}
            className={canOpen ? `daily-star ${returnHighlight === p.date ? 'returned-star' : ''} ${arrivalDate === p.date ? 'arrival-star' : ''}` : undefined} onClick={canOpen ? event => { event.stopPropagation(); activate(p.date); } : undefined}
            onKeyDown={canOpen ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(p.date); } } : undefined}>
            <title>{p.date}{day.dayScore == null ? ` · 已记录 ${day.completeness}/3 项` : ` · 综合 ${day.dayScore} 分`}</title>
            {canOpen && <circle className="star-hit-area" cx={p.x} cy={p.y} r={scale === 'week' ? 18 : 12} fill="transparent" />}
            {lit && appearance.halo > 0 && <circle className="data-star-halo" cx={p.x} cy={p.y} r={radius + (scale === 'year' ? 4 : 7)} fill="none" stroke={appearance.color} strokeWidth={scale === 'year' ? 1 : 1.5} opacity={appearance.halo} style={{ '--twinkle-time': `${appearance.twinkle}s`, '--twinkle-delay': `-${phase}ms` }} pointerEvents="none" />}
            <g className={`star-visual ${lit ? 'is-twinkling' : 'is-partial'}`} style={{ transformOrigin: `${p.x}px ${p.y}px`, '--twinkle-time': `${appearance.twinkle || 8}s`, '--twinkle-delay': `-${phase}ms` }}><polygon className="star-shape" points={starPoints(0, 0, 10)} style={{ transform: `translate(${p.x}px, ${p.y}px) scale(${radius / 10})`, opacity: lit ? appearance.brightness : scale === 'week' ? .28 : .065 }} fill={appearance.color} stroke={appearance.stroke} strokeWidth={lit ? .8 : .9} strokeLinejoin="round" pointerEvents="none" />
              {!lit && Array.from({ length: day.completeness }, (_, index) => <circle key={index} cx={p.x - 2 + index * 4} cy={p.y + radius + 4} r={scale === 'year' ? .8 : 1.3} fill="#b9c9e1" opacity=".5" />)}
            </g>
            {returnHighlight === p.date && <circle className="return-ring" cx={p.x} cy={p.y} r={radius + 8} fill="none" stroke="#ffe4a0" strokeWidth=".8" pointerEvents="none" />}
            {p.date === today && highlight && <g className={`today-location ${arrivalDate === p.date ? 'is-arriving' : ''}`} pointerEvents="none"><circle cx={p.x} cy={p.y} r={Math.max(radius + 5, 14)} fill="none" stroke="#ffe4a0" strokeWidth=".7" strokeDasharray="2 4" opacity=".7" />{scale !== 'week' && <text x={p.x} y={p.y - Math.max(radius + 11, 22)} textAnchor="middle">今天</text>}</g>}
            {scale === 'week' && <text x={p.x} y={p.y + Math.max(radius + 14, 27)} textAnchor="middle" className="star-date">{p.date.slice(5).replace('-', '.')}{p.date === today ? ' · 今天' : ''}</text>}
          </g>;
        })}
      </svg>
    </main>
    {scale === 'week' && <div className="week-day-picker" aria-label="选择日期">{period.days.map(date => <button key={date} disabled={date > today} aria-label={`打开 ${date} 日记`} onClick={() => onDay(date)}><span>{'日一二三四五六'[localDate(date).getDay()]}</span><b>{Number(date.slice(-2))}</b></button>)}</div>}
    <div className="map-tools"><span>{scale === 'year' ? '轻点星群，放大看看' : scale === 'month' ? '轻点星星，靠近这一周' : '轻点星星，打开这一天'}</span><button onClick={locateToday}>回到今天 ↗</button></div>
  </>;
}

