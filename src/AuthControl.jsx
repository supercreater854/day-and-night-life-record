import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cloudbaseAuth, sessionUser, userEmail } from './cloudbase';

const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function AuthControl({ onUserChange, isPro = false, proExpiresAt = null }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    cloudbaseAuth.getSession().then(result => {
      if (active) setUser(result?.error ? null : sessionUser(result));
    }).catch(() => { if (active) setUser(null); }).finally(() => { if (active) setLoading(false); });
    const listener = cloudbaseAuth.onAuthStateChange((event, session) => {
      if (!active) return;
      setUser(event === 'SIGNED_OUT' ? null : session?.user ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
      listener?.data?.subscription?.unsubscribe?.();
    };
  }, []);
  useLayoutEffect(() => { onUserChange?.(user); }, [onUserChange, user]);

  const email = userEmail(user);
  return <>
    <button className={`auth-entry ${user ? 'is-signed-in' : ''} ${isPro ? 'is-pro' : ''}`} onClick={() => setOpen(true)} aria-label={user ? `账号，已登录 ${email}${isPro ? '，Pro 用户' : ''}` : '邮箱登录'}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2" /><path d="M5.5 19c.6-3.6 2.8-5.4 6.5-5.4s5.9 1.8 6.5 5.4" /></svg>
      <span>{loading ? '…' : isPro ? 'Pro' : user ? '已登录' : '登录'}</span>
    </button>
    {open && <AuthDialog user={user} isPro={isPro} proExpiresAt={proExpiresAt} onUser={setUser} onClose={() => setOpen(false)} />}
  </>;
}

function AuthDialog({ user, isPro, proExpiresAt, onUser, onClose }) {
  const ref = useRef(null);
  const [email, setEmail] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [code, setCode] = useState('');
  const [verifyOtp, setVerifyOtp] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => { ref.current.showModal(); return () => ref.current?.close(); }, []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function sendCode(event) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    setError(''); setMessage('');
    if (!validEmail(normalized)) { setError('请输入有效的邮箱地址。'); return; }
    setBusy(true);
    try {
      const result = await cloudbaseAuth.signInWithOtp({ email: normalized, options: { shouldCreateUser: true } });
      if (result.error || typeof result.data?.verifyOtp !== 'function') throw result.error ?? new Error('验证码发送失败');
      setEmail(normalized); setSentEmail(normalized); setVerifyOtp(() => result.data.verifyOtp); setCooldown(60);
      setMessage('验证码已发送，请查看邮箱。');
    } catch {
      setError('验证码发送失败，请检查邮箱或稍后重试。');
    } finally { setBusy(false); }
  }

  async function signIn(event) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) { setError('请输入6位验证码。'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await verifyOtp({ token: code });
      if (result.error || !sessionUser(result)) throw result.error ?? new Error('登录失败');
      onUser(sessionUser(result)); setCode(''); setVerifyOtp(null); setMessage('登录成功。');
    } catch {
      setError('验证码无效或已过期，请重新获取。');
    } finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true); setError('');
    try {
      const result = await cloudbaseAuth.signOut();
      if (result?.error) throw result.error;
      onUser(null); setMessage('已退出登录。');
    } catch { setError('暂时无法退出，请稍后重试。'); }
    finally { setBusy(false); }
  }

  function changeEmail() {
    setSentEmail(''); setCode(''); setVerifyOtp(null); setMessage(''); setError(''); setCooldown(0);
  }

  const currentEmail = userEmail(user);
  return <dialog ref={ref} className="auth-dialog" aria-labelledby="auth-title" onCancel={event => { if (busy) event.preventDefault(); else onClose(); }}>
    <button className="auth-close" disabled={busy} onClick={onClose} aria-label="关闭账号窗口">×</button>
    <div className="auth-content">
      {user ? <>
        <span className="auth-symbol signed" aria-hidden="true">✓</span>
        <h1 id="auth-title">已登录</h1>
        <p className="auth-email">{currentEmail || 'CloudBase 用户'}</p>
        <p className="auth-note">{isPro ? `Day & Night Pro · 有效至 ${new Date(proExpiresAt).toLocaleDateString('zh-CN')}` : '每日记录会保留在本机，并同步到你的账号。'}</p>
        <button className="auth-secondary" disabled={busy} onClick={signOut}>{busy ? '正在退出…' : '退出登录'}</button>
      </> : <>
        <span className="auth-symbol" aria-hidden="true">@</span>
        <h1 id="auth-title">邮箱登录</h1>
        {!sentEmail ? <form onSubmit={sendCode}>
          <label className="auth-field"><span>邮箱</span><input type="email" autoComplete="email" inputMode="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" disabled={busy} autoFocus /></label>
          <button className="auth-primary" disabled={busy}>{busy ? '正在发送…' : '获取验证码'}</button>
        </form> : <form onSubmit={signIn}>
          <p className="auth-sent-to">验证码已发送至<br /><strong>{sentEmail}</strong></p>
          <label className="auth-field"><span>6位验证码</span><input className="auth-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" disabled={busy} autoFocus /></label>
          <button className="auth-primary" disabled={busy || code.length !== 6}>{busy ? '正在登录…' : '登录'}</button>
          <div className="auth-inline-actions"><button type="button" disabled={busy || cooldown > 0} onClick={sendCode}>{cooldown ? `${cooldown}秒后重试` : '重新发送'}</button><button type="button" disabled={busy} onClick={changeEmail}>更换邮箱</button></div>
        </form>}
      </>}
      {message && <p className="auth-message" role="status">{message}</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
    </div>
  </dialog>;
}
