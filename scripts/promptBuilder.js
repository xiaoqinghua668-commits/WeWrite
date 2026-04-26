const TEMPLATE_MAP = {
  '新品推荐': '新品推荐型：突出产品亮点、差异化卖点，语气新鲜感强',
  '节日活动': '节日活动型：结合节日氛围，有时效感和仪式感',
  '日常种草': '日常种草型：真实体验感，口语化，有带入感',
  '促销推广': '促销推广型：突出利益点、稀缺感，有明确行动号召',
  '品牌故事': '品牌故事型：情感化叙述，有起承转合，引发共鸣',
};
const LAYOUT_MAP = {
  '智能穿插': '根据文章内容节奏自然穿插图片，每个主要段落后安排一张',
  '头图优先': '第一张图作为开篇头图，其余图片放文章末尾',
  '文末集中': '所有图片集中在文章末尾展示',
};

function buildPrompt({ topic, extra, template, layout, imgCount, imgDesc }) {
  const brand = loadBrand();

  let imageSection = '';
  if (imgCount > 0) {
    imageSection = `
用户上传了 ${imgCount} 张图片，请仔细观察每张图片的内容、风格、色调、场景。
${imgDesc ? `用户对图片的额外描述：${imgDesc}` : ''}
图片排列要求：${LAYOUT_MAP[layout]}
在正文中用 <div class="imgbox"><div class="imgph" data-idx="N">此处放第N张图：[简短说明图片内容]</div></div> 标记图片位置，N 从 1 开始。
`;
  }

  const toneLines = brand.tone && brand.tone.length
    ? brand.tone.map(t => `  · ${t}`).join('\n')
    : '  · 无';

  const brandSection = brand.name ? `
【品牌信息】请在文章中自然融入以下品牌元素：
- 公众号名称：${brand.name}
- 品牌口号：${brand.slogan || '无'}
- 写作语气：${brand.voiceTone || '亲切温暖'}
- 固定话术（自然融入，不要生硬堆砌）：
${toneLines}
` : '';

  return `请根据以下信息生成一篇完整的微信公众号文章。

【主题】${topic}
${extra ? `【补充说明】${extra}` : ''}
【文章模板】${TEMPLATE_MAP[template]}
${imageSection}
${brandSection}

【HTML 输出规范】
严格按以下结构输出，不要任何解释：

<div class="art-title">吸引人的标题（15字以内）</div>
<div class="art-meta">${brand.name || '公众号名称'} · 今天</div>
<div class="art-body">
  <!-- 正文内容 -->
  <!-- 可用标签：<h2> <p> <ul><li> <div class="hl"> <div class="cta"> <div class="imgbox"> -->
</div>

【正文规范】
- 文章长度：700~950 字
- 标题：吸引人，带悬念或利益点，15字以内
- 小标题 <h2>：2~4个，每个不超过12字
- 列表 <ul><li>：每组3~5条，emoji 开头增加可读性
- 引用块 <div class="hl">：金句或核心卖点，1~2处
- 行动召唤 <div class="cta">：1处，放在文章末尾附近
- 结尾：有温度，呼吁互动或到店

只输出 HTML，从 <div class="art-title"> 开始，不要任何其他内容。`;
}
