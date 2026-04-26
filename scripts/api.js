// 所有 AI 调用经服务端代理，API Key 不下发到浏览器

async function callDoubao({ prompt, images = [], testMode = false }) {
  const res = await fetch('/api/doubao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, images, testMode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || '请求失败');
  return data.choices[0].message.content;
}

async function callClaude({ prompt, images = [], testMode = false }) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, images, testMode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || '请求失败');
  return data.content.filter(b => b.type === 'text').map(b => b.text).join('');
}
