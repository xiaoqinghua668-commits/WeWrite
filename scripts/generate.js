async function generateWithRetry(prompt, base64List, maxRetries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      setStatus(`第 ${attempt} 次重试中...`, 'loading');
      await new Promise(r => setTimeout(r, 1500));
    }
    try {
      return await callDoubao({ prompt, images: base64List });
    } catch (err) {
      lastError = err;
      if (err.message && (err.message.includes('401') || err.message.includes('403'))) {
        throw err;
      }
    }
  }
  throw lastError;
}

async function generate() {
  if (state.isLoading) return;

  if (state.mode === 'create') {
    if (!validateTopic()) return;
    state.topic   = document.getElementById('topic').value.trim();
    state.extra   = document.getElementById('extra').value.trim();
  } else {
    state.polishDraft = document.getElementById('polish-draft').value.trim();
    if (!state.polishDraft) {
      document.getElementById('polish-draft').classList.add('error');
      return;
    }
    document.getElementById('polish-draft').classList.remove('error');
  }

  state.imgDesc = document.getElementById('img-desc').value.trim();

  setLoading(true);
  setStatus(
    state.mode === 'create'
      ? 'AI 正在识别图片并撰写文案，请稍候...'
      : 'AI 正在润色排版，请稍候...',
    'loading'
  );

  setStreamCallback((partialHtml) => {
    const cleaned = partialHtml.replace(/^```html\s*/i, '').replace(/\s*```$/i, '').trim();
    try { renderArticle(cleaned); } catch (e) {}
  });

  const prompt = state.mode === 'create'
    ? buildPrompt({
        topic: state.topic, extra: state.extra,
        template: state.template, layout: state.layout,
        imgCount: state.images.length, imgDesc: state.imgDesc,
        selectedStyle: state.selectedStyle,
      })
    : buildPolishPrompt({
        draft: state.polishDraft,
        level: state.polishLevel,
        preserve: state.polishPreserve,
        imgCount: state.images.length, imgDesc: state.imgDesc,
        selectedStyle: state.selectedStyle,
      });

  const base64List = state.images.map(img => img.base64);

  try {
    const rawHtml = await generateWithRetry(prompt, base64List);
    const html    = rawHtml.replace(/^```html\s*/i, '').replace(/\s*```$/i, '').trim();

    state.generatedHTML = html;
    renderArticle(html);

    document.getElementById('copy-rich-btn').disabled = false;
    document.getElementById('copy-html-btn').disabled = false;
    setStatus('✓ 生成完成，点击黄色按钮复制', 'success');

    const brand = loadBrand();
    appendHistory({
      id:          `${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      title:       extractTitle(html),
      topic:       state.mode === 'create' ? state.topic : state.polishDraft.slice(0, 50),
      template:    state.mode === 'create' ? state.template : null,
      mode:        state.mode,
      polishDraft: state.mode === 'polish' ? state.polishDraft : undefined,
      html,
      createdAt:   new Date().toISOString(),
      brandName:   brand.name || '',
    });
    updateNavStats();

  } catch (err) {
    console.error(err);
    setStatus(`✗ 生成失败：${err.message || '网络错误'}，请稍后重试`, 'error');
  }

  setStreamCallback(null);
  setLoading(false);
}

function setLoading(v) {
  state.isLoading = v;
  const btn = document.getElementById('generate-btn');
  btn.disabled = v;
  if (v) {
    btn.innerHTML = '<div class="spinner"></div><span>生成中...</span>';
  } else {
    const label = state.mode === 'polish' ? '润色排版 ↗' : '生成文案 ↗';
    btn.innerHTML = `<span id="btn-text">${label}</span>`;
  }
}

function setStatus(msg, type = '') {
  const bar = document.getElementById('status-bar');
  bar.textContent = msg;
  bar.style.color = type === 'success' ? 'var(--success)'
                  : type === 'error'   ? 'var(--error)'
                  : type === 'loading' ? 'var(--text-secondary)'
                  :                      'var(--text-tertiary)';
}

function validateTopic() {
  const v = document.getElementById('topic').value.trim();
  if (!v) {
    document.getElementById('topic').classList.add('error');
    document.getElementById('topic-error').style.display = 'block';
    return false;
  }
  return true;
}
function clearTopicError(el) {
  el.classList.remove('error');
  document.getElementById('topic-error').style.display = 'none';
}

function updateEstimate() {
  const el = document.getElementById('gen-estimate');
  if (!el) return;
  document.getElementById('est-template').textContent = '预计 700~950 字';
  document.getElementById('est-img').textContent =
    state.images.length > 0 ? `${state.images.length} 张配图` : '';
  el.style.display = 'flex';
}
