declare module 'puppeteer' {
  export interface Browser {
    newPage(): Promise<Page>;
    close(): Promise<void>;
  }

  export interface Page {
    goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<any>;
    setViewport(viewport: { width: number; height: number; }): Promise<void>;
    setExtraHTTPHeaders(headers: Record<string, string>): Promise<void>;
    setUserAgent(userAgent: string): Promise<void>;
    waitForSelector(selector: string, options?: { timeout?: number }): Promise<any>;
    content(): Promise<string>;
    screenshot(options?: { path?: string }): Promise<Buffer>;
    close(): Promise<void>;
  }

  export interface LaunchOptions {
    headless?: boolean | 'new';
    args?: string[];
    executablePath?: string;
  }

  export { Browser, Page };

  const puppeteer: {
    launch(options?: LaunchOptions): Promise<Browser>;
  };

  export default puppeteer;
}