// 导入我们编译后的服务器主类
import { WebScraperMCPServer } from './build/index.js';

// 主测试函数
async function runTests() {
  console.log('🚀 启动四大核心工具的全面自动化测试...');

  // 1. 实例化服务器
  const server = new WebScraperMCPServer();
  console.log('✅ 服务器实例已创建。');

  // 辅助函数，用于模拟调用工具并打印结果
  const callTool = async (name, args) => {
    console.log(`\n--- 正在测试工具: [${name}] ---`);
    console.log('  参数:', JSON.stringify(args, null, 2));
    const result = await server.handleRequest({ name, arguments: args });
    console.log('  结果:', JSON.stringify(result, null, 2));
    return result;
  };

  try {
    // 2. 测试 `set_domain_headers` (通行证管理器)
    await callTool('set_domain_headers', {
      domain: 'httpbin.org',
      headers: {
        'X-Test-Header': 'CodeBuddy-Was-Here',
        'User-Agent': 'CodeBuddy-Test-Agent/1.0'
      }
    });

    // 3. 测试 `create_rule_set` (模板制作台)
    await callTool('create_rule_set', {
      name: 'test_rule',
      rules: {
        title: 'h1',
        content: 'p.main-content',
        custom: {
          author: '.author'
        }
      }
    });

    // 4. 测试 `scrape_url` (总指挥官)
    console.log('\n--- 场景 4.1: 爬取带自定义请求头的网站 ---');
    const headerTestResult = await callTool('scrape_url', {
      url: 'https://httpbin.org/headers',
      format: 'json'
    });
    const headerJson = JSON.parse(JSON.parse(headerTestResult.content[0].text).content);
    if (headerJson.headers['X-Test-Header'] === 'CodeBuddy-Was-Here') {
        console.log('  ✅ 验证成功: 自定义请求头已正确发送！');
    } else {
        console.error('  ❌ 验证失败: 未在响应中找到自定义请求头。');
    }

    console.log('\n--- 场景 4.2: 使用规则集进行精准提取 ---');
    const testHtml = `<html><head><title>Old</title></head><body><h1>Real Title</h1><p class="main-content">Main Body.</p><span class="author">John</span></body></html>`;
    const dataUrl = `data:text/html,${encodeURIComponent(testHtml)}`;
    const ruleTestResult = await callTool('scrape_url', {
      url: dataUrl,
      format: 'json',
      ruleSet: 'test_rule'
    });
    const ruleJson = JSON.parse(ruleTestResult.content[0].text);
    if (ruleJson.title === 'Real Title' && ruleJson.metadata.customData.author === 'John') {
        console.log('  ✅ 验证成功: 规则集已正确应用！');
    } else {
        console.error('  ❌ 验证失败: 规则集应用结果不符合预期。');
    }
    
    console.log('\n--- 场景 4.3: 智能切换Puppeteer爬取动态页面 ---');
    await callTool('scrape_url', {
        url: 'https://www.toutiao.com/?wid=1753620879637',
        format: 'text'
    });
    console.log('  请检查上方日志，应包含 "Puppeteer 模块已被激活" 的提示。');


    // 5. 测试 `batch_scrape` (异步并发处理器)
    console.log('\n--- 场景 5.1: 批量处理多个URL（包含成功、失败和延迟） ---');
    await callTool('batch_scrape', {
      urls: [
        'https://httpbin.org/html',
        'https://httpbin.org/status/404',
        'https://httpbin.org/delay/1'
      ],
      format: 'text'
    });
    console.log('  请检查上方结果，应包含3个URL的处理状态。');

  } catch (e) {
    console.error('\n🔥🔥🔥 测试过程中发生意外错误:', e);
  } finally {
    // 6. 清理资源
    await server.scraper.close();
    console.log('\n✅ 所有测试已执行完毕。Puppeteer浏览器实例已关闭。');
  }
}

runTests();