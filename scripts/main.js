const state = {
  topic:    '',
  extra:    '',
  template: '新品推荐',
  layout:   '智能穿插',
  images:   [],
  imgDesc:  '',
  generatedHTML: '',
  isLoading: false,
  settingsColor:     '#07C160',
  settingsVoiceTone: '亲切温暖',

  // 润色模式
  mode:         'create',     // 'create' | 'polish'
  polishDraft:  '',
  polishLevel:  '中度改写',   // '轻度润色' | '中度改写' | '深度扩写'
  polishPreserve: {
    keepViewpoints:  true,
    keepKeywords:    true,
    allowNewContent: false,
    allowReorder:    false,
  },

  // 风格
  selectedStyle: null,
};

// ── 标签页导航 ────────────────────────────
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('page-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'settings') populateSettingsForm();
    if (tab.dataset.tab === 'history')  renderHistoryList();
  });
});

// ── Pill-tag 点击 ────────────────────────
document.querySelectorAll('.pill-tag').forEach(tag => {
  tag.addEventListener('click', () => {
    const group = tag.dataset.group;
    document.querySelectorAll(`.pill-tag[data-group="${group}"]`)
      .forEach(t => t.classList.remove('active'));
    tag.classList.add('active');
    if (group === 'template' || group === 'layout') {
      state[group] = tag.dataset.val;
      if (group === 'template') updateEstimate();
    } else if (group === 'voiceTone') {
      state.settingsVoiceTone = tag.dataset.val;
      markUnsaved();
    } else if (group === 'polishLevel') {
      state.polishLevel = tag.dataset.val;
    }
  });
});

// ── 模式切换 ────────────────────────────
function switchMode(mode) {
  state.mode = mode;

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  const createFields = document.getElementById('create-fields');
  const polishFields = document.getElementById('polish-fields');
  if (createFields) createFields.style.display = mode === 'create' ? '' : 'none';
  if (polishFields) polishFields.style.display  = mode === 'polish' ? '' : 'none';

  // Sync button label
  const btnText = document.getElementById('btn-text');
  if (btnText) btnText.textContent = mode === 'polish' ? '润色排版 ↗' : '生成文案 ↗';

  const hintEl = document.querySelector('.shortcut-hint');
  if (hintEl) hintEl.textContent = mode === 'polish' ? '⌘ Enter 快速润色' : '⌘ Enter 快速生成';

  // Clear stale validation states
  if (mode === 'polish') {
    document.getElementById('topic').classList.remove('error');
    document.getElementById('topic-error').style.display = 'none';
  } else {
    const pd = document.getElementById('polish-draft');
    if (pd) pd.classList.remove('error');
  }
}

// ── 保留偏好 Checkbox ────────────────────
function updatePreserve() {
  state.polishPreserve.keepViewpoints  = document.getElementById('preserve-viewpoints').checked;
  state.polishPreserve.keepKeywords    = document.getElementById('preserve-keywords').checked;
  state.polishPreserve.allowNewContent = document.getElementById('allow-new-content').checked;
  state.polishPreserve.allowReorder    = document.getElementById('allow-reorder').checked;
}

// ── 风格选择器（创作页） ────────────────
function selectStyle(id) {
  if (id === null) {
    state.selectedStyle = null;
  } else {
    const styles = loadStyles();
    state.selectedStyle = styles.find(s => s.id === id) || null;
  }
  renderStyleSelector();
}

function renderStyleSelector() {
  const container = document.getElementById('style-selector');
  if (!container) return;
  const styles = loadStyles();

  if (styles.length === 0) {
    container.innerHTML = '<span class="style-empty-hint">暂无风格，去设置页添加</span>';
    return;
  }

  const selectedId = state.selectedStyle ? state.selectedStyle.id : null;

  const pills = [
    `<button class="pill-tag ${selectedId === null ? 'active' : ''}" onclick="selectStyle(null)">默认</button>`,
    ...styles.map(s =>
      `<button class="pill-tag ${selectedId === s.id ? 'active' : ''}" onclick="selectStyle('${s.id}')">${s.name}</button>`
    ),
  ];
  container.innerHTML = pills.join('');
}

// ── 键盘快捷键 ────────────────────────────
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      const activePage = document.querySelector('.page.active');
      if (activePage && activePage.id === 'page-create') {
        e.preventDefault();
        generate();
      }
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      const activePage = document.querySelector('.page.active');
      if (activePage && activePage.id === 'page-history') {
        e.preventDefault();
        document.getElementById('history-search').focus();
      }
    }

    if (e.key === 'Escape') {
      const searchEl = document.getElementById('history-search');
      if (document.activeElement === searchEl) {
        searchEl.value = '';
        renderHistoryList('');
        searchEl.blur();
      }
    }
  });
}

(function init() {
  syncPhoneHeader();
  updateNavStats();
  initUpload();
  initSettings();
  initHistory();
  initKeyboardShortcuts();
  renderStyleSelector();
})();
