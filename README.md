# WeWrite — 公众号图文生成工具

一键生成微信公众号图文，支持 AI 识图、自动排版、富文本复制。

## 本地运行

直接双击 `index.html` 即可，无需安装任何依赖。

## 部署到 Vercel

1. 将项目上传到 GitHub 仓库
2. 在 Vercel 导入该仓库
3. Framework Preset 选择「Other」
4. 点击 Deploy

## 配置 API Key

打开工具后，点击「设置」→「AI 接口配置」填写 API Key。
支持豆包 Vision 和 Claude Sonnet 两种接口。

## 注意事项

API Key 存储在本地浏览器（localStorage），不会上传到服务器。
