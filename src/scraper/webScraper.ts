import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer, { Browser, Page } from "puppeteer";
import fs from "fs";

/**
 * 浏览器管理器 (BrowserManager)
 * 这是一个静态类，负责在整个应用生命周期内管理唯一的浏览器实例。
 * 它的核心职责是智能地寻找一个可用的、稳定的Chrome或Chromium浏览器可执行文件。
 * 1. 优先查找用户系统上已安装的Chrome浏览器，以获得最佳性能和兼容性。
 * 2. 如果找不到，则回退到使用Puppeteer自动下载的Chromium版本。
 * 3. 缓存找到的路径，避免重复查找。
 */
class BrowserManager {
  private static executablePath: string | null = null;

  public static async ensureBrowserIsReady(): Promise<string> {
    // 如果已经找到路径，直接返回缓存的结果
    if (this.executablePath) {
      return this.executablePath;
    }

    // 定义常见的系统Chrome安装路径
    const defaultChromePaths =
      process.platform === "win32"
        ? [
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
            process.env.LOCALAPPDATA +
              "\\Google\\Chrome\\Application\\chrome.exe",
          ]
        : ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"];

    // 遍历检查系统路径是否存在
    for (const path of defaultChromePaths) {
      if (fs.existsSync(path)) {
        this.executablePath = path;
        return path;
      }
    }

    // 如果系统路径都找不到，则启动Puppeteer来获取其内置浏览器路径
    let tempBrowser: Browser | null = null;
    try {
      tempBrowser = await puppeteer.launch({ headless: "new" });
      // 从启动的临时浏览器实例中获取可执行文件路径
      const execPath = (tempBrowser as any)._process?.spawnfile;
      if (execPath && fs.existsSync(execPath)) {
        this.executablePath = execPath;
        return execPath;
      }
      throw new Error("Puppeteer启动后未能提供有效的浏览器路径。");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`[浏览器管理器] 浏览器初始化失败: ${errorMessage}`);
    } finally {
      if (tempBrowser) await tempBrowser.close();
    }
  }
}

/**
 * 爬取选项接口
 */
export interface ScrapeOptions {
  usePuppeteer?: boolean; // 是否强制使用Puppeteer
  headers?: Record<string, string>; // 自定义请求头
  timeout?: number; // 超时时间（毫秒）
  waitForSelector?: string; // Puppeteer等待的特定DOM选择器
  screenshot?: boolean; // 是否在爬取后截图
}

/**
 * 爬取结果内容接口
 */
export interface ScrapedContent {
  url: string;
  title: string;
  content: string; // 清理后的主要文本内容
  html: string; // 原始或渲染后的HTML
  links: string[];
  images: string[];
  metadata: Record<string, any>; // 页面的元数据
  timestamp: string;
}

/**
 * WebScraper 类
 * 封装了所有与网页爬取相关的核心逻辑。
 */
export class WebScraper {
  private browser: Browser | null = null; // 共享的浏览器实例

  constructor() {}

  /**
   * 智能爬取入口方法。
   * @param url 要爬取的URL
   * @param options 爬取选项
   */
  async scrape(
    url: string,
    options: ScrapeOptions = {}
  ): Promise<ScrapedContent> {
    const { usePuppeteer = false } = options;

    // 策略1：如果URL是data URI（统一资源标识符），不是一个有效的http URL
    // 需要使用Puppeteer处理
    if (url.startsWith("data:")) {
      return this.scrapeWithPuppeteer(url, options);
    }

    // 策略2：如果用户强制指定，直接使用Puppeteer
    if (usePuppeteer) {
      return this.scrapeWithPuppeteer(url, options);
    }

    // 策略3（默认）：先尝试快速的静态爬取
    try {
      const staticContent = await this.scrapeWithAxios(url, options);

      // 对静态内容进行启发式分析，判断是否为需要JS渲染的SPA页面
      const jsRequiredKeywords = [
        "您需要允许该网站执行 JavaScript",
        "enable JavaScript",
        "requires JavaScript",
        "not support a browser that has JavaScript disabled",
        "Please enable JavaScript",
      ];
      const contentIsJSReliant = jsRequiredKeywords.some((keyword) =>
        staticContent.html.toLowerCase().includes(keyword.toLowerCase())
      );

      // 如果内容明显依赖JS，则自动切换到Puppeteer
      if (contentIsJSReliant) {
        return this.scrapeWithPuppeteer(url, options);
      }
      return staticContent;
    } catch (error) {
      // 如果静态爬取失败（如网络错误、超时），则自动降级到更强大的Puppeteer模式重试
      console.error(
        `静态爬取失败: ${
          error instanceof Error ? error.message : "未知错误"
        }。自动尝试使用 Puppeteer...`
      );
      return this.scrapeWithPuppeteer(url, options);
    }
  }

  /**
   * 使用 Axios 进行快速、轻量级的静态HTML爬取。
   */
  private async scrapeWithAxios(
    url: string,
    options: ScrapeOptions
  ): Promise<ScrapedContent> {
    const { headers = {}, timeout = 15000 } = options; // 默认15秒超时
    try {
      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          ...headers,
        },
        timeout,
      });

      // 处理返回数据，确保是字符串格式
      const htmlContent =
        typeof response.data === "object"
          ? JSON.stringify(response.data)
          : String(response.data);
      const $ = cheerio.load(htmlContent);
      //将这个 HTML 字符串解析成一个内存中的 DOM 结构。
      return this.extractContent($, url, htmlContent);
    } catch (error) {
      throw new Error(
        `Axios爬取失败: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * 使用 Puppeteer 进行重量级但功能强大的动态页面爬取。
   * 能够完整渲染JavaScript，处理SPA应用和复杂的交互。
   */
  private async scrapeWithPuppeteer(
    url: string,
    options: ScrapeOptions
  ): Promise<ScrapedContent> {
    const {
      headers = {},
      timeout = 60000,
      waitForSelector,
      screenshot = false,
    } = options;
    let page: Page | null = null;

    console.log(
      "\n✅✅✅ [深度模式] Puppeteer已被激活！正在启动无头浏览器... ✅✅✅\n"
    );

    try {
      // 如果共享的浏览器实例不存在，则创建一个
      if (!this.browser) {
        const executablePath = await BrowserManager.ensureBrowserIsReady();
        this.browser = await puppeteer.launch({
          executablePath,
          headless: "new",
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
          ],
        });
      }

      page = await this.browser!.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      if (Object.keys(headers).length > 0)
        await page.setExtraHTTPHeaders(headers);
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
      );

      await page.goto(url, { waitUntil: "domcontentloaded", timeout });

      // 智能等待策略
      if (waitForSelector) {
        console.log(`[Puppeteer] 等待用户指定的选择器: ${waitForSelector}`);
        await page.waitForSelector(waitForSelector, { timeout: 15000 });
        //puppeteer会等待这个元素加载完成
      } else {
        //通用等待三秒
        console.log("[Puppeteer] 执行通用等待策略（3秒），等待异步JS加载...");
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      // 获取经JS渲染后的最终HTML
      const html = await page.content();
      if (screenshot)
        await page.screenshot({ path: `screenshot-${Date.now()}.png` });

      const $ = cheerio.load(html);
      return this.extractContent($, url, html);
    } catch (error) {
      throw new Error(
        `Puppeteer爬取失败: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      // 关闭页面，但保持浏览器实例打开以供下次使用
      if (page) await page.close();
    }
  }

  /**
   * 使用 Cheerio 从HTML中提取结构化内容。
   * 这是一个通用的内容解析器。
   */
  private extractContent(
    $: cheerio.CheerioAPI,
    url: string,
    html: string
  ): ScrapedContent {
    const title =
      $("title").text().trim() || $("h1").first().text().trim() || "无标题";
    let content = "";

    // 优先级列表，用于寻找最可能包含主要内容的容器
    const contentSelectors = [
      "main",
      "article",
      ".content",
      ".post-content",
      ".entry-content",
      "#content",
      ".main-content",
      "body",
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        // 移除脚本、样式、导航等无关元素
        element
          .find("script, style, nav, header, footer, aside, .actions, .buttons")
          .remove();
        content = element.text().trim();
        // 只返回用户在浏览器看到的文本
        if (content.length > 100) break;
      }
    }
    // 如果遍历完所有选择器还没找到内容，则使用body作为最后防线
    if (!content) {
      $("script, style, nav, header, footer, aside").remove();
      content = $("body").text().trim();
    }

    // 提取所有链接并转换为绝对路径
    const links: string[] = [];
    //遍历所有元素
    $("a[href]").each((_, element) => {
      const href = $(element).attr("href");
      if (href) {
        try {
          links.push(new URL(href, url).href);
        } catch {}
      }
    });

    // 提取所有图片链接并转换为绝对路径
    const images: string[] = [];
    $("img[src]").each((_, element) => {
      const src = $(element).attr("src");
      if (src) {
        try {
          images.push(new URL(src, url).href);
          //URL 构造函数被设计为在接收到无法解析为有效 URL 的输入时，会抛出一个 TypeError 异常。
        } catch {}
      }
    });

    // 提取页面的元数据
    const metadata: Record<string, any> = {};
    //Record 是 TypeScript 中的一个工具类型 (Utility Type)，它用于构建一个对象类型，其所有属性的键和值都遵循特定的类型约束。
    $("meta").each((_, element) => {
      const name = $(element).attr("name") || $(element).attr("property");
      const metaContent = $(element).attr("content");
      if (name && metaContent) metadata[name] = metaContent;
    });

    return {
      url,
      title,
      content: this.cleanText(content),
      html,
      links: [...new Set(links)], // 去重
      images: [...new Set(images)], // 去重
      metadata,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 移除多余空格或者换行符。
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n\n")
      .trim();
  }

  /**
   * 关闭浏览器实例，释放资源。
   * 应在应用退出时调用。
   */
  async close() {
    if (this.browser) {
      console.log("正在关闭 Puppeteer 浏览器实例...");
      await this.browser.close();
      this.browser = null;
      console.log("浏览器实例已成功关闭。");
    }
  }
}
