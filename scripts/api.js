async function callDoubao({ apiKey, prompt, images, testMode = false }) {
  const content = [];
  if (!testMode) {
    images.forEach(b64 => {
      content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } });
    });
  }
  content.push({ type: 'text', text: testMode ? '你好，请回复「ok」' : prompt });

  const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'doubao-1-5-vision-pro-32k',
      max_tokens: testMode ? 10 : 2000,
      messages: [{ role: 'user', content }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

async function callClaude({ apiKey, prompt, images, testMode = false }) {
  const content = [];
  if (!testMode) {
    images.forEach(b64 => {
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } });
    });
  }
  content.push({ type: 'text', text: testMode ? '你好，请回复「ok」' : prompt });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
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
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.filter(b => b.type === 'text').map(b => b.text).join('');
}
