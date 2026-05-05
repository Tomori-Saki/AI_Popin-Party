# AI_Popin'Party

与 BanG Dream! Poppin'Party 乐队成员进行 AI 角色扮演对话的单页 Web 应用。

## 功能

- 与 Poppin'Party 五位成员（户山香澄、牛込里美、山吹沙绫、市谷有咲、花园多惠）进行自然对话
- 基于角色设定、世界观（含全五团信息）和示例对话的 AI 系统提示词，还原角色性格与语气
- 流式响应 + 打字机动画，模拟真实聊天体验
- 支持回退到任意消息重新开始对话
- 按角色独立保存聊天记录（localStorage）
- 支持任意 OpenAI 兼容 API（DeepSeek、OpenAI、Grok 等），可自定义接口地址和模型
- 响应式布局，适配桌面与移动端

## 技术栈

纯静态前端，无框架、无构建步骤、无后端：

- HTML5 / CSS3 / Vanilla JavaScript (ES2020+)
- CSS 毛玻璃效果 + 径向渐变背景
- `fetch()` + `ReadableStream` 处理 SSE 流式响应
- localStorage 持久化 API 配置与聊天记录
- 零外部依赖

## 项目结构

```
├── index.html          # 主入口（单页应用）
├── script.js           # 全部 JavaScript 逻辑
├── styles.css          # 全部 CSS 样式
├── character.json      # 角色定义（身份、性格、卡面等）
├── world.json          # BanG Dream 世界观设定
├── eample.json         # Few-shot 对话示例
├── 角色卡面/           # 角色选择卡片图片（5 张 PNG）
└── 角色内容/           # 角色衍生图片
```

## 快速开始

1. 将项目部署到任意静态服务器，或直接用浏览器打开 `index.html`
2. 页面会自动弹出 API 设置窗口
3. 输入你的 API Key（默认使用 DeepSeek API）
4. 选择一个角色即可开始对话

```bash
# 使用 Python 快速启动本地服务器
python -m http.server 8080

# 或使用 Node.js
npx serve .
```

## API 配置

默认使用 DeepSeek API，你也可以修改为任意 OpenAI 兼容接口：

| 配置项 | 默认值 |
|--------|--------|
| API 地址 | `https://api.deepseek.com/chat/completions` |
| 模型 | `deepseek-chat` |

API Key 和配置保存在浏览器 localStorage 中，不会上传到任何服务器。

## 角色列表

| 角色 | 声部 | 代表色 |
|------|------|--------|
| 户山香澄 (Toyama Kasumi) | 吉他 & 主唱 | `#f58aa8` |
| 花园多惠 (Hanazono Tae) | 吉他 | `#62a7ff` |
| 牛込里美 (Ushigome Rimi) | 贝斯 | `#f36ca6` |
| 山吹沙绫 (Yamabuki Saya) | 鼓手 | `#f2b35e` |
| 市谷有咲 (Ichigaya Arisa) | 键盘 | `#9b7ad9` |

## 自定义

- **添加角色**：编辑 `character.json`，在 `characters` 数组中新增条目，并将角色卡面放入 `角色卡面/` 目录
- **修改世界观**：编辑 `world.json` 调整世界观设定和 AI 行为规则（已包含 Poppin'Party、Afterglow、Roselia、Hello Happy World、Pastel*Palettes 五团信息及跨团关系）
- **调整示例对话**：编辑 `eample.json` 添加新的对话场景
- **更换 API**：在页面 API 设置弹窗中修改接口地址和模型名称

## 许可证

本项目为个人兴趣项目，基于 BanG Dream! 系列的粉丝创作。角色版权归 Bushiroad 及相关权利方所有。
