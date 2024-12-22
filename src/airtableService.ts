import nodeFetch, { RequestInit } from 'node-fetch';
import { z } from 'zod';
import {
  IAirtableService,
  ListBasesResponse,
  BaseSchemaResponse,
  ListRecordsOptions,
  Field,
  Table,
  AirtableRecord,
  ListBasesResponseSchema,
  BaseSchemaResponseSchema,
  TableSchema,
  FieldSchema,
  FieldSet,
} from './types.js';

export class AirtableService implements IAirtableService {
  private readonly apiKey: string;

  private readonly baseUrl: string;

  private readonly fetch: typeof nodeFetch;

  constructor(
    apiKey: string = process.env.AIRTABLE_API_KEY || '',
    baseUrl: string = 'https://api.airtable.com',
    fetch: typeof nodeFetch = nodeFetch,
  ) {
    if (!apiKey) {
      throw new Error('No API key set. Either:\n1. Pass it in as a command-line argument, for example `airtable-mcp-server <API_KEY>`\n2. Set it in the `AIRTABLE_API_KEY` environment variable');
    }

    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.fetch = fetch;
  }

  private async fetchFromAPI<T>(endpoint: string, schema: z.ZodSchema<T>, options: RequestInit = {}): Promise<T> {
    const response = await this.fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Airtable API Error: ${response.statusText}. Response: ${responseText}`);
    }

    try {
      const data = JSON.parse(responseText);
      return schema.parse(data);
    } catch (parseError) {
      throw new Error(`Failed to parse API response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
  }

  async listBases(): Promise<ListBasesResponse> {
    return this.fetchFromAPI('/v0/meta/bases', ListBasesResponseSchema);
  }

  async getBaseSchema(baseId: string): Promise<BaseSchemaResponse> {
    return this.fetchFromAPI(`/v0/meta/bases/${baseId}/tables`, BaseSchemaResponseSchema);
  }

  async listRecords(baseId: string, tableId: string, options?: ListRecordsOptions): Promise<AirtableRecord[]> {
    const maxRecords = options?.maxRecords;
    let allRecords: AirtableRecord[] = [];
    let offset: string | undefined;

    do {
      const queryParams = new URLSearchParams();
      if (maxRecords) queryParams.append('maxRecords', maxRecords.toString());
      if (offset) queryParams.append('offset', offset);

      // eslint-disable-next-line no-await-in-loop
      const response = await this.fetchFromAPI(
        `/v0/${baseId}/${tableId}?${queryParams.toString()}`,
        z.object({
          records: z.array(z.object({ id: z.string(), fields: z.record(z.any()) })),
          offset: z.string().optional(),
        }),
      );

      allRecords = allRecords.concat(response.records);
      offset = response.offset;

      // Stop if we've reached maxRecords
      if (maxRecords && allRecords.length >= maxRecords) {
        allRecords = allRecords.slice(0, maxRecords);
        break;
      }
    } while (offset);

    return allRecords;
  }

  async getRecord(baseId: string, tableId: string, recordId: string): Promise<AirtableRecord> {
    return this.fetchFromAPI(
      `/v0/${baseId}/${tableId}/${recordId}`,
      z.object({ id: z.string(), fields: z.record(z.any()) }),
    );
  }

  async createRecord(baseId: string, tableId: string, fields: FieldSet): Promise<AirtableRecord> {
    return this.fetchFromAPI(
      `/v0/${baseId}/${tableId}`,
      z.object({ id: z.string(), fields: z.record(z.any()) }),
      {
        method: 'POST',
        body: JSON.stringify({ fields }),
      },
    );
  }

  async updateRecords(
    baseId: string,
    tableId: string,
    records: { id: string; fields: FieldSet }[],
  ): Promise<AirtableRecord[]> {
    const response = await this.fetchFromAPI(
      `/v0/${baseId}/${tableId}`,
      z.object({ records: z.array(z.object({ id: z.string(), fields: z.record(z.any()) })) }),
      {
        method: 'PATCH',
        body: JSON.stringify({ records }),
      },
    );
    return response.records;
  }

  async deleteRecords(baseId: string, tableId: string, recordIds: string[]): Promise<{ id: string }[]> {
    const queryString = recordIds.map((id) => `records[]=${id}`).join('&');
    const response = await this.fetchFromAPI(
      `/v0/${baseId}/${tableId}?${queryString}`,
      z.object({ records: z.array(z.object({ id: z.string(), deleted: z.boolean() })) }),
      {
        method: 'DELETE',
      },
    );
    return response.records.map(({ id }) => ({ id }));
  }

  async createTable(baseId: string, name: string, fields: Field[], description?: string): Promise<Table> {
    return this.fetchFromAPI(
      `/v0/meta/bases/${baseId}/tables`,
      TableSchema,
      {
        method: 'POST',
        body: JSON.stringify({ name, description, fields }),
      },
    );
  }

  async updateTable(
    baseId: string,
    tableId: string,
    updates: { name?: string; description?: string },
  ): Promise<Table> {
    return this.fetchFromAPI(
      `/v0/meta/bases/${baseId}/tables/${tableId}`,
      TableSchema,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      },
    );
  }

  async createField(baseId: string, tableId: string, field: Omit<Field, 'id'>): Promise<Field> {
    return this.fetchFromAPI(
      `/v0/meta/bases/${baseId}/tables/${tableId}/fields`,
      FieldSchema,
      {
        method: 'POST',
        body: JSON.stringify(field),
      },
    );
  }

  async updateField(
    baseId: string,
    tableId: string,
    fieldId: string,
    updates: { name?: string; description?: string },
  ): Promise<Field> {
    return this.fetchFromAPI(
      `/v0/meta/bases/${baseId}/tables/${tableId}/fields/${fieldId}`,
      FieldSchema,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      },
    );
  }
}
