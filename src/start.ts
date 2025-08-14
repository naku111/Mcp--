import { WebScraperMCPServer } from './index.js';

// 这个文件是启动服务器的唯一入口点
const server = new WebScraperMCPServer();
server.run().catch(console.error);