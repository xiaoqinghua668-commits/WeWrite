function selectColor(hex, btn) {
  state.settingsColor = hex;
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('s-color-hex').value = hex;
  updateAvatarPreview(hex);
  markUnsaved();
}

function onCustomColorInput(val) {
  const hex = val.startsWith('#') ? val : '#' + val;
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    state.settingsColor = hex;
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    updateAvatarPreview(hex);
    markUnsaved();
  }
}

function updateAvatarPreview(color) {
  const name    = document.getElementById('s-name').value || '公';
  const preview = document.getElementById('s-avatar-preview');
  preview.style.background = color;
  preview.textContent      = name.charAt(0).toUpperCase() || '公';
}

function markUnsaved() {
  document.getElementById('unsaved-dot').classList.add('visible');
}

function populateSettingsForm() {
  const brand = loadBrand();

  document.getElementById('s-name').value   = brand.name   || '';
  document.getElementById('s-slogan').value = brand.slogan || '';
  document.getElementById('s-tone').value   = (brand.tone || []).join('\n');

  state.settingsColor = brand.color || '#07C160';
  document.getElementById('s-color-hex').value = state.settingsColor;
  updateAvatarPreview(state.settingsColor);
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('selected', s.dataset.color === state.settingsColor);
  });

  const vt = brand.voiceTone || '亲切温暖';
  state.settingsVoiceTone = vt;
  document.querySelectorAll('.pill-tag[data-group="voiceTone"]').forEach(t => {
    t.classList.toggle('active', t.dataset.val === vt);
  });

  const history  = loadHistory();
  const today    = new Date().toDateString();
  const month    = new Date().toISOString().slice(0, 7);
  const todayCnt = history.filter(i => new Date(i.createdAt).toDateString() === today).length;
  const monthCnt = history.filter(i => i.createdAt && i.createdAt.startsWith(month)).length;
  document.getElementById('s-stat-today').textContent = todayCnt;
  document.getElementById('s-stat-month').textContent = monthCnt;
  document.getElementById('s-stat-total').textContent = history.length;

  document.getElementById('unsaved-dot').classList.remove('visible');
  updateStorageHint();
  renderStyleBank();
}

function saveSettings() {
  const brand = {
    name:      document.getElementById('s-name').value.trim(),
    color:     state.settingsColor,
    slogan:    document.getElementById('s-slogan').value.trim(),
    tone:      document.getElementById('s-tone').value
                 .split('\n').map(l => l.trim()).filter(Boolean),
    voiceTone: state.settingsVoiceTone,
  };

  saveBrand(brand);
  syncPhoneHeader();

  document.getElementById('unsaved-dot').classList.remove('visible');

  const btn = document.getElementById('save-btn-text');
  btn.textContent = '✓ 已保存';
  setTimeout(() => { btn.textContent = '保存设置'; }, 2000);
}

function updateStorageHint() {
  const quota = checkStorageQuota();
  const hint  = document.getElementById('storage-hint');
  if (!hint) return;
  hint.textContent = `已使用约 ${quota.usedMB}MB / 5MB`;
  hint.style.color = quota.isCritical ? 'var(--error)' : 'var(--text-tertiary)';
}

function confirmClearHistory() {
  const btn = document.querySelector('.btn-clear-history');
  if (!btn) return;
  btn.innerHTML = `确认清空？
    <button onclick="doCleanHistory()" style="color:var(--error);background:none;border:none;cursor:pointer;font-family:inherit;font-size:12px;">确认</button>
    <button onclick="populateSettingsForm()" style="color:var(--text-secondary);background:none;border:none;cursor:pointer;font-family:inherit;font-size:12px;">取消</button>`;
}

function doCleanHistory() {
  clearAllHistory();
  updateNavStats();
  populateSettingsForm();
}

function initSettings() {
  document.getElementById('s-name').addEventListener('input', function () {
    updateAvatarPreview(state.settingsColor);
  });
}

// ══════════════════════════════════════════════
//  风格库 (StyleBank)
// ══════════════════════════════════════════════

let pendingStyleData   = null;
let styleArticleCount  = 1;
let styleAnalyzing     = false;

function renderStyleBank() {
  const container = document.getElementById('style-bank-list');
  if (!container) return;

  const styles = loadStyles();

  const addBtn = `
    <div class="style-add-btn" onclick="showStyleAddFlow()">
      <span class="style-add-plus">+</span>
      <span>添加</span>
    </div>`;

  if (styles.length === 0) {
    container.innerHTML = `
      <div class="style-bank-empty">还没有风格，点击「+」开始学习</div>
      ${addBtn}`;
  } else {
    const cards = styles.map(s => `
      <div class="style-card">
        <div class="style-card-name">${s.name}</div>
        <div class="style-card-meta">${s.sourceCount} 篇学习</div>
        <div class="style-card-meta">${formatStyleDate(s.createdAt)}</div>
        <button class="style-card-del" onclick="confirmDeleteStyle('${s.id}', this)" title="删除">×</button>
      </div>`).join('');
    container.innerHTML = cards + addBtn;
  }
}

function formatStyleDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} 创建`;
}

function confirmDeleteStyle(id, btn) {
  btn.outerHTML = `
    <div class="style-del-confirm">
      <button onclick="doDeleteStyle('${id}')" style="color:var(--error);background:none;border:none;cursor:pointer;font-size:11px;font-family:inherit;">删除</button>
      <button onclick="renderStyleBank()" style="color:var(--text-secondary);background:none;border:none;cursor:pointer;font-size:11px;font-family:inherit;">取消</button>
    </div>`;
}

function doDeleteStyle(id) {
  if (state.selectedStyle && state.selectedStyle.id === id) {
    state.selectedStyle = null;
  }
  deleteStyle(id);
  renderStyleBank();
  renderStyleSelector();
}

// ── 添加风格流程 ─────────────────────────

function showStyleAddFlow() {
  const flow = document.getElementById('style-add-flow');
  if (!flow) return;
  styleArticleCount = 1;
  pendingStyleData  = null;
  flow.style.display = '';

  document.getElementById('style-article-1').value = '';
  document.getElementById('style-extra-articles').innerHTML = '';
  document.getElementById('style-analysis-result').style.display = 'none';
  document.getElementById('add-article-btn').style.display = '';

  const analyzeBtn = document.getElementById('analyze-style-btn');
  analyzeBtn.disabled = false;
  analyzeBtn.textContent = '开始分析风格 →';

  flow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function cancelStyleAdd() {
  const flow = document.getElementById('style-add-flow');
  if (flow) flow.style.display = 'none';
  pendingStyleData  = null;
  styleArticleCount = 1;
  styleAnalyzing    = false;
}

function addStyleArticle() {
  if (styleArticleCount >= 3) return;
  styleArticleCount++;
  const wrap = document.getElementById('style-extra-articles');
  const div  = document.createElement('div');
  div.className = 'form-group style-extra-article';
  div.innerHTML = `
    <label class="form-label">第 ${styleArticleCount} 篇参考文章</label>
    <textarea class="style-article-extra" placeholder="粘贴公众号文章的正文内容..." style="height:100px"></textarea>`;
  wrap.appendChild(div);

  if (styleArticleCount >= 3) {
    document.getElementById('add-article-btn').style.display = 'none';
  }
}

async function analyzeStyle() {
  if (styleAnalyzing) return;

  const texts = [];
  const t1 = document.getElementById('style-article-1').value.trim();
  if (t1) texts.push(t1);
  document.querySelectorAll('.style-article-extra').forEach(ta => {
    const t = ta.value.trim();
    if (t) texts.push(t);
  });

  if (texts.length === 0 || texts[0].length < 200) {
    document.getElementById('style-article-1').classList.add('error');
    document.getElementById('style-analyze-hint').textContent = '请至少粘贴一篇文章（200字以上）';
    document.getElementById('style-analyze-hint').style.color = 'var(--error)';
    return;
  }

  document.getElementById('style-article-1').classList.remove('error');
  document.getElementById('style-analyze-hint').textContent = '';

  styleAnalyzing = true;
  const analyzeBtn = document.getElementById('analyze-style-btn');
  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px"></div> 分析中...';

  try {
    const prompt = buildStyleAnalysisPrompt(texts);
    const raw    = await callDoubao({ prompt, images: [] });
    const jsonStr = raw.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    pendingStyleData = JSON.parse(jsonStr);
    pendingStyleData._sourceCount = texts.length;
    showStyleAnalysis(pendingStyleData);
  } catch (err) {
    document.getElementById('style-analyze-hint').textContent = `分析失败：${err.message || '请重试'}`;
    document.getElementById('style-analyze-hint').style.color = 'var(--error)';
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = '开始分析风格 →';
  }

  styleAnalyzing = false;
}

function showStyleAnalysis(data) {
  const resultEl = document.getElementById('style-analysis-result');
  resultEl.style.display = '';

  document.getElementById('style-name-input').value = data.name || '';

  const FEATURE_LABELS = {
    tone:          '🗣️ 语气',
    sentenceStyle: '✍️ 句式',
    vocabulary:    '💬 用词',
    structure:     '📐 结构',
    emoji:         '😊 Emoji',
    rhetoric:      '🎭 修辞',
    paragraph:     '📝 段落',
    cta:           '📢 CTA',
  };

  const rows = Object.entries(data.features || {})
    .map(([k, v]) => `
      <div class="style-feature-row">
        <span class="style-feature-key">${FEATURE_LABELS[k] || k}</span>
        <span class="style-feature-val">${v}</span>
      </div>`).join('');

  document.getElementById('style-features-preview').innerHTML = `
    <div class="style-features">${rows}</div>`;

  document.getElementById('analyze-style-btn').style.display = 'none';
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function saveNewStyle() {
  if (!pendingStyleData) return;
  const name = (document.getElementById('style-name-input').value.trim() || pendingStyleData.name).slice(0, 10);
  const card = {
    id:          `style_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    name,
    description: pendingStyleData.description || '',
    createdAt:   new Date().toISOString(),
    sourceCount: pendingStyleData._sourceCount || 1,
    features:    pendingStyleData.features || {},
    promptInjection: pendingStyleData.promptInjection || '',
  };

  saveStyle(card);
  cancelStyleAdd();
  renderStyleBank();
  renderStyleSelector();
}

function reanalyzeStyle() {
  pendingStyleData = null;
  document.getElementById('style-analysis-result').style.display = 'none';
  const analyzeBtn = document.getElementById('analyze-style-btn');
  analyzeBtn.style.display = '';
  analyzeBtn.disabled = false;
  analyzeBtn.textContent = '开始分析风格 →';
  document.getElementById('style-analyze-hint').textContent = '';
}
