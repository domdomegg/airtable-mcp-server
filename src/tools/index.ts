import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {ToolContext} from './types.js';
import {registerListRecords} from './list-records.js';
import {registerSearchRecords} from './search-records.js';
import {registerListBases} from './list-bases.js';
import {registerListTables} from './list-tables.js';
import {registerDescribeTable} from './describe-table.js';
import {registerGetRecord} from './get-record.js';
import {registerCreateRecord} from './create-record.js';
import {registerUpdateRecords} from './update-records.js';
import {registerDeleteRecords} from './delete-records.js';
import {registerCreateTable} from './create-table.js';
import {registerUpdateTable} from './update-table.js';
import {registerCreateField} from './create-field.js';
import {registerUpdateField} from './update-field.js';
import {registerCreateComment} from './create-comment.js';
import {registerListComments} from './list-comments.js';

export type {ToolContext} from './types.js';

export function registerAll(server: McpServer, ctx: ToolContext): void {
	registerListRecords(server, ctx);
	registerSearchRecords(server, ctx);
	registerListBases(server, ctx);
	registerListTables(server, ctx);
	registerDescribeTable(server, ctx);
	registerGetRecord(server, ctx);
	registerCreateRecord(server, ctx);
	registerUpdateRecords(server, ctx);
	registerDeleteRecords(server, ctx);
	registerCreateTable(server, ctx);
	registerUpdateTable(server, ctx);
	registerCreateField(server, ctx);
	registerUpdateField(server, ctx);
	registerCreateComment(server, ctx);
	registerListComments(server, ctx);
}
