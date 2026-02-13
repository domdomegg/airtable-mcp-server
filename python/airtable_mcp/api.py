"""
Sync Python API that wraps MCP tool calls. Each function spawns the Node server,
calls the tool, and returns the result. For token-efficient scripts and automation.
"""

from typing import Any, Optional

from .client import AirtableMCPClient, run_async


def _with_client(coro):
    """Run an async coroutine that takes a client, by creating and closing a client."""
    async def _run():
        async with AirtableMCPClient() as client:
            return await coro(client)
    return run_async(_run())


def list_bases() -> str:
    """List all accessible Airtable bases."""
    return _with_client(lambda c: c.list_bases())


def list_tables(baseId: str, detailLevel: Optional[str] = None) -> str:
    """List all tables in a base."""
    return _with_client(lambda c: c.list_tables(baseId=baseId, detailLevel=detailLevel))


def list_records(
    baseId: str,
    tableId: str,
    view: Optional[str] = None,
    maxRecords: Optional[int] = None,
    filterByFormula: Optional[str] = None,
    sort: Optional[list[dict[str, Any]]] = None,
) -> str:
    """List records from a table."""
    return _with_client(
        lambda c: c.list_records(
            baseId=baseId,
            tableId=tableId,
            view=view,
            maxRecords=maxRecords,
            filterByFormula=filterByFormula,
            sort=sort,
        )
    )


def search_records(
    baseId: str,
    tableId: str,
    searchTerm: str,
    fieldIds: Optional[list[str]] = None,
    maxRecords: Optional[int] = None,
    view: Optional[str] = None,
) -> str:
    """Search for records containing specific text."""
    return _with_client(
        lambda c: c.search_records(
            baseId=baseId,
            tableId=tableId,
            searchTerm=searchTerm,
            fieldIds=fieldIds,
            maxRecords=maxRecords,
            view=view,
        )
    )


def describe_table(
    baseId: str,
    tableId: str,
    detailLevel: Optional[str] = None,
) -> str:
    """Get detailed information about a table."""
    return _with_client(
        lambda c: c.describe_table(
            baseId=baseId,
            tableId=tableId,
            detailLevel=detailLevel,
        )
    )


def get_record(baseId: str, tableId: str, recordId: str) -> str:
    """Get a specific record by ID."""
    return _with_client(
        lambda c: c.get_record(baseId=baseId, tableId=tableId, recordId=recordId)
    )


def create_record(
    baseId: str,
    tableId: str,
    fields: dict[str, Any],
) -> str:
    """Create a new record in a table."""
    return _with_client(
        lambda c: c.create_record(
            baseId=baseId,
            tableId=tableId,
            fields=fields,
        )
    )


def update_records(
    baseId: str,
    tableId: str,
    records: list[dict[str, Any]],
) -> str:
    """Update up to 10 records in a table."""
    return _with_client(
        lambda c: c.update_records(
            baseId=baseId,
            tableId=tableId,
            records=records,
        )
    )


def delete_records(
    baseId: str,
    tableId: str,
    recordIds: list[str],
) -> str:
    """Delete records from a table."""
    return _with_client(
        lambda c: c.delete_records(
            baseId=baseId,
            tableId=tableId,
            recordIds=recordIds,
        )
    )


def create_table(
    baseId: str,
    name: str,
    fields: list[dict[str, Any]],
    description: Optional[str] = None,
) -> str:
    """Create a new table in a base."""
    return _with_client(
        lambda c: c.create_table(
            baseId=baseId,
            name=name,
            fields=fields,
            description=description,
        )
    )


def update_table(
    baseId: str,
    tableId: str,
    name: Optional[str] = None,
    description: Optional[str] = None,
) -> str:
    """Update a table's name or description."""
    return _with_client(
        lambda c: c.update_table(
            baseId=baseId,
            tableId=tableId,
            name=name,
            description=description,
        )
    )


def create_field(
    baseId: str,
    tableId: str,
    nested: dict[str, Any],
) -> str:
    """Create a new field in a table."""
    return _with_client(
        lambda c: c.create_field(
            baseId=baseId,
            tableId=tableId,
            nested=nested,
        )
    )


def update_field(
    baseId: str,
    tableId: str,
    fieldId: str,
    name: Optional[str] = None,
    description: Optional[str] = None,
) -> str:
    """Update a field's name or description."""
    return _with_client(
        lambda c: c.update_field(
            baseId=baseId,
            tableId=tableId,
            fieldId=fieldId,
            name=name,
            description=description,
        )
    )


def list_comments(
    baseId: str,
    tableId: str,
    recordId: str,
    pageSize: Optional[int] = None,
    offset: Optional[str] = None,
) -> str:
    """List comments on a record."""
    return _with_client(
        lambda c: c.list_comments(
            baseId=baseId,
            tableId=tableId,
            recordId=recordId,
            pageSize=pageSize,
            offset=offset,
        )
    )


def create_comment(
    baseId: str,
    tableId: str,
    recordId: str,
    text: str,
    parentCommentId: Optional[str] = None,
) -> str:
    """Create a comment on a record."""
    return _with_client(
        lambda c: c.create_comment(
            baseId=baseId,
            tableId=tableId,
            recordId=recordId,
            text=text,
            parentCommentId=parentCommentId,
        )
    )


def upload_attachment(
    baseId: str,
    recordId: str,
    attachmentFieldIdOrName: str,
    file: str,
    filename: str,
    contentType: str,
) -> str:
    """Upload a file to an attachment field (base64-encoded file content)."""
    return _with_client(
        lambda c: c.upload_attachment(
            baseId=baseId,
            recordId=recordId,
            attachmentFieldIdOrName=attachmentFieldIdOrName,
            file=file,
            filename=filename,
            contentType=contentType,
        )
    )
