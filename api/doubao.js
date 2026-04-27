const API_KEY = process.env.DOUBAO_API_KEY || '';
const MODEL   = process.env.DOUBAO_MODEL || 'doubao-seed-2.0-lite-250515';
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: { message: '未配置 DOUBAO_API_KEY 环境变量' } });
  }

  const { prompt, images = [], testMode = false } = req.body;

  const content = [];
  if (!testMode) {
    images.forEach(b64 => {
      content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } });
    });
  }
  content.push({ type: 'text', text: testMode ? '你好，请回复「ok」' : prompt });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const upstream = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: testMode ? 10 : 2000,
        messages: [{ role: 'user', content }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const rawText = await upstream.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('豆包返回非 JSON:', rawText.slice(0, 500));
      return res.status(502).json({
        error: { message: `豆包返回非 JSON 响应: ${rawText.slice(0, 200)}` }
      });
    }

    return res.status(upstream.status).json(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: { message: '豆包 API 请求超时（60s），请重试或减少图片数量' } });
    }
    console.error('请求豆包 API 失败:', err);
    return res.status(500).json({ error: { message: err.message } });
  }
};
