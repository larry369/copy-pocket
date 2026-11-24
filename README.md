# copy-pocket

本機端的常用指令收納工具，以 React + Tauri 2 建立。可依分類與群組整理指令、快速搜尋與複製，並支援視窗固定、透明度、主題、語系與字級設定。資料只存放在本機，不會上傳。  
A local snippet and command organizer built with React + Tauri 2. Organize commands by category and group, search and copy quickly, and customize window pinning, transparency, theme, language, and font size. All data is stored locally and is never uploaded.

---

## 使用說明 / User Guide

### 1. 分類 / Categories

- 點上方「+ 分類」建立新分類。
- 點「編輯」進入分類管理，可：
  - 拖曳左側 `⠿` 調整分類順序。
  - 重新命名分類。
  - 鎖定／解鎖分類；鎖定後無法刪除，可避免誤刪。
  - 刪除分類；刪除時該分類的群組與指令會一併刪除，且無法復原。
- 點分類頁籤切換目前分類；分類搜尋框可過濾頁籤。
- **響應式排版：**
  - **寬視窗（`> 900px`）：** 自動變成兩欄排版（左邊垂直分類清單、右邊指令清單），左側固定顯示分類清單，不使用下拉選單，也不會顯示收合按鈕。
  - **窄視窗（`≤ 900px`）：** 恢復單欄排版。分類搜尋框右側的箭頭可收合／展開上方分類區；收合後會變成下拉選單，可直接切換分類。

---

- Click **+ Category** at the top to create a new category.
- Click **Edit** to enter category management, where you can:
  - Drag the `⠿` handle on the left to reorder categories.
  - Rename categories.
  - Lock/unlock categories (locked categories cannot be deleted, preventing accidental removal).
  - Delete categories (deleting a category permanently removes all groups and commands within it and cannot be undone).
- Click a category tab to switch to that category, or use the category search box to filter tabs.
- **Responsive Layout:**
  - **Wide Window (`> 900px`):** Automatically switches to a two-column layout with a vertical category list on the left and the command list on the right. The sidebar stays permanently visible without a dropdown menu or collapse button.
  - **Narrow Window (`≤ 900px`):** Restores the single-column layout. Click the arrow to the right of the category search box to collapse or expand the top category area; when collapsed, it turns into a dropdown menu for quick switching.

### 2. 指令與群組 / Commands & Groups

- 點搜尋列下方的「+ 指令」新增目前分類的指令。標題可留空，說明與指令內容建議填寫。
- 點「+ 群組」新增群組。
- 群組標題列的 `+` 可直接在該群組內新增指令，並自動帶入所屬群組。
- **拖曳排序與移動：**
  - 指令卡片左側的 `⠿` 可拖曳到群組或「未分組」，放開後即完成移動。
  - 群組標題左側的 `⠿` 可調整群組順序；群組內的指令會跟著一起排序。
  - 拖曳按住時，游標靠近清單上下邊緣會自動捲動；滑鼠滾輪在拖曳期間也會直接捲動清單或分類頁籤。
- 群組可收合／展開。即使目前分類還沒有指令，已建立的群組仍會顯示，方便直接加入指令。
- 刪除群組時，群組內的指令會回到「未分組」，不會被刪除。

---

- Click **+ Command** below the search bar to add a command to the current category. The title is optional, though filling in the description and command content is recommended.
- Click **+ Group** to create a new group.
- Click the `+` button in a group's header bar to add a command directly to that group with the group pre-selected.
- **Drag & Drop:**
  - Drag the `⠿` handle on the left of a command card to move it into a group or **Ungrouped**, then release to drop.
  - Drag the `⠿` handle on the left of a group header to reorder groups (commands inside move along with the group).
  - Moving your cursor near the top or bottom edge of the list while dragging triggers auto-scrolling. You can also use the mouse wheel during a drag to scroll lists or category tabs.
- Groups can be collapsed or expanded. Empty groups remain visible in the current category so you can easily add commands to them later.
- Deleting a group moves its commands back to **Ungrouped** without deleting them.

### 3. 搜尋與快捷鍵 / Search & Shortcuts

- **指令搜尋：** 搜尋目前分類的標題、說明與指令內容。
- **`Ctrl + K`（macOS 為 `⌘ + K`）：** 直接聚焦指令搜尋框。
- **`Esc`：** 關閉選單、表單或對話框；若焦點在搜尋框，會清空搜尋條件。
- **複製指令：** 點指令框或右側複製鈕可複製完整指令。
- **選取與捲動：** 一般左鍵拖曳可用於選取指令框內的文字；內容過長時可拖曳水平捲軸，或使用 `Shift + 左鍵拖曳`、中鍵拖曳來水平移動。

---

- **Search:** Filters by title, description, and command content within the current category.
- **`Ctrl + K` (`⌘ + K` on macOS):** Focuses the command search box.
- **`Esc`:** Closes open menus, forms, or dialogs; if the search box is focused, clears the current search query.
- **Copy:** Click a command box or the copy button on the right to copy the full command.
- **Select & Scroll:** Select text inside a command box with a normal left-click drag. For long commands, use the horizontal scrollbar, `Shift + Left-click drag`, or `Middle-click drag` to pan horizontally.

### 4. 外觀與視窗 / Appearance & Window Controls

- **彈窗表單：** 新增／編輯分類、群組、指令的表單一律以置中且較大的彈窗顯示（窄視窗也一樣），不會往下擠或擠在兩欄中的任一側。
- **透明度滑桿（左上角）：** 調整視窗透明度，範圍為 `40%–100%`（預設 `100%`）。數值越低越能看到後面的視窗。*（僅在 Tauri 桌面版生效，Windows 使用原生視窗透明度。）*
- **視窗置頂（右側大頭針按鈕）：** 切換視窗是否永遠在最上層。*（僅在 Tauri 桌面版生效。）*
- **設定選單（右上角）：**
  - **主題：** 深色／淺色 *（深色為深灰階）*。
  - **語系：** 繁中／English。
  - **字級：** 小／中／大。

---

- **Modals:** Forms for adding/editing categories, groups, and commands always open in a large, centered modal dialog (even in narrow windows) so they never get squished into a single column.
- **Transparency Slider (Top-left):** Adjusts window opacity between `40%` and `100%` (default: `100%`). Lower values make underlying windows more visible. *(Tauri desktop app only; Windows uses native window transparency.)*
- **Pin Button (Right):** Toggles "Always on Top" mode. *(Tauri desktop app only.)*
- **Settings Menu (Top-right):**
  - **Theme:** Dark / Light *(Dark mode uses a dark grayscale palette)*.
  - **Language:** 繁中 (Traditional Chinese) / English.
  - **Font Size:** Small / Medium / Large.

### 5. 資料存放 / Data Storage

- 分類、群組、指令與偏好設定都存放在本機 WebView 的 `localStorage`，不需要登入或連網。
- 清除應用程式資料、WebView 資料或移除 App 會一併清除這些資料。目前沒有內建匯出／匯入功能。

---

- All categories, groups, commands, and preferences are stored locally in the WebView's `localStorage`. No login or internet connection is required.
- Clearing app data, clearing WebView data, or uninstalling the app will erase all saved data. Built-in export/import features are not currently available.

---

## 開發 / Development

```bash
npm install          # 安裝依賴套件 / Install dependencies
npm run dev          # Vite 開發伺服器 / Start Vite dev server (http://localhost:1420)
npm run build        # TypeScript 檢查 + 前端打包到 dist/ / Run TypeScript check + bundle to dist/
npm run tauri dev    # Tauri 桌面開發模式 / Run Tauri desktop app in dev mode
npm run tauri build  # 產生桌面安裝檔／執行檔 / Build desktop installer or executable
```

- **環境需求 / Prerequisites:** 建置桌面版需要 [Rust 工具鏈](https://rust-lang.org)（Building the desktop version requires the Rust toolchain）。
- **Windows 執行環境 / Windows Runtime:** 執行需要 **WebView2 Runtime**；若執行檔同層放有 `WebView2Runtime` 資料夾，程式會優先使用它（Running on Windows requires WebView2 Runtime; if a `WebView2Runtime` folder is placed alongside the executable, it will be prioritized）。

---

## 授權與使用條款 / License & Usage Terms

Copyright (c) 2026 larry369.

本專案採用 **MIT + Commons Clause** 授權（詳見 [LICENSE](LICENSE) 檔案）。歡迎免費下載、修改，或於**個人及公司內部使用**；但未經作者書面同意，嚴禁直接販售本工具，或將其作為付費產品、商業服務向第三方收費。

This project is licensed under the **MIT License with Commons Clause** — see the [LICENSE](LICENSE) file for details. It is free to use, modify, and deploy for **personal or internal company use**. However, selling this software or offering it as a paid product/service to third parties is strictly prohibited without prior written permission from the author.
