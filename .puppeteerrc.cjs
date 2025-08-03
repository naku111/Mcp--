const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 *
 * 这是为部署到服务器或交给其他系统调用而准备的通用配置。
 * 它会确保在任何新环境中，Puppeteer 都能自动下载所需的浏览器。
 */
module.exports = {
  // 指定从国内镜像下载浏览器，解决在服务器环境中可能出现的网络问题。
  downloadBaseUrl: 'https://npm.taobao.org/mirrors',
  
  // 关键：确保 Puppeteer 会下载浏览器，而不是依赖系统预装。
  skipDownload: false,
  
  // 将浏览器缓存到项目本地的 .cache 目录中，使项目自包含，便于移植。
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};