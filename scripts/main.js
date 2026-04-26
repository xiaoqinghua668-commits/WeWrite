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
      if (group === 'template') updateEstimate();
    } else if (group === 'voiceTone') {
      state.settingsVoiceTone = tag.dataset.val;
      markUnsaved();
    }
  });
});

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
})();
