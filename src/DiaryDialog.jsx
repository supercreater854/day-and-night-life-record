import { useEffect, useRef, useState } from 'react';
import { calculateDayScore, deriveStarAppearance, formatDuration, fullDate, hasData, MOODS, SLEEP, sleepMinutes, starPoints } from './model';
import { addMedia, deleteMedia, listMedia } from './media';
import { readDraft, writeDraft } from './repository';
import MoodFace from './MoodFace';
import MusicButton from './MusicButton';

export default function DiaryDialog({ date, record, onClose, onEdit, onSaveText, onMediaChanged, savedRevision = 0, music }) {
  const ref = useRef(null);
  const [text, setText] = useState(() => { try { return readDraft(date) ?? record?.diaryText ?? ''; } catch { return record?.diaryText ?? ''; } });
  const [textStatus, setTextStatus] = useState('');
  const [editing, setEditing] = useState(() => !hasData(record));
  const [busy, setBusy] = useState(false);
  const saveRevision = useRef(savedRevision);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  useEffect(() => {
    if (saveRevision.current === savedRevision) return;
    saveRevision.current = savedRevision;
    setEditing(false); setTextStatus('已保存'); ref.current.scrollTop = 0;
  }, [savedRevision]);
  useEffect(() => {
    if (!textStatus || editing) return;
    const timer = setTimeout(() => setTextStatus(''), 2500);
    return () => clearTimeout(timer);
  }, [textStatus, editing]);
  const duration = sleepMinutes(record?.sleepStart, record?.sleepEnd);
  const dayScore = calculateDayScore(record);
  const star = deriveStarAppearance(dayScore.dayScore, dayScore.completeness);
  const lit = star.complete;
  async function saveText(value) {
    const ok = onSaveText(value);
    if (ok) { setText(value); try { writeDraft(date, null); setTextStatus('已保存'); setEditing(false); ref.current.scrollTop = 0; } catch { setTextStatus('文字已保存，旧草稿清理失败，请重试保存。'); } }
    else setTextStatus('文字还没有保存，请检查浏览器本地存储后重试。');
  }
  return <dialog ref={ref} className={`record-dialog diary-dialog ${editing ? 'diary-editing' : 'diary-reading'}`} onCancel={event => { if (busy) event.preventDefault(); else onClose(); }} aria-label={`${fullDate(date)}日记`}>
    <MusicButton music={music} />
    <button className="close-button" disabled={busy} aria-label="关闭日记" onClick={onClose}>×</button>
    <div className="diary-content">
      <time className="diary-date" dateTime={date}>{fullDate(date)}</time>
      <svg className="diary-star" viewBox="0 0 180 150" aria-label="今日星星">
        <polygon points={starPoints(90, 75, lit ? 30 * star.size : 20)} fill={star.color} stroke={star.stroke} strokeWidth="1.5" opacity={star.brightness} strokeLinejoin="round" />
      </svg>
      {!lit && editing && <p className="time-summary star-explanation">{record?.mood == null ? '记下心情，再添一笔吃饭或睡眠，这颗星就有了模样。' : '再记一笔吃饭或睡眠，让这颗星有了模样。'}</p>}
      {!editing && <div className="diary-overview">
        <div className="reading-mood">{record?.mood ? <><MoodFace value={record.mood} /><span>{MOODS[record.mood - 1]}</span></> : <span>心情未记录</span>}</div>
        <dl className="reading-facts"><div><dt>睡眠</dt><dd>{duration !== null ? `${Math.floor(duration / 60)}小时${duration % 60 ? `${duration % 60}分` : ''}` : record?.sleepScore != null ? SLEEP.find(s => s.score === record.sleepScore)?.label : '未记录'}</dd></div>
          <div><dt>吃饭</dt><dd>{record?.mealScore != null ? `${record.mealCount == null ? '已记录' : `${record.mealCountAtLeast ? '3+' : record.mealCount}顿`} · ${record.mealScore}/5` : '未记录'}</dd></div></dl>
        {record?.diaryText?.trim() && <p className="reading-text">{record.diaryText}</p>}
      </div>}
      {editing && <><div className="daily-details">
        <button onClick={() => onEdit('mood')} aria-label="修改心情"><span>心情</span><strong>{record?.mood ? <span className="diary-mood"><MoodFace value={record.mood} />{MOODS[record.mood - 1]}</span> : '未记录'}</strong><span aria-hidden="true">›</span></button>
        <button onClick={() => onEdit('sleep')} aria-label="修改睡眠"><span>睡眠</span><strong>{duration !== null ? <>{record.sleepStart} → {record.sleepEnd}<small>{formatDuration(duration)}</small></> : record?.sleepScore != null ? `${SLEEP.find(s => s.score === record.sleepScore)?.label} · 待补时间` : '未记录'}</strong><span aria-hidden="true">›</span></button>
        <button onClick={() => onEdit('meals')} aria-label="修改吃饭"><span>吃饭</span><strong>{record?.mealScore != null ? <>{record.mealCount == null ? '已记录 · 待补时间' : `${record.mealCountAtLeast ? '3+' : record.mealCount} 顿 · ${record.mealScore}/5`}<small>{record.mealTimes?.join(' / ')}</small></> : '未记录'}</strong><span aria-hidden="true">›</span></button>
      </div>
      <section className="diary-writing">
        <label htmlFor="diary-text">文字</label>
        <textarea id="diary-text" value={text} placeholder="记下这一天……" onChange={e => { const value = e.target.value; setText(value); try { writeDraft(date, value === (record?.diaryText ?? '') ? null : value); setTextStatus(''); } catch { setTextStatus('草稿暂未保存，请保留页面并重试。'); } }} rows="5" />
        {text !== (record?.diaryText ?? '') && !textStatus && <p className="inline-status">草稿 · 下次打开可以接着写</p>}
        <div className="text-actions"><button className="text-button" onClick={() => { setText(''); try { writeDraft(date, ''); setTextStatus(''); } catch { setTextStatus('草稿暂未保存，请重试。'); } }} disabled={!text}>清空文字</button></div>
      </section></>}
      <DiaryMedia date={date} editing={editing} onBusy={setBusy} onChanged={onMediaChanged} music={music} />
      {textStatus && <p className={`inline-status diary-save-status ${textStatus === '已保存' ? 'success' : ''}`} role="status">{textStatus === '已保存' ? '✓ 已保存' : textStatus}</p>}
      {editing ? <button className="primary-button diary-finish" disabled={busy} onClick={() => saveText(text)}>保存记录</button>
        : <button className="edit-entry" onClick={() => { setEditing(true); setTextStatus(''); }}>编辑记录 <span aria-hidden="true">↗</span></button>}
    </div>
  </dialog>;
}

function DiaryMedia({ date, onChanged, editing, onBusy, music }) {
  const [items, setItems] = useState([]);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [viewImage, setViewImage] = useState(null);
  const imageInput = useRef(null), videoInput = useRef(null);
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    const urls = [];
    listMedia(date).then(media => {
      if (!active) return;
      setItems(media.map(item => { const url = URL.createObjectURL(item.blob); urls.push(url); return { ...item, url }; }));
    }).catch(() => { if (active) setError('无法读取本地媒体，请检查浏览器存储权限后重新打开日记。'); });
    return () => { active = false; urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [date, revision]);
  async function update(operation) {
    if (pending.current) return;
    pending.current = true; setBusy(true); onBusy(true); setError('');
    try { await operation(); setRevision(r => r + 1); onChanged(); }
    catch (e) { setError(`媒体未能保存：${e.name === 'QuotaExceededError' ? '浏览器存储空间不足。' : e.message || '请重试。'}`); }
    finally { pending.current = false; setBusy(false); onBusy(false); }
  }
  function choose(event, kind) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length) update(() => addMedia(date, files, kind));
  }
  if (!editing && !items.length && !error) return null;
  return <section className="diary-media" aria-label="图片与视频">
    {editing && <><div className="media-add-actions">
      <button className="text-button" disabled={busy} onClick={() => imageInput.current.click()}>＋ 添加图片</button>
      <button className="text-button" disabled={busy} onClick={() => videoInput.current.click()}>＋ 添加视频</button>
    </div>
    <input hidden ref={imageInput} aria-label="选择图片" type="file" accept="image/*" multiple onChange={event => choose(event, 'image')} />
    <input hidden ref={videoInput} aria-label="选择视频" type="file" accept="video/*" multiple onChange={event => choose(event, 'video')} />
    </>}
    {busy && <p className="inline-status" role="status">正在保存媒体…</p>}
    {error && <p className="save-error" role="alert">{error}</p>}
    <div className="media-gallery">{items.map(item => <figure key={item.id} data-media-kind={item.kind}>
      {item.kind === 'image' ? <button className="image-thumbnail" aria-label={`查看图片 ${item.name}`} onClick={() => setViewImage(item)}><img src={item.url} alt={item.name} /></button>
        : <video src={item.url} controls playsInline preload="metadata" aria-label={`播放视频 ${item.name}`} />}
      {editing && <figcaption><span title={item.name}>{item.name}</span><button className="text-button" disabled={busy} aria-label={`删除${item.kind === 'image' ? '图片' : '视频'} ${item.name}`} onClick={() => update(() => deleteMedia(item.id))}>删除</button></figcaption>}
    </figure>)}</div>
    {viewImage && <ImageViewer music={music} item={viewImage} onClose={() => setViewImage(null)} />}
  </section>;
}

function ImageViewer({ item, onClose, music }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="image-viewer" aria-label="查看图片" onCancel={onClose}><MusicButton music={music} /><button className="close-button" aria-label="关闭图片" onClick={onClose}>×</button><img src={item.url} alt={item.name} /></dialog>;
}
