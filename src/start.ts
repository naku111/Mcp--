import { WebScraperMCPServer } from "./index.js";

// 启动服务
const server = new WebScraperMCPServer();
server.run().catch(console.error);
