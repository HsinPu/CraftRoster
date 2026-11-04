# Blender 遊戲資產製作與審查

CraftRoster 1.3.0 提供獨立用途分類 **遊戲開發 `game-development`**：一次安裝 10 個 `blender-` Skills 與 2 個子代理。第一批涵蓋 Blender 資產製作；引擎玩法、完整遊戲專案與發布流程不在本批範圍。

## 安裝

使用 [README 的互動安裝指令](../README.md#快速開始)，依序選環境、全域或專案範圍、指定分類，再選「遊戲開發」。既有安裝重跑同一分類即可更新，仍受 ownership 與人工修改保護。

本機 checkout 也可指定分類，例如 Codex 專案安裝：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1 -SourceDir . -Target project -ProjectPlatform codex -InstallDir C:\projects\my-game -Type bundle -Bundle game-development
```

```bash
bash scripts/install.sh --source-dir . --target project --project-platform codex --dir /path/to/my-game --type bundle --bundle game-development
```

安裝 Skill 不會安裝 Blender、MCP add-on、遊戲引擎或付費服務。實際建模需要可用的 Blender CLI，或已連接且有權操作目標場景的 MCP。外部工具缺少時必須說明未執行項目。

## 內容與獨立安裝

| Skill | 主責 |
|---|---|
| [`blender-development`](../skills/blender-development/) | 共用資產契約、版本／工具、操作範圍、製作與驗收路由 |
| [`blender-modeling`](../skills/blender-modeling/) | 形體、道具／環境、拓撲與建模修正 |
| [`blender-reference-modeling`](../skills/blender-reference-modeling/) | 參考圖、相機／比例校準與推測紀錄 |
| [`blender-materials-uv`](../skills/blender-materials-uv/) | UV、PBR、貼圖與烘焙 |
| [`blender-rigging-animation`](../skills/blender-rigging-animation/) | 骨架、權重、clips 與變形 |
| [`blender-lookdev`](../skills/blender-lookdev/) | 材質層次、色彩、照明、視覺重點與呈現 |
| [`blender-game-optimization`](../skills/blender-game-optimization/) | 依遊戲需求設定預算、LOD、碰撞體與最佳化 |
| [`blender-export`](../skills/blender-export/) | 指定目標格式、重新匯入與交付契約 |
| [`blender-asset-validation`](../skills/blender-asset-validation/) | 技術檢查、證據有效性與明確未驗證項目 |
| [`blender-visual-review`](../skills/blender-visual-review/) | 唯讀看圖、依風格與用途提出修正、複查 |

總入口可獨立安裝。其餘專項都以 `required / usage: resource` 帶入總入口的共用文件，不會因此啟動完整製作流程或全部專項。`blender-export` 另外必需 `blender-asset-validation`。例如單裝 modeling 共 2 個 Skills；單裝 export 共 3 個。

搭配角色：

- [`blender-artist`](../agents/blender-artist.md)：在授權範圍製作、修正、渲染、匯出及保存證據。
- [`blender-asset-reviewer`](../agents/blender-asset-reviewer.md)：唯讀審核現有圖片、報告與檔案，回傳優先修正事項；不修改場景、產生新渲染或寫報告。

分類不預設帶入整個 Three.js、行動桌面分類或特定引擎。相關引擎支援依專案實際需要另選。

## 從建立到改善

1. **確認方向。** 保留已有風格、參考圖、尺寸、遊戲鏡頭、螢幕大小、預算與檔案範圍；不套用固定的「好看」模板。
2. **先做主要形體。** 優先處理輪廓、比例與辨識度，再進入材質、細節和動畫。
3. **取得實際畫面。** 檢視遊戲鏡頭與必要的 clay、線框、材質或姿勢圖；美化打光不能替代診斷圖。
4. **分開驗收。** 技術檢查核對明確契約；視覺審查實際看圖，評估輪廓、層次、配色、材質、穿插與風格一致性；引擎驗收需要真的匯入並執行。
5. **依影響修正並複查。** 製作者修正最有影響的問題，用相同鏡頭與設定產生前後圖。獨立 reviewer 可用時交由其審查，否則明確標示自我審查。
6. **交付最後版本。** 保留可編輯來源、必要輸出與當前證據。任何影響結果的修改都會使舊證據失效，不能只改報告狀態。

視覺審查回傳具體觀察、位置、影響、修正方向與複查條件。唯讀 reviewer 回覆內容由有寫入權限的製作者保存。是否符合藝術方向需依實際畫面判斷，沒有通用美感分數或「保證最漂亮」的自動通過門檻。

## 隨包工具與限制

- `run_blender.py`：啟動獨立背景程序，有 timeout 與失敗狀態；不是檔案系統 sandbox。
- `inspect_asset.py`：對明確 mesh 名稱檢查 evaluated geometry、三角形、尺寸、scale、FILE 貼圖與指定 UV／manifold／材質要求。它不驗證所有 rig、動畫、UV 重疊、程序材質或外部資源類型。
- `check_delivery.py`：核對來源、契約、輸出、已看過圖片的 hashes，以及技術／視覺／選用引擎報告；不會自行判斷圖片美感，也不是簽章認證。

呼叫方式與精確 JSON schema 見 [helper contract](../skills/blender-asset-validation/references/helper-contract.md)。未執行或不支援的檢查必須保持未驗證；Blender 重新匯入也不等於 Godot、Unity 或 Unreal 已通過。

## 驗證與來源

新增 28 個 output eval 案例定義，涵蓋 10 個 Skills；案例定義與實際模型／runtime 執行分開記錄。

```powershell
npm run test:blender-series -- --definitions
npm run test:blender-series -- --powershell powershell
python tests/blender-helpers.test.py
```

有 Blender 時，可再設定 `BLENDER_BIN` 執行原生檢查：

```powershell
$env:BLENDER_BIN = 'C:\path\to\blender.exe'
python tests/blender-helpers.test.py
python tests/blender-production.test.py
```

這次在 Windows 的 Blender 5.2.2 實測 scoped inspector、GLB 骨架／動畫 roundtrip、參考比例修正與道具製作／看圖改善。詳見 [實測紀錄](audits/blender-2026-11-04/README.md)。這些證據不建立所有 Blender 版本、host、FBX、複雜角色或遊戲引擎的完整支援矩陣。CI 執行分類／安裝與不需 Blender 的 helper 檢查；原生測試需額外提供 runtime。

本系列參考 [EL4CTEO、arjun988、majidmanzarpour 與 setcodes 四份固定來源](blender-game-development-research.md)，重新整理職責、共同資源、修正流程及驗收界線。每包保存來源 revision 與 MIT 通知；沒有內含上游的 MCP bridge、安裝器或付費服務設定。
