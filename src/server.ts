import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerAll, type ToolContext} from './tools/index.js';
import {registerResources} from './resources/index.js';

export type ServerConfig = ToolContext;

export function createServer(config: ServerConfig): McpServer {
	const server = new McpServer({
		name: 'airtable-mcp-server',
		version: '1.9.5',
	});

	registerAll(server, config);
	registerResources(server, config.airtableService);

	return server;
}
