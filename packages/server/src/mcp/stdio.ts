import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server.js';

const server = createMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[cloudasset-mcp] stdio transport ready');
