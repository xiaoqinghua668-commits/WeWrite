const API_KEY = process.env.DOUBAO_API_KEY || 'c14f1beb-1c59-4b57-b2e4-8cb170f531f8';
const MODEL   = 'doubao-1.5-vision-pro-250328';
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
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
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
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
