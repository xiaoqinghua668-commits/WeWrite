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

function selectProvider(type) {
  state.settingsProvider = type;
  document.getElementById('provider-doubao').classList.toggle('selected', type === 'doubao');
  document.getElementById('provider-claude').classList.toggle('selected', type === 'claude');
  markUnsaved();
}

async function testConnection() {
  const status = document.getElementById('test-status');
  const btn    = document.getElementById('test-btn');
  btn.disabled    = true;
  btn.innerHTML   = '<div class="spinner-sm"></div> 测试中...';
  status.textContent = '';
  status.className   = 'test-status';
  try {
    if (state.settingsProvider === 'claude') {
      await callClaude({ testMode: true });
    } else {
      await callDoubao({ testMode: true });
    }
    status.textContent = '✓ 连接正常';
    status.className   = 'test-status ok';
  } catch (e) {
    status.textContent = `✗ ${e.message || '连接异常，请检查服务端环境变量'}`;
    status.className   = 'test-status err';
  }
  btn.disabled  = false;
  btn.innerHTML = '测试连接';
}

function markUnsaved() {
  document.getElementById('unsaved-dot').classList.add('visible');
}

function populateSettingsForm() {
  const brand  = loadBrand();
  const apiCfg = loadApiConfig();

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

  state.settingsProvider = apiCfg.type || 'doubao';
  selectProvider(state.settingsProvider);

  const history  = loadHistory();
  const today    = new Date().toDateString();
  const month    = new Date().toISOString().slice(0, 7);
  const todayCnt = history.filter(i => new Date(i.createdAt).toDateString() === today).length;
  const monthCnt = history.filter(i => i.createdAt && i.createdAt.startsWith(month)).length;
  document.getElementById('s-stat-today').textContent = todayCnt;
  document.getElementById('s-stat-month').textContent = monthCnt;
  document.getElementById('s-stat-total').textContent = history.length;

  document.getElementById('unsaved-dot').classList.remove('visible');
  document.getElementById('test-status').textContent = '';
  document.getElementById('test-status').className   = 'test-status';
  updateStorageHint();
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
  const apiCfg = { type: state.settingsProvider };

  saveBrand(brand);
  saveApiConfig(apiCfg);
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
