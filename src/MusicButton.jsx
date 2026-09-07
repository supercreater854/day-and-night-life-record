export default function MusicButton({ music }) {
  return <div className="music-control">
    <button className={`music-button ${music.playing ? 'is-playing' : ''}`} aria-label={music.loading ? '取消加载音乐' : music.playing ? '暂停背景音乐' : '播放背景音乐'} aria-pressed={music.playing} title={music.playing ? '暂停轻音乐' : '听一点轻音乐'} onClick={music.toggle}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17V5l11-2v12M9 8l11-2" /><ellipse cx="6" cy="18" rx="3" ry="2.5" /><ellipse cx="17" cy="16" rx="3" ry="2.5" /></svg>
      {music.playing && <span className="music-playing-dot" aria-hidden="true" />}
    </button>
    <span className="sr-only" role="status">{music.loading ? '音乐加载中' : music.playing ? '轻音乐播放中' : music.blocked ? '点击页面后开始播放音乐' : ''}</span>
    {music.error && <p className="music-error" role="status">{music.error}</p>}
  </div>;
}
