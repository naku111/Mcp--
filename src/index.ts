import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
// 导入项目内部的核心功能模块
import { WebScraper } from "./scraper/webScraper.js";
import { ExportManager } from "./export/exportManager.js";
import { RuleEngine } from "./rules/ruleEngine.js";
import { HeaderManager } from "./headers/headerManager.js";

/**
 * @class WebScraperMCPServer
 * @description 这是整个Web爬虫工具的入口点。
 * 它遵循模型上下文协议（MCP），将复杂的爬虫功能封装成一系列可供AI调用的标准化工具。
 * 主要职责包括：
 * 1. 初始化并启动一个MCP服务器。
 * 2. 实例化并管理项目的所有核心模块（爬虫、导出、规则、请求头）。
 * 3. 定义AI可以使用的工具集（如`scrape_url`, `batch_scrape`等），并提供清晰的描述和输入规范。
 * 4. 接收并解析AI的工具调用请求，将其路由到相应的内部处理逻辑。
 * 5. 协调各个模块，完成从爬取、解析、格式化到返回结果的完整工作流。
 */
export class WebScraperMCPServer {
  private server: Server; // MCP服务器实例
  public scraper: WebScraper; // 网页爬取器实例
  private exportManager: ExportManager; // 内容导出管理器实例
  private ruleEngine: RuleEngine; // 内容提取规则引擎实例
  private headerManager: HeaderManager; // 自定义请求头管理器实例

  /**
   * @constructor
   * @description 初始化服务器和所有依赖的模块。
   */
  constructor() {
    // 1. 初始化MCP服务器
    this.server = new Server({
      name: "web-scraper-mcp",
      version: "1.0.0",
    });

    // 2. 实例化项目的所有核心模块
    this.scraper = new WebScraper();
    this.exportManager = new ExportManager();
    this.ruleEngine = new RuleEngine();
    this.headerManager = new HeaderManager();

    // 3. 设置工具的请求处理器
    this.setupToolHandlers();
  }

  /**
   * @private
   * @method setupToolHandlers
   * @description 定义服务器上所有可用的工具，并为它们注册处理器。
   */
  private setupToolHandlers() {
    // 注册 "ListTools" 请求的处理器。当AI想知道这个服务器能做什么时，会调用它。
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // --- 工具1: scrape_url ---
          {
            name: "scrape_url",
            description:
              "爬取单个指定URL的内容，能智能处理静态HTML和需要JavaScript渲染的动态页面（SPA）。",
            inputSchema: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                  description: "【必需】要爬取的网页URL。",
                },
                format: {
                  type: "string",
                  enum: ["markdown", "text", "html", "json"],
                  default: "markdown",
                  description: "期望返回内容的格式。",
                },
                usePuppeteer: {
                  type: "boolean",
                  default: false,
                  description:
                    "是否强制使用Puppeteer无头浏览器。对于SPA页面或需要复杂交互的网站，应设为true。",
                },
                ruleSet: {
                  type: "string",
                  description:
                    "要应用的规则集名称，用于从页面中精准提取特定内容（如文章标题、正文等）。",
                },
                customHeaders: {
                  type: "object",
                  description:
                    "本次请求使用的一次性自定义请求头，可用于覆盖或补充全局设置。",
                },
              },
              required: ["url"],
            },
          },
          // --- 工具2: create_rule_set ---
          {
            name: "create_rule_set",
            description: "创建一套自定义的内容提取规则集，用于后续的精准爬取。",
            inputSchema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description:
                    '【必需】规则集的唯一名称，例如 "my_blog_rules"。',
                },
                rules: {
                  type: "object",
                  description: "【必需】具体的提取规则定义，使用CSS选择器。",
                },
              },
              required: ["name", "rules"],
            },
          },
          // --- 工具3: set_domain_headers ---
          {
            name: "set_domain_headers",
            description:
              "为特定域名设置全局的自定义请求头（例如Cookie, Authorization），用于模拟登录状态或传递API密钥。",
            inputSchema: {
              type: "object",
              properties: {
                domain: {
                  type: "string",
                  description:
                    '【必需】要设置请求头的域名，例如 "github.com"。',
                },
                headers: {
                  type: "object",
                  description: "【必需】要设置的请求头键值对。",
                },
              },
              required: ["domain", "headers"],
            },
          },
          // --- 工具4: batch_scrape ---
          {
            name: "batch_scrape",
            description: "使用高效的异步并发模式，批量爬取多个URL。",
            inputSchema: {
              type: "object",
              properties: {
                urls: {
                  type: "array",
                  items: { type: "string" },
                  description: "【必需】要爬取的URL列表。",
                },
                format: {
                  type: "string",
                  enum: ["markdown", "text", "html", "json"],
                  default: "markdown",
                },
                usePuppeteer: { type: "boolean", default: false },
                ruleSet: { type: "string" },
              },
              required: ["urls"],
            },
          },
        ] as Tool[],
      };
    });

    // 注册 "CallTool" 请求的处理器。当AI决定调用上述某个工具时，请求会进入这里。
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      // 将请求转发给统一的内部处理器。
      return this.handleRequest(request.params);
    });
  }

  /**
   * @public
   * @method handleRequest
   * @description 统一的请求处理入口，根据工具名称路由到相应的内部处理函数。
   * 这个方法也用于直接在代码中（如测试脚本）模拟AI调用。
   * @param request - 包含工具名称和参数的请求对象。
   */
  public async handleRequest(request: { name: string; arguments?: any }) {
    // 使用解构和默认值确保 `args` 始终是一个对象，避免后续代码出错。
    const { name, arguments: args = {} } = request;
    try {
      // 使用 switch 语句将请求分发到对应的处理方法。
      switch (name) {
        case "scrape_url":
          return await this.handleScrapeUrl(args);
        case "create_rule_set":
          return await this.handleCreateRuleSet(args);
        case "set_domain_headers":
          return await this.handleSetDomainHeaders(args);
        case "batch_scrape":
          return await this.handleBatchScrape(args);
        default:
          throw new Error(`未知或不支持的工具: ${name}`);
      }
    } catch (error) {
      // 捕获所有处理过程中可能发生的错误，并以标准的错误格式返回给AI。
      console.error(`处理工具 [${name}] 时发生错误:`, error);
      return {
        content: [
          {
            type: "text",
            text: `错误: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }

  /**
   * @private
   * @method handleScrapeUrl
   * @description 处理单个URL爬取请求的完整业务逻辑。
   * @param args - 工具调用时传入的参数。
   */
  private async handleScrapeUrl(args: any) {
    const {
      url,
      format = "markdown",
      usePuppeteer = false,
      ruleSet,
      customHeaders,
    } = args;

    // 1. 准备请求头
    const isDataUrl = url.startsWith("data:"); // data: URI没有域名，需要特殊处理。
    let requestHeaders = {};
    if (!isDataUrl) {
      const hostname = new URL(url).hostname;
      // 如果提供了本次调用的一次性请求头，则优先设置它。
      if (customHeaders) this.headerManager.setHeaders(hostname, customHeaders);
      // 获取为该域名存储的所有请求头（包括刚设置的一次性请求头）。
      requestHeaders = this.headerManager.getHeaders(hostname);
    }

    // 2. 执行爬取
    const content = await this.scraper.scrape(url, {
      usePuppeteer,
      headers: requestHeaders,
    });

    // 3. 应用规则进行内容提取
    let processedContent = content;
    if (ruleSet) {
      processedContent = await this.ruleEngine.applyRules(ruleSet, content);
    }

    // 4. 格式化并返回结果
    const exportedContent = await this.exportManager.export(
      processedContent,
      format
    );
    return { content: [{ type: "text", text: exportedContent }] };
  }

  /**
   * @private
   * @method handleCreateRuleSet
   * @description 处理创建内容提取规则集的请求。
   * @param args - 工具参数。
   */
  private async handleCreateRuleSet(args: any) {
    const { name, rules } = args;
    this.ruleEngine.createRuleSet(name, rules);
    return {
      content: [
        { type: "text", text: `规则集 "${name}" 已成功创建并可供使用。` },
      ],
    };
  }

  /**
   * @private
   * @method handleSetDomainHeaders
   * @description 处理为域名设置全局请求头的请求。
   * @param args - 工具参数。
   */
  private async handleSetDomainHeaders(args: any) {
    const { domain, headers } = args;
    this.headerManager.setHeaders(domain, headers);
    return {
      content: [
        { type: "text", text: `域名 "${domain}" 的请求头已成功设置。` },
      ],
    };
  }

  /**
   * @private
   * @method handleBatchScrape
   * @description 处理批量爬取请求，使用 Promise.allSettled 实现高效、健壮的并发处理。
   * @param args - 工具参数。
   */
  private async handleBatchScrape(args: any) {
    const { urls, format = "markdown", usePuppeteer = false, ruleSet } = args;
    console.log(`🚀 开始异步批量爬取 ${urls.length} 个 URL...`);

    // 1. 将每个URL的爬取操作映射为一个返回Promise的异步函数。
    const scrapePromises = urls.map(async (url: string) => {
      try {
        // 批量任务内部复用单次爬取的逻辑
        const isDataUrl = url.startsWith("data:");
        const headers = isDataUrl
          ? {}
          : this.headerManager.getHeaders(new URL(url).hostname);
        const content = await this.scraper.scrape(url, {
          usePuppeteer,
          headers,
        });
        let processedContent = content;
        if (ruleSet)
          processedContent = await this.ruleEngine.applyRules(ruleSet, content);
        const exportedContent = await this.exportManager.export(
          processedContent,
          format
        );
        return { url, success: true, content: exportedContent };
      } catch (error) {
        // 关键：在单个任务内部捕获错误，确保一个任务的失败不会中断整个批量任务。
        return {
          url,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // 2. 使用 Promise.allSettled 并发执行所有爬取任务。
    // 它会等待所有Promise都完成（无论是成功 fulfilled 还是失败 rejected），这对于需要完整报告的批量任务至关重要。
    const settledResults = await Promise.allSettled(scrapePromises);

    // 3. 统一处理并格式化所有任务的结果。
    const results = settledResults.map((result) => {
      if (result.status === "fulfilled") {
        return result.value; // 如果任务成功，直接返回值。
      }
      // 如果任务失败，记录失败原因。
      return {
        success: false,
        error: `一个未知的爬取任务失败: ${result.reason}`,
      };
    });

    console.log("✅ 所有批量爬取任务已完成。");
    // 将包含所有URL结果的数组作为JSON字符串返回。
    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
  }

  /**
   * @public
   * @method run
   * @description 启动MCP服务器，开始监听来自AI的请求。
   */
  async run() {
    // 使用标准输入/输出作为通信通道。
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // 在标准错误流中打印日志，避免污染标准输出流的数据通道。
    console.error("✅ 网页爬取 MCP 服务器已成功启动并准备就绪。");
  }
}
