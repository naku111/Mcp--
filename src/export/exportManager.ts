import TurndownService from "turndown";
import { ScrapedContent } from "../scraper/webScraper.js";

/**
 * 定义了支持的导出格式类型。
 * - markdown: 富文本格式，适合阅读和再编辑。
 * - text: 纯文本，用于快速提取内容。
 * - html: 清理后的HTML，保留基本结构。
 * - json: 结构化数据，用于程序化处理。
 */
export type ExportFormat = "markdown" | "text" | "html" | "json";

/**
 * 导出管理器 (ExportManager)
 * 负责将爬取到的结构化内容（ScrapedContent）转换为用户指定的最终格式。
 * 这是一个典型的适配器模式应用，将内部数据结构适配到多种外部表示形式。
 */
export class ExportManager {
  private turndownService: TurndownService;

  /**
   * 构造函数，初始化一个 Turndown 服务实例。
   * Turndown 是一个强大的 HTML 到 Markdown 转换库。
   */
  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: "atx", // 使用 '#' 作为标题样式
      codeBlockStyle: "fenced", // 使用 ``` 作为代码块样式
    });

    // 设置自定义的转换规则，以优化输出的 Markdown 质量。
    this.setupTurndownRules();
  }

  /**
   * 主导出方法，根据指定的格式调用相应的处理函数。
   * @param content 爬取到的原始内容对象。
   * @param format 用户请求的导出格式。
   * @returns 返回一个包含最终格式化内容的字符串的 Promise。
   */
  async export(content: ScrapedContent, format: ExportFormat): Promise<string> {
    switch (format) {
      case "markdown":
        return this.exportToMarkdown(content);

      case "text":
        return this.exportToText(content);

      case "html":
        return this.exportToHtml(content);

      case "json":
        return this.exportToJson(content);

      default:
        // 如果格式不受支持，则抛出错误。
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  /**
   * 将内容导出为 Markdown 格式。
   * @param content 爬取到的内容对象。
   * @returns 格式化后的 Markdown 字符串。
   */
  private exportToMarkdown(content: ScrapedContent): string {
    const {
      title,
      url,
      content: textContent,
      links,
      images,
      metadata,
      timestamp,
    } = content;

    let markdown = "";

    // 1. 添加元数据头部：标题、来源URL和爬取时间。
    markdown += `# ${title}\n\n`;
    markdown += `**来源:** ${url}\n`;
    markdown += `**爬取时间:** ${new Date(timestamp).toLocaleString(
      "zh-CN"
    )}\n\n`;

    // 2. 添加正文内容。
    markdown += `## 内容\n\n`;
    try {
      // 优先尝试将清理后的 HTML 转换为 Markdown，以获得更丰富的格式。
      const htmlContent = this.extractMainContent(content.html);
      const markdownContent = this.turndownService.turndown(htmlContent);
      markdown += markdownContent;
    } catch {
      // 如果 HTML 转换失败，则回退到使用纯文本内容。
      markdown += textContent;
    }

    // 3. 添加相关链接列表（最多显示20个）。
    if (links.length > 0) {
      markdown += `\n\n## 相关链接\n\n`;
      links.slice(0, 20).forEach((link) => {
        markdown += `- [${link}](${link})\n`;
      });
      if (links.length > 20) {
        markdown += `\n*还有 ${links.length - 20} 个链接...*\n`;
      }
    }

    // 4. 添加图片列表（最多显示10个）。
    if (images.length > 0) {
      markdown += `\n\n## 图片\n\n`;
      images.slice(0, 10).forEach((image) => {
        markdown += `![图片](${image})\n\n`;
      });
      if (images.length > 10) {
        markdown += `*还有 ${images.length - 10} 张图片...*\n`;
      }
    }

    // 5. 添加其他元数据。
    if (Object.keys(metadata).length > 0) {
      markdown += `\n\n## 元数据\n\n`;
      Object.entries(metadata).forEach(([key, value]) => {
        if (typeof value === "string" && value.length < 200) {
          markdown += `**${key}:** ${value}\n\n`;
        }
      });
    }

    return markdown;
  }

  /**
   * 将内容导出为纯文本格式。
   * @param content 爬取到的内容对象。
   * @returns 格式化后的纯文本字符串。
   */
  private exportToText(content: ScrapedContent): string {
    const { title, url, content: textContent, timestamp } = content;

    let text = "";
    text += `标题: ${title}\n`;
    text += `来源: ${url}\n`;
    text += `爬取时间: ${new Date(timestamp).toLocaleString("zh-CN")}\n`;
    text += `${"=".repeat(50)}\n\n`;
    text += textContent;

    return text;
  }

  /**
   * 将内容导出为带有基本样式的 HTML 格式。
   * @param content 爬取到的内容对象。
   * @returns 一个完整的、可独立查看的 HTML 页面字符串。
   */
  private exportToHtml(content: ScrapedContent): string {
    const { title, url, html, timestamp } = content;

    // 首先清理原始 HTML，移除不必要的脚本和样式。
    const cleanHtml = this.extractMainContent(html);

    // 构建一个包含基本样式和元信息的完整 HTML 页面。
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
            line-height: 1.6;
        }
        .header {
            border-bottom: 2px solid #eee;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .meta {
            color: #666;
            font-size: 14px;
        }
        .content {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <div class="meta">
            <p><strong>来源:</strong> <a href="${url}" target="_blank">${url}</a></p>
            <p><strong>爬取时间:</strong> ${new Date(timestamp).toLocaleString(
              "zh-CN"
            )}</p>
        </div>
    </div>
    <div class="content">
        ${cleanHtml}
    </div>
</body>
</html>`;
  }

  /**
   * 将内容导出为 JSON 格式。
   * 这是最原始、最完整的输出，保留了所有提取到的信息。
   * @param content 爬取到的内容对象。
   * @returns 格式化后的 JSON 字符串。
   */
  private exportToJson(content: ScrapedContent): string {
    return JSON.stringify(content, null, 2);
  }

  /**
   * 从原始 HTML 中提取主要内容区域的 HTML。
   * 通过移除脚本、样式和常见的非核心内容标签（如导航、页眉、页脚）来实现。
   * @param html 原始的 HTML 字符串。
   * @returns 清理后的 HTML 字符串。
   */
  private extractMainContent(html: string): string {
    // 使用正则表达式链式调用，移除各类不需要的标签及其内容。
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<nav\b[^>]*>.*?<\/nav>/gi, "")
      .replace(/<header\b[^>]*>.*?<\/header>/gi, "")
      .replace(/<footer\b[^>]*>.*?<\/footer>/gi, "")
      .replace(/<aside\b[^>]*>.*?<\/aside>/gi, "");
  }

  /**
   * 配置 Turndown 服务的自定义转换规则。
   * 这可以让我们更好地控制最终生成的 Markdown 的细节。
   */
  private setupTurndownRules() {
    // 规则1：优化图片转换。
    // 默认情况下，Turndown 可能会丢失 alt 文本。我们确保它被保留。
    this.turndownService.addRule("images", {
      filter: "img",
      replacement: (content: string, node: any) => {
        const alt = node.getAttribute("alt") || "";
        const src = node.getAttribute("src") || "";
        return `![${alt}](${src})`;
      },
    });

    // 规则2：优化代码块转换。
    // 将 <pre> 标签转换为标准的 Markdown 围栏代码块。
    this.turndownService.addRule("codeBlocks", {
      filter: ["pre"],
      replacement: (content: string) => {
        // 移除内部 <code> 标签可能带来的多余缩进
        const codeContent = content.replace(/<code.*?>|<\/code>/g, "");
        return `\n\`\`\`\n${codeContent.trim()}\n\`\`\`\n`;
      },
    });
  }
}
