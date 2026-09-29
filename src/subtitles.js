// Subtitle tracks, timed to the scene (seconds). Burned in by render.mjs --lang zh
// and exported as SRT. "发行代币", "创作者奖励" and the risk notice follow the
// wording of pair.fund's own Chinese UI.
export const SUBS = {
  zh: [
    { from: 0.45, to: 1.9, text: '每个代币都需要一个配对。' },
    { from: 2.3, to: 3.85, text: '大多数代币都与 Gas 币配对。' },
    { from: 4.0, to: 5.6, text: '别再和 ETH 配对发币了。' },
    { from: 6.05, to: 7.8, text: '开始和真正赚钱的公司配对发币。' },
    { from: 8.5, to: 9.1, text: '发行与代币化股票配对的代币。' },
    { from: 9.1, to: 9.85, text: 'Robinhood Chain 上的多池发币平台。' },
    { from: 10.15, to: 11.3, text: '填写代币名称和代号。' },
    { from: 11.3, to: 13.25, text: '选择 1 到 5 个配对市场，并分配权重。' },
    { from: 13.25, to: 14.1, text: '点击“发行代币”。' },
    { from: 14.7, to: 15.45, text: '一笔交易，四个市场。' },
    { from: 15.45, to: 16.0, text: '每个配对资产都有自己独立的池子。' },
    { from: 16.0, to: 16.5, text: '没有联合曲线。' },
    { from: 16.5, to: 17.0, text: '没有迁移。' },
    { from: 17.0, to: 17.9, text: '流动性始终留在原地。' },
    { from: 18.05, to: 19.85, text: '第一秒的池子，就是第五年的池子。' },
    { from: 20.0, to: 20.7, text: '手续费去向，由你决定。' },
    { from: 20.7, to: 21.45, text: '创作者费用、费用分成、回购销毁、持有者分配。' },
    { from: 21.45, to: 22.0, text: '手续费策略在链上强制执行。' },
    { from: 22.0, to: 23.0, text: '天生非托管。' },
    { from: 23.0, to: 23.95, text: '每笔交易都由你的钱包签名，PAIR 从不持有资金。' },
    { from: 24.1, to: 26.7, text: 'PAIR 累计数据：交易量、交易笔数、发行代币数、创作者奖励。' },
    { from: 26.7, to: 27.35, text: '与 AWS 合作扩展基础设施。' },
    { from: 27.35, to: 28.0, text: '数据来源 pair.fund/stats，V1 与 Launch V2 合计，截至 2026 年 9 月 29 日。', size: 34 },
    { from: 29.4, to: 30.2, text: '万物皆可配对。' },
    { from: 30.2, to: 30.8, text: 'pair.fund，现已上线 Robinhood Chain。' },
    {
      from: 30.8,
      to: 32.0,
      text: '交易通过您的钱包提交，可能不可逆。代币价格可能波动大甚至失去所有价值。\nPAIR不提供资产托管、任何保证及财务建议。',
      size: 30,
    },
  ],
};

// SubRip text for a track.
export function toSRT(track) {
  const ts = (s) => {
    const ms = Math.round(s * 1000);
    const p = (n, w = 2) => String(n).padStart(w, '0');
    return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
  };
  return track.map((s, i) => `${i + 1}\n${ts(s.from)} --> ${ts(s.to)}\n${s.text}\n`).join('\n');
}
