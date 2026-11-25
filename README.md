# copy-pocket

本機端的常用指令收納工具，以 React + Tauri 2 建立。可依分類與群組整理指令、快速搜尋與複製，並支援迷你懸浮模式、視窗置頂、透明度、主題、語系與字級設定。資料只存放在本機，不會上傳。  
A local snippet and command organizer built with React + Tauri 2. Organize commands by category and group, search and copy quickly, and use a mini floating mode with customizable window pinning, opacity, theme, language, and font size. All data is stored locally and is never uploaded.

---

## 使用說明 / User Guide

### 1. 介面與排版 / Interface & Layout

- **單欄模式：** 上方是分類區與指令搜尋，下方是指令清單。分類區可收合，收合後會變成下拉選單。
- **雙欄模式：** 左側分類清單固定 `230px`，右側指令區會隨視窗拉寬而延展。
- **自動切換：** 視窗寬度達到 `900px` 會自動變成雙欄，低於則回到單欄。手動按單／雙欄按鈕後，下次拖曳視窗尺寸會恢復自動判斷。
- **底部狀態列：** 左側為 `copy-pocket` Logo，右側顯示分類數、群組數與目前篩選結果，例如 `8 個分類 · 1 個群組 · 顯示 4 / 15 筆指令`。

---

- **Single-column:** Category area and command search on top, command list below. The category area can collapse into a dropdown.
- **Split view:** The category sidebar stays fixed at `230px`; the command area grows as you widen the window.
- **Automatic switching:** Windows `900px` wide or wider use split view; narrower windows return to single-column. After using the manual toggle, resizing the window restores automatic behavior.
- **Status bar:** The `copy-pocket` logo appears on the left; the right shows category count, group count, and filtered command count, e.g. `8 categories · 1 group · showing 4 / 15 commands`.

### 2. 視窗操作 / Window Controls

- 標題列由左至右為：**設定選單**、**透明度滑桿**、**視窗置頂**；右側為：**縮小**、**迷你懸浮模式**、**單／雙欄切換**、**關閉**。
- 視窗已移除原生邊框，按住標題列空白處即可拖曳移動；一般模式下也可拖曳視窗邊緣調整大小。
- **透明度滑桿：** 範圍 `40%–100%`，預設 `100%`。數值越低越能看到後方視窗；迷你模式展開面板內也使用同一設定。
- **視窗置頂：** 切換是否永遠顯示在最上層。
- **單／雙欄切換：** 切到雙欄時視窗會加寬，切回單欄會恢復原本寬度。
- **縮小／關閉：** 使用 Windows 原生視窗行為。
- 視窗相關操作僅在 Tauri 桌面版生效；瀏覽器 `npm run dev` 中無法控制原生視窗。

---

- The title bar contains **Settings menu**, **Opacity slider**, and **Always on top** on the left; **Minimize**, **Mini mode**, **Single/split toggle**, and **Close** on the right.
- The native border is hidden; drag any empty area of the title bar to move the window. In normal mode you can also drag the window edges to resize.
- **Opacity slider:** `40%–100%`, default `100%`. Lower values reveal windows behind it. The expanded mini-mode panel shares the same setting.
- **Always on top:** Toggle whether the window stays above all other windows.
- **Single/split toggle:** Split mode widens the window; returning to single-column restores the previous width.
- **Minimize / Close:** Use native Windows behavior.
- Window controls only work in the Tauri desktop app; native window actions are unavailable in the browser dev server (`npm run dev`).

### 3. 分類 / Categories

- 點「+ 分類」建立新分類；點「編輯」進入管理，可拖曳 `⠿` 調整順序、重新命名、鎖定／解鎖或刪除。
- 鎖定的分類不能刪除；刪除分類時，其中的群組與指令會一併刪除，且無法復原。
- 點分類頁籤切換目前分類；分類搜尋框可過濾頁籤。
- 單欄模式下可收合上方分類區，改由下拉選單切換。

---

- Click **+ Category** to create one; click **Edit** to manage categories: drag `⠿` to reorder, rename, lock/unlock, or delete.
- Locked categories cannot be deleted. Deleting a category also removes its groups and commands permanently.
- Click a tab to switch categories; the category search box filters tabs.
- In single-column mode, the category area can collapse into a dropdown.

### 4. 指令與群組 / Commands & Groups

- 點「+ 指令」新增目前分類的指令；標題可留空，說明與指令內容建議填寫。
- 點「+ 群組」新增群組；群組標題列的 `+` 可直接在該群組內新增指令。
- 指令卡片左側的 `⠿` 可拖曳到群組或「未分組」；群組左側的 `⠿` 可調整群組順序。
- 拖曳時游標靠近清單上下邊緣會自動捲動，滾輪也可捲動清單或分類頁籤。
- 群組可收合／展開；刪除群組時，群組內的指令會回到「未分組」，不會被刪除。
- 可隱藏指令標題讓畫面更簡潔；隱藏後滑過或聚焦卡片仍會顯示標題。

---

- Click **+ Command** to add a command to the current category. The title is optional, though notes and command content are recommended.
- Click **+ Group** to create a group. The `+` in a group header adds a command directly into that group.
- Drag the `⠿` handle on a command card to move it into a group or **Ungrouped**; drag a group's `⠿` to reorder groups.
- While dragging, hovering near the list edge auto-scrolls; the mouse wheel also scrolls lists or category tabs.
- Groups can be collapsed or expanded. Deleting a group moves its commands back to **Ungrouped** without deleting them.
- Command titles can be hidden for a cleaner view; hidden titles still appear on hover or focus.

### 5. 搜尋、複製與快捷鍵 / Search, Copy & Shortcuts

- **指令搜尋：** 搜尋目前分類的標題、說明與指令內容。
- **`Ctrl + K`（macOS 為 `⌘ + K`）：** 直接聚焦指令搜尋框（畫面上不再顯示提示，但快捷鍵仍可用）。
- **`Esc`：** 關閉選單、表單或對話框；若焦點在搜尋框，會清空搜尋條件。
- **複製指令：** 點指令方塊或右側複製鈕即可複製；成功後會出現綠色打勾與短暫提示。
- **選取與捲動：** 一般左鍵拖曳可選取文字；內容過長時可拖曳水平捲軸，或使用 `Shift + 左鍵拖曳`、中鍵拖曳平移。

---

- **Search:** Filters the current category by title, notes, and command content.
- **`Ctrl + K` (`⌘ + K` on macOS):** Focuses the command search box. The on-screen hint was removed, but the shortcut still works.
- **`Esc`:** Closes menus, forms, or dialogs; clears the search when the search box is focused.
- **Copy:** Click a command box or its copy button. A green check and a brief toast confirm success.
- **Select & Scroll:** Drag with the left button to select text. For long commands, use the horizontal scrollbar, or pan with `Shift + Left-click drag` or middle-click drag.

### 6. 迷你懸浮模式 / Mini Floating Mode

- 點標題列的迷你模式按鈕進入膠囊式懸浮視窗；視窗會在目前位置縮小，不會跳到角落。
- 拖曳膠囊左側的點狀握把或空白處可移動視窗；點分類名稱可展開下拉選單切換分類。
- 滑鼠移到膠囊上會展開指令面板；點指令列即複製，成功後該列會出現綠色打勾。
- 面板最右側的細把手可拖曳調整寬度（`220px–900px`），調整後的寬度會保留，展開／收合面板也不會重設。
- 膠囊上的按鈕可置頂、展開回完整視窗、縮小或關閉。
- 迷你模式會跟隨主題、語系、字級與透明度設定；透明度 `100%` 時完全不透明。

---

- Click the mini-mode button in the title bar to switch to a compact floating capsule. The window shrinks in place instead of jumping to a corner.
- Drag the dotted handle or empty area of the capsule to move it; click the category name to open a dropdown.
- Hovering over the capsule expands the command panel. Clicking a row copies the command and shows a green check on success.
- Drag the slim handle on the right edge to resize the width (`220px–900px`). The width is remembered and is not reset when the panel expands or collapses.
- Buttons on the capsule let you pin, restore the full window, minimize, or close it.
- Mini mode follows the configured theme, language, font size, and opacity. At `100%`, it is fully opaque.

### 7. 外觀設定 / Appearance Settings

- 點左上角設定選單可調整 **主題**（深色／淺色）、**語系**（繁中／English）與 **字級**（小／中／大）。
- 透明度由標題列滑桿控制；新增／編輯表單一律以置中且較大的彈窗顯示。
- 所有設定會套用到主視窗與迷你懸浮模式。

---

- Click the settings menu at the top left to configure **Theme** (Dark / Light), **Language** (繁中 / English), and **Font size** (Small / Medium / Large).
- Opacity is controlled by the title-bar slider; add/edit forms always open in a large, centered modal.
- Settings apply to both the main window and mini floating mode.

### 8. 資料存放 / Data Storage

- 分類、群組、指令與偏好設定都存放在本機 WebView 的 `localStorage`，不需要登入或連網。
- 清除應用程式資料、WebView 資料或移除 App 會一併清除這些資料。目前沒有內建匯出／匯入功能。

---

- All categories, groups, commands, and preferences are stored locally in the WebView's `localStorage`. No login or internet connection is required.
- Clearing app data, clearing WebView data, or uninstalling the app erases all saved data. Built-in export/import is not available.

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
