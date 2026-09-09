import { calculateDayScore, clockHands, clockPoint, deriveStarAppearance, sleepArc, sleepMinutes, starPoints, timeMinutes } from './model';
import { touchFeedback } from './motion';
import { recordExperience } from './experience';

export function Moon({ ...props }) {
  return <path d="M 25,-48 C -9,-51 -42,-27 -42,8 C -42,43 -9,62 21,47 C 42,37 53,17 49,-4 C 27,15 0,5 -7,-15 C -12,-29 0,-44 25,-48 Z" {...props} />;
}

export default function Clock({ onSleep, onMeals, onMood, onDiary, now = new Date(), record, intro = false }) {
  const arc = sleepArc(record?.sleepStart, record?.sleepEnd);
  const experience = recordExperience(record);
  const hands = clockHands(now);
  const day = calculateDayScore(record);
  const appearance = deriveStarAppearance(day.dayScore, day.completeness);
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()].map(value => String(value).padStart(2, '0')).join(':');
  const activate = action => event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); action(); }
  };
  const status = `${experience.mealRecorded ? '吃饭已记录' : '吃饭未记录'}，${experience.sleepRecorded ? '睡眠已记录' : '睡眠未记录'}，${record?.mood ? '心情已记录' : '心情未记录'}`;
  return <svg className="clock" viewBox="0 0 480 480" aria-label={`12 小时时钟，当前时间 ${time}，${status}`}>
    <defs><clipPath id="clock-face"><circle cx="240" cy="240" r="184" /></clipPath></defs>
    <g className="clock-dial" transform="rotate(180 240 240)">
    <circle cx="240" cy="240" r="231" fill="#f7f5ee" stroke="#191c21" strokeWidth="8" />
    <g clipPath="url(#clock-face)">
      <path d="M50 50H430V240H50Z" fill="#263d6a" />
      <path d="M50 240H430V430H50Z" fill="#a9d9ed" />
      <path d="M50 240H430" stroke="#191c21" strokeWidth="7" />
      <g fill="#f9df86" stroke="#191c21" strokeWidth="3.5" strokeLinejoin="round">
        <polygon points={starPoints(121, 190, 13)} transform="rotate(180 121 190)" />
        <polygon points={starPoints(327, 126, 12)} transform="rotate(180 327 126)" />
        <polygon points={starPoints(358, 191, 16)} transform="rotate(180 358 191)" />
        <circle cx="277" cy="95" r="3" stroke="none" />
        <circle cx="284" cy="202" r="3" stroke="none" />
      </g>
      <path d="M74 308 C57 298 69 275 87 280 C89 258 123 252 134 276 C153 269 169 285 160 301 C171 313 158 326 144 325 H88 C76 325 69 318 74 308Z" transform="rotate(180 116 294)" fill="#fffdf5" stroke="#191c21" strokeWidth="6" strokeLinejoin="round" />
      <path d="M352 374 C339 363 347 346 361 347 C368 326 396 328 403 347 C423 342 435 359 425 372 C430 385 417 393 405 390 H368 C356 392 347 384 352 374Z" transform="rotate(180 390 360)" fill="#fffdf5" stroke="#191c21" strokeWidth="6" strokeLinejoin="round" />
      <g className={`celestial moon-button ${experience.sleepRecorded ? 'is-recorded' : ''}`} role="button" tabIndex="0" aria-label={experience.sleepRecorded ? '睡眠已记录，点击修改' : '记录睡眠'} onClick={event => { touchFeedback(event, 'moon'); onSleep(); }} onKeyDown={activate(onSleep)}>
        <circle className="hit-area" cx="218" cy="156" r="74" />
        <g transform="translate(218 150) rotate(168)"><Moon fill="#ffdc71" stroke="#191c21" strokeWidth="7" strokeLinejoin="round" /></g>
      </g>
      <g className={`celestial sun-button ${experience.mealRecorded ? 'is-recorded' : ''}`} role="button" tabIndex="0" aria-label={experience.mealRecorded ? '吃饭已记录，点击修改' : '记录吃饭'} onClick={event => { touchFeedback(event, 'sun'); onMeals(); }} onKeyDown={activate(onMeals)}>
        <circle className="hit-area" cx="260" cy="326" r="82" />
        <polygon points={starPoints(260, 326, 72, 0.76, 12)} fill="#ffcd55" stroke="#191c21" strokeWidth="6.5" strokeLinejoin="round" />
        <circle cx="260" cy="326" r="46" fill="#ffda6e" stroke="#191c21" strokeWidth="6" />
      </g>
    </g>
    <circle cx="240" cy="240" r="184" fill="none" stroke="#191c21" strokeWidth="8" pointerEvents="none" />
    </g>
    {arc && <g className="sleep-band" data-duration={sleepMinutes(record.sleepStart, record.sleepEnd)} pointerEvents="none">
      <title>{`睡眠 ${record.sleepStart} → ${record.sleepEnd}`}</title>
      <path d={arc} pathLength="1" fill="none" stroke="#191c21" strokeWidth="15" strokeLinecap="round" />
      <path d={arc} pathLength="1" fill="none" stroke="#aca9e6" strokeWidth="10" strokeLinecap="round" />
    </g>}
    {(record?.mealTimes ?? []).map((time, index) => {
      const position = clockPoint(timeMinutes(time));
      return <circle className="meal-marker" key={index} data-time={time} cx={position.x} cy={position.y} style={{ cx: position.x, cy: position.y, animationDelay: `${index * 75}ms` }} r="7" fill="#ffb34e" stroke="#191c21" strokeWidth="3" pointerEvents="none"><title>{`吃饭 ${time}`}</title></circle>;
    })}
    <g className="clock-record-status" pointerEvents="none" aria-hidden="true">
      {experience.mealRecorded && <g className="recorded-check sun-check" transform="translate(166 112)"><circle r="13" /><path d="m-6 0 4 5 9-11" /></g>}
      {experience.sleepRecorded && <g className="recorded-check moon-check" transform="translate(324 365)"><circle r="13" /><path d="m-6 0 4 5 9-11" /></g>}
      {experience.sleepRecorded && <g className="sleep-status-stars">
        <polygon points={starPoints(318, 287, 7)} /><polygon points={starPoints(205, 352, 5)} /><polygon points={starPoints(337, 322, 4)} />
      </g>}
    </g>
    {Array.from({ length: 60 }, (_, i) => {
      if (i % 15 === 0) return null;
      const a = i * Math.PI / 30;
      const end = i % 5 === 0 ? 215 : 208;
      return <line className="clock-tick" key={i} x1={240 + Math.sin(a) * 201} y1={240 - Math.cos(a) * 201} x2={240 + Math.sin(a) * end} y2={240 - Math.cos(a) * end} stroke="#191c21" strokeWidth={i % 5 === 0 ? 3.5 : 1.5} strokeLinecap="round" pointerEvents="none" />;
    })}
    <g className="clock-numbers" fill="#191c21" textAnchor="middle" dominantBaseline="central">
      <text x="240" y="31">12</text><text x="449" y="240">3</text>
      <text x="240" y="449">6</text><text x="31" y="240">9</text>
    </g>
    <g className="clock-hands" data-time={time} pointerEvents="none" aria-label={`当前时间 ${time}`}>
      <g className="hour-hand" data-angle={hands.hour} transform={`rotate(${hands.hour} 240 240)`}>
        <line x1="240" y1="248" x2="240" y2="145" stroke="#f7f5ee" strokeWidth="13" strokeLinecap="round" />
        <line x1="240" y1="248" x2="240" y2="145" stroke="#191c21" strokeWidth="9" strokeLinecap="round" />
      </g>
      <g className="minute-hand" data-angle={hands.minute} transform={`rotate(${hands.minute} 240 240)`}>
        <line x1="240" y1="250" x2="240" y2="95" stroke="#f7f5ee" strokeWidth="9" strokeLinecap="round" />
        <line x1="240" y1="250" x2="240" y2="95" stroke="#191c21" strokeWidth="5.5" strokeLinecap="round" />
      </g>
      <g className="second-hand" data-angle={hands.second} transform={`rotate(${hands.second} 240 240)`}>
        <line x1="240" y1="261" x2="240" y2="78" stroke="#f7f5ee" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="240" y1="261" x2="240" y2="78" stroke="#c75942" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <circle cx="240" cy="240" r="9" fill="#191c21" /><circle cx="240" cy="240" r="3.5" fill="#c75942" />
    </g>
    <g className={`today-star-anchor mood-entry ${appearance.complete ? 'is-ready' : 'is-waiting'}`} role="button" tabIndex="0" aria-label={record?.mood ? '心情已记录，点击修改' : '记录今天的心情'} onClick={onMood} onKeyDown={activate(onMood)}>
      <circle className="hit-area" cx="240" cy="240" r="32" />
      {appearance.halo > 0 && <circle className="today-star-halo" cx="240" cy="240" r={22 * appearance.size} fill="none" stroke={appearance.color} strokeWidth="3" opacity={appearance.halo} />}
      <polygon className="today-star-shape" points={starPoints(240, 240, appearance.complete ? 15 * appearance.size : 14)} fill={appearance.color} opacity={appearance.brightness} stroke={appearance.complete ? appearance.stroke : '#6f7780'} strokeWidth="2.4" strokeLinejoin="round" />
      {!appearance.complete && Array.from({ length: day.completeness }, (_, index) => <circle key={index} cx={231 + index * 18} cy="266" r="2.8" fill="#191c21" />)}
    </g>
    <g className={`diary-corner-entry ${record?.diaryText?.trim() ? 'has-text' : ''}`} role="button" tabIndex="0" aria-label={record?.diaryText?.trim() ? '简记已保存，点击修改' : '写一条简记'} onClick={onDiary} onKeyDown={activate(onDiary)}>
      <path d="M377 250h39v45h-39z" fill="#fffdf5" stroke="#191c21" strokeWidth="3" />
      <path d="M401 250v15h15" fill="#ffdc71" stroke="#191c21" strokeWidth="3" strokeLinejoin="round" />
      <path d="M386 276h20M386 284h14" stroke="#191c21" strokeWidth="2" strokeLinecap="round" />
      {record?.diaryText?.trim() && <path d="m387 266 4 4 8-9" fill="none" stroke="#c75942" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
    </g>
    {intro && <g className="clock-intro" pointerEvents="none" textAnchor="middle"><g><rect x="165" y="191" width="110" height="25" rx="12" fill="#fffdf5" stroke="#191c21" strokeWidth="2" /><text x="220" y="208" fill="#191c21">点太阳 · 吃饭</text></g><g><rect x="204" y="390" width="116" height="25" rx="12" fill="#ffdc71" stroke="#191c21" strokeWidth="2" /><text x="262" y="407" fill="#191c21">点月亮 · 睡眠</text></g><g><rect x="187" y="262" width="106" height="23" rx="11" fill="#fffdf5" stroke="#191c21" strokeWidth="2" /><text x="240" y="278" fill="#191c21">点星星 · 心情</text></g></g>}
  </svg>;
}
