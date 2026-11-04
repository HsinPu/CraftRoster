# 遊戲開發分組與 Blender Skills 來源研究

研究日期：2026-11-04。整合狀態：**已納入 1.3.0，提供 10 個 Skills、2 個 Agents 與遊戲開發分類**。使用方式見 [Blender 指南](blender-skills.md)；下文保留來源研究與採用理由。

使用者希望有獨立的遊戲開發分組，第一批先加入 Blender 能力。初步研究直接核對上游 GitHub 的固定 commit、Skill 本文、部分腳本、目錄與 LICENSE；當時 CraftRoster 為 1.2.3，仍有 16 個用途分類、294 個 Skills、238 個 Agents。後續實作沒有安裝上游套件，改以本機 Blender 5.2.2 驗證自行撰寫的工具與資產流程，結果另記於 [實測紀錄](audits/blender-2026-11-04/README.md)。

## 建議採用方向

新增用途分類「遊戲開發」`game-development`，第一批以 Blender 遊戲資產製作為主。Blender 負責模型、材質、骨架、動畫與資產交付；玩法、引擎場景、執行效能與遊戲發布由後續引擎配套負責。

主要參考 **EL4CTEO 的模組與執行方式**，以 **arjun988 的製作流程及領域拆分**補足覆蓋，再借鏡 **majidmanzarpour 的參考圖量測與交付驗收**，以 setcodes 補充遊戲資產最佳化與分工方式。整合採獨立改寫，未將上游程式測試宣稱為本專案測試。

## 固定來源與授權

以下四個專案的根目錄 LICENSE 均已直接讀取，內容為 MIT；表內連結固定研究版本。正式套件已保存來源、commit、blob 與必要授權通知，並納入專案既有 provenance／originality 驗證。

| 專案 | 固定 commit | 實際範圍與適合參考的部分 |
|---|---|---|
| [EL4CTEO/blender-skills](https://github.com/EL4CTEO/blender-skills/tree/fb92cfb4cc5a238c22113a6a230b09f535bd0656) | `fb92cfb4cc5a238c22113a6a230b09f535bd0656` | 28 個 `blender-` Skills；模型、UV、PBR、烘焙、骨架、動畫、最佳化、匯出與 QA，含 Python scripts 與測試檔案。 |
| [arjun988/blender-skills](https://github.com/arjun988/blender-skills/tree/8f778d2405a214b508d4c7d80742be8e43acdd52) | `8f778d2405a214b508d4c7d80742be8e43acdd52` | `.claude/skills/` 有 94 個 Skills，另有 Cursor 鏡像；包含製作總監、角色／道具／環境、風格、LOD、碰撞體及各引擎匯出。 |
| [majidmanzarpour/blender-game-skills](https://github.com/majidmanzarpour/blender-game-skills/tree/f0ef29385a03de139957e6f700b801cdc00b7e29) | `f0ef29385a03de139957e6f700b801cdc00b7e29` | 一個 `blender-image-to-3d` Skill，包含 scripts、references 與 build template；重點為參考圖、比例校準、階段驗收與重新匯入。 |
| [setcodes/gamedev-skills](https://github.com/setcodes/gamedev-skills/tree/096c224aa498a789fa99d476583029fcb9f538e1) | `096c224aa498a789fa99d476583029fcb9f538e1` | `game-designer`、`godot-gamedev`、`blender-game-assets` 三種職責；適合參考低模、烘焙、角色減面與遊戲鏡頭檢查。 |

授權原文：[EL4CTEO](https://github.com/EL4CTEO/blender-skills/blob/fb92cfb4cc5a238c22113a6a230b09f535bd0656/LICENSE)、[arjun988](https://github.com/arjun988/blender-skills/blob/8f778d2405a214b508d4c7d80742be8e43acdd52/LICENSE)、[majidmanzarpour](https://github.com/majidmanzarpour/blender-game-skills/blob/f0ef29385a03de139957e6f700b801cdc00b7e29/LICENSE)、[setcodes](https://github.com/setcodes/gamedev-skills/blob/096c224aa498a789fa99d476583029fcb9f538e1/LICENSE)。

### EL4CTEO：模組、背景執行與 QA

- [`blender-core`](https://github.com/EL4CTEO/blender-skills/blob/fb92cfb4cc5a238c22113a6a230b09f535bd0656/skills/blender-core/SKILL.md) 宣告 Blender 5.2+，提供 MCP live session 或 headless CLI 兩種路徑，並要求版本、場景、節點及操作 context 檢查。
- [`run_in_blender.py`](https://github.com/EL4CTEO/blender-skills/blob/fb92cfb4cc5a238c22113a6a230b09f535bd0656/skills/blender-core/scripts/run_in_blender.py) 使用系統 Python 尋找 Blender，再啟動其背景程序。其他專項會引用 core、QA 或最佳化；拆包時需明確表達依賴，不能只複製各自的 `SKILL.md`。
- [`blender-asset-qa`](https://github.com/EL4CTEO/blender-skills/blob/fb92cfb4cc5a238c22113a6a230b09f535bd0656/skills/blender-asset-qa/SKILL.md) 將數值檢查與多角度視覺檢查分開，並明列腳本無法完全判斷的比例、穿插、變形及材質意圖。超過預設 300k triangles 時部分幾何檢查會跳過；整合時必須呈現跳過項目。
- [`匯出 Skill`](https://github.com/EL4CTEO/blender-skills/blob/fb92cfb4cc5a238c22113a6a230b09f535bd0656/skills/blender-export-pipelines/SKILL.md) 與 [`export_asset.py`](https://github.com/EL4CTEO/blender-skills/blob/fb92cfb4cc5a238c22113a6a230b09f535bd0656/skills/blender-export-pipelines/scripts/export_asset.py) 提供各引擎設定與 GLB 結構摘要。結構摘要、Blender 重新匯入及目標引擎實測是不同層級的證據。

上游 README 宣稱有 headless Blender 測試；本次只核對測試檔案存在，沒有重跑，亦未證明各 OS、Blender 版本或引擎全部相容。

### arjun988：製作分工與共用文件

- [`blender-director`](https://github.com/arjun988/blender-skills/blob/8f778d2405a214b508d4c7d80742be8e43acdd52/.claude/skills/blender-director/SKILL.md) 可參考需求分析、預算、專項路由與製作 brief；它的 frontmatter 存在重複 `role` 鍵，改寫時需清理。
- 多個 Skills 讀取同層 `references/` 共用文件。例如 [`export-pipeline`](https://github.com/arjun988/blender-skills/blob/8f778d2405a214b508d4c7d80742be8e43acdd52/.claude/skills/export-pipeline/SKILL.md) 另外要求 asset-optimization 驗證。單顆複製會漏掉這些內容。
- [`MCP 指引`](https://github.com/arjun988/blender-skills/blob/8f778d2405a214b508d4c7d80742be8e43acdd52/.claude/skills/references/mcp-tools.md) 要求以實際 tool schema 為準；Poly Haven、Hyper3D 等是條件式服務，不應變成所有 Blender 工作的必要配套。
- 正式內容只有一套 94 Skills，不能把 `.claude/skills/` 與 `.cursor/skills/` 鏡像重複計算。大量通用名稱及風格分支應重新整理成有界的 `blender-` 系列，避免與既有能力搶路由。

### majidmanzarpour：參考圖建模與交付契約

- [`blender-image-to-3d`](https://github.com/majidmanzarpour/blender-game-skills/blob/f0ef29385a03de139957e6f700b801cdc00b7e29/skills/blender-image-to-3d/SKILL.md) 適合參考「量測 → blockout → 輪廓／比例檢查 → 材質／骨架 → 匯出」；未知背面與尺寸要標示推測。背景執行為主要路徑，MCP 選用，比較圖另需 Pillow。
- 輪廓對齊後的分數無法證明世界尺寸與位置；上游另外提供 world gate。門檻及鏡頭需依當前資產契約設定，不能把其預設值當通用品質標準。
- [`roundtrip.py`](https://github.com/majidmanzarpour/blender-game-skills/blob/f0ef29385a03de139957e6f700b801cdc00b7e29/skills/blender-image-to-3d/scripts/roundtrip.py) 產生 mesh、骨架、動畫等報告，沒有載入 manifest 自動逐項比對。完整契約核對需要另外實作或明確執行；腳本結束成功不等於所有交付項目通過。
- LICENSE 位於 repository 根目錄；獨立包裝時須連同必要通知保存。上游的逐階段確認要求應依使用者已授權範圍調整，不把每個技術步驟都變成重新詢問。

### setcodes：遊戲資產整理與工具邊界

- [`blender-game-assets`](https://github.com/setcodes/gamedev-skills/blob/096c224aa498a789fa99d476583029fcb9f538e1/skills/blender-game-assets/SKILL.md) 可參考高模轉低模、材質烘焙、角色權重及近景／遊戲鏡頭雙重檢查。Meshy 或 Mixamo 只適用特定分支。
- [`連接文件`](https://github.com/setcodes/gamedev-skills/blob/096c224aa498a789fa99d476583029fcb9f538e1/skills/blender-game-assets/references/connection.md) 指定 Blender Lab MCP add-on、JSON 加 NUL 的 socket protocol 與自帶 Python bridge。這不是可以直接假定與其他 Blender MCP 互換的介面。
- 本文含作者個人角色 FBX 偏好、特定日期的貼圖偏好與俯視群體遊戲預算。改寫時應改成專案確認的選項；來源中的單機效能數字不能作為一般效能承諾。

## 第一批整合分工

提供 `blender-development` 總入口，再將可獨立使用的專項拆包。使用者補充「建立後還要審查、改善外觀」，因此在原先 8 個製作／技術分工之外，加入 `blender-lookdev` 與唯讀的 `blender-visual-review`。較特殊的衣物、毛髮、天氣、影片剪輯與大量風格分支留待實際需求。

| Skill | 主責 |
|---|---|
| `blender-development` | 需求、版本／工具偵測、場景與檔案所有權、共同契約、條件路由 |
| `blender-modeling` | 道具／環境模型、拓撲與可重跑的建模流程 |
| `blender-reference-modeling` | 參考圖、比例／相機校準、推測紀錄與視覺比對 |
| `blender-materials-uv` | UV、PBR 材質、貼圖與烘焙 |
| `blender-rigging-animation` | 骨架、權重、動畫 clips、root motion 與變形驗證 |
| `blender-lookdev` | 材質、燈光、色彩層次與符合原方向的視覺改善 |
| `blender-game-optimization` | 三角形／貼圖預算、LOD、碰撞體與輸出資產成本 |
| `blender-export` | 依目標引擎匯出 GLB／FBX，產出設定與資產 manifest |
| `blender-asset-validation` | 幾何、材質、骨架、重新匯入、視覺證據及未驗證項目 |
| `blender-visual-review` | 實際看圖、優先修正建議、最後版本複查；不改場景或寫檔 |

搭配 `blender-artist` 實作子代理與 `blender-asset-reviewer` 唯讀子代理。前者在授權範圍內產生來源、匯出與驗證成果；後者檢查已有成果和證據，不能因安裝了製作 Skill 而取得場景修改權限。

## 安裝與依賴原則

1. **用途分組與來源分類分開維護。** 安裝選單的 `game-development` 包含上述 Blender 配套；Skill source category 為 `blender-creation`。入口路由不等於把所有專項設為必需依賴。
2. **專項可單獨安裝。** 共用文件若由 `blender-development` 擁有，專項用 `required` 且 `usage: resource` 補齊；這只帶入文件，不啟動總入口流程。總入口的專項選擇用 `conditional`，避免全量擴張或互相必需造成迴圈。
3. **依真正的契約決定必需配套。** 例如若匯出強制執行共用資產驗證，`blender-export` 必須宣告該依賴；QA 需要修復時是交接給對應專項，不反向強制安裝全部製作 Skills。
4. **外部 runtime 與 Skill 配套分開。** 實際製作需要 Blender；MCP 為 live session 分支，headless CLI 為另一執行路徑。Skill 安裝不自動安裝 Blender、修改主機 MCP 設定或啟用外部服務。缺少工具時精確列出未能執行的步驟。
5. **依目標接引擎。** Three.js、Unity、Godot、Unreal 的設定、文件與執行驗證只在該目標需要時加入。新分組不預設聯集整個 Three.js 或行動桌面分類。
6. **所有必要資源隨包交付。** 腳本、references、授權通知與同包 helper 要納入安裝完整性驗證；不能依賴上游 repository 才存在的外部相對路徑。

## 實作驗收準則

- 明確定義支援的 Blender 版本、host OS、headless／MCP 路徑與目標引擎；依實際 runtime API 核對，不直接沿用上游版本宣稱。
- 至少以靜態道具、帶骨架動畫角色及參考圖比例修正三種案例走完來源保存、匯出、重新匯入和視覺檢查。
- 保存 `.blend`、GLB／FBX、貼圖、資產 manifest、版本／參數及檢查證據；目標引擎未實際匯入或執行的項目要保持未驗證。
- 驗證單顆安裝、共用資源、條件依賴、分類合併去重、子代理權限與全域／專案範圍；同步 generators、README、固定來源與回歸案例。
- 本次整合增加 MINOR 至 1.3.0，更新為 304 Skills／240 Agents／17 用途。上游的測試檔案、Skill 被載入或 MCP tools 被發現，均不能替代實際資產與引擎驗證。
