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

const POLISH_LEVEL_MAP = {
  '轻度润色': `你是一位公众号排版编辑。用户已经写好了初稿，请你：
- 修正错别字和语法问题
- 调整语气，使其更适合公众号阅读
- 添加合适的标点和分段
- 套用公众号 HTML 排版格式
- 不要改变原文的内容、观点和结构
- 不要自行添加原文中没有的信息`,

  '中度改写': `你是一位公众号内容编辑。用户提供了大纲或初稿，请你：
- 优化每个段落的表达，使其更生动流畅
- 补充适当的过渡句，让文章连贯
- 在合适的位置添加 emoji 增强可读性
- 提炼 2~4 个小标题（<h2>）组织内容
- 可以合并或拆分段落以改善阅读节奏
- 保留用户的核心观点和关键信息`,

  '深度扩写': `你是一位公众号内容创作者。用户提供了要点或大纲，请你：
- 将每个要点扩写为完整的段落（含案例、数据或场景描写）
- 提炼吸引人的标题
- 设计 2~4 个小标题，构建清晰的文章结构
- 添加金句（<div class="hl">）和行动号召（<div class="cta">）
- 补充 AI 认为有价值的相关信息
- 用户原始要点必须全部覆盖，不可遗漏`,
};

const PRESERVE_MAP = {
  keepViewpoints:   '必须保留用户原文中的所有核心观点，不可替换或删除',
  keepKeywords:     '用户原文中的品牌名、产品名、专有名词必须原样保留',
  allowNewContent:  '可以在用户内容基础上补充你认为有价值的案例、数据或观点',
  allowReorder:     '如果调整段落顺序能让文章更流畅，可以重新排列',
};

function _buildBrandSection(brand) {
  const toneLines = brand.tone && brand.tone.length
    ? brand.tone.map(t => `  · ${t}`).join('\n')
    : '  · 无';
  return brand.name ? `
【品牌信息】请在文章中自然融入以下品牌元素：
- 公众号名称：${brand.name}
- 品牌口号：${brand.slogan || '无'}
- 写作语气：${brand.voiceTone || '亲切温暖'}
- 固定话术（自然融入，不要生硬堆砌）：
${toneLines}
` : '';
}

function _buildImageSection(imgCount, imgDesc, layout) {
  if (!imgCount) return '';
  return `
用户上传了 ${imgCount} 张图片，请仔细观察每张图片的内容、风格、色调、场景。
${imgDesc ? `用户对图片的额外描述：${imgDesc}` : ''}
图片排列要求：${LAYOUT_MAP[layout] || LAYOUT_MAP['智能穿插']}
在正文中用 <div class="imgbox"><div class="imgph" data-idx="N">此处放第N张图：[简短说明图片内容]</div></div> 标记图片位置，N 从 1 开始。
`;
}

function _buildHtmlSpec(brand) {
  return `
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

function buildPrompt({ topic, extra, template, layout, imgCount, imgDesc, selectedStyle }) {
  const brand = loadBrand();
  const imageSection = _buildImageSection(imgCount, imgDesc, layout);
  const brandSection = _buildBrandSection(brand);
  const styleSection = selectedStyle
    ? `\n【写作风格要求】\n${selectedStyle.promptInjection}\n`
    : '';

  return `请根据以下信息生成一篇完整的微信公众号文章。

【主题】${topic}
${extra ? `【补充说明】${extra}` : ''}
【文章模板】${TEMPLATE_MAP[template]}
${imageSection}
${brandSection}
${styleSection}
${_buildHtmlSpec(brand)}`;
}

function buildPolishPrompt({ draft, level, preserve, imgCount, imgDesc, selectedStyle }) {
  const brand = loadBrand();
  const imageSection = _buildImageSection(imgCount, imgDesc, '智能穿插');
  const brandSection = _buildBrandSection(brand);
  const styleSection = selectedStyle
    ? `\n【写作风格要求】\n${selectedStyle.promptInjection}\n`
    : '';

  const preserveLines = [];
  if (preserve.keepViewpoints)  preserveLines.push(PRESERVE_MAP.keepViewpoints);
  if (preserve.keepKeywords)    preserveLines.push(PRESERVE_MAP.keepKeywords);
  if (preserve.allowNewContent) preserveLines.push(PRESERVE_MAP.allowNewContent);
  if (preserve.allowReorder)    preserveLines.push(PRESERVE_MAP.allowReorder);

  return `请对以下粗稿进行润色排版，生成一篇完整的微信公众号文章。

【润色要求】
${POLISH_LEVEL_MAP[level]}

【保留偏好】
${preserveLines.length ? preserveLines.map(l => `- ${l}`).join('\n') : '- 无特殊保留要求'}

【用户原始稿件】
${draft}

${imageSection}
${brandSection}
${styleSection}
${_buildHtmlSpec(brand)}`;
}

function buildStyleAnalysisPrompt(articles) {
  return `你是一位资深的公众号内容分析师。请仔细阅读以下 ${articles.length} 篇公众号文章，提取它们共同的写作风格特征。

【参考文章】
${articles.map((text, i) => `--- 第 ${i + 1} 篇 ---\n${text}\n`).join('\n')}

请严格按以下 JSON 格式输出，不要任何其他内容：

{
  "name": "用 4~6 个字概括这种风格（如：文艺清新风、硬核测评风、温暖治愈风）",
  "description": "用 1~2 句话描述这种风格的整体感觉",
  "features": {
    "tone": "语气和态度（如：亲切、权威、幽默、冷静）",
    "sentenceStyle": "句式特点（如：短句为主、长短交替、排比多）",
    "vocabulary": "用词偏好（如：口语化、书面正式、网络热词多）",
    "structure": "文章结构特点（如：开头方式、分段方式、收尾方式）",
    "emoji": "emoji 使用习惯（如：频繁/偶尔/几乎不用，偏好哪类）",
    "rhetoric": "修辞手法（如：比喻多、排比多、设问多、数据引用多）",
    "paragraph": "段落习惯（如：长段落、短段落、每段几句）",
    "cta": "行动号召风格（如：强推、软引导、不设 CTA）"
  },
  "promptInjection": "将以上所有特征整合为一段完整的写作指令，200 字以内，可直接注入到文章生成 Prompt 中使用"
}

只输出 JSON，不要任何其他文字。`;
}
