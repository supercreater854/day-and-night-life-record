import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './iteration.css';
import './update.css';
import './interaction.css';
import './space.css';
import { recoverRestore } from './repository';

const root = createRoot(document.getElementById('root'));
async function start() {
  root.render(<div className="startup" role="status">正在打开记录…</div>);
  try {
    await recoverRestore();
    root.render(<React.StrictMode><App /></React.StrictMode>);
  } catch {
    root.render(<div className="startup"><p>本地记录暂时无法打开。请检查浏览器存储空间和权限，再试一次。</p><button onClick={start}>重新打开</button></div>);
  }
}
start();
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { /* Data panel shows offline readiness separately. */ });
}
