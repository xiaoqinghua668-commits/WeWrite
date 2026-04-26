module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: '服务端未配置 CLAUDE_API_KEY 环境变量' } });
  }

  const { prompt, images = [], testMode = false } = req.body;

  const content = [];
  if (!testMode) {
    images.forEach(b64 => {
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } });
    });
  }
  content.push({ type: 'text', text: testMode ? '你好，请回复「ok」' : prompt });

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: testMode ? 10 : 2000,
        system: '你是一位专业的微信公众号图文编辑，擅长根据图片内容和主题创作符合中国用户阅读习惯的公众号文章。你的输出必须是纯 HTML 片段，不包含任何 markdown 代码块标记、解释文字或前缀。',
        messages: [{ role: 'user', content }],
      }),
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
};
