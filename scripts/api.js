async function callDoubao({ prompt, images = [], testMode = false }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 65000);

  try {
    const res = await fetch('/api/doubao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, images, testMode }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const rawText = await res.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      throw new Error(`服务器返回异常: ${rawText.slice(0, 100)}`);
    }

    if (!res.ok) throw new Error(data.error?.message || '请求失败');

    if (data.choices && data.choices[0]) {
      return data.choices[0].message.content;
    }
    if (data.content && data.content[0]) {
      return data.content[0].text;
    }
    throw new Error('未知的响应格式');

  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('请求超时，请减少图片数量或稍后重试');
    }
    throw err;
  }
}
