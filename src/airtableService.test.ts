import {
	describe, test, expect, vi, beforeEach, type MockedFunction,
} from 'vitest';
import {AirtableService} from './airtableService.js';

describe('AirtableService', () => {
	const mockApiKey = 'test-api-key';
	const mockBaseUrl = 'https://api.airtable.com';
	let service: AirtableService;
	let mockFetch: MockedFunction<(...args: Parameters<typeof fetch>) => Promise<Partial<Response>>>;

	beforeEach(() => {
		// Create a mock fetch function that we'll inject
		mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			text: async () => Promise.resolve(JSON.stringify({success: true})),
		});

		// Initialize service with our mock fetch
		service = new AirtableService(mockApiKey, mockBaseUrl, mockFetch as typeof fetch);
	});

	describe('constructor', () => {
		test('initializes with default base URL', () => {
			const defaultService = new AirtableService(mockApiKey, undefined, mockFetch as typeof fetch);
			expect(defaultService).toBeInstanceOf(AirtableService);
		});

		test('initializes with custom base URL', () => {
			const customService = new AirtableService(mockApiKey, 'https://custom.url', mockFetch as typeof fetch);
			expect(customService).toBeInstanceOf(AirtableService);
		});
	});

	describe('API calls', () => {
		describe('listBases', () => {
			const mockResponse = {
				bases: [
					{id: 'base1', name: 'Base 1', permissionLevel: 'create'},
				],
			};

			test('fetches bases list successfully', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					text: async () => Promise.resolve(JSON.stringify(mockResponse)),
				});

				const result = await service.listBases();

				expect(mockFetch).toHaveBeenCalledWith(
					`${mockBaseUrl}/v0/meta/bases`,
					expect.objectContaining({
						headers: expect.objectContaining({
							Authorization: `Bearer ${mockApiKey}`,
							Accept: 'application/json',
						}),
					}),
				);
				expect(result).toEqual(mockResponse);
			});
		});

		describe('getBaseSchema', () => {
			const mockBaseId = 'base123';
			const mockResponse = {
				tables: [
					{
						id: 'tbl1',
						name: 'Table 1',
						primaryFieldId: 'fld1',
						fields: [
							{
								id: 'fld1',
								name: 'Name',
								type: 'singleLineText',
							},
						],
						views: [
							{
								id: 'viw1',
								name: 'Grid view',
								type: 'grid',
							},
						],
					},
				],
			};

			test('fetches base schema successfully', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					text: async () => Promise.resolve(JSON.stringify(mockResponse)),
				});

				const result = await service.getBaseSchema(mockBaseId);

				expect(mockFetch).toHaveBeenCalledWith(
					`${mockBaseUrl}/v0/meta/bases/${mockBaseId}/tables`,
					expect.objectContaining({
						headers: expect.objectContaining({
							Authorization: `Bearer ${mockApiKey}`,
						}),
					}),
				);
				expect(result).toEqual(mockResponse);
			});
		});

		describe('listRecords', () => {
			const mockBaseId = 'base123';
			const mockTableId = 'table123';
			const mockResponse = {
				records: [
					{id: 'rec1', fields: {name: 'Test'}},
				],
			};

			test('lists records successfully', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					text: async () => Promise.resolve(JSON.stringify(mockResponse)),
				});

				const result = await service.listRecords(mockBaseId, mockTableId);

				expect(mockFetch).toHaveBeenCalledWith(
					`${mockBaseUrl}/v0/${mockBaseId}/${mockTableId}?`,
					expect.any(Object),
				);
				expect(result).toEqual(mockResponse.records);
			});

			test('handles maxRecords option', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					text: async () => Promise.resolve(JSON.stringify(mockResponse)),
				});

				await service.listRecords(mockBaseId, mockTableId, {maxRecords: 100});

				expect(mockFetch).toHaveBeenCalledWith(
					`${mockBaseUrl}/v0/${mockBaseId}/${mockTableId}?maxRecords=100`,
					expect.any(Object),
				);
			});

			test('handles view option', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					text: async () => Promise.resolve(JSON.stringify(mockResponse)),
				});

				await service.listRecords(mockBaseId, mockTableId, {view: 'viw123'});

				expect(mockFetch).toHaveBeenCalledWith(
					`${mockBaseUrl}/v0/${mockBaseId}/${mockTableId}?view=viw123`,
					expect.any(Object),
				);
			});

			test('handles sort option with single field', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					text: async () => Promise.resolve(JSON.stringify(mockResponse)),
				});

				await service.listRecords(mockBaseId, mockTableId, {
					sort: [{field: 'Name'}],
				});

				expect(mockFetch).toHaveBeenCalledWith(
					`${mockBaseUrl}/v0/${mockBaseId}/${mockTableId}?sort%5B0%5D%5Bfield%5D=Name`,
					expect.any(Object),
				);
			});

			test('handles sort option with multiple fields and directions', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					text: async () => Promise.resolve(JSON.stringify(mockResponse)),
				});

				await service.listRecords(mockBaseId, mockTableId, {
					sort: [
						{field: 'Name', direction: 'asc'},
						{field: 'CreatedTime', direction: 'desc'},
					],
				});

				expect(mockFetch).toHaveBeenCalledWith(
					expect.stringContaining(`${mockBaseUrl}/v0/${mockBaseId}/${mockTableId}?`),
					expect.any(Object),
				);

				// Check the URL contains all the sort parameters
				const url = mockFetch.mock.calls[0]?.[0];
				expect(typeof url).toBe('string');
				expect(url).toContain('sort%5B0%5D%5Bfield%5D=Name');
				expect(url).toContain('sort%5B0%5D%5Bdirection%5D=asc');
				expect(url).toContain('sort%5B1%5D%5Bfield%5D=CreatedTime');
				expect(url).toContain('sort%5B1%5D%5Bdirection%5D=desc');
			});
		});

		describe('error handling', () => {
			test('handles API errors', async () => {
				const errorMessage = 'API Error';
				mockFetch.mockResolvedValueOnce({
					ok: false,
					statusText: errorMessage,
					text: async () => Promise.resolve('Error response'),
				});

				await expect(service.listBases()).rejects.toThrow('Airtable API Error');
			});

			test('enhances AUTHENTICATION_REQUIRED errors', async () => {
				const errorResponse = JSON.stringify({
					error: {
						type: 'AUTHENTICATION_REQUIRED',
						message: 'Authentication required',
					},
				});

				mockFetch.mockResolvedValueOnce({
					ok: false,
					statusText: 'Unauthorized',
					text: async () => Promise.resolve(errorResponse),
				});

				await expect(service.listBases()).rejects.toThrow(/Verify that the token hasn't expired or been revoked./);
			});

			test('enhances INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND errors', async () => {
				const errorResponse = JSON.stringify({
					error: {
						type: 'INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND',
						message: 'Invalid permissions or model not found',
					},
				});

				mockFetch.mockResolvedValueOnce({
					ok: false,
					statusText: 'Forbidden',
					text: async () => Promise.resolve(errorResponse),
				});

				await expect(service.listBases()).rejects.toThrow(/schema\.bases:read/);
			});

			test('handles JSON parse errors', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					text: async () => Promise.resolve('invalid json'),
				});

				await expect(service.listBases()).rejects.toThrow('Failed to parse API response');
			});

			test('handles schema validation errors', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					text: async () => Promise.resolve('{"invalidData": true}'),
				});

				await expect(service.listBases()).rejects.toThrow();
			});
		});

		describe('searchRecords', () => {
			const mockBaseId = 'base123';
			const mockTableId = 'table123';
			const mockResponse = {
				records: [
					{id: 'rec1', fields: {name: 'Test Result'}},
				],
			};

			test('searches records successfully', async () => {
				// Mock the getBaseSchema call to return fields for validation
				mockFetch.mockResolvedValueOnce({
					ok: true,
					text: async () => Promise.resolve(JSON.stringify({
						tables: [{
							id: mockTableId,
							name: 'Test Table',
							primaryFieldId: 'fld1',
							fields: [{id: 'fld1', name: 'Name', type: 'singleLineText'}],
							views: [{id: 'viw1', name: 'Grid view', type: 'grid'}],
						}],
					})),
				});

				// Mock the listRecords call that searchRecords uses internally
				mockFetch.mockResolvedValueOnce({
					ok: true,
					text: async () => Promise.resolve(JSON.stringify(mockResponse)),
				});

				const result = await service.searchRecords(mockBaseId, mockTableId, 'test');

				// Verify the second call (listRecords) has the correct filter formula
				expect(mockFetch).toHaveBeenCalledTimes(2);
				const secondCallUrl = mockFetch.mock.calls[1]?.[0] as string;
				expect(secondCallUrl).toContain('filterByFormula=');
				expect(result).toEqual(mockResponse.records);
			});

			test('handles view parameter', async () => {
				// Mock the getBaseSchema call to return fields for validation
				mockFetch.mockResolvedValueOnce({
					ok: true,
					text: async () => Promise.resolve(JSON.stringify({
						tables: [{
							id: mockTableId,
							name: 'Test Table',
							primaryFieldId: 'fld1',
							fields: [{id: 'fld1', name: 'Name', type: 'singleLineText'}],
							views: [{id: 'viw1', name: 'Grid view', type: 'grid'}],
						}],
					})),
				});

				// Mock the listRecords call that searchRecords uses internally
				mockFetch.mockResolvedValueOnce({
					ok: true,
					text: async () => Promise.resolve(JSON.stringify(mockResponse)),
				});

				await service.searchRecords(mockBaseId, mockTableId, 'test', undefined, 100, 'viw123');

				// Verify the second call (listRecords) has the view parameter
				expect(mockFetch).toHaveBeenCalledTimes(2);
				const secondCallUrl = mockFetch.mock.calls[1]?.[0] as string;
				expect(secondCallUrl).toContain('view=viw123');
			});
		});

		describe('record operations', () => {
			const mockBaseId = 'base123';
			const mockTableId = 'table123';
			const mockRecordId = 'rec123';

			test('creates record successfully', async () => {
				const mockRecord = {id: mockRecordId, fields: {name: 'Test'}};
				mockFetch.mockResolvedValueOnce({
					ok: true,
					text: async () => Promise.resolve(JSON.stringify(mockRecord)),
				});

				const result = await service.createRecord(mockBaseId, mockTableId, {name: 'Test'});

				expect(mockFetch).toHaveBeenCalledWith(
					`${mockBaseUrl}/v0/${mockBaseId}/${mockTableId}`,
					expect.objectContaining({
						method: 'POST',
						body: expect.any(String),
					}),
				);
				expect(result).toEqual(mockRecord);
			});

			test('updates records successfully', async () => {
				const mockResponse = {
					records: [{id: mockRecordId, fields: {name: 'Updated'}}],
				};
				mockFetch.mockResolvedValueOnce({
					ok: true,
					text: async () => Promise.resolve(JSON.stringify(mockResponse)),
				});

				const records = [{id: mockRecordId, fields: {name: 'Updated'}}];
				const result = await service.updateRecords(mockBaseId, mockTableId, records);

				expect(mockFetch).toHaveBeenCalledWith(
					`${mockBaseUrl}/v0/${mockBaseId}/${mockTableId}`,
					expect.objectContaining({
						method: 'PATCH',
						body: expect.any(String),
					}),
				);
				expect(result).toEqual(mockResponse.records);
			});

			test('deletes records successfully', async () => {
				const mockResponse = {
					records: [{id: mockRecordId, deleted: true}],
				};
				mockFetch.mockResolvedValueOnce({
					ok: true,
					text: async () => Promise.resolve(JSON.stringify(mockResponse)),
				});

				const result = await service.deleteRecords(mockBaseId, mockTableId, [mockRecordId]);

				expect(mockFetch).toHaveBeenCalledWith(
					expect.stringContaining(`${mockBaseUrl}/v0/${mockBaseId}/${mockTableId}?records[]=${mockRecordId}`),
					expect.objectContaining({
						method: 'DELETE',
					}),
				);
				expect(result).toEqual([{id: mockRecordId}]);
			});
		});
	});
});
