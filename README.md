# 日与夜

**手机正式地址：[日与夜 · 最新版](https://day-and-night-life-next.vercel.app/)**。已发布到公网，电脑可以关闭。详情见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

一个移动端优先的极简生活记录 Web App。用太阳记录吃饭、月亮记录睡眠，再根据心情生成当天的星星，逐步点亮年度星图。

## CloudBase 邮箱登录

- SDK：`@cloudbase/js-sdk` 3.9.2，认证模块延迟加载。
- 环境：`daynight-d2g3dj5fs4734fda7`，地域：`ap-shanghai`。
- 正式域名：`https://daynight.zenmehui.fun`。该域名需已加入 CloudBase 身份认证的安全域名配置。
- 登录入口位于页面左上角。输入邮箱获取 6 位验证码，SDK 调用 `signInWithOtp({ email })`；用户输入验证码后调用本次请求返回的 `verifyOtp({ token })`。
- SDK 使用 `persistence: 'local'` 保存认证会话；刷新后通过 `getSession()` 恢复，并通过 `onAuthStateChange()` 同步登录、退出和令牌刷新状态。
- 验证码只保存在当前登录弹层内存中。前端只包含公开的环境 ID 和地域，没有管理员 API Key、Secret 或私钥。
- 账号仅用于建立认证闭环，没有连接数据库，也没有把现有 localStorage、日记或 IndexedDB 媒体绑定到账号。

## 打开与运行

- 本地预览：http://127.0.0.1:5174/
- 本地数据保存在当前浏览器中，与正式地址的数据彼此独立。

在本目录运行：

```sh
npm install
npm test
npm run build
npm run preview
```

预览地址为 5174，提供完整的离线缓存。开发时使用 `npm run dev`，地址为 5175；开发服务器不注册离线缓存，避免影响热更新。

修改完成后，重新 `npm run build`，关闭该地址的全部页面再重新打开，即可使用新缓存版本。预览服务可以保持运行。

## 这版可以体验什么

1. 首次打开时，太阳和月亮旁有轻提示；进入记录后消失。
2. 睡眠优先沿用最近一次已记录的时间；首次预填 00:00–07:30，用户保存前不计入记录。时长快捷选项以当前选择的起床时间为基准。
3. 选择吃饭 3+ 后，可以继续增加实际顿数和时间，吃饭得分仍然封顶 5 分。
4. 保存后有短暂反馈。首次生成当天星星后，可以直接进入当月星图。
5. 星图周、月、年共用原有固定星位，切换尺度保留所查看的时间；年图点星群进入月图，月图进一步进入周图。星群附近的空白也可点击放大。周图提供容易点击的日期入口，支持补记过去的日子。
6. 日记文字输入后保存本地草稿；下次打开、刷新仍可继续写。保存文字后清除草稿，正式记录和草稿分别保存。
7. Statistics 底部的“数据与使用”提供完整备份和恢复，包括每日记录、文字、草稿、图片、视频。导入先校验，再预览日期数量及冲突。默认保留本机重叠日期；也可明确选择使用备份的整日内容。
8. 首次联网加载完成后，可以断网打开、编辑、回看本地媒体。附有主屏幕图标与 manifest。

备份格式为 JSON，媒体通过 Base64 封装。本原型限制备份文件为 150 MB，导出时也检查同样的上限。媒体数量更大时应另行实现流式文件包导出，当前不宣称支持无限媒体。

## 原有规则与扩展空间

- 原有时钟插画、太阳在上/月亮在下、粗黑描边、米白 Today 和 Statistics、深蓝星图保持。
- 星位布局保持稳定，年度仍是一整张连续星图；连线根据已有记录调整可见度。
- 星星大小只由睡眠与吃饭分数决定，亮度只由心情决定。
- 每日数据的 `schemaVersion` 为 3，`starRuleVersion` 为 1；兼容旧版已有记录。旧版 3+ 通过 `mealCountAtLeast` 保留“至少三顿”的含义，直到用户重新确认顿数。
- 每日对象预留 `extensions`，例如未来可保存 `{ reading: { completed: true } }`。当前没有加入爱好打卡界面，也不把扩展记录混入星星评分。
- 页面通过 `repository.js` 保存正式记录和草稿。图片、视频继续存 IndexedDB，JSON 记录继续存 localStorage。
- 恢复操作先在同一 IndexedDB 事务中写入媒体与待完成的记录快照，再更新 localStorage。中断后会在下次启动时继续恢复；未完成期间阻止继续编辑。

当前没有账号与跨设备自动同步。备份文件由用户手动保管和转移。旧版原始记录 JSON 可导入；旧版媒体须以完整备份结构提供，不能仅靠记录 JSON 带入。

## 目录

```text
life-record-next/
├── index.html
├── package.json / package-lock.json
├── vite.config.js
├── public/
│   ├── manifest.webmanifest
│   ├── icon.svg
│   └── icon-192.png / icon-512.png
├── scripts/
│   └── build-sw.js
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── Clock.jsx
│   ├── RecordDialog.jsx
│   ├── DiaryDialog.jsx
│   ├── StarMap.jsx
│   ├── PeriodControls.jsx
│   ├── Statistics.jsx / MoodFace.jsx
│   ├── DataDialog.jsx
│   ├── model.js / media.js
│   ├── repository.js / backup.js
│   └── styles.css / iteration.css / update.css
├── tests/
│   ├── model.test.js
│   ├── iteration.test.js
│   └── update.test.js
├── VERIFICATION.json
└── dist/                  构建后的可部署静态文件
```

## 相对原版的文件变更

本次修改只发生在 `life-record-next`。新增 `DataDialog.jsx`、`repository.js`、`backup.js`、`update.css`、`public/*`、`scripts/build-sw.js`、`tests/update.test.js` 及本说明。

修改 `App.jsx`、`Clock.jsx`、`RecordDialog.jsx`、`DiaryDialog.jsx`、`StarMap.jsx`、`PeriodControls.jsx`、`Statistics.jsx`、`main.jsx`、`model.js`、`media.js`、`index.html`、`package.json`、`package-lock.json`、`tests/iteration.test.js`。

## 验证与边界

- 19 项 Node 测试通过，覆盖评分、时间、旧记录、实际顿数和备份校验。
- Chrome 浏览器验证：睡眠/吃饭/心情、记录持久化、草稿、图片和视频、完整导入导出、保留/替换冲突、无效文件、离线刷新和编辑、离线媒体播放。
- 模拟恢复时 localStorage 写入失败，确认重新打开后恢复记录、草稿和媒体，媒体不重复。
- 检查 375×812、375×667、320×568 和 1440×1000 布局，无横向溢出。
- 1/7/30/183/365 天星图截图位于相邻 outputs 根目录，名称 `next-year-*-days.png`。这些使用独立测试数据，不注入正常应用。
- 最初为本地独立预览；2026-09-04 已将最新版独立发布至 https://day-and-night-life-next.vercel.app/。原有线上版本保留。国内网络可达性和手机实机安装行为未作保证。

主屏幕安装和离线功能在正式部署时需要 HTTPS；127.0.0.1 属于浏览器允许的本机测试环境。

## 时钟修正

更新版已改为常规 12 小时模拟时钟：12/3/6/9 方位，小时与分钟刻度，独立的时针、分针和秒针。插画的旋转不再影响计时。所有指针按设备本地时间计算，按整秒刷新；页面获得焦点、重新可见或从浏览器缓存恢复时立即校时。

吃饭标记与睡眠区间同步使用 12 小时位置。完整的开始/结束时间仍以 24 小时格式保存在记录中；12 小时及以上睡眠在表盘上绘制完整一圈，具体时长可在详情查看。

本轮修改：src/Clock.jsx、src/model.js、src/App.jsx、tests/iteration.test.js，新增 tests/clock.test.js。验证了 03/06/09/12 点方位、15:30:30 的三针角度、23:59:59 跨午夜、实时秒针、返回页面校时及太阳/月亮交互。截图：outputs/next-real-clock-mobile.png、outputs/next-real-clock-desktop.png。

## 交互与轻音乐更新

- 已有记录的星星在年/月/周视图都可直接打开简洁查看态；空白区域仍支持逐级放大。关闭详情回到原尺度与位置。
- 查看态仅展示日期、星星、心情、睡眠/吃饭摘要，以及实际保存的文字和媒体；“编辑记录”展开编辑入口。空白日期直接进入编辑。
- 保存记录后回到摘要并短暂显示“已保存”；单项睡眠、吃饭或心情保存后也回到摘要。媒体操作即时保存，输入文字保持草稿，最后“保存记录”提交文字并收起表单。
- 太阳/月亮触碰反馈、弹层进入、心情确认、睡眠弧线绘制、饭点出现/移动、首次星星生成、星图缩放及返回定位均有轻动画。
- 编辑期间保持背后的星图旧状态；关闭详情后过渡到新的大小/亮度，定位环仅短暂出现，不持续闪烁。减少动态效果模式关闭上述位移与缩放。
- 星图左下角音符按钮手动播放/暂停一首 64 秒合成纯音乐。默认静音，离开星图短暂淡出并暂停，视频播放、页面隐藏或退出时立即暂停，返回不自动恢复。
- 音乐源文件为 public/quiet-orbit.wav；由 scripts/make-music.js 原创编排与谐波合成，无第三方录音或采样。说明见 public/MUSIC.md。运行 node scripts/make-music.js 可重建。
- 音乐首次成功播放后独立缓存；核心离线安装不等待音乐下载。音乐加载失败不影响记录和核心离线能力。

本轮新增：src/motion.js、src/useBgm.js、src/MusicButton.jsx、src/interaction.css、scripts/make-music.js、public/quiet-orbit.wav、public/MUSIC.md、INTERACTION-VERIFICATION.json。
本轮修改：src/App.jsx、src/Clock.jsx、src/DiaryDialog.jsx、src/StarMap.jsx、src/main.jsx、scripts/build-sw.js。

已在 Chrome 中验证查看/编辑切换、草稿保留、媒体呈现、保存失败不误报成功、快速心情选择以最后一次为准、音乐播放/暂停/视频互斥/后台暂停、音乐离线播放与加载失败、320px/375px/桌面布局及减少动态效果。手机系统锁屏行为仍需实机确认。
测试截图：outputs/interaction-reading.png、outputs/interaction-saved.png、outputs/interaction-return-map.png、outputs/interaction-music-map.png。记录与媒体使用隔离的测试浏览器，不写入用户浏览器。

## 全应用音乐与星空动效

本轮按最新需求将音乐改为全应用播放。首次打开自动尝试播放；遇到浏览器 NotAllowedError 时，在首次点击或按键后重试。手动暂停的选择会保留，切页或刷新不会擅自恢复。页面隐藏时暂停，回来时仅在音乐仍开启且未被视频中断时恢复。视频播放时暂停 BGM，之后可用音符按钮恢复。

Today、Star Map、Statistics 右上角均有同一个播放状态的音符控制。记录、日记、数据及图片查看弹层内也有控制按钮。

星图新增独立的装饰层：8 个缓慢明暗变化的光点、两条间歇流星、偶尔经过的火箭与飞碟。它们使用扁平 SVG 插画，不参与数据计算，不拦截触碰。打开日记和页面隐藏时暂停；系统减少动态效果开启时隐藏装饰层。记录星星仍保持心情决定的固定亮度。

新增 src/SpaceEffects.jsx、src/space.css。修改 src/useBgm.js、src/MusicButton.jsx、src/App.jsx、src/StarMap.jsx、src/RecordDialog.jsx、src/DiaryDialog.jsx、src/DataDialog.jsx、src/main.jsx。

验证结果：SPACE-VERIFICATION.json。Chrome 中验证了允许自动播放时首次打开出声、跨三个页面持续播放、弹层内暂停、手动暂停持久化、后台暂停与恢复、动效存在且不遮挡点击、减少动态效果，以及 320px/375px/桌面宽度。通过注入 NotAllowedError 验证了受限自动播放回退到首次真实用户点击；未声称所有手机浏览器允许无交互播放。

动效精修：保留光点闪烁；流星改为细长、渐隐的尾迹，约 1.4 秒划过。火箭缩至 27px 宽，沿曲线飞行并随轨迹调整朝向；飞碟缩至 43px 宽，带轻微起伏。以 60 秒为周期错开出现，分别于第 3/25 秒出现流星、第 10 秒开始火箭、第 36 秒开始飞碟。飞行物每次约 9.6 秒，留出安静间隔。路径随可视区域尺寸调整，桌面飞行范围限制为 650px。运动使用 CSS offset-path，ResizeObserver 只在尺寸改变时更新路径。

本轮修改 src/SpaceEffects.jsx、src/space.css、README.md。MOTION-VERIFICATION.json 记录手机尺寸下多个时间点的轨迹、错开出现及桌面尺寸检查；19 项单元测试及 SPACE-VERIFICATION.json 中的回归检查通过。outputs/motion-*.png 为精修后的时间轴抽帧。

## 统计页参考图调整

第三页保留浅色底，采用分隔线分区、七天记录图标及大太阳/月亮平均值摘要。心情概览使用表情与天数，五档分布使用同一套表情。未记录的日期显示淡空心图标，各指标分别判断记录状态，零分仍属于已记录。

手机上平均值与七天图标上下排列，620px 以上并排排列。月视图按日横滑，年视图按月平均状态横滑，整体统计仍按原有逐日数据计算。睡得好、吃得好的计数保持评分达到 4 分的规则，旧版 3+ 仍按 3 顿计算。

修改 src/Statistics.jsx，新增 src/statistics.css。构建与 19 项单元测试通过；STATISTICS-VERIFICATION.json 记录示例平均值、按项空缺、周月年切换、横滑、刷新持久化，以及 320/375/768/1440px 布局检查。示例数据仅存在于隔离测试浏览器，不写入用户记录。预览图位于上级 outputs/statistics-reference-mobile.png 与 outputs/statistics-reference-desktop.png。
