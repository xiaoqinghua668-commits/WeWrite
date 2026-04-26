async function addFiles(files) {
  const remaining = 6 - state.images.length;
  if (remaining <= 0) { setStatus('最多上传 6 张图片', 'error'); return; }
  const toAdd = files.slice(0, remaining);
  for (const file of toAdd) {
    const base64 = await compressImage(file);
    state.images.push({ file, base64 });
  }
  if (files.length > remaining)
    setStatus(`最多上传 6 张图片，已跳过多余的 ${files.length - remaining} 张`, 'error');
  renderThumbs();
  toggleImgDesc();
}

function removeImage(i) {
  if (state.images[i]._thumbUrl) URL.revokeObjectURL(state.images[i]._thumbUrl);
  state.images.splice(i, 1);
  renderThumbs(); toggleImgDesc();
}

function renderThumbs() {
  const row = document.getElementById('thumb-row');
  row.innerHTML = state.images.map((img, i) => {
    const url = img._thumbUrl || (img._thumbUrl = URL.createObjectURL(img.file));
    return `<div class="thumb-wrap">
      <img class="thumb-img" src="${url}" alt="图${i+1}">
      <button class="thumb-del" onclick="removeImage(${i})">✕</button>
    </div>`;
  }).join('');
}

function toggleImgDesc() {
  document.getElementById('img-desc-group').classList.toggle('visible', state.images.length > 0);
}

function initUpload() {
  document.getElementById('file-input').addEventListener('change', async (e) => {
    await addFiles([...e.target.files]);
    e.target.value = '';
  });
  const zone = document.getElementById('upload-zone');
  zone.addEventListener('dragover',  (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', ()  => zone.classList.remove('dragover'));
  zone.addEventListener('drop', async (e) => {
    e.preventDefault(); zone.classList.remove('dragover');
    await addFiles([...e.dataTransfer.files].filter(f => f.type.startsWith('image/')));
  });
}
