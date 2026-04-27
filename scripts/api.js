async function callDoubao({ prompt, images = [], testMode = false }) {
  const res = await fetch('/api/doubao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, images, testMode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || '请求失败');
  return data.output[0].content[0].text;
}
