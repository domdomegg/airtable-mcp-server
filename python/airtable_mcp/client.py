"""
MCP client that spawns the Node airtable-mcp-server and calls tools via stdio.
"""

import asyncio
import os
from pathlib import Path
from typing import Any, Optional

from mcp import ClientSession, StdioServerParameters, types
from mcp.client.stdio import stdio_client


def _default_command_and_args() -> tuple[str, list[str]]:
    """Default command and args to run the Airtable MCP server."""
    repo_root = Path(__file__).resolve().parent.parent.parent
    main_js = repo_root / "dist" / "main.js"
    if main_js.exists():
        return ("node", [str(main_js)])
    return ("npx", ["-y", "airtable-mcp-server"])


class AirtableMCPClient:
    """
    Async context manager that spawns the Node MCP server and provides tool calls.
    """

    def __init__(
        self,
        command: Optional[str] = None,
        args: Optional[list[str]] = None,
        env: Optional[dict[str, str]] = None,
    ):
        """
        Args:
            command: Executable to run (e.g. "node"). Default: "node" in repo, else "npx".
            args: Arguments for the command (e.g. [path to main.js] or ["-y", "airtable-mcp-server"]).
            env: Extra environment variables. Merged with os.environ (AIRTABLE_API_KEY is passed through).
        """
        default_cmd, default_args = _default_command_and_args()
        self._command = command if command is not None else default_cmd
        self._args = args if args is not None else default_args
        self._env = {**os.environ, **(env or {})}
        self._session: Optional[ClientSession] = None
        self._read = None
        self._write = None
        self._stdio_context = None

    async def __aenter__(self) -> "AirtableMCPClient":
        params = StdioServerParameters(
            command=self._command,
            args=self._args,
            env=self._env,
        )
        self._stdio_context = stdio_client(params)
        self._read, self._write = await self._stdio_context.__aenter__()
        self._session = ClientSession(self._read, self._write)
        await self._session.__aenter__()
        await self._session.initialize()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        if self._session:
            await self._session.__aexit__(exc_type, exc_val, exc_tb)
            self._session = None
        if self._stdio_context:
            await self._stdio_context.__aexit__(exc_type, exc_val, exc_tb)
            self._stdio_context = None
        self._read, self._write = None, None

    async def call_tool(self, name: str, **kwargs: Any) -> str:
        """
        Call an MCP tool by name. Drops None values from kwargs.
        Returns the tool result as text.
        """
        if self._session is None:
            raise RuntimeError("Client not connected. Use 'async with AirtableMCPClient()'.")
        args = {k: v for k, v in kwargs.items() if v is not None}
        result = await self._session.call_tool(name, arguments=args)
        if not result.content:
            return ""
        text_parts = []
        for block in result.content:
            if isinstance(block, types.TextContent):
                text_parts.append(block.text)
        return "\n".join(text_parts)

    async def list_bases(self) -> str:
        return await self.call_tool("list_bases")

    async def list_tables(
        self,
        baseId: str,
        detailLevel: Optional[str] = None,
    ) -> str:
        return await self.call_tool(
            "list_tables",
            baseId=baseId,
            detailLevel=detailLevel,
        )

    async def list_records(
        self,
        baseId: str,
        tableId: str,
        view: Optional[str] = None,
        maxRecords: Optional[int] = None,
        filterByFormula: Optional[str] = None,
        sort: Optional[list[dict[str, Any]]] = None,
    ) -> str:
        return await self.call_tool(
            "list_records",
            baseId=baseId,
            tableId=tableId,
            view=view,
            maxRecords=maxRecords,
            filterByFormula=filterByFormula,
            sort=sort,
        )

    async def search_records(
        self,
        baseId: str,
        tableId: str,
        searchTerm: str,
        fieldIds: Optional[list[str]] = None,
        maxRecords: Optional[int] = None,
        view: Optional[str] = None,
    ) -> str:
        return await self.call_tool(
            "search_records",
            baseId=baseId,
            tableId=tableId,
            searchTerm=searchTerm,
            fieldIds=fieldIds,
            maxRecords=maxRecords,
            view=view,
        )

    async def describe_table(
        self,
        baseId: str,
        tableId: str,
        detailLevel: Optional[str] = None,
    ) -> str:
        return await self.call_tool(
            "describe_table",
            baseId=baseId,
            tableId=tableId,
            detailLevel=detailLevel,
        )

    async def get_record(
        self,
        baseId: str,
        tableId: str,
        recordId: str,
    ) -> str:
        return await self.call_tool(
            "get_record",
            baseId=baseId,
            tableId=tableId,
            recordId=recordId,
        )

    async def create_record(
        self,
        baseId: str,
        tableId: str,
        fields: dict[str, Any],
    ) -> str:
        return await self.call_tool(
            "create_record",
            baseId=baseId,
            tableId=tableId,
            fields=fields,
        )

    async def update_records(
        self,
        baseId: str,
        tableId: str,
        records: list[dict[str, Any]],
    ) -> str:
        return await self.call_tool(
            "update_records",
            baseId=baseId,
            tableId=tableId,
            records=records,
        )

    async def delete_records(
        self,
        baseId: str,
        tableId: str,
        recordIds: list[str],
    ) -> str:
        return await self.call_tool(
            "delete_records",
            baseId=baseId,
            tableId=tableId,
            recordIds=recordIds,
        )

    async def create_table(
        self,
        baseId: str,
        name: str,
        fields: list[dict[str, Any]],
        description: Optional[str] = None,
    ) -> str:
        return await self.call_tool(
            "create_table",
            baseId=baseId,
            name=name,
            fields=fields,
            description=description,
        )

    async def update_table(
        self,
        baseId: str,
        tableId: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
    ) -> str:
        return await self.call_tool(
            "update_table",
            baseId=baseId,
            tableId=tableId,
            name=name,
            description=description,
        )

    async def create_field(
        self,
        baseId: str,
        tableId: str,
        nested: dict[str, Any],
    ) -> str:
        return await self.call_tool(
            "create_field",
            baseId=baseId,
            tableId=tableId,
            nested=nested,
        )

    async def update_field(
        self,
        baseId: str,
        tableId: str,
        fieldId: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
    ) -> str:
        return await self.call_tool(
            "update_field",
            baseId=baseId,
            tableId=tableId,
            fieldId=fieldId,
            name=name,
            description=description,
        )

    async def list_comments(
        self,
        baseId: str,
        tableId: str,
        recordId: str,
        pageSize: Optional[int] = None,
        offset: Optional[str] = None,
    ) -> str:
        return await self.call_tool(
            "list_comments",
            baseId=baseId,
            tableId=tableId,
            recordId=recordId,
            pageSize=pageSize,
            offset=offset,
        )

    async def create_comment(
        self,
        baseId: str,
        tableId: str,
        recordId: str,
        text: str,
        parentCommentId: Optional[str] = None,
    ) -> str:
        return await self.call_tool(
            "create_comment",
            baseId=baseId,
            tableId=tableId,
            recordId=recordId,
            text=text,
            parentCommentId=parentCommentId,
        )

    async def upload_attachment(
        self,
        baseId: str,
        recordId: str,
        attachmentFieldIdOrName: str,
        file: str,
        filename: str,
        contentType: str,
    ) -> str:
        return await self.call_tool(
            "upload_attachment",
            baseId=baseId,
            recordId=recordId,
            attachmentFieldIdOrName=attachmentFieldIdOrName,
            file=file,
            filename=filename,
            contentType=contentType,
        )


def run_async(coro) -> Any:
    """Run an async coroutine from sync code."""
    return asyncio.run(coro)
