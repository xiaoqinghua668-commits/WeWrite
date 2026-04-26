const BRAND_KEY   = 'wechat_tool_brand';
const API_KEY_LS  = 'wechat_tool_api';
const HISTORY_KEY = 'wechat_tool_history';

const DEFAULT_BRAND = {
  name: '', color: '#07C160', slogan: '',
  tone: [], voiceTone: '亲切温暖',
};
const DEFAULT_API = { type: 'doubao', key: '' };

function loadBrand() {
  try { return { ...DEFAULT_BRAND, ...JSON.parse(localStorage.getItem(BRAND_KEY)) }; }
  catch { return { ...DEFAULT_BRAND }; }
}
function saveBrand(data) {
  localStorage.setItem(BRAND_KEY, JSON.stringify(data));
}

function loadApiConfig() {
  try { return { ...DEFAULT_API, ...JSON.parse(localStorage.getItem(API_KEY_LS)) }; }
  catch { return { ...DEFAULT_API }; }
}
function saveApiConfig(data) {
  localStorage.setItem(API_KEY_LS, JSON.stringify(data));
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}
function appendHistory(item) {
  const h = loadHistory();
  h.unshift(item);
  if (h.length > 100) h.splice(100);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

function extractTitle(html) {
  const m = html.match(/<div[^>]*class="art-title"[^>]*>([\s\S]*?)<\/div>/i);
  return m ? m[1].replace(/<[^>]*>/g, '').trim() : '';
}
