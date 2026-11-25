# copy-pocket

本機端的常用指令收納工具，以 React + Tauri 2 建立。可依分類與群組整理指令、快速搜尋與複製，並支援視窗固定、透明度、主題、語系與字級設定。資料只存放在本機，不會上傳。  
A local snippet and command organizer built with React + Tauri 2. Organize commands by category and group, search and copy quickly, and customize window pinning, transparency, theme, language, and font size. All data is stored locally and is never uploaded.

---

## 使用說明 / User Guide

### 1. 視窗操作 / Window Controls

- 標題列由左至右為：**設定選單**、**透明度滑桿**、**視窗置頂**；右側為：**縮小**、**迷你懸浮模式**、**單／雙欄切換**、**關閉**。
- 視窗已移除原生邊框，按住標題列空白處即可拖曳移動視窗。
- **透明度滑桿：** 範圍 `40%–100%`，預設 `100%`；`100%` 為完全不透明，數值越低越能看到後方視窗。迷你模式的展開面板內也有同一個滑桿。
- **視窗置頂：** 切換是否永遠顯示在最上層。
- **單／雙欄切換：** 一鍵切換單欄與左右雙欄排版；切換到雙欄時視窗會加寬，切回單欄會恢復原本寬度。
- **縮小／關閉：** 使用 Windows 原生視窗行為。
- 視窗相關操作僅在 Tauri 桌面版生效；在瀏覽器 `npm run dev` 中無法控制原生視窗。

---

- The title bar is arranged left to right as **Settings menu**, **Opacity slider**, **Always on top**; on the right are **Minimize**, **Mini floating mode**, **Single/split layout toggle**, and **Close**.
- The native window border is removed; drag any empty area of the title bar to move the window.
- **Opacity slider:** `40%–100%`, default `100%`. `100%` is fully opaque; lower values show windows behind it. The same slider is also available inside the expanded mini-mode panel.
- **Always on top:** Toggle whether the window stays above all other windows.
- **Single/split layout toggle:** Switch between single-column and side-by-side layouts. Split mode widens the window; returning to single-column restores the previous width.
- **Minimize / Close:** Use native Windows window behavior.
- Window controls only work in the Tauri desktop app; native window actions are unavailable in the browser dev server (`npm run dev`).

### 2. 分類 / Categories

- 點上方「+ 分類」建立新分類。
- 點「編輯」進入分類管理，可：
  - 拖曳左側 `⠿` 調整分類順序。
  - 重新命名分類。
  - 鎖定／解鎖分類；鎖定後無法刪除，可避免誤刪。
  - 刪除分類；刪除時該分類的群組與指令會一併刪除，且無法復原。
- 點分類頁籤切換目前分類；分類搜尋框可過濾頁籤。
- 單欄模式下可收合分類區；收合後會變成下拉選單，可直接切換分類。

---

- Click **+ Category** at the top to create a new category.
- Click **Edit** to enter category management, where you can:
  - Drag the `⠿` handle on the left to reorder categories.
  - Rename categories.
  - Lock/unlock categories (locked categories cannot be deleted, preventing accidental removal).
  - Delete categories (deleting a category permanently removes all groups and commands within it and cannot be undone).
- Click a category tab to switch to that category, or use the category search box to filter tabs.
- In single-column mode, the category area can be collapsed into a dropdown for quick switching.

### 3. 指令與群組 / Commands & Groups

- 點搜尋列下方的「+ 指令」新增目前分類的指令；標題可留空，建議填寫說明與指令內容。
- 點「+ 群組」新增群組；群組標題列的 `+` 可直接在該群組內新增指令，並自動帶入所屬群組。
- **拖曳排序與移動：**
  - 指令卡片左側的 `⠿` 可拖曳到群組或「未分組」，放開後即完成移動。
  - 群組標題左側的 `⠿` 可調整群組順序，群組內的指令會跟著一起排序。
  - 拖曳時游標靠近清單上下邊緣會自動捲動；滾輪也可在拖曳期間捲動清單或分類頁籤。
- 群組可收合／展開；即使目前分類還沒有指令，已建立的群組仍會顯示。
- 刪除群組時，群組內的指令會回到「未分組」，不會被刪除。
- **標題開關：** 可隱藏指令標題讓畫面更簡潔；隱藏後滑過或聚焦卡片仍會顯示標題。

---

- Click **+ Command** below the search bar to add a command to the current category. The title is optional, though filling in the description and command content is recommended.
- Click **+ Group** to create a new group. Click the `+` button in a group's header to add a command directly to that group with the group pre-selected.
- **Drag & Drop:**
  - Drag the `⠿` handle on the left of a command card to move it into a group or **Ungrouped**, then release to drop.
  - Drag the `⠿` handle on the left of a group header to reorder groups; commands inside move along with the group.
  - Moving the cursor near the top or bottom edge while dragging triggers auto-scrolling. The mouse wheel also scrolls lists or category tabs during a drag.
- Groups can be collapsed or expanded; empty groups remain visible in the current category.
- Deleting a group moves its commands back to **Ungrouped** without deleting them.
- **Title toggle:** Hide command titles for a cleaner view. Hidden titles still appear on hover or focus.

### 4. 搜尋、複製與快捷鍵 / Search, Copy & Shortcuts

- **指令搜尋：** 搜尋目前分類的標題、說明與指令內容。
- **`Ctrl + K`（macOS 為 `⌘ + K`）：** 直接聚焦指令搜尋框。
- **`Esc`：** 關閉選單、表單或對話框；若焦點在搜尋框，會清空搜尋條件。
- **複製指令：** 點指令框，或滑過指令框後點右側複製鈕，即可複製完整指令。
- **選取與捲動：** 一般左鍵拖曳可用於選取指令框內的文字；內容過長時可拖曳水平捲軸，或使用 `Shift + 左鍵拖曳`、中鍵拖曳來水平移動。

---

- **Search:** Filters by title, description, and command content within the current category.
- **`Ctrl + K` (`⌘ + K` on macOS):** Focuses the command search box.
- **`Esc`:** Closes open menus, forms, or dialogs; if the search box is focused, clears the current search query.
- **Copy:** Click a command box, or hover it and click the copy button on the right, to copy the full command.
- **Select & Scroll:** Select text inside a command box with a normal left-click drag. For long commands, use the horizontal scrollbar, `Shift + Left-click drag`, or `Middle-click drag` to pan horizontally.

### 5. 迷你懸浮模式 / Mini Floating Mode

- 點右側的迷你模式按鈕進入膠囊式懸浮視窗；視窗會在目前位置縮小，不會跳到角落。
- 拖曳膠囊左側的點狀握把或空白處即可移動視窗。
- 點膠囊上的分類名稱會展開分類下拉選單，可直接切換分類。
- 滑鼠移到膠囊上會展開指令面板；面板頂端有透明度滑桿，與主視窗共用同一設定。
- 膠囊與面板上的按鈕可置頂、展開回完整視窗、縮小或關閉。
- 迷你模式會跟隨主題、語系、字級與透明度設定；透明度 `100%` 時膠囊與面板為完全不透明。

---

- Click the mini-mode button on the right to switch to a compact floating capsule. The window shrinks in place instead of jumping to a corner.
- Drag the dotted handle on the left of the capsule, or any empty area, to move the window.
- Click the category name on the capsule to open a dropdown and switch categories.
- Hover over the capsule to expand the command panel. The opacity slider at the top of the panel is shared with the main window.
- Buttons on the capsule let you pin, restore the full window, minimize, or close it.
- Mini mode follows the configured theme, language, font size, and opacity. At `100%`, the capsule and panel are fully opaque.

### 6. 外觀設定 / Appearance Settings

- 點左上角設定選單可調整：
  - **主題：** 深色／淺色。
  - **語系：** 繁中／English。
  - **字級：** 小／中／大。
- 新增／編輯分類、群組、指令的表單一律以置中且較大的彈窗顯示，不會被擠在單一欄位中。
- 設定會套用到主視窗與迷你懸浮模式。

---

- Click the settings menu at the top left to configure:
  - **Theme:** Dark / Light.
  - **Language:** 繁中 (Traditional Chinese) / English.
  - **Font size:** Small / Medium / Large.
- Forms for adding or editing categories, groups, and commands always open in a large, centered modal and never get squeezed into one column.
- Settings apply to both the main window and mini floating mode.

### 7. 資料存放 / Data Storage

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
