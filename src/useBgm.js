import { useEffect, useRef, useState } from 'react';

const PREFERENCE = 'life-record:music-enabled';
export default function useBgm() {
  const controls = useRef(null);
  const [state, setState] = useState({ playing: false, loading: false, blocked: false, error: '' });
  useEffect(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}quiet-orbit.wav`);
    audio.loop = true; audio.preload = 'none'; audio.volume = .5;
    let enabled = true, disposed = false, sequence = 0, blocked = false, pending = false, videoSuspended = false;
    try { enabled = localStorage.getItem(PREFERENCE) !== 'false'; } catch {}
    const update = value => { if (!disposed) setState(previous => ({ ...previous, ...value })); };
    const pause = () => { sequence++; pending = false; audio.pause(); update({ playing: false, loading: false }); };
    async function play() {
      if (!enabled || disposed || document.hidden || videoSuspended || pending) return;
      if ([...document.querySelectorAll('video')].some(video => !video.paused)) return;
      if (!audio.paused) return;
      const id = ++sequence; pending = true;
      update({ loading: true, error: '' });
      try {
        if (audio.error) audio.load();
        await audio.play();
        if (id !== sequence || disposed) return;
        blocked = false; pending = false; update({ playing: true, loading: false, blocked: false });
      } catch (error) {
        if (id !== sequence || disposed) return;
        pending = false; blocked = error.name === 'NotAllowedError';
        update({ playing: false, loading: false, blocked, error: blocked ? '' : '音乐暂时无法播放，点音符可重试。' });
      }
    }
    function toggle() {
      if (enabled && (!audio.paused || pending)) {
        enabled = false; blocked = false; pause(); update({ blocked: false, error: '' });
      } else { enabled = true; videoSuspended = false; play(); }
      try { localStorage.setItem(PREFERENCE, String(enabled)); } catch {}
    }
    const gesture = event => {
      if (event.target instanceof Element && event.target.closest('.music-button')) return;
      if (enabled && blocked) play();
    };
    const visibility = () => { if (document.hidden) pause(); else play(); };
    const leave = () => pause();
    const returnPage = () => play();
    const video = event => { if (event.target instanceof HTMLVideoElement) { videoSuspended = true; pause(); } };
    const onPause = () => { if (audio.paused) update({ playing: false }); };
    const failed = () => { pause(); update({ error: '音乐暂时无法播放，点音符可重试。' }); };
    controls.current = { toggle };
    document.addEventListener('pointerdown', gesture, true); document.addEventListener('keydown', gesture, true);
    document.addEventListener('visibilitychange', visibility); document.addEventListener('play', video, true);
    window.addEventListener('pagehide', leave); window.addEventListener('pageshow', returnPage);
    audio.addEventListener('pause', onPause); audio.addEventListener('error', failed);
    play();
    return () => {
      disposed = true; sequence++; controls.current = null;
      audio.removeEventListener('pause', onPause); audio.removeEventListener('error', failed);
      audio.pause(); audio.removeAttribute('src'); audio.load();
      document.removeEventListener('pointerdown', gesture, true); document.removeEventListener('keydown', gesture, true);
      document.removeEventListener('visibilitychange', visibility); document.removeEventListener('play', video, true);
      window.removeEventListener('pagehide', leave); window.removeEventListener('pageshow', returnPage);
    };
  }, []);
  return { ...state, toggle: () => controls.current?.toggle() };
}
