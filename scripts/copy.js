function buildStyledHTML(html) {
  return `<div style="font-family:'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;font-size:15px;line-height:1.9;color:#333;max-width:677px;margin:0 auto;">${
    html
      .replace(/class="art-title"/g,
        'style="font-size:20px;font-weight:700;color:#1a1a1a;line-height:1.4;margin-bottom:6px;"')
      .replace(/class="art-meta"/g,
        'style="font-size:11px;color:#999;padding-bottom:10px;border-bottom:1px solid #f0f0f0;margin-bottom:12px;"')
      .replace(/<h2>/g,
        '<h2 style="font-size:16px;font-weight:700;color:#1a1a1a;margin:16px 0 7px;padding-left:8px;border-left:3px solid #07C160;">')
      .replace(/<p>/g,
        '<p style="font-size:14px;line-height:1.9;color:#333;margin:0 0 10px;">')
      .replace(/<ul>/g,
        '<ul style="padding-left:4px;list-style:none;margin:0 0 10px;">')
      .replace(/<li>/g,
        '<li style="font-size:14px;line-height:1.8;margin-bottom:6px;">')
      .replace(/class="hl"/g,
        'style="background:#f0faf5;border-left:3px solid #07C160;padding:10px 12px;margin:12px 0;border-radius:0 6px 6px 0;font-size:13px;color:#1a5c34;font-style:italic;"')
      .replace(/class="cta"/g,
        'style="background:#07C160;color:#fff;text-align:center;padding:12px;border-radius:8px;margin:14px 0;font-size:14px;font-weight:600;"')
  }</div>`;
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function flashCopySuccess(btnId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const orig   = btn.textContent;
  const origBg = btn.style.background || '';
  btn.textContent      = '✓ 已复制！';
  btn.style.background = 'var(--success)';
  btn.style.color      = '#fff';
  setTimeout(() => {
    btn.textContent      = orig;
    btn.style.background = origBg;
    btn.style.color      = '';
  }, 2000);
}

async function copyRichText() {
  if (!state.generatedHTML) return;
  const styledHTML = buildStyledHTML(state.generatedHTML);
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html':  new Blob([styledHTML],            { type: 'text/html'  }),
        'text/plain': new Blob([stripTags(styledHTML)], { type: 'text/plain' }),
      }),
    ]);
  } catch {
    const tmp = document.createElement('div');
    tmp.innerHTML = styledHTML;
    tmp.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
    document.body.appendChild(tmp);
    const sel = window.getSelection(), range = document.createRange();
    range.selectNodeContents(tmp);
    sel.removeAllRanges(); sel.addRange(range);
    document.execCommand('copy');
    sel.removeAllRanges();
    document.body.removeChild(tmp);
  }
  flashCopySuccess('copy-rich-btn');
  setStatus('✓ 已复制到剪贴板，直接粘贴到公众号编辑器即可', 'success');
}

function copyHtmlSource() {
  if (!state.generatedHTML) return;
  const btn = document.getElementById('copy-html-btn');
  navigator.clipboard.writeText(state.generatedHTML).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = state.generatedHTML;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); ta.remove();
  });
  const orig = btn.textContent;
  btn.textContent = '✓ 已复制';
  setTimeout(() => { btn.textContent = orig; }, 2000);
}
