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
  document.getElementById('s-api-key').placeholder =
    type === 'claude' ? 'sk-ant-xxxxxxxxxxxxxxxxxx' : 'sk-xxxxxxxxxxxxxxxxxx';
  markUnsaved();
}

function onSettingsKeyInput(val) {
  const trimmed = val.trim();
  if (trimmed.startsWith('sk-ant-')) {
    selectProvider('claude');
  } else if (trimmed.startsWith('sk-')) {
    selectProvider('doubao');
  }
  document.getElementById('test-status').textContent = '';
  document.getElementById('test-status').className   = 'test-status';
  markUnsaved();
}

function toggleKeyVisibility() {
  const inp = document.getElementById('s-api-key');
  const btn = document.getElementById('toggle-key-btn');
  if (inp.type === 'password') {
    inp.type = 'text';
    btn.textContent = '隐藏';
  } else {
    inp.type = 'password';
    btn.textContent = '显示';
  }
}

async function testConnection() {
  const key    = document.getElementById('s-api-key').value.trim();
  const status = document.getElementById('test-status');
  const btn    = document.getElementById('test-btn');
  if (!key) {
    status.textContent = '请先填写 API Key';
    status.className   = 'test-status err';
    return;
  }
  btn.disabled    = true;
  btn.innerHTML   = '<div class="spinner-sm"></div> 测试中...';
  status.textContent = '';
  status.className   = 'test-status';
  try {
    const type = state.settingsProvider;
    if (type === 'claude') {
      await callClaude({ apiKey: key, prompt: '', images: [], testMode: true });
    } else {
      await callDoubao({ apiKey: key, prompt: '', images: [], testMode: true });
    }
    status.textContent = '✓ 连接正常';
    status.className   = 'test-status ok';
  } catch (e) {
    status.textContent = `✗ Key 无效或网络异常`;
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
  document.getElementById('s-api-key').value = apiCfg.key || '';

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
  const apiCfg = {
    type: state.settingsProvider,
    key:  document.getElementById('s-api-key').value.trim(),
  };

  saveBrand(brand);
  saveApiConfig(apiCfg);

  syncPhoneHeader();

  document.getElementById('generate-btn').disabled = !apiCfg.key;

  document.getElementById('unsaved-dot').classList.remove('visible');

  const btn = document.getElementById('save-btn-text');
  btn.textContent = '✓ 已保存';
  setTimeout(() => { btn.textContent = '保存设置'; }, 2000);
}

function initSettings() {
  document.getElementById('s-name').addEventListener('input', function () {
    updateAvatarPreview(state.settingsColor);
  });
}
