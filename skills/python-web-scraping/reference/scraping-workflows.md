# Python 網頁擷取與 Scraping — 參考資料

Use this reference when the work centers on extracting data from web pages, feeds, or HTML documents.

## 目錄（Table of Contents）

- [觸發時機](#觸發時機)
- [邊界與分工](#邊界與分工)
- [先決策再抓取](#先決策再抓取)
- [請求策略](#請求策略)
- [解析策略](#解析策略)
- [分頁與爬行](#分頁與爬行)
- [動態頁面](#動態頁面)
- [正規化與去重](#正規化與去重)
- [輸出](#輸出)
- [測試](#測試)
- [營運準則](#營運準則)
- [檢查清單](#檢查清單)

---

## 觸發時機

- 擷取網站內容、目錄、文章列表、商品列表或 feeds
- 建立 crawler / scraper
- 解析 HTML 成為結構化 records
- 處理 pagination、重試、timeout、headers、session
- 判斷靜態 HTML、JSON endpoint，或需要 browser automation

---

## 邊界與分工

- 用 `browser-automation` 或 `playwright-automation` 處理需要授權點擊、登入狀態或 JS rendering 的資料擷取；只在成果是本機應用驗證或 UI debugging 時使用 `webapp-testing`。
- 用 `python-data-engineering` 處理擷取後的清理、join、聚合與資料管線。
- 用 `python-development` 處理一般 Python 架構、包裝與風格。
- 這份參考專注在抓取、解析、分頁、去重與輸出。

---

## 先決策再抓取

- 先找 API、feed、site map、export 或公開 JSON endpoint。
- 若 HTML 已足夠，就不要升級到 browser automation。
- 若頁面高度依賴 JS、登入狀態或互動流程，再選擇可用的 `browser-automation` 或 `playwright-automation` 擷取路徑。
- 抓取前先定義輸出 schema 與唯一識別鍵。

---

## 請求策略

- 預設使用明確的 timeout。
- 用 session 保持 headers、cookies 與連線重用。
- 針對暫時性失敗做有限重試與 exponential backoff。
- 設定合理的 `User-Agent` 與 accept headers。
- 保持 concurrency 保守，避免打爆對方服務。

```python
import httpx


async def fetch_page(url: str) -> str:
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        response = await client.get(url, headers={"User-Agent": "CraftRosterBot/1.0"})
        response.raise_for_status()
        return response.text
```

---

## 解析策略

- 用最穩定的語意節點，而不是最長的 CSS path。
- 先抽 title、url、id、date、price 等核心欄位，再補充 metadata。
- HTML 結構常變時，優先找 `data-*` 屬性、canonical link、schema.org 標記或 JSON-LD。
- 保持 fetch 與 parse 分離，讓 parser 可單獨測試。

```python
from bs4 import BeautifulSoup
from urllib.parse import urljoin


def parse_links(html: str, base_url: str) -> list[dict[str, str]]:
    soup = BeautifulSoup(html, "html.parser")
    items = []
    for card in soup.select("article a[href]"):
        title = card.get_text(" ", strip=True)
        href = urljoin(base_url, card["href"])
        if title:
            items.append({"title": title, "url": href})
    return items
```

---

## 分頁與爬行

- 先識別 pagination 模式：next link、page number、cursor、offset、infinite scroll。
- 保留已訪問 URL 或 cursor，避免循環。
- 盡量把 crawl frontier 記錄成可重啟狀態。
- 大型爬行任務要能暫停、續跑與分批寫出。

---

## 動態頁面

- 優先抓 network 可見的 JSON API 或頁面內嵌資料。
- 若一定要 browser，轉交給 `browser-automation` 或 `playwright-automation`；擷取資料本身不代表要啟動本機應用 QA。
- 不要把 browser automation 當作默認策略。

---

## 正規化與去重

- 清理空白、不可見字元、HTML entity 與重複分隔符。
- 統一日期時區與格式。
- 對 URL 取 canonical form。
- 以穩定 key 去重，而不是以整列文字比對。

```python
from urllib.parse import urlsplit, urlunsplit


def canonicalize_url(url: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, parts.query, ""))
```

---

## 輸出

- 小型結果可輸出為 JSON 或 CSV。
- 若要做後續分析，改交給 `python-data-engineering`。
- 保留原始欄位與解析後欄位，方便追蹤來源。
- 寫出前排序 key，讓輸出可重現。

---

## 測試

- 用固定 HTML fixture 測 parser。
- 驗證欄位抽取、空值處理、URL 正規化與去重。
- 不要在單元測試中依賴外網。
- 需要實際站點驗證時，分成小型 smoke test。

```python
def test_parse_links():
    html = "<article><a href='/a'>Alpha</a></article>"
    assert parse_links(html, "https://example.com")[0]["url"] == "https://example.com/a"
```

---

## 營運準則

- 尊重服務條款與 rate limits。
- 不要嘗試繞過 access controls、captcha 或 paywall。
- 對 429 / 403 / 5xx 做有限退避。
- 記錄抓取時間、來源、使用的 selector 與失敗頁面。

---

## 檢查清單

- [ ] 已先確認 API / feed / export 是否更適合
- [ ] fetch 與 parse 已分離
- [ ] timeout、retry、headers 已設定
- [ ] pagination / crawl frontier 可重啟
- [ ] 已定義 canonical key 與去重規則
- [ ] 動態頁面沒有誤用 browser automation
- [ ] 輸出可重現、可測、可追蹤
