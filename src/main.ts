#!/usr/bin/env node

import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {initServer, setupSignalHandlers, handleStartupError} from './transports/shared.js';

const main = async () => {
	const transport = process.env.MCP_TRANSPORT || 'stdio';

	if (transport === 'stdio') {
		const server = initServer();
		const stdioTransport = new StdioServerTransport();

		setupSignalHandlers(async () => {
			await server.close();
		});

		await server.connect(stdioTransport);
	} else if (transport === 'http') {
		// Dynamic import to avoid loading express when not needed
		const {default: express} = await import('express');
		const {StreamableHTTPServerTransport} = await import('@modelcontextprotocol/sdk/server/streamableHttp.js');
		const {randomUUID} = await import('node:crypto');

		const app = express();
		app.use(express.json());

		type HttpTransport = InstanceType<typeof StreamableHTTPServerTransport>;
		const transports = new Map<string, HttpTransport>();

		app.post('/mcp', async (req, res) => {
			const sessionId = req.headers['mcp-session-id'] as string | undefined;
			let httpTransport: HttpTransport;

			if (sessionId && transports.has(sessionId)) {
				httpTransport = transports.get(sessionId)!;
			} else if (!sessionId && !req.body.method?.startsWith('notifications/')) {
				const newSessionId = randomUUID();
				httpTransport = new StreamableHTTPServerTransport({
					sessionIdGenerator: () => newSessionId,
					onsessioninitialized(id) {
						transports.set(id, httpTransport);
					},
				});

				const server = initServer();
				await server.connect(httpTransport);

				httpTransport.onclose = () => {
					transports.delete(newSessionId);
				};
			} else {
				res.status(400).json({error: 'Bad Request: No valid session'});
				return;
			}

			await httpTransport.handleRequest(req, res, req.body);
		});

		app.get('/mcp', async (req, res) => {
			const sessionId = req.headers['mcp-session-id'] as string | undefined;
			if (!sessionId || !transports.has(sessionId)) {
				res.status(400).json({error: 'Bad Request: No valid session for SSE'});
				return;
			}

			const httpTransport = transports.get(sessionId)!;
			await httpTransport.handleRequest(req, res);
		});

		app.delete('/mcp', async (req, res) => {
			const sessionId = req.headers['mcp-session-id'] as string | undefined;
			if (!sessionId || !transports.has(sessionId)) {
				res.status(400).json({error: 'Bad Request: No valid session'});
				return;
			}

			const httpTransport = transports.get(sessionId)!;
			await httpTransport.handleRequest(req, res);
			transports.delete(sessionId);
		});

		const port = parseInt(process.env.PORT || '3000', 10);
		app.listen(port, () => {
			console.log(`Airtable MCP HTTP server listening on port ${port}`);
			console.log('⚠️  WARNING: The HTTP transport has no authentication.');
			console.log('   Other processes on your machine—including websites in your browser—');
			console.log('   could potentially access this endpoint and control your Airtable.');
			console.log('   Only use HTTP transport behind a reverse proxy or in another secured setup.');
		});
	} else {
		throw new Error(`Unknown transport: ${transport}. Use MCP_TRANSPORT=stdio or MCP_TRANSPORT=http`);
	}
};

main().catch(handleStartupError);
