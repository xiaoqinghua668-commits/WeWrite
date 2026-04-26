function updateNavStats() {
  const history  = loadHistory();
  const today    = new Date().toDateString();
  const todayCnt = history.filter(i => new Date(i.createdAt).toDateString() === today).length;
  document.getElementById('stat-today').textContent = todayCnt;
  document.getElementById('stat-total').textContent = history.length;
}

function syncPhoneHeader() {
  const brand = loadBrand();
  const name  = brand.name || '我的公众号';
  const initial = name.charAt(0).toUpperCase();
  const el = document.getElementById('wx-avatar');
  el.textContent  = initial;
  el.style.background = brand.color || '#07C160';
  document.getElementById('wx-name').textContent = name;
}

function injectImages(html, images) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  doc.querySelectorAll('.imgph[data-idx]').forEach((el) => {
    const idx = parseInt(el.getAttribute('data-idx'), 10) - 1;
    const img = images[idx];
    if (img) {
      const box = el.closest('.imgbox') || el.parentElement;
      box.innerHTML = `<img src="data:image/jpeg;base64,${img.base64}"
        style="max-width:100%;border-radius:8px;display:block;margin:10px auto;"
        alt="图片${idx + 1}">`;
    }
  });
  return doc.querySelector('div').innerHTML;
}

function renderArticle(html) {
  const finalHtml = injectImages(html, state.images);
  document.getElementById('article-body').innerHTML = finalHtml;
  document.getElementById('preview-empty').style.display = 'none';
  document.getElementById('article-output').classList.add('visible');
}
