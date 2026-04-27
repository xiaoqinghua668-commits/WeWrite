async function compressImage(file, options = {}) {
  const {
    maxPx    = 800,
    quality  = 0.7,
    maxBytes = 150_000,
  } = options;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

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

function estimateTotalSize(images) {
  return images.reduce((sum, img) => sum + (img.base64 ? img.base64.length * 0.75 : 0), 0);
}
