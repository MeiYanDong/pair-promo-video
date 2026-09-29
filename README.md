# pair-promo-video

[PAIR](https://pair.fund/) 的 32 秒宣传片，完全用代码生成：一个 Canvas 场景文件逐帧渲染画面，一个合成器脚本生成原创配乐和音效，最后由 ffmpeg 合成 MP4。

![poster](out/poster.jpg)

**成片：[`out/pair-promo.mp4`](out/pair-promo.mp4)**

| 项目 | 规格 |
| --- | --- |
| 画面 | 1920×1080，60 fps，每帧 4 个子帧做运动模糊（快速镜头处 16 个），H.264 (yuv420p, BT.709) |
| 声音 | 原创合成配乐，120 BPM，D 小调，AAC 256k，响度 -14 LUFS |
| 时长 | 32 秒（16 小节，每小节 2 秒） |

## 做法：参考 awesome-opus5-5-videos

参考仓库 [yihui-dev/awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos) 收录了 389 条用 Claude Opus 5.5 写代码生成视频的提示词。这支片子主要借鉴了其中几条产品宣传片提示词的方法：

- **[@verbove](https://x.com/verbove/status/2103483957266268381) / [@AnnaCher___](https://x.com/AnnaCher___/status/2103571096549433425)**：一个 canvas、一个 `draw(t)` 纯函数，不用计时器，不在帧之间保存状态；闭式弹簧（closed-form spring）只允许很小的过冲，多次改变目标的数值用“弹簧求和”保持纯函数；120 BPM 节拍网格，每拍都有事件发生；先渲染每拍一帧的联系表（contact sheet）检查，再出全片；用光标驱动真实的 UI 操作。
- **[@brainextends](https://x.com/brainextends/status/2103801834930606193)**：逐秒时间轴、确定性的 `seek(t)`、子帧运动模糊、音乐和画面对拍、输出前检查接缝和文字重叠。
- **[@HowDevelop](https://x.com/HowDevelop/status/2103840883812733090)**：每个转场都要演示一个产品特性；加入“准确性护栏”，屏幕上的每个数字和说法都来自公开资料。
- **[@moritzkremb](https://x.com/moritzkremb/status/2103066071838466494)**：SaaS 发布片的叙事结构（痛点、产品、特性、数据、行动号召）。

## 分镜（节拍网格）

| 时间 | 小节 | 画面 | 声音 |
| --- | --- | --- | --- |
| 0 至 2s | 1 | “Every token needs a pair.” 句号是一个青柠色圆点，镜头推进圆点 | 前奏铺底，心跳底鼓 |
| 2 至 4s | 2 | 圆点变成 $ORBIT 代币，与 ETH 配对，价格线剧烈波动：“Most tokens pair with a gas coin.” | 律动进入 |
| 4 至 6s | 3 | “Stop launching against ETH.” ETH 被划掉，连线断开，ETH 掉落 | Breakdown，军鼓滚奏 |
| 6 至 8s | 4 | 青柠色圆形转场。“Start launching against the companies that actually print money.” 背景是股票代码墙 | 全律动，上升音效 |
| 8 至 10s | 5 | PAIR 字标落版：“Launch tokens paired with tokenized stocks.” | Drop，重击 |
| 10 至 14s | 6 至 7 | 发币界面：输入 Orbit / $ORBIT，在 24 个股票代币中点选 NVDA、TSLA、AAPL、SPY，每次点击落在拍点上，镜头跟随焦点缩放 | 拨弦琶音，打字、点击音 |
| 14 至 16s | 8 | 点击 Launch，按钮变成加载圈，打勾，变成代币；四个池子同时生成并上锁：“One transaction. Four pools.” | 提示音，四连弹出，上锁 |
| 16 至 18s | 9 | “No bonding curve. No price ceiling. No migration.” | 每行一拍 |
| 18 至 20s | 10 | 池子固定不动，下面的时间轴从 SECOND 1 走到 YEAR 5：“The pool at second one is the pool at year five.” | 每格一个滴答 |
| 20 至 22s | 11 | “1% swap fee on every trade.” 分成条长出 70% 创作者 / 30% 协议金库 | 刷过音效 |
| 22 至 24s | 12 | 钱包签名卡片，光标点 Sign：“Non-custodial. By design.” | 点击，提示音 |
| 24 至 28s | 13 至 14 | 数据计数：$26M+ 累计交易量，160K+ 笔交易，$180K+ 创作者收益，1,200+ 代币；“Partnered with AWS to scale” | 计数滴答，上升音效 |
| 28 至 32s | 15 至 16 | 24 个股票代币绕成环，收拢成 PAIR 字标：“Pair your token with the market.” / pair.fund | 重击，F add9 和弦收尾 |

## 片中事实的来源

pair.fund 在本次构建环境中被网络策略拦截，所以文案依据公开的新闻稿和文档摘要（2026 年 8 月 31 日 GlobeNewswire 新闻稿，以及 pair.fund/docs 的搜索摘要）：

- Robinhood Chain 上的多池（multipool）发币平台，新代币可与 1 至 5 个 Robinhood 股票代币配对，一笔交易完成
- Uniswap v4 流动性永久锁定，没有 bonding curve、没有价格上限、不迁移
- 1% 交易手续费，70% 给代币创作者，30% 给协议金库，可无许可领取、按资产领取
- 非托管：钱包签署每笔交易，PAIR 不持有资金
- 多池上线（8 月 26 日）后五天：累计交易量超过 2600 万美元，超过 16 万笔交易，超过 18 万美元创作者收益，覆盖 1200 多个代币
- 与 AWS 合作扩展基础设施
- 24 个可配对股票代币：AAPL, AMC, AMD, AMZN, BABA, BE, CRCL, CRWV, GOOGL, INTC, META, MSFT, MU, NVDA, ORCL, PLTR, QQQ, SGOV, SLV, SNDK, SPCX, SPY, TSLA, USAR

片中的 $ORBIT 是虚构的示例代币，价格曲线是示意动画。

**品牌色是占位值**：因为拿不到官网，青柠色主色 `#C6FF4A` 是临时选的。所有颜色都在 [`src/scene.js`](src/scene.js) 顶部的 `P` 对象里，改完重新渲染即可。

## 重新渲染

```bash
npm install                 # @napi-rs/canvas
pip install imageio-ffmpeg  # 自带 libx264 的 ffmpeg；也可以设置 FFMPEG=/path/to/ffmpeg

npm run audio               # build/audio.wav（合成配乐 + 音效，响度归一化）
npm run contact             # build/contact-*.png，每拍一帧的联系表
node scripts/render.mjs     # out/pair-promo.mp4（并行渲染，自动混入音轨）
node scripts/render.mjs --still 29.8   # 单帧检查
npm run preview             # 浏览器预览 http://localhost:8080 ，可拖动时间轴
```

渲染参数：`--fps 60 --sub 4 --fast-sub 16 --shutter 0.5 --crf 16 --workers N --from 0 --to 32`。快速镜头的时间窗在 `src/scene.js` 的 `FAST` 里。4 核机器上全片约 4 分钟。

## 文件

```
src/scene.js        场景：draw(ctx, t) 纯函数，所有时间点、文案、配色
scripts/render.mjs  帧渲染（@napi-rs/canvas）+ 子帧运动模糊 + ffmpeg 编码
scripts/audio.mjs   配乐与音效合成，读取 scene.js 里的 CUES 对齐到帧
index.html          浏览器实时预览（同一个 scene.js）
assets/fonts/       Geist / Geist Mono（SIL OFL 1.1）
out/                成片、海报帧
```
