# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 目前狀態

這個 repo 還沒有程式碼。唯一的內容是 [AI 應用工程師 4–8 週學習計畫.md](AI%20%E6%87%89%E7%94%A8%E5%B7%A5%E7%A8%8B%E5%B8%AB%204%E2%80%938%20%E9%80%B1%E5%AD%B8%E7%BF%92%E8%A8%88%E7%95%AB.md)，它同時是這個專案的規格書與路線圖：八週逐週把能力疊加到同一個 repo，最後交出一份作品集。

因此目前**沒有 build / lint / test 指令**。要動工時，先讀學習計畫對應那一週的「實作任務」，再依下面的約定建立結構，不要自己另發明一套工具鏈。

## 畢業專題架構：金流異常處理助手

客服人員用自然語言問交易問題 → agent 查交易、查文件、擬回覆 → 遇到退款先停下來等人核准。所有元件都在這一個 repo 裡累積，各元件對應的週次：

| 元件 | 週次 | 內容 |
| --- | --- | --- |
| LLM 呼叫層 | W1 | 多供應商可切換、Pydantic 驗證的 structured output、streaming、exponential backoff 重試 |
| 假交易資料庫 | W2 | SQLite（訂單號、金額、狀態、錯誤碼、時間），全部是自己產的假資料 |
| 工具層 | W2 | 手寫 tool-use 迴圈（**不靠框架**）：查交易狀態、查錯誤碼說明；另加一個 MCP server 暴露查交易工具 |
| RAG | W3–W4 | Postgres + pgvector（Docker），公開金流串接文件，回答需附引用段落；W4 加 hybrid search（BM25 + 向量）與 rerank |
| Evals | W4、W6 | 30 題黃金測試集（問題 + 應命中段落 + 標準答案）、recall@5 / MRR、faithfulness（Ragas 或自寫 LLM-as-judge）、20 個端到端情境 |
| Agent 編排 | W5 | LangGraph：意圖判斷 → 查交易 → 查文件 → 擬回覆 →（需退款時）人工核准；用 checkpoint + interrupt 做 human-in-the-loop |
| 可觀測性 | W6 | 自架 Langfuse（Docker）接上 agent 每一步；回歸測試（promptfoo 或 pytest）進 GitHub Actions |
| 防護與部署 | W7 | PII 遮罩層、紅隊測試、FastAPI + Docker 部署 |

W1 的 `llm-basics` 是獨立練習 repo；W2 起的成果都疊在這個 repo 裡。

## 開發環境約定

- **Python 3.12，用 uv 管理**（不要用 pip / poetry / conda）。
- **Mac Apple Silicon**：要部署到 Cloud Run / Fly.io 時，build image 必須加 `--platform linux/amd64`。
- **Docker Desktop** 跑依賴服務：Postgres + pgvector（W3 起）、Langfuse（W6 起）。
- **模型選用**：開發和跑測試用小模型，只在做品質比較時才呼叫大模型；本地實驗用 Ollama。API key 要設用量上限。
- Evals 必須是**一個指令就能重跑**的腳本 —— 改 prompt 或換模型時靠它判斷有沒有退步，不靠手感。

## 不可違反的限制

這些來自學習計畫，是專案的核心賣點（金流背景 + AI 安全），不是可選項：

1. **資料來源**：只用公開文件與自己產生的假資料。不碰公司內部資料，不用真實卡號、真實個資。
2. **PII 遮罩**：卡號（Luhn 檢查）、身分證字號（格式比對）、電話，在送進模型**之前**就遮罩，log 裡也不留明碼。
3. **高風險動作**：退款這類工具要有金額上限 + 人工核准 + 稽核日誌。工具權限最小化。
4. **間接 prompt injection**：RAG 文件與工具回傳結果都視為不可信輸入。每發現一種 injection 手法就加進測試集。
5. **迴圈防護**：agent 一定要設最大步數與逾時，避免無限迴圈燒錢。
6. 能寫死的步驟就寫死成固定工作流，不要為了用 agent 而用 agent。

## Repo 衛生注意事項

`.gitignore` 是 Visual Studio 的模板（repo 原本是 .NET 專案的殼），尾端已補上 Python / uv 與機密檔案的規則：`.venv/`、`.env`、`.env.*`（但保留 `.env.example`）、`.pytest_cache/`、`.ruff_cache/`。

**還有一個繼承來的陷阱**：第 376 行的 `docker-compose.yml` 會讓 compose 檔被靜默忽略。W3（Postgres + pgvector）和 W6（Langfuse）都需要把 compose 檔提交進 repo，動到那一步時要先刪掉這條規則，或改用 `compose.yaml` 這個檔名。

## 課程教材（lessons/）

依學習計畫做成的 HTML 課程，一週一課。[lessons/index.html](lessons/index.html) 是索引。

**改樣式或互動時，只改 `lessons/assets/lesson.css` 和 `lesson.js`，然後跑建置：**

```
python3 lessons/build.py
```

它會把那兩個檔案內嵌回每一課的 HTML（`<!--SHARED-CSS:START-->` / `<!--SHARED-JS:START-->` 標記之間）。**不要直接改 HTML 裡被內嵌的那兩塊，下次建置會被覆蓋。**

為什麼要內嵌而不是用 `<link>`：課程 HTML 會被用各種方式打開，而以 `data:` URL 渲染時（例如某些預覽視窗）相對路徑的外部檔案載不到，頁面會變成沒樣式也沒互動。交付的檔案必須自給自足。

其他慣例：
- 課程內的「語法解剖」區塊用 `data-anno` 標在 `.cb` 上，每個 `.note` 用 `data-line="N"` 指定它對應程式碼的第幾行（1-based，含空行）。改動程式碼區塊後行號會跑掉，要一併更新。
- 教材裡的 Claude API 資訊（模型 ID、價格、參數）對照官方 SDK 文件，不要憑記憶寫。特別注意 `temperature` 在現行模型已移除、MCP 的伺服器類別是 `MCPServer`（不是舊版的 `FastMCP`）。

## 工作節奏

- 週間學概念做小練習，週末把當週技能疊加到畢業專題，週日 commit 並寫 3 行學習筆記。
- 每週都有明確產出（比較表、失敗案例筆記、評估對照表、流程圖、trace 截圖…）。這些產出就是面試素材，和程式碼一樣要留在 repo 裡。
- 文件、筆記、commit message 用繁體中文（與學習計畫一致）。
