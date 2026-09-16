# Python MCP Server 實作指南（Implementation Guide）

## 目錄（Table of Contents）

- [總覽（Overview）](#總覽overview)
- [快速參考（Quick Reference）](#快速參考quick-reference)
- [MCP Python SDK 與 FastMCP](#mcp-python-sdk-與-fastmcp)
- [伺服器命名規範（Server Naming Convention）](#伺服器命名規範server-naming-convention)
- [Tool 實作（Tool Implementation）](#tool-實作tool-implementation)
- [Pydantic v2 要點（Pydantic v2 Key Features）](#pydantic-v2-要點pydantic-v2-key-features)
- [回應格式選項（Response Format Options）](#回應格式選項response-format-options)
- [分頁實作（Pagination Implementation）](#分頁實作pagination-implementation)
- [錯誤處理（Error Handling）](#錯誤處理error-handling)
- [共用工具（Shared Utilities）](#共用工具shared-utilities)
- [Async/Await 最佳實踐（Async/Await Best Practices）](#asyncawait-最佳實踐asyncawait-best-practices)
- [型別提示（Type Hints）](#型別提示type-hints)
- [Tool Docstring](#tool-docstring)
- [完整範例（Complete Example）](#完整範例complete-example)
- [進階 FastMCP 功能（Advanced FastMCP Features）](#進階-fastmcp-功能advanced-fastmcp-features)
- [程式碼最佳實踐（Code Best Practices）](#程式碼最佳實踐code-best-practices)
- [品質檢查清單（Quality Checklist）](#品質檢查清單quality-checklist)

---

## 總覽（Overview）

本文件提供以 MCP Python SDK 實作 MCP 伺服器時，Python 專用的最佳實踐與範例。涵蓋伺服器設定、tool 註冊模式、以 Pydantic 做輸入驗證、錯誤處理，以及完整可運作範例。

---

## 快速參考（Quick Reference）

### 主要匯入（Key Imports）
```python
from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List, Dict, Any
from enum import Enum
import httpx
```

### 伺服器初始化（Server Initialization）
```python
mcp = FastMCP("service_mcp")
```

### Tool 註冊模式（Tool Registration Pattern）
```python
@mcp.tool(name="tool_name", annotations={...})
async def tool_function(params: InputModel) -> str:
    # Implementation
    pass
```

---

## MCP Python SDK 與 FastMCP

官方 MCP Python SDK 提供 FastMCP，為建構 MCP 伺服器的高階框架。功能包括：
- 從函式簽名與 docstring 自動產生 description 與 inputSchema
- 以 Pydantic model 做輸入驗證
- 以 `@mcp.tool` 裝飾器註冊 tool

使用目前可用且已授權的文件擷取能力核對 SDK 文件；不要求特定工具名稱。下列 main README 是導航起點，應優先對照專案使用的 release/tag。遠端不可用時可查本地已安裝 SDK source，標明版本與未核對之處，繼續有證據支持的工作：
`https://raw.githubusercontent.com/modelcontextprotocol/python-sdk/main/README.md`

## 伺服器命名規範（Server Naming Convention）

Python MCP 伺服器須遵循下列命名：
- **格式**：`{service}_mcp`（小寫、底線）
- **範例**：`github_mcp`、`jira_mcp`、`stripe_mcp`

名稱應：具通用性、能描述所整合的服務/API、易從任務描述推斷、且不含版本號或日期。

## Tool 實作（Tool Implementation）

### Tool 命名（Tool Naming）

Tool 名稱使用 snake_case（如 "search_users"、"create_project"、"get_channel_info"），並採用清楚、動詞導向的名稱。

**避免命名衝突**：加上服務前綴以區隔：
- 用 "slack_send_message" 而非僅 "send_message"
- 用 "github_create_issue" 而非僅 "create_issue"
- 用 "asana_list_tasks" 而非僅 "list_tasks"

### 以 FastMCP 定義 Tool 結構（Tool Structure with FastMCP）

以 `@mcp.tool` 裝飾器定義 tool，並以 Pydantic model 做輸入驗證：

```python
from pydantic import BaseModel, Field, ConfigDict
from mcp.server.fastmcp import FastMCP

# Initialize the MCP server
mcp = FastMCP("example_mcp")

# Define Pydantic model for input validation
class ServiceToolInput(BaseModel):
    '''Input model for service tool operation.'''
    model_config = ConfigDict(
        str_strip_whitespace=True,  # Auto-strip whitespace from strings
        validate_assignment=True,    # Validate on assignment
        extra='forbid'              # Forbid extra fields
    )

    param1: str = Field(..., description="First parameter description (e.g., 'user123', 'project-abc')", min_length=1, max_length=100)
    param2: Optional[int] = Field(default=None, description="Optional integer parameter with constraints", ge=0, le=1000)
    tags: Optional[List[str]] = Field(default_factory=list, description="List of tags to apply", max_items=10)

@mcp.tool(
    name="service_tool_name",
    annotations={
        "title": "Human-Readable Tool Title",
        "readOnlyHint": True,     # Tool does not modify environment
        "destructiveHint": False,  # Tool does not perform destructive operations
        "idempotentHint": True,    # Repeated calls have no additional effect
        "openWorldHint": False     # Tool does not interact with external entities
    }
)
async def service_tool_name(params: ServiceToolInput) -> str:
    '''Tool description automatically becomes the 'description' field.

    This tool performs a specific operation on the service. It validates all inputs
    using the ServiceToolInput Pydantic model before processing.

    Args:
        params (ServiceToolInput): Validated input parameters containing:
            - param1 (str): First parameter description
            - param2 (Optional[int]): Optional parameter with default
            - tags (Optional[List[str]]): List of tags

    Returns:
        str: JSON-formatted response containing operation results
    '''
    # Implementation here
    pass
```

## Pydantic v2 要點（Pydantic v2 Key Features）

- 使用 `model_config` 取代巢狀 `Config` 類別
- 使用 `field_validator` 取代已棄用的 `validator`
- 使用 `model_dump()` 取代已棄用的 `dict()`
- validator 須加上 `@classmethod` 裝飾器
- validator 方法須有型別提示

```python
from pydantic import BaseModel, Field, field_validator, ConfigDict

class CreateUserInput(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True
    )

    name: str = Field(..., description="User's full name", min_length=1, max_length=100)
    email: str = Field(..., description="User's email address", pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    age: int = Field(..., description="User's age", ge=0, le=150)

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Email cannot be empty")
        return v.lower()
```

## 回應格式選項（Response Format Options）

為彈性起見，支援多種輸出格式：

```python
from enum import Enum

class ResponseFormat(str, Enum):
    '''Output format for tool responses.'''
    MARKDOWN = "markdown"
    JSON = "json"

class UserSearchInput(BaseModel):
    query: str = Field(..., description="Search query")
    response_format: ResponseFormat = Field(
        default=ResponseFormat.MARKDOWN,
        description="Output format: 'markdown' for human-readable or 'json' for machine-readable"
    )
```

**Markdown 格式**：
- 使用標題、列表與格式以提升可讀性
- 將時間戳轉為人類可讀（如 "2024-01-15 10:30:00 UTC" 而非 epoch）
- 顯示名稱並在括號內附 ID（如 "@john.doe (U123456)"）
- 省略冗長 metadata（如只顯示一個頭像 URL，非所有尺寸）
- 依邏輯分組相關資訊

**JSON 格式**：
- 回傳完整、結構化資料供程式處理
- 包含所有可用欄位與 metadata
- 欄位名稱與型別一致

## 分頁實作（Pagination Implementation）

對會列出資源的 tool：

```python
class ListInput(BaseModel):
    limit: Optional[int] = Field(default=20, description="Maximum results to return", ge=1, le=100)
    offset: Optional[int] = Field(default=0, description="Number of results to skip for pagination", ge=0)

async def list_items(params: ListInput) -> str:
    # Make API request with pagination
    data = await api_request(limit=params.limit, offset=params.offset)

    # Return pagination info
    response = {
        "total": data["total"],
        "count": len(data["items"]),
        "offset": params.offset,
        "items": data["items"],
        "has_more": data["total"] > params.offset + len(data["items"]),
        "next_offset": params.offset + len(data["items"]) if data["total"] > params.offset + len(data["items"]) else None
    }
    return json.dumps(response, indent=2)
```

## 錯誤處理（Error Handling）

提供清楚、可執行的錯誤訊息：

```python
def _handle_api_error(e: Exception) -> str:
    '''Consistent error formatting across all tools.'''
    if isinstance(e, httpx.HTTPStatusError):
        if e.response.status_code == 404:
            return "Error: Resource not found. Please check the ID is correct."
        elif e.response.status_code == 403:
            return "Error: Permission denied. You don't have access to this resource."
        elif e.response.status_code == 429:
            return "Error: Rate limit exceeded. Please wait before making more requests."
        return f"Error: API request failed with status {e.response.status_code}"
    elif isinstance(e, httpx.TimeoutException):
        return "Error: Request timed out. Please try again."
    return f"Error: Unexpected error occurred: {type(e).__name__}"
```

## 共用工具（Shared Utilities）

將共通邏輯抽出為可重複使用的函式：

```python
# Shared API request function
async def _make_api_request(endpoint: str, method: str = "GET", **kwargs) -> dict:
    '''Reusable function for all API calls.'''
    async with httpx.AsyncClient() as client:
        response = await client.request(
            method,
            f"{API_BASE_URL}/{endpoint}",
            timeout=30.0,
            **kwargs
        )
        response.raise_for_status()
        return response.json()
```

## Async/Await 最佳實踐（Async/Await Best Practices）

網路請求與 I/O 一律使用 async/await：

```python
# Good: Async network request
async def fetch_data(resource_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_URL}/resource/{resource_id}")
        response.raise_for_status()
        return response.json()

# Bad: Synchronous request
def fetch_data(resource_id: str) -> dict:
    response = requests.get(f"{API_URL}/resource/{resource_id}")  # Blocks
    return response.json()
```

## 型別提示（Type Hints）

全程使用型別提示：

```python
from typing import Optional, List, Dict, Any

async def get_user(user_id: str) -> Dict[str, Any]:
    data = await fetch_user(user_id)
    return {"id": data["id"], "name": data["name"]}
```

## Tool Docstring

每個 tool 須有完整 docstring，並明確標示型別資訊：

```python
async def search_users(params: UserSearchInput) -> str:
    '''
    Search for users in the Example system by name, email, or team.

    This tool searches across all user profiles in the Example platform,
    supporting partial matches and various search filters. It does NOT
    create or modify users, only searches existing ones.

    Args:
        params (UserSearchInput): Validated input parameters containing:
            - query (str): Search string to match against names/emails (e.g., "john", "@example.com", "team:marketing")
            - limit (Optional[int]): Maximum results to return, between 1-100 (default: 20)
            - offset (Optional[int]): Number of results to skip for pagination (default: 0)

    Returns:
        str: JSON-formatted string containing search results with the following schema:

        Success response:
        {
            "total": int,           # Total number of matches found
            "count": int,           # Number of results in this response
            "offset": int,          # Current pagination offset
            "users": [
                {
                    "id": str,      # User ID (e.g., "U123456789")
                    "name": str,    # Full name (e.g., "John Doe")
                    "email": str,   # Email address (e.g., "john@example.com")
                    "team": str     # Team name (e.g., "Marketing") - optional
                }
            ]
        }

        Error response:
        "Error: <error message>" or "No users found matching '<query>'"

    Examples:
        - Use when: "Find all marketing team members" -> params with query="team:marketing"
        - Use when: "Search for John's account" -> params with query="john"
        - Don't use when: You need to create a user (use example_create_user instead)
        - Don't use when: You have a user ID and need full details (use example_get_user instead)

    Error Handling:
        - Input validation errors are handled by Pydantic model
        - Returns "Error: Rate limit exceeded" if too many requests (429 status)
        - Returns "Error: Invalid API authentication" if API key is invalid (401 status)
        - Returns formatted list of results or "No users found matching 'query'"
    '''
```

## 完整範例（Complete Example）

以下為完整 Python MCP 伺服器範例：

```python
#!/usr/bin/env python3
'''
MCP Server for Example Service.

This server provides tools to interact with Example API, including user search,
project management, and data export capabilities.
'''

from typing import Optional, List, Dict, Any
from enum import Enum
import httpx
from pydantic import BaseModel, Field, field_validator, ConfigDict
from mcp.server.fastmcp import FastMCP

# Initialize the MCP server
mcp = FastMCP("example_mcp")

# Constants
API_BASE_URL = "https://api.example.com/v1"

# Enums
class ResponseFormat(str, Enum):
    '''Output format for tool responses.'''
    MARKDOWN = "markdown"
    JSON = "json"

# Pydantic Models for Input Validation
class UserSearchInput(BaseModel):
    '''Input model for user search operations.'''
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True
    )

    query: str = Field(..., description="Search string to match against names/emails", min_length=2, max_length=200)
    limit: Optional[int] = Field(default=20, description="Maximum results to return", ge=1, le=100)
    offset: Optional[int] = Field(default=0, description="Number of results to skip for pagination", ge=0)
    response_format: ResponseFormat = Field(default=ResponseFormat.MARKDOWN, description="Output format")

    @field_validator('query')
    @classmethod
    def validate_query(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Query cannot be empty or whitespace only")
        return v.strip()

# Shared utility functions
async def _make_api_request(endpoint: str, method: str = "GET", **kwargs) -> dict:
    '''Reusable function for all API calls.'''
    async with httpx.AsyncClient() as client:
        response = await client.request(
            method,
            f"{API_BASE_URL}/{endpoint}",
            timeout=30.0,
            **kwargs
        )
        response.raise_for_status()
        return response.json()

def _handle_api_error(e: Exception) -> str:
    '''Consistent error formatting across all tools.'''
    if isinstance(e, httpx.HTTPStatusError):
        if e.response.status_code == 404:
            return "Error: Resource not found. Please check the ID is correct."
        elif e.response.status_code == 403:
            return "Error: Permission denied. You don't have access to this resource."
        elif e.response.status_code == 429:
            return "Error: Rate limit exceeded. Please wait before making more requests."
        return f"Error: API request failed with status {e.response.status_code}"
    elif isinstance(e, httpx.TimeoutException):
        return "Error: Request timed out. Please try again."
    return f"Error: Unexpected error occurred: {type(e).__name__}"

# Tool definitions
@mcp.tool(
    name="example_search_users",
    annotations={
        "title": "Search Example Users",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True
    }
)
async def example_search_users(params: UserSearchInput) -> str:
    '''Search for users in the Example system by name, email, or team.

    [Full docstring as shown above]
    '''
    try:
        # Make API request using validated parameters
        data = await _make_api_request(
            "users/search",
            params={
                "q": params.query,
                "limit": params.limit,
                "offset": params.offset
            }
        )

        users = data.get("users", [])
        total = data.get("total", 0)

        if not users:
            return f"No users found matching '{params.query}'"

        # Format response based on requested format
        if params.response_format == ResponseFormat.MARKDOWN:
            lines = [f"# User Search Results: '{params.query}'", ""]
            lines.append(f"Found {total} users (showing {len(users)})")
            lines.append("")

            for user in users:
                lines.append(f"## {user['name']} ({user['id']})")
                lines.append(f"- **Email**: {user['email']}")
                if user.get('team'):
                    lines.append(f"- **Team**: {user['team']}")
                lines.append("")

            return "\n".join(lines)

        else:
            # Machine-readable JSON format
            import json
            response = {
                "total": total,
                "count": len(users),
                "offset": params.offset,
                "users": users
            }
            return json.dumps(response, indent=2)

    except Exception as e:
        return _handle_api_error(e)

if __name__ == "__main__":
    mcp.run()
```

---

## 進階 FastMCP 功能（Advanced FastMCP Features）

### Context 參數注入（Context Parameter Injection）

FastMCP 可自動將 `Context` 參數注入 tool，以支援 logging、進度回報、資源讀取與使用者互動：

```python
from mcp.server.fastmcp import FastMCP, Context

mcp = FastMCP("example_mcp")

@mcp.tool()
async def advanced_search(query: str, ctx: Context) -> str:
    '''Advanced tool with context access for logging and progress.'''

    # Report progress for long operations
    await ctx.report_progress(0.25, "Starting search...")

    # Log information for debugging
    await ctx.log_info("Processing query", {"query": query, "timestamp": datetime.now()})

    # Perform search
    results = await search_api(query)
    await ctx.report_progress(0.75, "Formatting results...")

    # Access server configuration
    server_name = ctx.fastmcp.name

    return format_results(results)

@mcp.tool()
async def interactive_tool(resource_id: str, ctx: Context) -> str:
    '''Tool that can request additional input from users.'''

    # Request sensitive information when needed
    api_key = await ctx.elicit(
        prompt="Please provide your API key:",
        input_type="password"
    )

    # Use the provided key
    return await api_call(resource_id, api_key)
```

**Context 能力**：
- `ctx.report_progress(progress, message)` — 長操作進度回報
- `ctx.log_info(message, data)` / `ctx.log_error()` / `ctx.log_debug()` — 記錄
- `ctx.elicit(prompt, input_type)` — 向使用者請求輸入
- `ctx.fastmcp.name` — 存取伺服器設定
- `ctx.read_resource(uri)` — 讀取 MCP 資源

### 資源註冊（Resource Registration）

以資源形式暴露資料，便於以模板為基礎存取：

```python
@mcp.resource("file://documents/{name}")
async def get_document(name: str) -> str:
    '''Expose documents as MCP resources.

    Resources are useful for static or semi-static data that doesn't
    require complex parameters. They use URI templates for flexible access.
    '''
    document_path = f"./docs/{name}"
    with open(document_path, "r") as f:
        return f.read()

@mcp.resource("config://settings/{key}")
async def get_setting(key: str, ctx: Context) -> str:
    '''Expose configuration as resources with context.'''
    settings = await load_settings()
    return json.dumps(settings.get(key, {}))
```

**Resources 與 Tools 使用時機**：
- **Resources**：以簡單參數（URI 模板）存取資料時
- **Tools**：需驗證與業務邏輯的複雜操作時

### 結構化輸出型別（Structured Output Types）

FastMCP 支援字串以外的多種回傳型別：

```python
from typing import TypedDict
from dataclasses import dataclass
from pydantic import BaseModel

# TypedDict for structured returns
class UserData(TypedDict):
    id: str
    name: str
    email: str

@mcp.tool()
async def get_user_typed(user_id: str) -> UserData:
    '''Returns structured data - FastMCP handles serialization.'''
    return {"id": user_id, "name": "John Doe", "email": "john@example.com"}

# Pydantic models for complex validation
class DetailedUser(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime
    metadata: Dict[str, Any]

@mcp.tool()
async def get_user_detailed(user_id: str) -> DetailedUser:
    '''Returns Pydantic model - automatically generates schema.'''
    user = await fetch_user(user_id)
    return DetailedUser(**user)
```

### 生命週期管理（Lifespan Management）

初始化在多次請求間持續存在的資源：

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def app_lifespan():
    '''Manage resources that live for the server's lifetime.'''
    # Initialize connections, load config, etc.
    db = await connect_to_database()
    config = load_configuration()

    # Make available to all tools
    yield {"db": db, "config": config}

    # Cleanup on shutdown
    await db.close()

mcp = FastMCP("example_mcp", lifespan=app_lifespan)

@mcp.tool()
async def query_data(query: str, ctx: Context) -> str:
    '''Access lifespan resources through context.'''
    db = ctx.request_context.lifespan_state["db"]
    results = await db.query(query)
    return format_results(results)
```

### 傳輸選項（Transport Options）

FastMCP 支援兩種主要傳輸：

```python
# stdio transport (for local tools) - default
if __name__ == "__main__":
    mcp.run()

# Streamable HTTP transport (for remote servers)
if __name__ == "__main__":
    mcp.run(transport="streamable_http", port=8000)
```

**傳輸選擇**：
- **stdio**：命令列工具、本機整合、子行程執行
- **Streamable HTTP**：Web 服務、遠端存取、多客戶端

---

## 程式碼最佳實踐（Code Best Practices）

### 可組合性與重用（Code Composability and Reusability）

實作須**優先考慮可組合與程式碼重用**：

1. **抽出共通功能**：
   - 為多個 tool 共用的操作建立可重用 helper
   - 以共用的 API client 發送 HTTP 請求，勿重複寫
   - 將錯誤處理集中到工具函式
   - 將業務邏輯抽出為可組合的函式
   - 抽出共用的 Markdown/JSON 欄位選擇與格式化邏輯

2. **避免重複**：
   - 切勿在 tool 之間複製貼上相似程式碼
   - 若相同邏輯寫了兩次，請抽出成函式
   - 分頁、篩選、欄位選擇、格式化等應共用
   - 認證／授權邏輯應集中

### Python 專用最佳實踐（Python-Specific Best Practices）

1. **型別提示**：函式參數與回傳值一律加上型別註解
2. **Pydantic Models**：所有輸入驗證以清楚的 Pydantic model 定義
3. **避免手動驗證**：以 Pydantic 的約束處理輸入驗證
4. **匯入分組**：標準庫、第三方、本機分組
5. **錯誤處理**：使用具體例外型別（如 httpx.HTTPStatusError，勿用通用 Exception）
6. **Async context manager**：需清理的資源使用 `async with`
7. **常數**：模組層級常數以 UPPER_CASE 定義

## 品質檢查清單（Quality Checklist）

完成 Python MCP 伺服器前請確認：

### 策略設計（Strategic Design）
- [ ] Tools 支援完整工作流程，而非僅包裝 API 端點
- [ ] Tool 名稱反映自然的任務切分
- [ ] 回應格式有利 agent context 效率
- [ ] 適當處使用人類可讀識別碼
- [ ] 錯誤訊息能引導 agent 正確使用

### 實作品質（Implementation Quality）
- [ ] FOCUSED IMPLEMENTATION: Most important and valuable tools implemented
- [ ] All tools have descriptive names and documentation
- [ ] Return types are consistent across similar operations
- [ ] Error handling is implemented for all external calls
- [ ] Server name follows format: `{service}_mcp`
- [ ] All network operations use async/await
- [ ] Common functionality is extracted into reusable functions
- [ ] Error messages are clear, actionable, and educational
- [ ] Outputs are properly validated and formatted

### Tool 設定（Tool Configuration）
- [ ] 所有 tool 在裝飾器中實作 'name' 與 'annotations'
- [ ] 註解正確設定（readOnlyHint、destructiveHint、idempotentHint、openWorldHint）
- [ ] 所有 tool 以 Pydantic BaseModel 與 Field() 做輸入驗證
- [ ] 所有 Pydantic Field 有明確型別、描述與約束
- [ ] 所有 tool 有完整 docstring 與明確的 input/output 型別
- [ ] Docstring 含 dict/JSON 回傳的完整 schema 結構
- [ ] 以 Pydantic model 處理輸入驗證（無需手動驗證）

### 進階功能（視情況）（Advanced Features）
- [ ] 已使用 Context 注入做 logging、進度或 elicitation
- [ ] 適當的資料端點已註冊為 Resources
- [ ] 已實作 Lifespan 管理以維持連線
- [ ] 已使用結構化輸出型別（TypedDict、Pydantic models）
- [ ] 已設定適當傳輸（stdio 或 streamable HTTP）

### 程式碼品質（Code Quality）
- [ ] 檔案含正確匯入（含 Pydantic）
- [ ] 適用處已正確實作分頁
- [ ] 對可能很大的結果集提供篩選選項
- [ ] 所有 async 函式以 `async def` 正確定義
- [ ] HTTP client 依 async 模式並使用適當 context manager
- [ ] 程式碼全程使用型別提示
- [ ] 常數在模組層級以 UPPER_CASE 定義

### 測試（Testing）
- [ ] 伺服器可正常執行：`python your_server.py --help`
- [ ] 所有 import 正確解析
- [ ] 範例 tool 呼叫運作正常
- [ ] 錯誤情境有妥善處理
