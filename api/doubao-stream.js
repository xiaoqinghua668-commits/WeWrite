export const config = {
  runtime: 'edge',
};

const API_KEY = process.env.DOUBAO_API_KEY || '';
const MODEL   = process.env.DOUBAO_MODEL || 'doubao-seed-2.0-lite-250515';
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!API_KEY) {
    return new Response(JSON.stringify({ error: { message: '未配置 DOUBAO_API_KEY' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { prompt, images = [], testMode = false } = await req.json();

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
        stream: true,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return new Response(JSON.stringify({ error: { message: errText.slice(0, 300) } }), {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: { message: err.message } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
