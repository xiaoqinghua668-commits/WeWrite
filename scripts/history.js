/* ═══════════════════════════════════════════
   History Page — Phase 3
═══════════════════════════════════════════ */

// ── 数据处理 ────────────────────────────────

function groupHistoryByDate(history) {
  const today    = new Date().toDateString();
  const weekAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const groups = { '今天': [], '本周': [], '本月': [], '更早': [] };

  history.forEach(item => {
    const d = new Date(item.createdAt);
    if (d.toDateString() === today)  groups['今天'].push(item);
    else if (d >= weekAgo)           groups['本周'].push(item);
    else if (d >= monthAgo)          groups['本月'].push(item);
    else                             groups['更早'].push(item);
  });

  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

function filterHistory(history, keyword) {
  if (!keyword.trim()) return history;
  const kw = keyword.toLowerCase();
  return history.filter(item =>
    (item.title  && item.title.toLowerCase().includes(kw)) ||
    (item.topic  && item.topic.toLowerCase().includes(kw))
  );
}

function formatTime(isoStr) {
  const d     = new Date(isoStr);
  const today = new Date().toDateString();
  if (d.toDateString() === today) {
    return d.toTimeString().slice(0, 5);
  }
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

const TEMPLATE_EMOJI = {
  '新品推荐': '🛍️',
  '节日活动': '🎉',
  '日常种草': '🌱',
  '促销推广': '🔥',
  '品牌故事': '✨',
};
function getTemplateEmoji(template) {
  return TEMPLATE_EMOJI[template] || '📄';
}

// ── 渲染函数 ────────────────────────────────

function renderHistoryList(keyword) {
  keyword = keyword || '';
  const all      = loadHistory();
  const filtered = filterHistory(all, keyword);
  const listEl   = document.getElementById('history-list-inner');

  if (all.length === 0) {
    listEl.innerHTML = `
      <div class="history-empty">
        <div class="history-empty-icon">📋</div>
        <div class="history-empty-text">还没有生成记录</div>
        <div class="history-empty-sub">去创作页生成第一篇文章吧</div>
        <button class="btn-go-create" onclick="switchTab('create')">去创作 →</button>
      </div>`;
    return;
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="history-empty">
        <div class="history-empty-icon" style="font-size:24px">🔍</div>
        <div class="history-empty-text">没有找到相关文章</div>
      </div>`;
    return;
  }

  const groups = groupHistoryByDate(filtered);
  listEl.innerHTML = groups.map(([label, items]) => `
    <div class="history-group">
      <div class="history-group-label">${label}</div>
      ${items.map(item => renderHistoryItem(item)).join('')}
    </div>
  `).join('');

  // 恢复选中状态
  if (selectedHistoryId) {
    const el = document.querySelector(`.history-item[data-id="${selectedHistoryId}"]`);
    if (el) el.classList.add('selected');
  }
}

function renderHistoryItem(item) {
  const title   = item.title || '（无标题）';
  const topic   = item.topic ? (item.topic.length > 20 ? item.topic.slice(0, 20) + '...' : item.topic) : '';
  const time    = formatTime(item.createdAt);
  const emoji   = getTemplateEmoji(item.template);
  const isEmpty = !item.title;

  return `
    <div class="history-item" data-id="${item.id}" onclick="selectHistoryItem('${item.id}')">
      <div class="history-item-icon">${emoji}</div>
      <div class="history-item-body">
        <div class="history-item-title ${isEmpty ? 'empty' : ''}">${title}</div>
        <div class="history-item-topic">${topic}</div>
      </div>
      <div class="history-item-time">${time}</div>
    </div>`;
}

// ── 交互函数 ────────────────────────────────

let selectedHistoryId = null;

function selectHistoryItem(id) {
  selectedHistoryId = id;

  document.querySelectorAll('.history-item').forEach(el => {
    el.classList.toggle('selected', el.dataset.id === id);
  });

  const history = loadHistory();
  const item    = history.find(i => i.id === id);
  if (!item) return;

  renderHistoryPreview(item);
}

function renderHistoryPreview(item) {
  const brandName = item.brandName || '我的公众号';
  const initial   = brandName.charAt(0).toUpperCase();
  const brand     = loadBrand();
  const color     = brand.color || '#07C160';

  document.getElementById('history-preview-content').innerHTML = `
    <div class="phone-shell">
      <div class="phone-notch"></div>
      <div class="phone-screen">
        <div class="wx-bar">
          <div class="wx-avatar" style="background:${color}">${initial}</div>
          <div class="wx-name">${brandName}</div>
          <div class="wx-follow">已关注</div>
        </div>
        <div class="art-body-wrap">${item.html}</div>
      </div>
    </div>
    <div class="copy-btns">
      <button class="btn-copy-rich" onclick="copyHistoryItem('${item.id}')">
        ✦ 一键复制富文本
      </button>
      <button class="btn-copy-html btn-reuse" onclick="reuseHistoryItem('${item.id}')">
        载入创作页复用
      </button>
      <button class="btn-delete-history" onclick="confirmDeleteHistory('${item.id}')">
        删除这篇
      </button>
    </div>`;
}

function copyHistoryItem(id) {
  const history = loadHistory();
  const item    = history.find(i => i.id === id);
  if (!item) return;
  const prev          = state.generatedHTML;
  state.generatedHTML = item.html;
  copyRichText();
  state.generatedHTML = prev;
}

function reuseHistoryItem(id) {
  const history = loadHistory();
  const item    = history.find(i => i.id === id);
  if (!item) return;

  document.getElementById('topic').value = item.topic || '';

  if (item.template) {
    document.querySelectorAll('.pill-tag[data-group="template"]').forEach(t => {
      t.classList.toggle('active', t.dataset.val === item.template);
    });
    state.template = item.template;
  }

  switchTab('create');
  setStatus('已载入历史文章，修改主题后重新生成', 'info');
  setTimeout(() => document.getElementById('topic').focus(), 300);
}

function confirmDeleteHistory(id) {
  const btnEl = document.querySelector(`.btn-delete-history[onclick="confirmDeleteHistory('${id}')"]`);
  if (!btnEl) return;
  btnEl.outerHTML = `
    <div class="delete-confirm-row">
      <span style="font-size:12px;color:var(--text-secondary)">确认删除？</span>
      <button onclick="deleteHistoryItem('${id}')"
        style="font-size:12px;color:var(--error);background:none;border:none;cursor:pointer;font-family:inherit;margin-left:6px;">
        确认删除
      </button>
      <button onclick="selectHistoryItem('${id}')"
        style="font-size:12px;color:var(--text-secondary);background:none;border:none;cursor:pointer;font-family:inherit;margin-left:4px;">
        取消
      </button>
    </div>`;
}

function deleteHistoryItem(id) {
  let history = loadHistory();
  history     = history.filter(i => i.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

  selectedHistoryId = null;

  const keyword = document.getElementById('history-search').value;
  renderHistoryList(keyword);

  document.getElementById('history-preview-content').innerHTML = `
    <div class="preview-empty">
      <div class="preview-empty-icon">📋</div>
      <div class="preview-empty-text">点击左侧文章<br>即可预览内容</div>
    </div>`;

  updateNavStats();
}

function switchTab(tabName) {
  document.querySelector(`.nav-tab[data-tab="${tabName}"]`).click();
}

function initHistory() {
  document.getElementById('history-search').addEventListener('input', (e) => {
    renderHistoryList(e.target.value);
  });
}
