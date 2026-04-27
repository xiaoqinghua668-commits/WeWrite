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
  if (!validateTopic()) return;

  state.topic   = document.getElementById('topic').value.trim();
  state.extra   = document.getElementById('extra').value.trim();
  state.imgDesc = document.getElementById('img-desc').value.trim();

  setLoading(true);
  setStatus('AI 正在识别图片并撰写文案，请稍候...', 'loading');

  setStreamCallback((partialHtml) => {
    const cleaned = partialHtml.replace(/^```html\s*/i, '').replace(/\s*```$/i, '').trim();
    try {
      renderArticle(cleaned);
    } catch (e) {
      // 部分 HTML 渲染失败是正常的，等内容更完整后会成功
    }
  });

  const prompt     = buildPrompt({
    topic: state.topic, extra: state.extra,
    template: state.template, layout: state.layout,
    imgCount: state.images.length, imgDesc: state.imgDesc,
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
      id:        `${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      title:     extractTitle(html),
      topic:     state.topic,
      template:  state.template,
      html,
      createdAt: new Date().toISOString(),
      brandName: brand.name || '',
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
  btn.disabled  = v;
  btn.innerHTML = v
    ? '<div class="spinner"></div><span>生成中...</span>'
    : '<span id="btn-text">生成文案 ↗</span>';
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
