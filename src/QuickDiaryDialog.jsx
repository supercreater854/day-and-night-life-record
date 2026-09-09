import { useEffect, useRef, useState } from 'react';
import { readDraft, writeDraft } from './repository';

export default function QuickDiaryDialog({ date, record, onSave, onClose }) {
  const ref = useRef(null);
  const [text, setText] = useState(() => { try { return readDraft(date) ?? record?.diaryText ?? ''; } catch { return record?.diaryText ?? ''; } });
  const [status, setStatus] = useState('');
  useEffect(() => { ref.current.showModal(); return () => ref.current.close(); }, []);
  function change(value) {
    setText(value); setStatus('');
    try { writeDraft(date, value === (record?.diaryText ?? '') ? null : value); } catch { setStatus('草稿暂未保存'); }
  }
  function save() {
    if (!onSave(text)) { setStatus('文字还没有保存，请重试。'); return; }
    try { writeDraft(date, null); } catch { /* The record itself is already safe. */ }
    setStatus('saved');
    setTimeout(onClose, 180);
  }
  return <dialog ref={ref} className={`quick-diary ${status === 'saved' ? 'is-saved' : ''}`} onCancel={onClose} aria-labelledby="quick-diary-title">
    <button className="close-button" aria-label="关闭简记" onClick={onClose}>×</button>
    <div className="quick-paper"><span className="paper-fold" aria-hidden="true" /><h1 id="quick-diary-title">今天，想记一句什么？</h1><textarea autoFocus value={text} onChange={event => change(event.target.value)} rows="7" maxLength="1200" placeholder="写下此刻……" />
      {status && status !== 'saved' && <p role="alert">{status}</p>}
      {status === 'saved' && <div className="quick-diary-check" aria-label="已保存">✓</div>}
      <button className="primary-button" onClick={save}>保存简记</button></div>
  </dialog>;
}
