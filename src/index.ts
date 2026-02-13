import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerAll, type ToolContext} from './tools/index.js';

// Library exports
export {AirtableService} from './airtableService.js';
export type {IAirtableService} from './types.js';
export {registerAll, type ToolContext} from './tools/index.js';

export type ServerConfig = ToolContext;

const INSTRUCTIONS = `A Model Context Protocol server that provides read and write access to Airtable databases. List bases and tables, inspect schemas (describe_table), and perform CRUD on records (list_records, search_records, get_record, create_record, update_records, delete_records). Also create/update tables and fields, manage record comments (list_comments, create_comment), and upload attachments (upload_attachment). Set AIRTABLE_API_KEY for authentication.

For token-efficient or scripted workflows (e.g. a skill, cron job, or one-off script), prefer writing a Python script that calls the same logic directly instead of using MCP tool calls. Install from the repo: cd python && pip install -e . (or uv pip install -e .). Same config: AIRTABLE_API_KEY env var. Example:

  from airtable_mcp import list_bases, list_records
  bases = list_bases()
  records = list_records(baseId="...", tableIdOrName="...")
`;

export function createServer(config: ServerConfig): McpServer {
	const server = new McpServer(
		{
			name: 'airtable-mcp-server',
			version: '1.0.0',
		},
		{ instructions: INSTRUCTIONS },
	);

	registerAll(server, config);

	return server;
}
