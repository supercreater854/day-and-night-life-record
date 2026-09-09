import { useEffect, useMemo, useRef, useState } from 'react';
import { calculateDayScore, deriveStarAppearance, localDate, periodFor, starPoints } from './model';
import PeriodControls from './PeriodControls';
import MoodFace from './MoodFace';
import { machineResult } from './statisticsModel';
import './statistics.css';

const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

function aggregate(date, label, records) {
  const rows = records.filter(Boolean);
  const sleepScore = mean(rows.map(row => row.sleepScore).filter(value => value != null));
  const mealScore = mean(rows.map(row => row.mealScore).filter(value => value != null));
  const mood = mean(rows.map(row => row.mood).filter(value => value != null));
  const complete = rows.map(calculateDayScore).filter(value => value.dayScore != null);
  return { date, label, sleepScore, mealScore, mood, dayScore: mean(complete.map(value => value.dayScore)), completeness: [sleepScore, mealScore, mood].filter(value => value != null).length };
}

function dayEntry(date, record) {
  const day = localDate(date), score = calculateDayScore(record);
  return { date, label: `${day.getMonth() + 1}.${String(day.getDate()).padStart(2, '0')}`, weekday: weekdays[day.getDay()], ...record, ...score };
}

function SunIcon() { return <svg viewBox="0 0 64 64" aria-hidden="true"><polygon points={starPoints(32, 32, 29, .7, 10)} /><circle cx="32" cy="32" r="17" /></svg>; }
function MoonIcon() { return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M42 7C19 6 9 22 12 39s21 28 41 18C31 53 25 27 42 7Z" /></svg>; }
function StarIcon() { return <svg viewBox="0 0 64 64" aria-hidden="true"><polygon points={starPoints(32, 32, 27)} /></svg>; }

function ResultStar({ entry, compact = false }) {
  const appearance = deriveStarAppearance(entry?.dayScore, entry?.completeness ?? 0);
  const radius = (compact ? 13 : 29) * appearance.size;
  return <svg className={`result-star ${appearance.complete ? 'is-complete' : 'is-partial'}`} viewBox="-55 -55 110 110" aria-hidden="true">
    {appearance.halo > 0 && <circle r={radius + 9} fill="none" stroke={appearance.color} strokeWidth="3" opacity={appearance.halo} />}
    <polygon points={starPoints(0, 0, radius)} fill={appearance.color} stroke={appearance.stroke} strokeWidth={compact ? 2 : 3} opacity={appearance.brightness} />
    {!appearance.complete && Array.from({ length: appearance.markers }, (_, index) => <circle key={index} cx={-5 + index * 10} cy="40" r="2.5" fill="#191c21" />)}
  </svg>;
}

function Reel({ kind, value, phase }) {
  const Icon = kind === 'meal' ? SunIcon : kind === 'sleep' ? MoonIcon : StarIcon;
  const label = kind === 'meal' ? '吃饭' : kind === 'sleep' ? '睡眠' : '心情';
  return <div className={`machine-reel reel-${kind} phase-${phase}`}><div className="reel-track" aria-hidden="true"><span>—</span><span>5</span><span>2</span><span>4</span><span>1</span><span>3</span></div><div className="reel-window"><Icon /><strong>{value == null ? '—' : Number(value.toFixed(1))}</strong><small>/ 5</small></div><span className="reel-label">{label}</span></div>;
}

function RevealMachine({ entry, onRevealed }) {
  const [phase, setPhase] = useState('ready');
  const timers = useRef([]);
  useEffect(() => { setPhase('ready'); timers.current.forEach(clearTimeout); }, [entry?.date]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  function pull() {
    if (phase === 'spinning') return;
    setPhase('spinning');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    timers.current = [setTimeout(() => { setPhase('revealed'); onRevealed(); }, reduced ? 0 : 1250)];
  }
  const missing = machineResult(entry).missing;
  return <section className={`reveal-machine machine-${phase}`} aria-label="真实数据揭晓台">
    <div className="machine-top"><span>DAY &amp; NIGHT</span><strong>{entry?.date || '选择一天'}</strong></div>
    <div className="machine-body"><div className="machine-reels"><Reel kind="meal" value={entry?.mealScore} phase={phase} /><Reel kind="sleep" value={entry?.sleepScore} phase={phase} /><Reel kind="mood" value={entry?.mood} phase={phase} /></div>
      <button className="machine-lever" onClick={pull} aria-label={phase === 'revealed' ? '再看一次真实结果' : '拉下摇杆揭晓真实结果'}><span className="lever-knob" /><span className="lever-arm" /></button>
      <div className="machine-result"><ResultStar entry={entry} /><div><strong>{phase === 'revealed' && entry?.dayScore != null ? Math.round(entry.dayScore) : '—'}</strong><span>/ 100</span></div></div>
    </div>
    <p className="machine-message">{phase === 'spinning' ? '正在揭晓这一天…' : missing.length ? `还差${missing.join('、')}记录` : phase === 'revealed' ? '这就是当天真实状态' : '拉下摇杆，看看真实结果'}</p>
  </section>;
}

function Trend({ entries, metric, onSelect, selected }) {
  const value = entry => metric === 'total' ? entry.dayScore : metric === 'meal' ? entry.mealScore == null ? null : entry.mealScore * 20 : metric === 'sleep' ? entry.sleepScore == null ? null : entry.sleepScore * 20 : entry.mood == null ? null : (entry.mood - 1) * 25;
  return <div className="trend-wrap"><div className={`state-strip ${entries.length > 12 ? 'is-scrollable' : ''}`} role="list">{entries.map(entry => <button key={entry.date} className={selected === entry.date ? 'is-selected' : ''} onClick={() => onSelect(entry.date)} aria-label={`${entry.date}${entry.dayScore == null ? ' 未形成综合星' : ` 综合 ${Math.round(entry.dayScore)} 分`}`}><ResultStar entry={entry} compact /><span>{entry.label}</span>{entry.weekday && <small>{entry.weekday}</small>}</button>)}</div>
    <svg className="trend-line" viewBox={`0 0 ${Math.max(360, entries.length * 38)} 130`} preserveAspectRatio="none" aria-label="状态趋势">
      <path className="trend-guide" d={`M0 105H${Math.max(360, entries.length * 38)}M0 65H${Math.max(360, entries.length * 38)}M0 25H${Math.max(360, entries.length * 38)}`} />
      {entries.slice(1).map((entry, index) => { const a = value(entries[index]), b = value(entry); if (a == null || b == null) return null; return <line key={entry.date} x1={19 + index * 38} y1={115 - a} x2={19 + (index + 1) * 38} y2={115 - b} className="trend-segment" />; })}
      {entries.map((entry, index) => { const number = value(entry); return number == null ? null : <circle key={entry.date} cx={19 + index * 38} cy={115 - number} r="4" className="trend-point" />; })}
    </svg></div>;
}

export default function Statistics({ records, today, isPro = false, onRequestPro }) {
  const [scale, setScale] = useState('week'), [anchor, setAnchor] = useState(today), [selected, setSelected] = useState(today), [revealed, setRevealed] = useState(false), [metric, setMetric] = useState('total');
  useEffect(() => { if (!isPro && scale !== 'week') { setScale('week'); setAnchor(today); } }, [isPro, scale, today]);
  const period = useMemo(() => periodFor(scale, anchor), [scale, anchor]);
  const entries = useMemo(() => scale === 'year' ? Array.from({ length: 12 }, (_, month) => { const prefix = `${anchor.slice(0, 4)}-${String(month + 1).padStart(2, '0')}`; return aggregate(prefix, `${month + 1}月`, period.days.filter(date => date.startsWith(prefix)).map(date => records[date])); }) : period.days.map(date => dayEntry(date, records[date])), [scale, anchor, period, records]);
  useEffect(() => { const candidate = entries.find(entry => entry.date === today) ?? [...entries].reverse().find(entry => entry.date <= today) ?? entries[0]; setSelected(candidate?.date); setRevealed(false); }, [period.start, scale, today]);
  const current = entries.find(entry => entry.date === selected) ?? entries[0];
  const recorded = entries.filter(entry => entry.completeness > 0).length;
  function chooseScale(next) { if (!isPro && next !== 'week') { onRequestPro(); return; } setScale(next); setRevealed(false); }
  return <main className="statistics-main machine-statistics">
    <PeriodControls scale={scale} anchor={anchor} onScale={chooseScale} onAnchor={value => { setAnchor(value); setRevealed(false); }} today={today} lockedScales={isPro ? [] : ['month', 'year']} navigationLocked={!isPro} onLocked={onRequestPro} />
    <div className="statistics-content">
      <p className="coverage">{recorded ? <>本周期已有 <strong>{recorded}</strong> 个状态位</> : '本周期还没有记录'}</p>
      <RevealMachine entry={current} onRevealed={() => setRevealed(true)} />
      <section className={`machine-trends ${revealed ? 'is-visible' : ''}`} aria-label="状态轨迹">
        <div className="trend-tabs"><button className={metric === 'total' ? 'active' : ''} onClick={() => setMetric('total')}><StarIcon />综合</button><button className={metric === 'meal' ? 'active' : ''} onClick={() => setMetric('meal')}><SunIcon />吃饭</button><button className={metric === 'sleep' ? 'active' : ''} onClick={() => setMetric('sleep')}><MoonIcon />睡眠</button><button className={metric === 'mood' ? 'active' : ''} onClick={() => setMetric('mood')}><MoodFace value="4" />心情</button></div>
        <Trend entries={entries} metric={metric} selected={selected} onSelect={date => { setSelected(date); setRevealed(false); }} />
      </section>
      {!isPro && <section className="pro-lock-panel"><span aria-hidden="true">★</span><h2>完整回顾</h2><p>30天回顾、月度生活趋势、历史月份与完整统计</p><button onClick={onRequestPro}>查看 Day &amp; Night Pro</button></section>}
    </div>
  </main>;
}
