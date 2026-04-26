# WeWrite — 公众号图文生成工具

一键生成微信公众号图文，支持 AI 识图、自动排版、富文本复制。

## 部署到 Vercel

1. Fork 或上传本仓库到 GitHub
2. 在 Vercel 导入该仓库，Framework Preset 选择「Other」
3. 在 Vercel 项目的 **Settings → Environment Variables** 中添加：

   | 变量名            | 说明                     |
   |-------------------|--------------------------|
   | `DOUBAO_API_KEY`  | 火山引擎方舟平台 API Key |
   | `CLAUDE_API_KEY`  | Anthropic Claude API Key |

4. 点击 Deploy，等待约 30 秒即可访问

## 本地开发

API Key 需通过环境变量传入，推荐用 Vercel CLI 本地运行：

```bash
npm i -g vercel
vercel dev
```

或在项目根目录创建 `.env.local`（已被 .gitignore 忽略，不会提交）：

```
DOUBAO_API_KEY=你的豆包key
CLAUDE_API_KEY=你的ClaudeKey
```

然后运行 `vercel dev`，访问 `http://localhost:3000`。

## 安全说明

API Key 仅存在于 Vercel 服务端环境变量中，**不会出现在前端代码或浏览器中**。
用户请求经由 `/api/doubao` 和 `/api/claude` 代理转发，浏览器不持有任何密钥。
