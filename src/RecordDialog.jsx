import { useEffect, useRef, useState } from 'react';
import { DEFAULT_MEAL_TIMES, defaultSleep, formatDuration, MEALS, MOODS, SLEEP, sleepMinutes, sleepScoreFor, TIMING, TIME_OPTIONS, starPoints } from './model';
import { Moon } from './Clock';
import MoodFace from './MoodFace';
import MusicButton from './MusicButton';
import { useReducedMotion } from './motion';

export default function RecordDialog({ type, record, suggestion, onSave, onConfirming, onClose, error, music }) {
  const ref = useRef(null);
  const timer = useRef(null);
  const reducedMotion = useReducedMotion();
  const [confirming, setConfirming] = useState(false);
  const [selectedMood, setSelectedMood] = useState(record?.mood ?? null);
  const [mealCount, setMealCount] = useState(record?.mealCount ?? null);
  const [mealTiming, setMealTiming] = useState(record?.mealTiming ?? null);
  const [mealTimes, setMealTimes] = useState(record?.mealTimes?.length ? record.mealTimes : Array.from({ length: record?.mealCount ?? 0 }, (_, index) => DEFAULT_MEAL_TIMES[3][index] ?? '20:30'));
  const [sleepStart, setSleepStart] = useState(record?.sleepStart ?? suggestion?.sleepStart ?? '00:00');
  const [sleepEnd, setSleepEnd] = useState(record?.sleepEnd ?? suggestion?.sleepEnd ?? '07:30');
  const duration = sleepMinutes(sleepStart, sleepEnd);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => { clearTimeout(timer.current); dialog.close(); };
  }, []);
  useEffect(() => {
    setConfirming(false);
    setSelectedMood(record?.mood ?? null);
  }, [type, record?.mood]);
  function confirmSave(patch) {
    if (confirming) return;
    setConfirming(true);
    onConfirming?.(type);
    timer.current = setTimeout(() => {
      const saved = onSave(patch);
      if (saved === false) setConfirming(false);
    }, reducedMotion ? 0 : 180);
  }
  function chooseMeal(count) {
    setMealCount(count);
    setMealTimes([...DEFAULT_MEAL_TIMES[count]]);
  }
  function chooseSleep(index) {
    const defaults = defaultSleep(index, sleepEnd);
    setSleepStart(defaults.sleepStart);
    setSleepEnd(defaults.sleepEnd);
  }
  const title = type === 'sleep' ? '昨晚睡了多久？' : type === 'meals' ? '今天吃了几顿？' : '今天心情怎么样？';
  return <dialog ref={ref} className={`record-dialog ${type} ${confirming ? 'is-confirming' : ''}`} onCancel={event => { if (confirming) event.preventDefault(); else onClose(); }} aria-labelledby="record-question">
    <MusicButton music={music} />
    <button className="close-button" aria-label="关闭" onClick={onClose}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
    <div className="dialog-content" key={type}>
      <svg className="dialog-symbol" viewBox="-75 -75 150 150" aria-hidden="true">
        {type === 'sleep' ? <Moon fill="#ffdc71" stroke="#191c21" strokeWidth="6" strokeLinejoin="round" />
          : type === 'meals' ? <><polygon points={starPoints(0, 0, 61, .76, 12)} fill="#ffcd55" stroke="#191c21" strokeWidth="5" strokeLinejoin="round" /><circle r="38" fill="#ffda6e" stroke="#191c21" strokeWidth="5" /></>
          : <polygon points={starPoints(0, 0, 52)} fill="#ffda6e" stroke="#191c21" strokeWidth="5" strokeLinejoin="round" />}
      </svg>
      <h1 id="record-question">{title}</h1>
      {type === 'sleep' && <>
        <div className="sleep-options" role="group" aria-label="睡眠时长">
          {SLEEP.map((option, index) => <button key={option.label} aria-pressed={(duration === null ? record?.sleepScore : sleepScoreFor(duration)) === option.score} onClick={() => chooseSleep(index)}>{option.label}</button>)}
        </div>
        <div className="time-fields">
          <TimeSelect label="开始时间" value={sleepStart} onChange={setSleepStart} />
          <span aria-hidden="true">→</span>
          <TimeSelect label="结束时间" value={sleepEnd} onChange={setSleepEnd} />
        </div>
        <p className="time-summary">{duration === null ? '选择时长，再调整时间' : `${sleepEnd < sleepStart ? '跨午夜 · ' : ''}${formatDuration(duration)}${duration === 0 ? ' · 相同时间表示未睡眠' : ''}`}</p>
        {!record?.sleepStart && <p className="time-summary">{suggestion?.source}</p>}
        <button className="primary-button" disabled={duration === null || confirming} onClick={() => confirmSave({ sleepStart, sleepEnd })}>{confirming ? '正在留下记录…' : '保存睡眠'}</button>
      </>}
      {type === 'meals' && <>
        <div className="meal-options" role="group" aria-label="今天吃了几顿">
          {MEALS.map(option => <button key={option.label} aria-pressed={option.score === 3 ? mealCount >= 3 : mealCount === option.score} onClick={() => chooseMeal(option.score)}>{option.label}</button>)}
        </div>
        <h2>大致按时吗？</h2>
        <div className="timing-options" role="group" aria-label="吃饭是否按时">
          {TIMING.map(option => <button key={option.label} aria-pressed={mealTiming === option.score} onClick={() => setMealTiming(option.score)}>{option.label}</button>)}
        </div>
        {mealCount > 0 && <div className="meal-time-fields">{mealTimes.map((time, index) => <TimeSelect key={index} label={`第 ${index + 1} 顿`} value={time} onChange={value => setMealTimes(times => times.map((t, i) => i === index ? value : t))} />)}</div>}
        {mealCount >= 3 && <div className="extra-meals"><button className="text-button" onClick={() => { setMealCount(count => count + 1); setMealTimes(times => [...times, '20:30']); }}>＋ 再记一顿</button>{mealCount > 3 && <button className="text-button" onClick={() => { setMealCount(count => count - 1); setMealTimes(times => times.slice(0, -1)); }}>去掉最后一顿</button>}</div>}
        <button className="primary-button" disabled={mealCount === null || mealTiming === null || confirming} onClick={() => confirmSave({ mealCount, mealTiming, mealTimes })}>{confirming ? '正在留下记录…' : '保存吃饭'}</button>
      </>}
      {type === 'mood' && <div className={`mood-options ${selectedMood ? 'has-selection' : ''}`} role="group" aria-label="今天的心情">
        {MOODS.map((label, index) => <button key={label} disabled={confirming && selectedMood !== index + 1} aria-label={`${index + 1} ${label}`} aria-pressed={selectedMood === index + 1} onClick={() => { setSelectedMood(index + 1); confirmSave({ mood: index + 1 }); }}><MoodFace value={index + 1} /><span>{label}</span></button>)}
      </div>}
      {error && <p className="save-error" role="alert">{error}</p>}
    </div>
  </dialog>;
}

function TimeSelect({ label, value, onChange }) {
  return <label className="time-field"><span>{label}</span><select aria-label={label} value={value} onChange={event => onChange(event.target.value)}>
    {!value && <option value="" disabled>选择时间</option>}
    {TIME_OPTIONS.map(time => <option key={time} value={time}>{time}</option>)}
  </select></label>;
}
