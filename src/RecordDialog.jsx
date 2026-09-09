import { useEffect, useRef, useState } from 'react';
import { DEFAULT_MEAL_TIMES, deriveMealTiming, formatDuration, MEALS, MOODS, sleepMinutes, sleepScoreFor, starPoints } from './model';
import MoodFace from './MoodFace';
import MusicButton from './MusicButton';
import { useReducedMotion } from './motion';
import TimeWheel from './TimeWheel';
import SleepRangePicker from './SleepRangePicker';

const rhythmLabels = ['节奏自由', '节奏尚稳', '节奏稳定'];

export default function RecordDialog({ type, record, suggestion, onSave, onConfirming, onClose, error, music }) {
  const ref = useRef(null), timer = useRef(null);
  const reducedMotion = useReducedMotion();
  const [confirming, setConfirming] = useState(false);
  const [selectedMood, setSelectedMood] = useState(record?.mood ?? null);
  const [mealCount, setMealCount] = useState(record?.mealCount ?? null);
  const [mealTimes, setMealTimes] = useState(record?.mealTimes?.length ? record.mealTimes : []);
  const [sleepStart, setSleepStart] = useState(record?.sleepStart ?? suggestion?.sleepStart ?? '00:00');
  const [sleepEnd, setSleepEnd] = useState(record?.sleepEnd ?? suggestion?.sleepEnd ?? '07:30');
  const [wheel, setWheel] = useState(null);
  const duration = sleepMinutes(sleepStart, sleepEnd);
  const rhythm = deriveMealTiming(mealCount, mealTimes);
  const mealScore = mealCount == null || rhythm == null ? null : Math.min(mealCount, 3) + rhythm;
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => { clearTimeout(timer.current); dialog.close(); }; }, []);
  function confirmSave(patch) {
    if (confirming) return;
    setConfirming(true); onConfirming?.(type);
    timer.current = setTimeout(() => { if (onSave(patch) === false) setConfirming(false); }, reducedMotion ? 0 : 180);
  }
  function chooseMeal(count) {
    setMealCount(count);
    setMealTimes(previous => Array.from({ length: count }, (_, index) => previous[index] ?? DEFAULT_MEAL_TIMES[Math.min(count, 3)][index] ?? '20:30'));
  }
  function changeTime(index, value) { setMealTimes(times => times.map((time, current) => current === index ? value : time)); }
  const title = type === 'sleep' ? '昨晚什么时候睡？' : type === 'meals' ? '今天吃了几顿？' : '今天心情怎么样？';
  return <dialog ref={ref} className={`record-dialog ${type} ${confirming ? 'is-confirming' : ''}`} onCancel={event => { if (confirming || wheel) event.preventDefault(); else onClose(); }} aria-labelledby="record-question">
    <MusicButton music={music} /><button className="close-button" aria-label="关闭" onClick={onClose}><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
    <div className="dialog-content">
      {type !== 'sleep' && <svg className="dialog-symbol" viewBox="-75 -75 150 150" aria-hidden="true">{type === 'meals' ? <><polygon points={starPoints(0, 0, 61, .76, 12)} fill="#ffcd55" stroke="#191c21" strokeWidth="5" /><circle r="38" fill="#ffda6e" stroke="#191c21" strokeWidth="5" /></> : <polygon points={starPoints(0, 0, 52)} fill="#ffda6e" stroke="#191c21" strokeWidth="5" />}</svg>}
      <h1 id="record-question">{title}</h1>
      {type === 'sleep' && <>
        <SleepRangePicker start={sleepStart} end={sleepEnd} onChange={(start, end) => { setSleepStart(start); setSleepEnd(end); }} onEdit={setWheel} />
        <p className="time-summary">{duration > 0 && sleepEnd <= sleepStart ? '跨午夜 · ' : ''}{formatDuration(duration)} · {sleepScoreFor(duration)} / 5</p>
        <button className="primary-button" disabled={duration === null || confirming} onClick={() => confirmSave({ sleepStart, sleepEnd })}>{confirming ? '正在留下记录…' : '保存睡眠'}</button>
      </>}
      {type === 'meals' && <>
        <div className="meal-options" role="group" aria-label="今天吃了几顿">{MEALS.map(option => <button key={option.label} aria-pressed={option.score === 3 ? mealCount >= 3 : mealCount === option.score} onClick={() => chooseMeal(option.score)}>{option.label}</button>)}</div>
        {mealCount > 0 && <div className="meal-time-fields">{mealTimes.map((time, index) => <button className="meal-time-row" type="button" key={index} onClick={() => setWheel(index)}><span>第 {index + 1} 顿</span><strong>{time}</strong><span aria-hidden="true">›</span></button>)}</div>}
        {mealCount >= 3 && <div className="extra-meals"><button className="text-button" onClick={() => { setMealCount(count => count + 1); setMealTimes(times => [...times, '20:30']); }}>＋ 再记一顿</button>{mealCount > 3 && <button className="text-button" onClick={() => { setMealCount(count => count - 1); setMealTimes(times => times.slice(0, -1)); }}>去掉最后一顿</button>}</div>}
        {mealScore != null && <p className="meal-result">{mealCount}顿 · {rhythmLabels[rhythm]} · <strong>{mealScore}/5</strong></p>}
        <button className="primary-button" disabled={mealCount === null || mealTimes.length !== mealCount || confirming} onClick={() => confirmSave({ mealCount, mealTimes, mealTiming: rhythm })}>{confirming ? '正在留下记录…' : '保存吃饭'}</button>
      </>}
      {type === 'mood' && <div className={`mood-options ${selectedMood ? 'has-selection' : ''}`} role="group" aria-label="今天的心情">{MOODS.map((label, index) => <button key={label} disabled={confirming && selectedMood !== index + 1} aria-label={`${index + 1} ${label}`} aria-pressed={selectedMood === index + 1} onClick={() => { setSelectedMood(index + 1); confirmSave({ mood: index + 1 }); }}><MoodFace value={index + 1} /><span>{label}</span></button>)}</div>}
      {error && <p className="save-error" role="alert">{error}</p>}
    </div>
    {wheel != null && <TimeWheel label={type === 'sleep' ? wheel === 'start' ? '入睡' : '起床' : `第 ${wheel + 1} 顿`} value={type === 'sleep' ? wheel === 'start' ? sleepStart : sleepEnd : mealTimes[wheel]} onChange={value => type === 'sleep' ? wheel === 'start' ? setSleepStart(value) : setSleepEnd(value) : changeTime(wheel, value)} onClose={() => setWheel(null)} />}
  </dialog>;
}
