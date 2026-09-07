import { useEffect, useRef, useState } from 'react';
import { createBackup, inspectConflicts, MAX_BACKUP_BYTES, restoreBackup, validateBackup } from './backup';
import { recoverRestore } from './repository';
import MusicButton from './MusicButton';

export default function DataDialog({ onClose, onRestored, music }) {
  const ref = useRef(null), input = useRef(null);
  const [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [error, setError] = useState('');
  const [preview, setPreview] = useState(null), [policy, setPolicy] = useState('keep');
  const [offlineReady, setOfflineReady] = useState(false);
  const [pendingRecovery, setPendingRecovery] = useState(false);
  useEffect(() => {
    ref.current.showModal(); let active = true;
    if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(() => { if (active) setOfflineReady(true); });
    return () => { active = false; };
  }, []);
  async function run(action) {
    setBusy(true); setError(''); setStatus('');
    try { await action(); } catch (e) { setError(e.message || '操作未完成，请重试。'); if (e.recoveryPending) setPendingRecovery(true); }
    finally { setBusy(false); }
  }
  async function download() {
    await run(async () => {
      const blob = await createBackup();
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = `日与夜备份-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      setStatus('备份文件已生成，请在下载中确认保存。');
    });
  }
  async function choose(file) {
    if (!file) return;
    setPreview(null);
    await run(async () => {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('当前原型支持 150 MB 以内的备份。');
      let parsed; try { parsed = JSON.parse(await file.text()); } catch { throw new Error('无法读取文件，请选择日与夜的 JSON 备份。'); }
      const backup = validateBackup(parsed);
      const conflicts = await inspectConflicts(backup);
      setPolicy('keep'); setPreview({ backup, conflicts, name: file.name });
    });
  }
  async function restore() {
    await run(async () => {
      const result = await restoreBackup(preview.backup, policy);
      onRestored(); setPreview(null); setStatus(`已恢复 ${result.count} 天的内容。`);
    });
  }
  return <dialog className="record-dialog data-dialog" ref={ref} aria-labelledby="data-title" onCancel={event => { if (busy || pendingRecovery) event.preventDefault(); else onClose(); }}>
    <MusicButton music={music} />
    <button className="close-button" disabled={busy || pendingRecovery} aria-label="关闭数据与使用" onClick={onClose}>×</button>
    <div className="data-content">
      <h1 id="data-title">数据与使用</h1>
      <p className="data-intro">把记录留好，也把它带走。</p>
      <section><h2>备份这段日子</h2><p>记录、文字、草稿、照片与视频，一起保存到一个文件里。换浏览器或换手机时，可以带着它回来。</p>
        <button className="primary-button" disabled={busy || pendingRecovery} onClick={download}>导出完整备份</button>
        <button className="data-import" disabled={busy || pendingRecovery} onClick={() => input.current.click()}>从备份恢复</button>
        <input ref={input} hidden type="file" accept=".json,application/json" aria-label="选择备份文件" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; choose(file); }} />
        <small>文件保存在你的设备上。当前支持 150 MB 以内的备份。</small>
      </section>
      {preview && <section className="restore-preview"><h2>恢复前看一眼</h2>
        <p className="backup-filename">{preview.name}</p>
        <p>{preview.backup.dates.length} 天 · {preview.backup.media.length} 个媒体文件 · {Object.keys(preview.backup.drafts).length} 份草稿</p>
        {preview.backup.dates.length > 0 && <p>{preview.backup.dates[0]} 至 {preview.backup.dates.at(-1)}</p>}
        {preview.conflicts.length > 0 ? <fieldset><legend>{preview.conflicts.length} 个日期已有内容</legend>
          <label><input type="radio" name="conflict" value="keep" checked={policy === 'keep'} onChange={() => setPolicy('keep')} />保留本机这些日期的内容</label>
          <label><input type="radio" name="conflict" value="replace" checked={policy === 'replace'} onChange={() => setPolicy('replace')} />使用备份中的整日内容</label>
          {policy === 'replace' && <p>重叠日期的记录、草稿和媒体将一起替换。</p>}
        </fieldset> : <p>与本机记录没有日期冲突。</p>}
        <button className="primary-button" disabled={busy || pendingRecovery || !preview.backup.dates.length} onClick={restore}>确认恢复</button>
        <button className="text-button" disabled={busy || pendingRecovery} onClick={() => setPreview(null)}>取消导入</button>
      </section>}
      {busy && <p role="status" className="inline-status">正在处理，请稍等…</p>}
      {status && <p role="status" className="inline-status">{status}</p>}
      {error && <p role="alert" className="save-error">{error}</p>}
      {pendingRecovery && <button className="primary-button" disabled={busy} onClick={() => run(async () => { await recoverRestore(); onRestored(); setPendingRecovery(false); setPreview(null); setStatus('恢复已完成。'); })}>继续恢复</button>}
      <section><h2>放到手机主屏幕</h2><p>在手机浏览器菜单里选择“添加到主屏幕”；iPhone 可从 Safari 的分享菜单进入。</p><p className="offline-state">{offlineReady ? '✓ 已准备好离线使用' : '首次联网加载后准备离线使用'}</p><small>记录保存在当前浏览器。清理网站数据前，请先导出备份。</small></section>
    </div>
  </dialog>;
}
