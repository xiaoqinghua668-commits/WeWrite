const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const apiKey = process.env.DOUBAO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: '服务端未配置 DOUBAO_API_KEY 环境变量' } });
  }

  const model = process.env.DOUBAO_MODEL;
  if (!model) {
    return res.status(500).json({ error: { message: '服务端未配置 DOUBAO_MODEL 环境变量，请填入接入点 ID（ep-xxx）或已开通按量计费的模型名' } });
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
    const upstream = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        max_tokens: testMode ? 10 : 2000,
        messages: [{ role: 'user', content }],
      }),
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
};
