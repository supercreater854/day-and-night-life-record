import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Clock from './Clock';
import StarMap from './StarMap';
import RecordDialog from './RecordDialog';
import DiaryDialog from './DiaryDialog';
import Statistics from './Statistics';
import DataDialog from './DataDialog';
import useBgm from './useBgm';
import MusicButton from './MusicButton';
import { ONBOARDING_KEY, saveRecord } from './repository';
import { listMediaDates } from './media';
import { dateKey, makeRecord, readRecords, STORAGE_KEY, suggestedSleep, starPoints } from './model';
import { cloudbaseDb, userId } from './cloudbase';
import { loadCloudRecords, syncCloudRecord } from './cloudRecords';

const AuthControl = lazy(() => import('./AuthControl'));

export default function App() {
  const [page, setPage] = useState('today');
  const [now, setNow] = useState(() => new Date());
  const [initial] = useState(() => { try { return { records: readRecords(), error: '' }; } catch { return { records: {}, error: '无法读取本地记录，请检查浏览器存储权限后刷新。' }; } });
  const [localRecords, setLocalRecords] = useState(initial.records);
  const [cloudRecords, setCloudRecords] = useState({});
  const [cloudUser, setCloudUser] = useState(null);
  const [syncError, setSyncError] = useState('');
  const [error, setError] = useState(initial.error);
  const [modal, setModal] = useState(null);
  const [dataOpen, setDataOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [mapFocus, setMapFocus] = useState(0);
  const [pulse, setPulse] = useState(null);
  const [returned, setReturned] = useState(null);
  const [diarySaved, setDiarySaved] = useState(0);
  const closeTimer = useRef(null), pendingPulse = useRef(null);
  const syncGeneration = useRef(0), syncQueues = useRef(new Map());
  const music = useBgm();
  const [intro, setIntro] = useState(() => { try { return !localStorage.getItem(ONBOARDING_KEY) && !Object.keys(initial.records).length; } catch { return false; } });
  const [diaryDate, setDiaryDate] = useState(null);
  const [mediaDates, setMediaDates] = useState([]);
  const [mediaRevision, setMediaRevision] = useState(0);
  const [mediaReadError, setMediaReadError] = useState('');
  const records = useMemo(() => ({ ...localRecords, ...cloudRecords }), [localRecords, cloudRecords]);
  const allRecords = useMemo(() => {
    const combined = { ...records };
    for (const date of mediaDates) combined[date] = { ...makeRecord(date, records[date]), hasMedia: true };
    return combined;
  }, [records, mediaDates]);
  const mapRecords = useRef(allRecords);
  if (!diaryDate) mapRecords.current = allRecords;
  const today = dateKey(now);
  useEffect(() => {
    let active = true;
    listMediaDates().then(dates => { if (active) { setMediaDates(dates); setMediaReadError(''); } }).catch(() => { if (active) setMediaReadError('暂时无法读取本地媒体记录，请检查浏览器存储权限后刷新。'); });
    return () => { active = false; };
  }, [mediaRevision]);
  useEffect(() => {
    let timer;
    const refreshDate = () => {
      clearTimeout(timer);
      setNow(new Date());
      if (!document.hidden) timer = setTimeout(refreshDate, 1000 - Date.now() % 1000);
    };
    refreshDate();
    window.addEventListener('focus', refreshDate);
    window.addEventListener('pageshow', refreshDate);
    document.addEventListener('visibilitychange', refreshDate);
    const sync = event => { if (event.key === STORAGE_KEY) { try { setLocalRecords(readRecords()); setError(''); } catch { setError('无法读取本地记录，请刷新后重试。'); } } };
    window.addEventListener('storage', sync);
    return () => { clearTimeout(timer); window.removeEventListener('focus', refreshDate); window.removeEventListener('pageshow', refreshDate); document.removeEventListener('visibilitychange', refreshDate); window.removeEventListener('storage', sync); };
  }, []);
  const cloudUid = userId(cloudUser);
  useEffect(() => {
    const generation = ++syncGeneration.current;
    let active = true;
    setCloudRecords({});
    setSyncError('');
    if (!cloudUid) return () => { active = false; };
    loadCloudRecords(cloudbaseDb, cloudUid).then(next => {
      if (active && syncGeneration.current === generation) setCloudRecords(current => ({ ...next, ...current }));
    }).catch(() => {
      if (active && syncGeneration.current === generation) setSyncError('云端记录读取失败，本地记录仍可正常使用。');
    });
    return () => { active = false; };
  }, [cloudUid]);
  useEffect(() => {
    if (!notice || modal) return;
    const timer = setTimeout(() => setNotice(null), notice.star ? 9000 : 3500);
    return () => clearTimeout(timer);
  }, [notice, modal]);
  useEffect(() => {
    if (!pulse) return;
    const timer = setTimeout(() => setPulse(null), 1100);
    return () => clearTimeout(timer);
  }, [pulse]);
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  function closeRecord() {
    clearTimeout(closeTimer.current); setModal(null);
    if (pendingPulse.current) { setPulse(pendingPulse.current); pendingPulse.current = null; }
  }
  function open(type, date = dateKey(), fromDiary = false) {
    clearTimeout(closeTimer.current);
    setError(''); setNotice(null); setIntro(false);
    try { localStorage.setItem(ONBOARDING_KEY, 'seen'); } catch { /* Recording reports storage errors separately. */ }
    setModal({ type, date, fromDiary });
  }
  function writeRecord(date, patch) {
    try {
      const next = saveRecord(date, patch, records[date]);
      setLocalRecords(next);
      setError('');
      const saved = next[date];
      if (cloudUid) {
        setCloudRecords(current => ({ ...current, [date]: saved }));
        const generation = syncGeneration.current;
        const queueKey = `${cloudUid}:${date}`;
        const previous = syncQueues.current.get(queueKey) ?? Promise.resolve();
        const operation = previous.catch(() => {}).then(() => {
          if (generation !== syncGeneration.current) return;
          return syncCloudRecord(cloudbaseDb, cloudUid, saved);
        });
        syncQueues.current.set(queueKey, operation);
        operation.then(() => {
          if (generation === syncGeneration.current) setSyncError('');
        }).catch(() => {
          if (generation === syncGeneration.current) setSyncError('云端同步失败，本地记录已保存。');
        }).finally(() => {
          if (syncQueues.current.get(queueKey) === operation) syncQueues.current.delete(queueKey);
        });
      }
      return saved;
    } catch { setError('这次还没有保存。请允许浏览器本地存储后重试。'); return false; }
  }
  function save(patch) {
    const before = records[modal.date];
    const saved = writeRecord(modal.date, patch);
    if (!saved) return;
    const mood = patch.mood ?? records[modal.date]?.mood;
    clearTimeout(closeTimer.current);
    const askMood = !modal.fromDiary && modal.type !== 'mood' && mood == null;
    if (askMood) { pendingPulse.current = modal.type; setModal({ type: 'mood', date: modal.date }); }
    else if (modal.type === 'mood' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      closeTimer.current = setTimeout(() => { closeRecord(); if (modal.fromDiary) setDiarySaved(value => value + 1); }, 180);
    } else { closeRecord(); if (modal.fromDiary) setDiarySaved(value => value + 1); }
    if (!modal.fromDiary) {
      const newStar = saved.starSize != null && saved.starBrightness != null && !(before?.starSize != null && before?.starBrightness != null);
      setNotice({ text: newStar ? '今天的星，留下了。' : modal.type === 'sleep' ? '睡眠已保存' : modal.type === 'meals' ? '吃饭已保存' : '心情已保存', star: newStar, record: saved, id: Date.now() });
      if (!askMood && modal.type !== 'mood') setPulse(modal.type);
    }
  }
  function refreshRecords() { setLocalRecords(readRecords()); setMediaRevision(value => value + 1); }
  return <div className={`app ${page === 'map' ? 'night' : ''}`}>
    <Suspense fallback={null}><AuthControl onUserChange={setCloudUser} /></Suspense>
    {!modal && !diaryDate && !dataOpen && <div className="global-music"><MusicButton music={music} /></div>}
    {page === 'today' ? <>
      <header className="date"><time dateTime={today}>{now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日</time></header>
      <main className={`today-main ${pulse ? `saved-${pulse}` : ''}`}><Clock now={now} record={records[today]} intro={intro} onSleep={() => open('sleep')} onMeals={() => open('meals')} /></main>
    </> : page === 'map' ? <StarMap key={mapFocus} focusToday={mapFocus > 0} records={mapRecords.current} today={today} onDay={setDiaryDate} returned={returned} effectsPaused={!!diaryDate || !!modal} /> : <><Statistics records={allRecords} today={today} /><button className="data-entry" onClick={() => setDataOpen(true)}>数据与使用 <span aria-hidden="true">↗</span></button></>}
    {notice && !modal && page === 'today' && <div className={`save-notice ${notice.star ? 'star-arrival' : ''}`} role="status" key={notice.id}>{notice.star && <svg className="saved-star" viewBox="-40 -40 80 80" aria-hidden="true"><polygon points={starPoints(0, 0, 18 * notice.record.starSize)} fill="#ffe4a0" opacity={notice.record.starBrightness} /></svg>}<span>{notice.text}</span>{notice.star && <button onClick={() => { setMapFocus(value => value + 1); setPage('map'); setNotice(null); }}>看看今天的星 <span aria-hidden="true">↗</span></button>}</div>}
    {error && !modal && <p className="page-error" role="alert">{error}</p>}
    {syncError && !modal && <p className="page-error" role="alert">{syncError}</p>}
    {mediaReadError && <p className="page-error" role="alert">{mediaReadError}</p>}
    <nav className="bottom-nav" aria-label="页面切换">
      <button className={page === 'today' ? 'active' : ''} aria-current={page === 'today' ? 'page' : undefined} onClick={() => setPage('today')}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5" /><path d="M12 7.5V12l3 2" /></svg><span>Today</span>
      </button>
      <button className={page === 'map' ? 'active' : ''} aria-current={page === 'map' ? 'page' : undefined} onClick={() => setPage('map')}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z" /></svg><span>Star Map</span>
      </button>
      <button className={page === 'statistics' ? 'active' : ''} aria-current={page === 'statistics' ? 'page' : undefined} onClick={() => setPage('statistics')}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V12M12 19V5M19 19V9" /></svg><span>Statistics</span>
      </button>
    </nav>
    {diaryDate && <DiaryDialog music={music} key={diaryDate} date={diaryDate} record={allRecords[diaryDate]} savedRevision={diarySaved} onClose={() => { setReturned({ date: diaryDate, id: Date.now() }); setDiaryDate(null); }} onEdit={type => open(type, diaryDate, true)} onSaveText={diaryText => writeRecord(diaryDate, { diaryText })} onMediaChanged={() => setMediaRevision(value => value + 1)} />}
    {modal && <RecordDialog music={music} key={`${modal.type}-${modal.date}`} type={modal.type} suggestion={suggestedSleep(records, modal.date)} record={records[modal.date]} onSave={save} onClose={closeRecord} error={error} />}
    {dataOpen && <DataDialog music={music} onClose={() => setDataOpen(false)} onRestored={refreshRecords} />}
  </div>;
}
