import * as cheerio from 'cheerio';
import { ScrapedContent } from '../scraper/webScraper.js';

/**
 * 定义了单个提取规则的结构。
 * 每个字段都是一个 CSS 选择器字符串，用于定位页面上的特定元素。
 */
export interface ExtractionRule {
  title?: string; // 标题选择器
  content?: string; // 主要内容选择器
  links?: string; // 链接选择器
  images?: string; // 图片选择器
  exclude?: string[]; // 需要排除的元素选择器列表
  custom?: Record<string, string>; // 自定义字段，键是字段名，值是选择器
}

/**
 * 定义了规则集的完整结构。
 * 一个规则集包含一个唯一的名称、具体的规则和可选的描述。
 */
export interface RuleSet {
  name: string;
  rules: ExtractionRule;
  description?: string;
}

/**
 * 规则引擎 (RuleEngine)
 * 负责管理、解析和应用规则集，以从原始 HTML 中精准提取结构化数据。
 * 这是实现内容定制化提取的核心模块。
 */
export class RuleEngine {
  // 使用 Map 存储所有规则集，键为规则集名称，值为规则集对象。
  private ruleSets: Map<string, RuleSet> = new Map();

  /**
   * 构造函数，在实例化时自动加载预定义的默认规则集。
   */
  constructor() {
    this.initializeDefaultRuleSets();
  }

  /**
   * 创建一个新的规则集并添加到引擎中。
   * @param name 规则集的唯一名称。
   * @param rules 提取规则对象。
   * @param description 规则集的可选描述。
   */
  createRuleSet(name: string, rules: ExtractionRule, description?: string): void {
    const ruleSet: RuleSet = {
      name,
      rules,
      description
    };
    this.ruleSets.set(name, ruleSet);
  }

  /**
   * 根据名称获取一个已注册的规则集。
   * @param name 规则集的名称。
   * @returns 返回找到的规则集对象，如果不存在则返回 undefined。
   */
  getRuleSet(name: string): RuleSet | undefined {
    return this.ruleSets.get(name);
  }

  /**
   * 列出所有已注册的规则集的名称。
   * @returns 返回一个包含所有规则集名称的字符串数组。
   */
  listRuleSets(): string[] {
    return Array.from(this.ruleSets.keys());
  }

  /**
   * 将指定的规则集应用于已爬取的内容。
   * 这是规则引擎的核心执行方法。
   * @param ruleSetName 要应用的规则集的名称。
   * @param content 原始的爬取内容对象。
   * @returns 返回一个经过规则处理后的、新的内容对象 Promise。
   */
  async applyRules(ruleSetName: string, content: ScrapedContent): Promise<ScrapedContent> {
    const ruleSet = this.ruleSets.get(ruleSetName);
    if (!ruleSet) {
      throw new Error(`规则集 "${ruleSetName}" 不存在`);
    }

    // 使用 Cheerio 加载 HTML，创建一个类似 jQuery 的可操作 DOM 对象。
    const $ = cheerio.load(content.html);
    const { rules } = ruleSet;

    // 步骤 1: 应用排除规则，预先移除所有不需要的元素。
    if (rules.exclude && rules.exclude.length > 0) {
      rules.exclude.forEach(selector => {
        $(selector).remove();
      });
    }

    // 步骤 2: 提取标题。
    let title = content.title;
    if (rules.title) {
      const titleElement = $(rules.title).first();
      if (titleElement.length > 0) {
        title = titleElement.text().trim();
      }
    }

    // 步骤 3: 提取主要内容。
    let extractedContent = content.content;
    if (rules.content) {
      const contentElements = $(rules.content);
      if (contentElements.length > 0) {
        // 将所有匹配到的内容元素文本连接起来。
        extractedContent = contentElements.map((_, el) => $(el).text()).get().join('\n\n');
      }
    }

    // 步骤 4: 提取链接。
    let links = content.links;
    if (rules.links) {
      links = [];
      $(rules.links).each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          try {
            // 将相对 URL 转换为绝对 URL。
            const absoluteUrl = new URL(href, content.url).href;
            links.push(absoluteUrl);
          } catch {
            // 忽略无效或格式不正确的链接。
          }
        }
      });
    }

    // 步骤 5: 提取图片。
    let images = content.images;
    if (rules.images) {
      images = [];
      $(rules.images).each((_, element) => {
        const src = $(element).attr('src');
        if (src) {
          try {
            // 将相对 src 转换为绝对 URL。
            const absoluteUrl = new URL(src, content.url).href;
            images.push(absoluteUrl);
          } catch {
            // 忽略无效或格式不正确的图片链接。
          }
        }
      });
    }

    // 步骤 6: 提取自定义字段。
    const customData: Record<string, any> = {};
    if (rules.custom) {
      Object.entries(rules.custom).forEach(([key, selector]) => {
        const elements = $(selector);
        if (elements.length === 1) {
          // 如果只匹配一个元素，直接取其文本。
          customData[key] = elements.text().trim();
        } else if (elements.length > 1) {
          // 如果匹配多个元素，返回一个文本数组。
          customData[key] = elements.map((_, el) => $(el).text().trim()).get();
        }
      });
    }

    // 步骤 7: 构建并返回一个新的内容对象。
    return {
      ...content, // 保留原始信息
      title,
      content: this.cleanText(extractedContent),
      links: [...new Set(links)], // 去重
      images: [...new Set(images)], // 去重
      metadata: {
        ...content.metadata,
        customData, // 添加自定义数据
        appliedRuleSet: ruleSetName // 记录应用的规则集
      }
    };
  }

  /**
   * 初始化一系列默认的、开箱即用的规则集。
   */
  private initializeDefaultRuleSets(): void {
    // 规则集1：通用博客文章
    this.createRuleSet('blog', {
      title: 'h1, .post-title, .entry-title, .article-title',
      content: 'article, .post-content, .entry-content, .article-content, main',
      exclude: ['nav', 'header', 'footer', '.sidebar', '.comments', '.related-posts']
    }, '适用于大多数博客文章页面');

    // 规则集2：通用新闻文章
    this.createRuleSet('news', {
      title: 'h1, .headline, .news-title',
      content: '.article-body, .news-content, .story-body',
      exclude: ['nav', 'header', 'footer', '.ad', '.advertisement', '.social-share']
    }, '适用于新闻网站文章');

    // 规则集3：电商产品页面
    this.createRuleSet('product', {
      title: 'h1, .product-title, .product-name',
      content: '.product-description, .product-details',
      images: '.product-images img, .gallery img',
      custom: {
        price: '.price, .product-price',
        rating: '.rating, .stars',
        availability: '.stock, .availability'
      }
    }, '适用于电商产品页面');

    // 规则集4：技术文档页面
    this.createRuleSet('documentation', {
      title: 'h1, .doc-title',
      content: '.doc-content, .documentation, .content',
      links: '.doc-nav a, .toc a',
      exclude: ['.sidebar', '.nav', '.breadcrumb']
    }, '适用于技术文档页面');

    // 规则集5：论坛帖子页面
    this.createRuleSet('forum', {
      title: '.topic-title, .thread-title, h1',
      content: '.post-content, .message-content',
      exclude: ['.signature', '.user-info', '.post-meta']
    }, '适用于论坛帖子页面');
  }

  /**
   * 清理文本，移除多余的空白和换行符。
   * @param text 原始文本。
   * @returns 清理后的文本。
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // 将多个空白符合并为一个空格
      .replace(/\n\s*\n/g, '\n\n') // 将多个换行符合并为两个换行符
      .trim(); // 移除首尾空白
  }

  /**
   * 根据名称删除一个规则集。
   * @param name 要删除的规则集的名称。
   * @returns 如果成功删除则返回 true，否则返回 false。
   */
  deleteRuleSet(name: string): boolean {
    return this.ruleSets.delete(name);
  }

  /**
   * 获取指定规则集的详细信息。
   * @param name 规则集的名称。
   * @returns 返回规则集对象，如果不存在则返回 null。
   */
  getRuleSetDetails(name: string): RuleSet | null {
    const ruleSet = this.ruleSets.get(name);
    return ruleSet || null;
  }
}
