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
  settingsProvider:  'doubao',
  settingsVoiceTone: '亲切温暖',
};

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

document.querySelectorAll('.pill-tag').forEach(tag => {
  tag.addEventListener('click', () => {
    const group = tag.dataset.group;
    document.querySelectorAll(`.pill-tag[data-group="${group}"]`)
      .forEach(t => t.classList.remove('active'));
    tag.classList.add('active');
    if (group === 'template' || group === 'layout') {
      state[group] = tag.dataset.val;
    } else if (group === 'voiceTone') {
      state.settingsVoiceTone = tag.dataset.val;
      markUnsaved();
    }
  });
});

(function init() {
  syncPhoneHeader();
  const apiCfg = loadApiConfig();
  const btn    = document.getElementById('generate-btn');
  btn.disabled = !apiCfg.key;
  if (!apiCfg.key) btn.title = '请先在「设置」填写 API Key';
  updateNavStats();
  initUpload();
  initSettings();
  initHistory();
})();
