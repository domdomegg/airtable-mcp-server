import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';

export function jsonResult<T extends Record<string, unknown>>(data: T): CallToolResult & {structuredContent: T} {
	return {
		content: [{type: 'text', text: JSON.stringify(data, null, 2)}],
		structuredContent: data,
	};
}
