# SVG Skills

七個 `svg-` Skills 採用與 Three.js 系列相同的命名方式，以 `svg-development` 作為總入口。它們是可供 AI 使用的工作指引與本地資源，並非一次裝入整套繪圖軟體。每個 Skill 都可獨立安裝，無強制的兄弟 Skill 依賴。

## 能力與安裝分類

| Skill | 用途 | 畫圖與圖像處理 | 網頁與介面設計 |
|---|---|:---:|:---:|
| [`svg-development`](../skills/svg-development/SKILL.md) | 總入口、基本修圖與跨能力協調 | ✓ | ✓ |
| [`svg-design`](../skills/svg-design/SKILL.md) | 路徑、圖示、漸層、遮罩、sprite 與嵌入 | ✓ | ✓ |
| [`svg-illustration`](../skills/svg-illustration/SKILL.md) | 可編輯插畫、角色、場景與局部修改 | ✓ | |
| [`svg-vectorization`](../skills/svg-vectorization/SKILL.md) | 將提供的點陣圖重建成真正的向量幾何 | ✓ | |
| [`svg-animation`](../skills/svg-animation/SKILL.md) | CSS／SMIL／JS 動畫、角色狀態與路徑轉場 | ✓ | ✓ |
| [`svg-optimization`](../skills/svg-optimization/SKILL.md) | 保留功能與外觀的容量、路徑及 sprite 最佳化 | ✓ | ✓ |
| [`svg-visual-validation`](../skills/svg-visual-validation/SKILL.md) | 結構預檢、渲染檢視、版本與參考圖比對 | ✓ | ✓ |

沿用現有 **15 個用途分類**；沒有額外增加安裝選單。「畫圖與圖像處理」直接包含 13 個 Skills 與 2 個子代理，「網頁與介面設計」直接包含 45 個 Skills 與 11 個子代理。數量為分類直接成員，安裝預覽還會列出必要或建議配套及去重結果。舊式單類型 catalog 中，七個項目皆屬 `frontend-design`，該分類目前 41 個 Skills。

## 如何安裝與更新

Windows 一個指令開啟互動選擇器：

```powershell
powershell -ExecutionPolicy Bypass -NoProfile -Command '$s = irm https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/setup.ps1; & ([scriptblock]::Create($s))'
```

Linux／macOS：

```bash
curl -fsSL https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/setup.sh | bash
```

依序選擇環境、全域或專案、全部或指定分類；選「畫圖與圖像處理」即可取得完整 SVG 系列及該分類子代理。選「網頁與介面設計」取得網頁常用五項及介面相關子代理。寫入前可核對完整預覽。完整平台與目錄說明見[互動安裝指南](interactive-installation.md)。

已下載 repository 時，可以先預演單顆安裝：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install.ps1 -SourceDir . -Target codex -Type skill -Name svg-design -DryRun
```

```bash
bash scripts/install.sh --source-dir . --target codex --type skill --name svg-design --dry-run
```

確認後移除預演參數即可安裝。分類參數為 `-Type bundle -Bundle image-graphics` 或 `--type bundle --bundle image-graphics`。專案安裝使用 `-Target project -ProjectPlatform codex -InstallDir <專案根目錄>`，Bash 對應 `--target project --project-platform codex --dir <專案根目錄>`。

更新時重新執行同一個選擇器，選相同環境、範圍與分類。安裝器不記住上次的分類選擇；會依 ownership 檢查更新選中的套件，人工修改或未知來源衝突會停止並說明，避免直接覆蓋。更新後開啟新的 AI 工作階段。這次新增 Skills 不需要更換安裝指令。

## 配套關係

七個項目無 `required` 兄弟 Skill。總入口可直接完成簡單 SVG；有特定需求時才選取專門工作流程。條件配套不會隨單顆安裝自動追加；用途分類的直接成員則固定一起安裝。

- 設計、插畫、向量化、動畫或最佳化需要可重現比對時，可搭配 `svg-visual-validation`；缺少它時仍可直接使用目標瀏覽器或既有渲染工具，誠實記錄未完成的檢查。
- `logo-design` 保留品牌概念職責，`lobe-icons-usage` 保留既有圖示選用職責，catalog 以 `related` route 指向 SVG 技術編輯。
- `image-generator` 在要求可編輯向量時使用插畫／向量化指引；`frontend-developer` 在介面包含 SVG 時使用總入口／動畫指引；`ui-designer` 提供 SVG 設計建議；`ui-visual-validator` 提供比對證據。這些關聯均為 `conditional`，不改變角色原本的讀寫權限。
- 子代理是否可由主代理實際呼叫，仍依 AI 平台支援與設定；安裝檔案本身不等於自動委派已啟用。

外部工具依成果選用：手寫 SVG 不需要 Node、Python、模型 API 或 GPU；`inspect_svg.py` 需要 Python 3.10+，只用標準函式庫；瀏覽器負責網頁與動態輸出；專案本地 SVGO、tracer、CairoSVG／librsvg 或圖片比較工具皆為條件工具，不隨安裝自動下載。純向量化不得以內嵌點陣圖冒充可編輯幾何。

## 參考來源與改寫

已實際閱讀以下上游指引與授權，固定 commit、tree、參考路徑和 blob，並以 CraftRoster 的可獨立安裝與跨平台流程重新整理。不是只改名稱。每個安裝套件內的 `references/upstream-notice.md` 保留完整 MIT 通知、固定來源連結與使用範圍。

| 上游 | 固定 revision | 採用內容 |
|---|---|---|
| [OpenData SVG Design](https://github.com/tryopendata/skills/tree/f97583ecb7eeb8a0c2a193fe9b80e55806d29823/plugins/opendesign/skills/svg-design) | `f97583ecb7eeb8a0c2a193fe9b80e55806d29823` | SVG 設計、編輯、動畫與最佳化指引；MIT／OpenData |
| [syi0808/svg-skills](https://github.com/syi0808/svg-skills/tree/c5937c2bed48aff98c12cda43ccba2ed6f2880f0) | `c5937c2bed48aff98c12cda43ccba2ed6f2880f0` | 插畫、向量重建、分層與結構／視覺證據區分；MIT／Yein Sung |
| [molauu/svg-character-animator](https://github.com/molauu/svg-character-animator/tree/5ee1e7845caefe2c9ab51c64a2aa6f386e72ef5b) | `5ee1e7845caefe2c9ab51c64a2aa6f386e72ef5b` | 角色狀態、逐部件轉場、拓樸與中斷清理架構；MIT／molauu |

主要來源記錄於 [source manifest](../scripts/data/skill-reference-sources.json) 與 [provenance lock](../scripts/data/skill-reference-lock.json)；動畫的補充 OpenData 參考另見該套件的固定來源通知。

調整包含：移除上游強制問卷、平台專屬路徑與外掛假設；不用全域安裝或預設覆蓋原圖；不使用不完整的路徑解析器或固定通用精度。molauu 的範例圖另採 [CC BY-NC 4.0](https://github.com/molauu/svg-character-animator/blob/5ee1e7845caefe2c9ab51c64a2aa6f386e72ef5b/examples/LICENSE.md)，本專案未收錄那些圖、內嵌它們的 Studio 頁面或上游動畫引擎。原創檢查程式不宣稱相容上游 validator 的全部能力。

## 驗證方式與界線

`npm run validate` 檢查 catalog、來源、依賴、評估案例與 review registry。`npm run test:svg-series` 在私有暫存專案測試七個獨立安裝、兩種用途分類、資源完整性、ownership、重複更新與 SVG 預檢。Windows 可用 `-- --powershell powershell.exe` 或指定 `pwsh.exe`；Linux 使用 `-- --shell bash`。測試不寫入使用者實際的全域 Skills 目錄。

新增 21 個成果案例定義與 32 個路由案例定義，用來描述真實任務的預期結果，**不等於模型任務已執行或每種 SVG 都已通過視覺測試**。結構通過、渲染成功、實際看圖、參考圖一致是四種不同證據。靜態預檢不支援的 CSS／動畫，應由 `web` profile 加上目標瀏覽器檢查；程式不會刪除功能來製造通過，也不是上傳檔案的安全清洗器。

本次實際執行的驗證、環境與限制見 [驗證紀錄](audits/svg-series-2026-10-15/verification.md)。
