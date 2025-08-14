/**
 * @class HeaderManager
 * @description 负责管理和维护针对不同域名的自定义HTTP请求头。
 * 这个类允许用户为特定网站预设请求头（如User-Agent, Cookie, Authorization），
 * 在爬取时自动应用，对于模拟登录状态、绕过反爬虫策略至关重要。
 */
export class HeaderManager {
  /**
   * @private
   * @property {Map<string, Record<string, string>>} domainHeaders
   * @description 使用Map结构存储域名与请求头的映射关系。
   * - Key: 经过标准化的域名字符串 (e.g., "example.com")
   * - Value: 一个对象，代表该域名的所有自定义请求头 (e.g., { 'User-Agent': 'MyCrawler' })
   * 使用Map而非普通对象，是因为Map在频繁增删键值对的场景下性能更优。
   */
  private domainHeaders: Map<string, Record<string, string>> = new Map();

  /**
   * @constructor
   * @description 初始化HeaderManager实例，并加载预设的默认请求头。
   */
  constructor() {
    // 初始化时，为一些常见网站预设好请求头，方便开箱即用。
    this.initializeDefaultHeaders();
  }

  /**
   * @method setHeaders
   * @description 为指定的域名设置或更新自定义请求头。
   * 如果该域名已存在配置，则会将新的请求头与旧的合并，新值会覆盖旧值。
   * @param {string} domain - 目标域名，可以是完整的URL或纯域名 (e.g., "https://github.com/features" or "github.com")。
   * @param {Record<string, string>} headers - 一个包含请求头键值对的对象。
   */
  setHeaders(domain: string, headers: Record<string, string>): void {
    // 始终使用标准化的域名作为键，确保一致性。
    const normalizedDomain = this.normalizeDomain(domain);
    
    // 获取该域名已有的请求头，如果不存在则返回空对象。
    const existingHeaders = this.domainHeaders.get(normalizedDomain) || {};
    // 使用对象展开语法合并新旧请求头，实现更新或添加。
    const mergedHeaders = { ...existingHeaders, ...headers };
    
    this.domainHeaders.set(normalizedDomain, mergedHeaders);
  }

  /**
   * @method getHeaders
   * @description 获取指定域名的所有自定义请求头。
   * @param {string} domain - 目标域名。
   * @returns {Record<string, string>} - 返回一个包含该域名请求头的对象，如果未配置则返回空对象。
   */
  getHeaders(domain: string): Record<string, string> {
    const normalizedDomain = this.normalizeDomain(domain);
    // 如果Map中找不到对应域名，返回一个空对象，避免调用方出错。
    return this.domainHeaders.get(normalizedDomain) || {};
  }

  /**
   * @method removeHeaders
   * @description 删除指定域名的所有请求头配置。
   * @param {string} domain - 目标域名。
   * @returns {boolean} - 如果成功删除则返回 true，否则返回 false。
   */
  removeHeaders(domain: string): boolean {
    const normalizedDomain = this.normalizeDomain(domain);
    return this.domainHeaders.delete(normalizedDomain);
  }

  /**
   * @method removeHeaderField
   * @description 从指定域名的配置中，移除单个请求头字段。
   * @param {string} domain - 目标域名。
   * @param {string} fieldName - 要移除的请求头字段名 (e.g., "User-Agent")。
   * @returns {boolean} - 如果成功找到并移除了字段，则返回 true，否则返回 false。
   */
  removeHeaderField(domain: string, fieldName: string): boolean {
    const normalizedDomain = this.normalizeDomain(domain);
    const headers = this.domainHeaders.get(normalizedDomain);
    
    if (headers && fieldName in headers) {
      delete headers[fieldName];
      return true;
    }
    
    return false;
  }

  /**
   * @method listDomains
   * @description 列出所有当前已配置自定义请求头的域名。
   * @returns {string[]} - 返回一个包含所有已配置域名的字符串数组。
   */
  listDomains(): string[] {
    return Array.from(this.domainHeaders.keys());
  }

  /**
   * @method getAllHeaders
   * @description 获取所有域名的完整请求头配置。
   * @returns {Record<string, Record<string, string>>} - 返回一个对象，键是域名，值是对应的请求头对象。
   */
  getAllHeaders(): Record<string, Record<string, string>> {
    const result: Record<string, Record<string, string>> = {};
    
    this.domainHeaders.forEach((headers, domain) => {
      // 返回一个深拷贝，防止外部修改影响内部状态
      result[domain] = { ...headers };
    });
    
    return result;
  }

  /**
   * @private
   * @method normalizeDomain
   * @description 将输入的URL或域名字符串标准化处理，提取其核心域名部分。
   * 例如: "https://www.example.com:8080/path/to/page" -> "www.example.com"
   * @param {string} domain - 原始域名或URL字符串。
   * @returns {string} - 标准化后的域名，全小写。
   */
  private normalizeDomain(domain: string): string {
    // 1. 移除协议头 (http://, https://)
    let normalized = domain.replace(/^https?:\/\//, '');
    
    // 2. 移除协议后的路径部分
    normalized = normalized.split('/')[0];
    
    // 3. 移除端口号
    normalized = normalized.split(':')[0];
    
    // 4. 统一转换为小写，便于匹配
    return normalized.toLowerCase();
  }

  /**
   * @private
   * @method initializeDefaultHeaders
   * @description 初始化一些常用网站的默认请求头，提供开箱即用的便利性。
   */
  private initializeDefaultHeaders(): void {
    // 为常见的内容平台设置一些基本的、无害的请求头，可以提高爬取成功率。
    this.setHeaders('github.com', {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache'
    });

    this.setHeaders('zhihu.com', {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': 'https://www.zhihu.com/'
    });

    this.setHeaders('weibo.com', {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': 'https://weibo.com/'
    });

    this.setHeaders('douban.com', {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': 'https://www.douban.com/'
    });

    this.setHeaders('jianshu.com', {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': 'https://www.jianshu.com/'
    });

    this.setHeaders('csdn.net', {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': 'https://www.csdn.net/'
    });
  }

  /**
   * @method addAntiDetectionHeaders
   * @description 为指定域名添加一套通用的、模拟真实浏览器的请求头，用于对抗常见的反爬虫检测。
   * @param {string} domain - 目标域名。
   */
  addAntiDetectionHeaders(domain: string): void {
    const antiDetectionHeaders = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
      'Cache-Control': 'max-age=0',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };

    this.setHeaders(domain, antiDetectionHeaders);
  }

  /**
   * @method setMobileHeaders
   * @description 为指定域名设置一套模拟移动端（iPhone）的请求头。
   * @param {string} domain - 目标域名。
   */
  setMobileHeaders(domain: string): void {
    const mobileHeaders = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br'
    };

    this.setHeaders(domain, mobileHeaders);
  }

  /**
   * @method setApiHeaders
   * @description 为指定域名设置一套适用于请求API接口的请求头。
   * @param {string} domain - 目标域名。
   * @param {string} [apiKey] - (可选) 如果API需要认证，可以提供Bearer Token。
   */
  setApiHeaders(domain: string, apiKey?: string): void {
    const apiHeaders: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    };

    if (apiKey) {
      apiHeaders['Authorization'] = `Bearer ${apiKey}`;
    }

    this.setHeaders(domain, apiHeaders);
  }
}
