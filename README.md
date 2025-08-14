# Web Scraper MCP Server

基于 Model Context Protocol (MCP) 的 TypeScript 网页爬取服务器，内置多种常用爬取与命令工具。

<a href="https://glama.ai/mcp/servers/@naku111/mcpServer">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@naku111/mcpServer/badge" alt="Web Scraper Server MCP server" />
</a>

## 功能特性

- 🚀 **多种导出格式**: 支持将爬取内容导出为 Markdown、Text、HTML 和 JSON 格式
- 🎭 **Puppeteer 无头浏览器**: 解决未实现静态化的 SPA 单页应用渲染问题
- 📋 **规则集支持**: 支持设置规则集，实现抓取网页的特定部分内容
- 🔧 **自定义域名 Headers**: 支持设置自定义域名 Headers，绕过网站登录限制
- 📦 **批量爬取**: 支持同时爬取多个 URL
- 🎯 **智能内容提取**: 自动识别和提取网页主要内容

## 安装

```bash
# 克隆项目
git clone <repository-url>
cd web-scraper-mcp

# 安装依赖
npm install

# 构建项目
npm run build
```

## 使用方法

### 启动服务器

```bash
npm start
```

### 可用工具

#### 1. scrape_url - 爬取单个网页

```json
{
  "name": "scrape_url",
  "arguments": {
    "url": "https://example.com",
    "format": "markdown",
    "usePuppeteer": false,
    "ruleSet": "blog",
    "customHeaders": {
      "Authorization": "Bearer token"
    }
  }
}
```

**参数说明:**
- `url` (必需): 要爬取的网页 URL
- `format` (可选): 导出格式，支持 `markdown`、`text`、`html`、`json`，默认为 `markdown`
- `usePuppeteer` (可选): 是否使用 Puppeteer 无头浏览器，默认为 `false`
- `ruleSet` (可选): 规则集名称，用于提取特定内容
- `customHeaders` (可选): 自定义请求头

#### 2. create_rule_set - 创建内容提取规则集

```json
{
  "name": "create_rule_set",
  "arguments": {
    "name": "my_blog_rule",
    "rules": {
      "title": "h1, .post-title",
      "content": ".post-content, article",
      "links": ".post-content a",
      "images": ".post-content img",
      "exclude": ["nav", "footer", ".sidebar"]
    }
  }
}
```

**参数说明:**
- `name` (必需): 规则集名称
- `rules` (必需): 提取规则配置
  - `title`: 标题选择器
  - `content`: 内容选择器
  - `links`: 链接选择器
  - `images`: 图片选择器
  - `exclude`: 要排除的选择器列表

#### 3. set_domain_headers - 设置域名请求头

```json
{
  "name": "set_domain_headers",
  "arguments": {
    "domain": "example.com",
    "headers": {
      "Authorization": "Bearer your-token",
      "X-Custom-Header": "custom-value"
    }
  }
}
```

#### 4. batch_scrape - 批量爬取

```json
{
  "name": "batch_scrape",
  "arguments": {
    "urls": [
      "https://example1.com",
      "https://example2.com",
      "https://example3.com"
    ],
    "format": "markdown",
    "usePuppeteer": false,
    "ruleSet": "blog"
  }
}
```

### 预定义规则集

系统内置了以下规则集：

- **blog**: 适用于大多数博客文章页面
- **news**: 适用于新闻网站文章
- **product**: 适用于电商产品页面
- **documentation**: 适用于技术文档页面
- **forum**: 适用于论坛帖子页面

### 导出格式

#### Markdown
将网页内容转换为 Markdown 格式，包含标题、内容、链接和图片。

#### Text
纯文本格式，去除所有 HTML 标签。

#### HTML
清理后的 HTML 格式，移除脚本和样式。

#### JSON
完整的结构化数据，包含所有提取的信息。

## 开发

### 项目结构

```
src/
├── index.ts              # 主服务器文件
├── scraper/
│   └── webScraper.ts     # 网页爬取器
├── export/
│   └── exportManager.ts  # 导出管理器
├── rules/
│   └── ruleEngine.ts     # 规则引擎
├── headers/
│   └── headerManager.ts  # 请求头管理器
└── utils/
    └── logger.ts         # 日志工具
```

### 开发模式

```bash
# 监听文件变化并自动重新构建
npm run dev
```

### 测试

```bash
npm test
```

## 配置

### 环境变量

- `LOG_LEVEL`: 日志级别 (debug, info, warn, error)
- `PUPPETEER_TIMEOUT`: Puppeteer 超时时间（毫秒）
- `REQUEST_TIMEOUT`: HTTP 请求超时时间（毫秒）

### 自定义配置

可以通过修改源代码来自定义：

1. **默认请求头**: 编辑 `src/headers/headerManager.ts`
2. **预定义规则集**: 编辑 `src/rules/ruleEngine.ts`
3. **导出格式**: 编辑 `src/export/exportManager.ts`

## 常见问题

### Q: 为什么某些网站爬取失败？
A: 可能是因为网站有反爬虫机制。尝试：
1. 使用 `usePuppeteer: true` 启用无头浏览器
2. 设置合适的自定义请求头
3. 使用预定义的反检测请求头

### Q: 如何处理需要登录的网站？
A: 使用 `set_domain_headers` 工具设置包含认证信息的请求头，如 Cookie 或 Authorization。

### Q: SPA 应用内容为空怎么办？
A: 设置 `usePuppeteer: true` 使用 Puppeteer 渲染动态内容。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！