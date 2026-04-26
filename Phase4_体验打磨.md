# 公众号图文生成工具 — Phase 4：体验打磨

> 目标：在完整功能的基础上，消除所有使用摩擦点，为后续迁移 Vercel 做准备。
> 依赖：Phase 1~3 全部完成。本阶段无新增页面，只对已有功能做增强。

---

## 1. 本阶段优化项总览

| 编号 | 优化项 | 优先级 | 影响文件 |
|------|--------|--------|---------|
| 4-1 | 生成失败自动重试 | 高 | `generate.js` |
| 4-2 | 图片压缩策略优化 | 高 | `imageUtils.js` |
| 4-3 | 快捷键支持 | 中 | `main.js` |
| 4-4 | 生成字数 / Token 预估提示 | 中 | `generate.js` `create` HTML |
| 4-5 | 空状态引导优化 | 中 | `create` HTML + CSS |
| 4-6 | 复制成功动效 | 低 | `copy.js` |
| 4-7 | localStorage 容量预警 | 中 | `storage.js` |
| 4-8 | Vercel 部署准备 | 高 | 新增配置文件 |
| 4-9 | API Key 安全提示 | 中 | `settings.js` |
| 4-10 | 响应式布局基础适配 | 低 | 所有 CSS |

---

## 2. 各优化项详细说明

---

### 4-1 生成失败自动重试

**问题**：网络抖动或 API 临时超时导致生成失败，用户需要手动再点一次。

**方案**：失败后自动重试最多 2 次，每次间隔 1.5s，超过后才展示错误信息。

**修改文件**：`scripts/generate.js`

```javascript
// 在 generate() 函数中替换 try/catch 为带重试的版本

async function generateWithRetry(apiCfg, prompt, base64List, maxRetries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      setStatus(`第 ${attempt} 次重试中...`, 'loading');
      await new Promise(r => setTimeout(r, 1500));
    }
    try {
      if (apiCfg.type === 'claude') {
        return await callClaude({ apiKey: apiCfg.key, prompt, images: base64List });
      } else {
        return await callDoubao({ apiKey: apiCfg.key, prompt, images: base64List });
      }
    } catch (err) {
      lastError = err;
      // 如果是 Key 无效（4xx），不重试
      if (err.message && (err.message.includes('401') || err.message.includes('403'))) {
        throw err;
      }
    }
  }
  throw lastError;
}

// generate() 中替换原来的直接调用：
// 原：let html = await callClaude(...) / callDoubao(...)
// 改：let html = await generateWithRetry(apiCfg, prompt, base64List);
```

**状态文字变化**：
```
第 1 次：「AI 正在识别图片并撰写文案，请稍候...」
重试 1：「网络波动，第 1 次重试中...」
重试 2：「第 2 次重试中...」
全部失败：「✗ 生成失败：[错误信息]，请检查 API Key 或网络」
```

---

### 4-2 图片压缩策略优化

**问题**：原压缩仅处理 > 1MB 的图片，小图不压缩但 base64 仍可能较大，多张图片叠加导致 API 请求超时。

**方案**：改为按总大小控制，所有图片统一压缩到合理尺寸。

**修改文件**：`scripts/imageUtils.js`

```javascript
// 替换原 compressImage 函数

async function compressImage(file, options = {}) {
  const {
    maxPx    = 1024,    // 最大边长（像素）
    quality  = 0.82,    // JPEG 质量
    maxBytes = 300_000, // 单张压缩目标（约 300KB base64 ≈ 400KB）
  } = options;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      // 计算缩放比例
      let ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);

      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

      // 二次压缩：如果仍然太大，降低质量
      const tryCompress = (q) => {
        canvas.toBlob((blob) => {
          if (blob.size > maxBytes && q > 0.5) {
            tryCompress(q - 0.1);
            return;
          }
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result.split(',')[1]);
          reader.readAsDataURL(blob);
        }, 'image/jpeg', q);
      };

      tryCompress(quality);
      URL.revokeObjectURL(url);
    };

    img.src = url;
  });
}

// 新增：计算所有图片总大小预估（用于 UI 提示）
function estimateTotalSize(images) {
  return images.reduce((sum, img) => sum + (img.base64 ? img.base64.length * 0.75 : 0), 0);
}
```

**上传后在缩略图区域显示总大小提示**：
```
若总大小 < 2MB：不显示
若总大小 2~4MB：「图片共约 Xmb，生成可能稍慢」（橙色）
若总大小 > 4MB：「图片较大，建议删除部分图片以提升速度」（红色）
```

---

### 4-3 快捷键支持

**修改文件**：`scripts/main.js`

在 `init()` 中追加：

```javascript
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // ⌘/Ctrl + Enter：触发生成（在创作页且非输入状态时）
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      const activePage = document.querySelector('.page.active');
      if (activePage && activePage.id === 'page-create') {
        e.preventDefault();
        generate();
      }
    }

    // ⌘/Ctrl + K：聚焦搜索框（在历史页时）
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      const activePage = document.querySelector('.page.active');
      if (activePage && activePage.id === 'page-history') {
        e.preventDefault();
        document.getElementById('history-search').focus();
      }
    }

    // Esc：清空历史搜索框
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
```

**在创作页生成按钮旁添加快捷键提示**：

在 `index.html` 的 `.btn-generate` 下方添加：
```html
<div class="shortcut-hint">⌘ Enter 快速生成</div>
```

样式（加入 `create.css`）：
```css
.shortcut-hint {
  text-align: center;
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 6px;
}
```

---

### 4-4 生成字数预估提示

**问题**：用户不清楚当前输入会生成多长的文章，以及是否会超出 API token 限制。

**方案**：在生成按钮上方实时显示预估信息。

**修改文件**：`scripts/generate.js`，`index.html`

在 `.btn-generate` 上方添加预估信息区域：

```html
<div class="gen-estimate" id="gen-estimate" style="display:none">
  <span id="est-template"></span>
  <span id="est-img"></span>
</div>
```

样式（加入 `create.css`）：
```css
.gen-estimate {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}
.gen-estimate span {
  font-size: 11px;
  color: var(--text-tertiary);
  background: var(--bg-input);
  padding: 3px 8px;
  border-radius: 999px;
}
```

**更新逻辑**（在模板、图片变更时调用）：

```javascript
function updateEstimate() {
  const el = document.getElementById('gen-estimate');
  if (!el) return;

  const parts = [];
  parts.push(`预计 700~950 字`);
  if (state.images.length > 0) {
    parts.push(`${state.images.length} 张配图`);
  }

  document.getElementById('est-template').textContent = parts[0] || '';
  document.getElementById('est-img').textContent      = parts[1] || '';
  el.style.display = 'flex';
}
// 调用时机：Pill 选择模板时、图片增删时
```

---

### 4-5 空状态引导优化

**问题**：新用户打开工具，右侧预览区只有「填写主题后点击生成」，没有引导说明工具怎么用。

**方案**：未配置 API Key 时，显示「3步开始」引导卡片。

**修改文件**：`scripts/render.js`，`index.html`

在 `.preview-empty` 区域内，当检测到没有 API Key 时，额外显示引导步骤：

```javascript
function renderPreviewEmpty() {
  const apiCfg   = loadApiConfig();
  const hasKey   = !!apiCfg.key;
  const emptyEl  = document.getElementById('preview-empty');

  if (!hasKey) {
    emptyEl.innerHTML = `
      <div class="preview-empty-icon">✍️</div>
      <div class="preview-empty-text" style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:12px;">
        3 步开始使用
      </div>
      <div class="onboard-steps">
        <div class="onboard-step">
          <div class="step-num">1</div>
          <div class="step-text">前往「设置」填写 API Key</div>
        </div>
        <div class="onboard-step">
          <div class="step-num">2</div>
          <div class="step-text">填写文章主题并上传图片</div>
        </div>
        <div class="onboard-step">
          <div class="step-num">3</div>
          <div class="step-text">点击生成，一键复制到公众号</div>
        </div>
      </div>
      <button class="btn-go-settings" onclick="document.querySelector('.nav-tab[data-tab=settings]').click()">
        前往设置 →
      </button>`;
  }
}
```

样式（加入 `create.css`）：
```css
.onboard-steps {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 200px;
  margin-bottom: 16px;
}
.onboard-step {
  display: flex;
  align-items: center;
  gap: 10px;
}
.step-num {
  width: 22px; height: 22px;
  border-radius: 50%;
  background: var(--yellow);
  color: var(--black);
  font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.step-text {
  font-size: 13px;
  color: var(--text-secondary);
  text-align: left;
}
.btn-go-settings {
  padding: 8px 20px;
  border-radius: 999px;
  border: 1.5px solid var(--black);
  background: transparent;
  color: var(--black);
  font-size: 13px; font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.btn-go-settings:hover {
  background: var(--black);
  color: #fff;
}
```

---

### 4-6 复制成功动效

**问题**：复制成功反馈只有文字变化，不够明显。

**方案**：黄色按钮复制成功时，背景色过渡到绿色再恢复。

**修改文件**：`scripts/copy.js`

```javascript
// copyRichText() 成功后，替换原来的文字变化为动效 + 文字双重反馈

function flashCopySuccess(btnId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  const orig     = btn.textContent;
  const origBg   = btn.style.background || '';

  btn.textContent      = '✓ 已复制！';
  btn.style.background = 'var(--success)';
  btn.style.color      = '#fff';

  setTimeout(() => {
    btn.textContent      = orig;
    btn.style.background = origBg;
    btn.style.color      = '';
  }, 2000);
}

// 在 copyRichText() 成功分支中替换原来的按钮文字修改：
// 原：btn.textContent = '✓ 已复制！';
// 改：flashCopySuccess('copy-rich-btn');
//     flashCopySuccess('history-copy-rich-btn'); // 历史页按钮（如有独立 id）
```

---

### 4-7 localStorage 容量预警

**问题**：历史记录含 base64 图片，100 条后可能接近 localStorage 5MB 限制，导致写入失败。

**方案**：每次写入前检查容量，超过阈值时提示用户清理。

**修改文件**：`scripts/storage.js`

```javascript
// 新增容量检测函数
function checkStorageQuota() {
  try {
    let total = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage.getItem(key).length * 2; // UTF-16，每字符 2 bytes
      }
    }
    const usedMB  = (total / 1024 / 1024).toFixed(1);
    const limitMB = 5;
    const ratio   = total / (limitMB * 1024 * 1024);

    return { usedMB: parseFloat(usedMB), ratio, isCritical: ratio > 0.8 };
  } catch {
    return { usedMB: 0, ratio: 0, isCritical: false };
  }
}

// 修改 appendHistory()：写入前检查
function appendHistory(item) {
  const quota = checkStorageQuota();
  if (quota.isCritical) {
    // 自动清理：只保留最近 30 条
    const h = loadHistory().slice(0, 30);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  }

  const h = loadHistory();
  h.unshift(item);
  if (h.length > 100) h.splice(100);

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  } catch (e) {
    // 写入失败（存储已满）：自动删除最旧的 20 条再重试
    h.splice(80);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
    } catch {
      console.warn('localStorage 已满，无法保存历史记录');
    }
  }
}

// 新增：清空所有历史（供设置页「清空历史」按钮调用）
function clearAllHistory() {
  localStorage.removeItem(HISTORY_KEY);
}
```

**在设置页使用统计卡片底部新增「清空历史」按钮**：

```html
<!-- 加在 stats-cols 下方 -->
<div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between">
  <span class="form-hint" id="storage-hint"></span>
  <button class="btn-clear-history" onclick="confirmClearHistory()">清空历史记录</button>
</div>
```

样式（加入 `settings.css`）：
```css
.btn-clear-history {
  font-size: 12px;
  color: var(--error);
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  opacity: 0.7;
  padding: 4px 0;
}
.btn-clear-history:hover { opacity: 1; }
```

逻辑（加入 `settings.js`）：
```javascript
function confirmClearHistory() {
  const btn = document.querySelector('.btn-clear-history');
  btn.innerHTML = `确认清空？
    <button onclick="doCleanHistory()" style="color:var(--error);background:none;border:none;cursor:pointer;font-family:inherit;font-size:12px;">确认</button>
    <button onclick="populateSettingsForm()" style="color:var(--text-secondary);background:none;border:none;cursor:pointer;font-family:inherit;font-size:12px;">取消</button>`;
}

function doCleanHistory() {
  clearAllHistory();
  updateNavStats();
  populateSettingsForm();
}

// populateSettingsForm() 中新增容量显示：
function updateStorageHint() {
  const quota  = checkStorageQuota();
  const hint   = document.getElementById('storage-hint');
  if (!hint) return;
  hint.textContent = `已使用约 ${quota.usedMB}MB / 5MB`;
  hint.style.color = quota.isCritical ? 'var(--error)' : 'var(--text-tertiary)';
}
// 在 populateSettingsForm() 末尾调用 updateStorageHint()
```

---

### 4-8 Vercel 部署准备

**目标**：将本地 `file://` 协议的多文件项目迁移到可通过 URL 访问的 Vercel 静态部署。

#### 新增文件：`vercel.json`

```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options",        "value": "DENY"    },
        { "key": "Referrer-Policy",         "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

#### 新增文件：`.gitignore`

```
.DS_Store
Thumbs.db
*.log
node_modules/
```

#### 新增文件：`README.md`

```markdown
# WeWrite — 公众号图文生成工具

一键生成微信公众号图文，支持 AI 识图、自动排版、富文本复制。

## 本地运行

直接双击 `index.html` 即可，无需安装任何依赖。

## 部署到 Vercel

1. 将项目上传到 GitHub 仓库
2. 在 Vercel 导入该仓库
3. Framework Preset 选择「Other」
4. 点击 Deploy

## 配置 API Key

打开工具后，点击「设置」→「AI 接口配置」填写 API Key。
支持豆包 Vision 和 Claude Sonnet 两种接口。

## 注意事项

API Key 存储在本地浏览器（localStorage），不会上传到服务器。
```

#### CORS 问题说明

本地 `file://` 协议下调用豆包 API 可能遇到 CORS 限制。
部署到 Vercel 后（`https://` 协议），CORS 问题自动消失。

若本地调试时遇到 CORS，临时解决方案：
- 用 VSCode 的 Live Server 插件打开（`http://127.0.0.1`）
- 或使用 `python3 -m http.server 8080` 在本地启动简单服务器

---

### 4-9 API Key 安全提示

**修改文件**：`scripts/settings.js`，`index.html`（设置页 API 配置卡片）

在 API Key 输入框下方（`test-row` 之后）添加提示：

```html
<div class="form-hint" style="margin-top:6px">
  🔒 API Key 仅保存在本地浏览器，不会上传到任何服务器。
  部署到公网后，请勿将工具链接分享给他人。
</div>
```

---

### 4-10 响应式布局基础适配

**目标**：在平板（768px ~ 1024px）宽度下保持基本可用，不要求完美适配移动端。

**修改文件**：所有 CSS 文件末尾追加，或新建 `styles/responsive.css`

```css
/* ═══════════════════════════════════════════
   Responsive — 平板适配（768px ~ 1024px）
═══════════════════════════════════════════ */
@media (max-width: 1024px) {

  /* 创作页：输入区与预览区改为上下布局 */
  .create-main {
    grid-template-columns: 1fr;
    padding: 16px 16px 0;
  }

  /* 预览手机居中 */
  .preview-area {
    padding-bottom: 24px;
  }

  /* 历史页：列表区变全宽，预览隐藏（点击列表项时展开） */
  .history-main {
    grid-template-columns: 1fr;
    padding: 16px;
  }

  /* 设置页：减少边距 */
  .settings-view {
    padding: 20px 16px 32px;
  }

  /* Nav：统计 Pill 隐藏（节省空间） */
  .nav-right {
    display: none;
  }
}

@media (max-width: 768px) {
  /* Nav Tab 文字缩短 */
  .nav-tab {
    padding: 5px 10px;
    font-size: 12px;
  }

  /* 品牌色块换行 */
  .color-picker-row {
    flex-wrap: wrap;
  }

  /* Provider 选择改为单列 */
  .provider-options {
    grid-template-columns: 1fr;
  }
}
```

在 `index.html` 的 `<head>` 中最后引入（在所有其他 CSS 之后）：
```html
<link rel="stylesheet" href="styles/responsive.css">
```

---

## 3. 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `scripts/generate.js` | 新增 `generateWithRetry()`，新增 `updateEstimate()` |
| 修改 | `scripts/imageUtils.js` | 替换 `compressImage()`，新增 `estimateTotalSize()` |
| 修改 | `scripts/copy.js` | 新增 `flashCopySuccess()`，替换复制成功反馈 |
| 修改 | `scripts/storage.js` | 新增 `checkStorageQuota()`，修改 `appendHistory()`，新增 `clearAllHistory()` |
| 修改 | `scripts/settings.js` | 新增 `confirmClearHistory()`、`doCleanHistory()`、`updateStorageHint()` |
| 修改 | `scripts/render.js` | 新增 `renderPreviewEmpty()` 引导卡片逻辑 |
| 修改 | `scripts/main.js` | 新增 `initKeyboardShortcuts()`，`init()` 中调用 |
| 修改 | `styles/create.css` | 新增 `.shortcut-hint`、`.gen-estimate`、`.onboard-steps` 等 |
| 修改 | `styles/settings.css` | 新增 `.btn-clear-history` |
| 新建 | `styles/responsive.css` | 响应式布局 |
| 新建 | `vercel.json` | Vercel 部署配置 |
| 新建 | `.gitignore` | Git 忽略文件 |
| 新建 | `README.md` | 项目说明 |
| 修改 | `index.html` | 新增快捷键提示、预估信息、安全提示、引入新 CSS |

---

## 4. 最终项目结构

```
wewrite/
├── index.html
├── vercel.json
├── .gitignore
├── README.md
├── styles/
│   ├── tokens.css
│   ├── base.css
│   ├── nav.css
│   ├── create.css
│   ├── article.css
│   ├── settings.css
│   ├── history.css
│   └── responsive.css       ← Phase 4 新增
└── scripts/
    ├── storage.js
    ├── imageUtils.js
    ├── api.js
    ├── promptBuilder.js
    ├── render.js
    ├── copy.js
    ├── generate.js
    ├── upload.js
    ├── settings.js
    ├── history.js
    └── main.js
```

---

## 5. Phase 4 完成标准

- [ ] 网络抖动时自动重试，重试次数和状态有明确提示
- [ ] 多张图片上传后，若总大小过大有提示
- [ ] `⌘/Ctrl + Enter` 可在创作页触发生成
- [ ] 历史页 `⌘/Ctrl + K` 聚焦搜索框，`Esc` 清空
- [ ] 新用户未配置 API Key 时，预览区显示 3 步引导
- [ ] 复制成功有绿色动效反馈
- [ ] 设置页显示 localStorage 使用量
- [ ] 「清空历史记录」功能正常
- [ ] 项目可正常部署到 Vercel，通过 URL 访问
- [ ] 平板宽度（768px ~ 1024px）下页面基本可用，不出现横向滚动条

---

## 6. Vercel 部署步骤（操作指引）

```
1. 在 GitHub 新建仓库（如 wewrite）

2. 将 wewrite/ 目录下所有文件推送到仓库：
   git init
   git add .
   git commit -m "init: WeWrite 公众号图文生成工具"
   git remote add origin https://github.com/你的用户名/wewrite.git
   git push -u origin main

3. 打开 vercel.com，点击「Add New Project」

4. 导入刚创建的 GitHub 仓库

5. 配置项：
   Framework Preset → Other
   Root Directory   → ./（默认）
   Build Command    → 留空
   Output Directory → 留空

6. 点击 Deploy，等待约 30 秒

7. 部署完成后获得访问链接，如：
   https://wewrite.vercel.app
```

---

*文档版本：v1.0 | Phase 4（最终阶段）| 上一步：Phase 3 历史草稿*
