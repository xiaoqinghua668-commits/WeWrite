async function callDoubao({ prompt, images = [], testMode = false }) {
  const res = await fetch('/api/doubao-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, images, testMode }),
  });

  if (!res.ok) {
    let errMsg = '请求失败';
    try {
      const errData = await res.json();
      errMsg = errData.error?.message || errMsg;
    } catch (e) {
      errMsg = await res.text().catch(() => errMsg);
    }
    throw new Error(errMsg);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream')) {
    return await readSSEStream(res);
  }

  const data = await res.json();
  if (data.choices && data.choices[0]) {
    return data.choices[0].message.content;
  }
  throw new Error('未知的响应格式');
}

async function readSSEStream(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let result = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          result += delta;
          if (typeof onStreamChunk === 'function') {
            onStreamChunk(result);
          }
        }
      } catch (e) {
        // 忽略解析失败的行
      }
    }
  }

  if (!result) {
    throw new Error('流式响应为空，豆包未返回内容');
  }
  return result;
}

let onStreamChunk = null;
function setStreamCallback(fn) {
  onStreamChunk = fn;
}
