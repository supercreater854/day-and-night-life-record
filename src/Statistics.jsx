import { useEffect, useMemo, useState } from 'react';
import { formatDuration, localDate, MOODS, periodFor, starPoints, statistics } from './model';
import PeriodControls from './PeriodControls';
import MoodFace from './MoodFace';
import './statistics.css';

const percent = value => value === null ? '—' : `${Math.round(value)}%`;
const moodColors = ['#526d86', '#a4b7cd', '#dce3e8', '#ffe6a1', '#ffd45c'];
const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const mean = values => values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : null;

function RecordSymbol({ kind, value, hero = false }) {
  const filled = value != null || hero;
  return <svg className={`record-symbol ${filled ? 'is-recorded' : 'is-empty'}`} viewBox="0 0 80 80" aria-hidden="true" fill="none" stroke="#191c21" strokeWidth={hero ? 3.6 : 2.7} strokeLinejoin="round">
    {kind === 'mood' ? <polygon points={starPoints(40, 40, 34)} fill={filled ? moodColors[Math.round(value) - 1] : 'none'} /> : kind === 'sleep' ?
      <path d="M49 7C22 5 9 24 12 44S35 78 60 66C35 61 29 31 49 7Z" fill={hero ? '#ffd45c' : filled ? '#35536f' : 'none'} fillOpacity={hero ? 1 : filled ? .25 + value / 5 * .75 : 1} /> :
      <><polygon points={starPoints(40, 40, 36, .64, 10)} fill={filled ? '#ffdc70' : 'none'} fillOpacity={hero ? 1 : filled ? .22 + value / 5 * .78 : 1} /><circle cx="40" cy="40" r="24" fill={filled ? '#ffd45c' : 'none'} fillOpacity={hero ? 1 : filled ? .22 + value / 5 * .78 : 1} /></>}
  </svg>;
}

function RecordStrip({ entries, kind, scale, today }) {
  const field = { mood: 'mood', sleep: 'sleepScore', meals: 'mealScore' }[kind];
  const name = { mood: '心情', sleep: '睡眠', meals: '吃饭' }[kind];
  return <div className={`record-strip ${scale !== 'week' ? 'is-scrollable' : ''}`} tabIndex={scale !== 'week' ? 0 : undefined} role="list" aria-label={`${name}${scale === 'year' ? '月均状态，左右滑动查看' : '每日记录'}`} key={`${scale}-${entries[0]?.date}`}>
    {entries.map(entry => {
      const value = entry[field], missing = value == null;
      const status = missing ? '未记录' : kind === 'mood' ? MOODS[Math.round(value) - 1] : `${scale === 'year' ? '月均' : ''}评分 ${Number(value.toFixed(1))} / 5`;
      return <div className={`record-day ${entry.date === today && scale !== 'year' ? 'is-today' : ''}`} key={entry.date} role="listitem" aria-label={`${entry.date}，${name}：${status}`} title={`${entry.date} · ${name}：${status}`} data-recorded={!missing}>
        <RecordSymbol kind={kind} value={value} />
        <span className="record-date">{entry.label}</span>
        {scale !== 'year' && <span className="record-weekday">{entry.weekday}</span>}
      </div>;
    })}
  </div>;
}

export default function Statistics({ records, today, isPro = false, onRequestPro }) {
  const [scale, setScale] = useState('week');
  const [anchor, setAnchor] = useState(today);
  useEffect(() => {
    if (!isPro && scale !== 'week') { setScale('week'); setAnchor(today); }
  }, [isPro, scale, today]);
  const period = useMemo(() => periodFor(scale, anchor), [scale, anchor]);
  const stats = useMemo(() => statistics(records, period.days), [records, period]);
  const data = period.days.map(date => records[date]).filter(Boolean);
  const moodCounts = [data.filter(r => r.mood >= 4).length, data.filter(r => r.mood === 3).length, data.filter(r => r.mood != null && r.mood <= 2).length];
  const entries = useMemo(() => {
    if (scale === 'year') return Array.from({ length: 12 }, (_, month) => {
      const prefix = `${anchor.slice(0, 4)}-${String(month + 1).padStart(2, '0')}`;
      const rows = period.days.filter(date => date.startsWith(prefix)).map(date => records[date]).filter(Boolean);
      return Object.fromEntries([['date', prefix], ['label', `${month + 1}月`], ...['mood', 'sleepScore', 'mealScore'].map(field => [field, mean(rows.map(r => r[field]).filter(value => value != null))])]);
    });
    return period.days.map(date => {
      const day = localDate(date);
      return { ...records[date], date, label: `${day.getMonth() + 1}.${String(day.getDate()).padStart(2, '0')}`, weekday: weekdays[day.getDay()] };
    });
  }, [scale, anchor, period, records]);
  const strip = kind => <RecordStrip entries={entries} kind={kind} scale={scale} today={today} />;
  if (!isPro) return <main className="statistics-main illustrated-statistics">
    <PeriodControls scale="week" anchor={scale === 'week' ? anchor : today} onScale={setScale} onAnchor={setAnchor} today={today} lockedScales={['month', 'year']} navigationLocked onLocked={onRequestPro} />
    <div className="statistics-content free-review">
      <p className="coverage">记录 <strong data-stat="coverage">{stats.recorded} / {stats.total}</strong> 天</p>
      <section className="stat-section" aria-labelledby="free-mood-heading"><div className="stat-heading"><h1 id="free-mood-heading">心情</h1></div>{strip('mood')}</section>
      <section className="stat-section" aria-labelledby="free-sleep-heading"><div className="stat-heading"><h2 id="free-sleep-heading">睡眠</h2></div>{strip('sleep')}</section>
      <section className="stat-section" aria-labelledby="free-meals-heading"><div className="stat-heading"><h2 id="free-meals-heading">吃饭</h2></div>{strip('meals')}</section>
      <section className="pro-lock-panel" aria-labelledby="pro-lock-heading">
        <span aria-hidden="true">★</span><h2 id="pro-lock-heading">完整回顾</h2>
        <p>30天回顾、月度生活趋势、历史月份与完整统计</p>
        <button onClick={onRequestPro}>查看 Day &amp; Night Pro</button>
      </section>
    </div>
  </main>;
  return <main className="statistics-main illustrated-statistics">
    <PeriodControls scale={scale} anchor={anchor} onScale={setScale} onAnchor={setAnchor} today={today} />
    <div className="statistics-content">
      <p className="coverage">记录 <strong data-stat="coverage">{stats.recorded} / {stats.total}</strong> 天</p>
      {scale !== 'week' && <p className="strip-hint">{scale === 'year' ? '按月呈现平均状态' : '按天呈现记录'} · 左右滑动查看</p>}
      <section className="stat-section" aria-labelledby="mood-stat-heading">
        <div className="stat-heading"><h1 id="mood-stat-heading">心情</h1><div className="mood-counts">
          {[5, 3, 1].map((value, i) => <span key={value} aria-label={`${['开心', '一般', '不开心'][i]} ${moodCounts[i]} 天`}><MoodFace value={value} /><span>{moodCounts[i]}<small> 天</small></span></span>)}
        </div></div>
        {strip('mood')}
        <div className="distribution-heading"><h2>心情分布</h2><span>基于 {stats.moodDays} 天记录</span></div>
        <div className="mood-distribution">{MOODS.map((label, i) => <div key={label}>
          <span className="distribution-face" style={{ '--face-fill': moodColors[i] }}><MoodFace value={i + 1} /></span>
          <span>{label}</span><b data-stat={`mood-${i + 1}`}>{percent(stats.distribution[i])}</b>
        </div>)}</div>
      </section>
      <section className="stat-section" aria-labelledby="sleep-stat-heading">
        <div className="stat-heading"><h2 id="sleep-stat-heading">睡眠</h2><small>睡得好 <b data-stat="sleep-good-days">{data.filter(r => r.sleepScore >= 4).length} / {stats.sleepDays}</b> 天</small></div>
        <div className="illustrated-metric"><div className="metric-summary"><RecordSymbol kind="sleep" hero /><div><strong data-stat="average-sleep" className={stats.averageSleep === null ? 'no-average' : ''}>{stats.averageSleep === null ? '—' : formatDuration(stats.averageSleep)}</strong><span>平均睡眠时长</span></div></div>{strip('sleep')}</div>
        {stats.durationDays !== stats.sleepDays && <p className="stat-note">时长按 {stats.durationDays} 天的具体睡眠区间计算</p>}
      </section>
      <section className="stat-section" aria-labelledby="meal-stat-heading">
        <div className="stat-heading"><h2 id="meal-stat-heading">吃饭</h2><small>吃得好 <b data-stat="meal-good-days">{data.filter(r => r.mealScore >= 4).length} / {stats.mealDays}</b> 天</small></div>
        <div className="illustrated-metric"><div className="metric-summary"><RecordSymbol kind="meals" hero /><div><strong data-stat="average-meals" className={stats.averageMeals === null ? 'no-average' : ''}>{stats.averageMeals === null ? '—' : <>{stats.averageMeals.toFixed(1)}<small> 顿</small></>}</strong><span>平均每天</span></div></div>{strip('meals')}</div>
      </section>
      <p className="statistics-footnote">空心表示未记录，平均值仅计算有记录的日期。<br />睡眠与吃饭评分达 4 分记为「好」。{data.some(r => r.mealCountAtLeast) && '旧版 3+ 按 3 顿计。'}</p>
    </div>
  </main>;
}
