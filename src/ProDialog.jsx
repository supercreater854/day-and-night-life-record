import { useEffect, useRef, useState } from 'react';
import { cancelOrder, createOrder, markOrderPaid, PRO_PRODUCT } from './pro';
import { cloudbaseDb } from './cloudbase';

const benefits = ['完整30天回顾', '月度生活趋势', '所有历史月份', '完整统计'];

export default function ProDialog({ uid, email, onClose, onEntitlement }) {
  const ref = useRef(null);
  const [step, setStep] = useState('offer');
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { ref.current.showModal(); return () => ref.current?.close(); }, []);

  async function beginCheckout() {
    if (!uid) { setError('请先关闭窗口，并使用右上角邮箱登录。'); return; }
    setBusy(true); setError('');
    try {
      const next = await createOrder(cloudbaseDb, uid);
      setOrder(next); setStep('checkout');
    } catch { setError('暂时无法创建测试订单，请稍后重试。'); }
    finally { setBusy(false); }
  }

  async function pay() {
    setBusy(true); setError('');
    try {
      const entitlement = await markOrderPaid(cloudbaseDb, uid, order.id);
      setOrder(current => ({ ...current, status: 'paid' }));
      onEntitlement(entitlement); setStep('success');
    } catch { setError('模拟支付没有完成，尚未获得 Pro 权益。'); }
    finally { setBusy(false); }
  }

  async function cancelAndClose() {
    if (!order || order.status !== 'pending') { onClose(); return; }
    setBusy(true); setError('');
    try { await cancelOrder(cloudbaseDb, uid, order.id); onClose(); }
    catch { setError('订单暂时无法取消，但尚未支付，也不会获得 Pro 权益。'); }
    finally { setBusy(false); }
  }

  return <dialog ref={ref} className="pro-dialog" aria-labelledby="pro-title" onCancel={event => { event.preventDefault(); if (!busy) cancelAndClose(); }}>
    <button className="pro-close" disabled={busy} onClick={cancelAndClose} aria-label="关闭 Pro 窗口">×</button>
    <div className="pro-content">
      {step === 'offer' && <>
        <span className="pro-mark" aria-hidden="true">★</span>
        <h1 id="pro-title">{PRO_PRODUCT.name}</h1>
        <ul>{benefits.map(item => <li key={item}>✓ {item}</li>)}</ul>
        <strong className="pro-price">{PRO_PRODUCT.priceLabel}</strong>
        {email && <small className="pro-account">将绑定至 {email}</small>}
        <button className="pro-primary" disabled={busy} onClick={beginCheckout}>{busy ? '正在创建订单…' : uid ? '立即解锁' : '登录后解锁'}</button>
      </>}
      {step === 'checkout' && <>
        <span className="pro-mark checkout" aria-hidden="true">¥</span>
        <h1 id="pro-title">模拟收银台</h1>
        <dl><div><dt>商品</dt><dd>{PRO_PRODUCT.name}</dd></div><div><dt>金额</dt><dd>¥4.90</dd></div></dl>
        <p className="test-payment-note">当前为测试支付，不会产生真实扣款。</p>
        <button className="pro-primary" disabled={busy} onClick={pay}>{busy ? '正在处理…' : '模拟支付成功'}</button>
        <button className="pro-secondary" disabled={busy} onClick={cancelAndClose}>取消</button>
      </>}
      {step === 'success' && <>
        <span className="pro-mark success" aria-hidden="true">✓</span>
        <h1 id="pro-title">Pro 已解锁</h1>
        <p className="pro-success-copy">权益已经写入当前账号，有效期为 30 天。</p>
        <button className="pro-primary" onClick={onClose}>查看完整统计</button>
      </>}
      {error && <p className="pro-error" role="alert">{error}</p>}
    </div>
  </dialog>;
}
