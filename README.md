# copy-pocket

本機端的常用指令收納工具，以 React + Tauri 2 建立。可依分類與群組整理指令、快速搜尋與複製，並支援視窗固定、透明度、主題、語系與字級設定。資料只存放在本機，不會上傳。

## 使用說明

### 1. 分類

- 點上方「+ 分類」建立新分類。
- 點「編輯」進入分類管理，可：
  - 拖曳左側 `⠿` 調整分類順序。
  - 重新命名分類。
  - 鎖定／解鎖分類；鎖定後無法刪除，可避免誤刪。
  - 刪除分類；刪除時該分類的群組與指令會一併刪除，且無法復原。
- 點分類頁籤切換目前分類；分類搜尋框可過濾頁籤。
- 視窗拉寬到 900px 以上時，會自動變成兩欄排版：左邊是垂直分類清單，右邊是指令清單；拉回窄視窗則恢復單欄。
- 窄視窗時，分類搜尋框右側的箭頭可收合／展開上方分類區；收合後會變成下拉選單，可直接切換分類。寬視窗兩欄模式下左側固定顯示分類清單，不使用下拉選單，也不會顯示收合按鈕。

### 2. 指令與群組

- 點搜尋列下方的「+ 指令」新增目前分類的指令。標題可留空，說明與指令內容建議填寫。
- 點「+ 群組」新增群組。
- 群組標題列的 `+` 可直接在該群組內新增指令，並自動帶入所屬群組。
- 指令卡片左側的 `⠿` 可拖曳到群組或「未分組」，放開後即完成移動。
- 群組標題左側的 `⠿` 可調整群組順序；群組內的指令會跟著一起排序。
- 群組可收合／展開。即使目前分類還沒有指令，已建立的群組仍會顯示，方便直接加入指令。
- 刪除群組時，群組內的指令會回到「未分組」，不會被刪除。

### 3. 搜尋與快捷鍵

- 指令搜尋會搜尋目前分類的標題、說明與指令內容。
- `Ctrl + K`（macOS 為 `⌘ + K`）可直接聚焦指令搜尋框。
- `Esc` 可關閉選單、表單或對話框；若焦點在搜尋框，會清空搜尋條件。
- 點指令框或右側複製鈕可複製完整指令。
- 指令框內的內容可選取文字；內容過長時可拖曳水平捲軸查看。也可用 `Shift + 左鍵拖曳` 或中鍵拖曳來水平移動；一般左鍵拖曳用於選字。

### 4. 外觀與視窗

- 左上角滑桿調整視窗透明度，範圍為 40%–100%，預設 100%。數值越低越能看到後面的視窗；此功能在 Tauri 桌面版生效，Windows 使用原生視窗透明度。
- 右側大頭針按鈕可切換視窗是否永遠在最上層；此功能在 Tauri 桌面版生效。
- 右上角設定選單可調整：
  - 主題：深色／淺色（深色為深灰階）。
  - 語系：繁中／English。
  - 字級：小／中／大。

### 5. 資料存放

- 分類、群組、指令與偏好設定都存放在本機 WebView 的 `localStorage`，不需要登入或連網。
- 清除應用程式資料、WebView 資料或移除 App 會一併清除這些資料。目前沒有內建匯出／匯入功能。

## 開發

```bash
npm install
npm run dev          # Vite 開發伺服器：http://localhost:1420
npm run build        # TypeScript 檢查 + 前端打包到 dist/
npm run tauri dev    # Tauri 桌面開發模式
npm run tauri build  # 產生桌面安裝檔／執行檔
```

桌面版需要 Rust 工具鏈。Windows 執行需要 WebView2 Runtime；若執行檔同層放有 `WebView2Runtime` 資料夾，程式會優先使用它。

## License & Usage Terms / 授權與使用條款

Copyright (c) 2026 larry369.

This project is licensed under the **MIT License with Commons Clause** — see the [LICENSE](LICENSE) file for details.
It is free to use, modify, and deploy for **personal or internal company use**. However, selling this software or offering it as a paid product/service to third parties is strictly prohibited without prior written permission from the author.

本專案採用 **MIT + Commons Clause** 授權（詳見 [LICENSE](LICENSE) 檔案）。歡迎免費下載、修改，或於**個人及公司內部使用**；但未經作者書面同意，嚴禁直接販售本工具，或將其作為付費產品、商業服務向第三方收費。
