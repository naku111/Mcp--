#!/usr/bin/env node

/**
 * Web Scraper MCP 服务器使用示例
 */

console.log('🚀 Web Scraper MCP 服务器使用示例\n');

console.log('1. 启动服务器:');
console.log('   node build/index.js\n');

console.log('2. 基本爬取示例 (JSON-RPC 请求):');
console.log(JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'scrape_url',
    arguments: {
      url: 'https://example.com',
      format: 'markdown',
      usePuppeteer: false
    }
  }
}, null, 2));

console.log('\n3. 使用 Puppeteer 爬取 SPA 应用:');
console.log(JSON.stringify({
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/call',
  params: {
    name: 'scrape_url',
    arguments: {
      url: 'https://spa-app.com',
      format: 'markdown',
      usePuppeteer: true,
      waitForSelector: '.main-content'
    }
  }
}, null, 2));

console.log('\n4. 创建自定义规则集:');
console.log(JSON.stringify({
  jsonrpc: '2.0',
  id: 3,
  method: 'tools/call',
  params: {
    name: 'create_rule_set',
    arguments: {
      name: 'tech_blog',
      rules: {
        title: 'h1, .post-title',
        content: '.post-content, article',
        exclude: ['nav', 'footer', '.sidebar']
      }
    }
  }
}, null, 2));

console.log('\n5. 批量爬取:');
console.log(JSON.stringify({
  jsonrpc: '2.0',
  id: 4,
  method: 'tools/call',
  params: {
    name: 'batch_scrape',
    arguments: {
      urls: [
        'https://example1.com',
        'https://example2.com'
      ],
      format: 'json',
      ruleSet: 'blog'
    }
  }
}, null, 2));

console.log('\n✅ 项目构建成功！可以开始使用了。');