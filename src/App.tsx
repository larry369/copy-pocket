import { useEffect, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalPosition, LogicalSize } from "@tauri-apps/api/window";

type Category = string;

interface CategoryItem {
  name: Category;
  locked: boolean;
}

interface GroupItem {
  id: string;
  category: Category;
  name: string;
  collapsed: boolean;
}

interface CommandItem {
  id: string;
  category: Category;
  title: string;
  note?: string;
  command: string;
  groupId?: string;
}

type CmdForm = { mode: "add" } | { mode: "edit"; item: CommandItem };

type ConfirmTarget =
  | { kind: "category"; name: Category }
  | { kind: "group"; id: string; name: string; count: number }
  | { kind: "command"; item: CommandItem };

const UNGROUPED_KEY = "__ungrouped__";

const DEFAULT_CATEGORIES: Category[] = [
  "git",
  "kube",
  "tauri",
  "rust",
  "python",
  "npm",
];

const STORAGE_ITEMS_KEY = "command_pocket_items_v4";
const LEGACY_ITEM_KEYS = [
  "command_pocket_items_v3",
  "command_pocket_items_v2",
];
const STORAGE_CATS_KEY = "command_pocket_categories_v3";
const LEGACY_CATS_KEY = "command_pocket_categories_v2";
const STORAGE_GROUPS_KEY = "command_pocket_groups_v1";
const STORAGE_THEME_KEY = "command_pocket_theme_v1";
const STORAGE_LANG_KEY = "command_pocket_lang_v1";
const STORAGE_FONT_SIZE_KEY = "command_pocket_font_size_v1";
const STORAGE_OPACITY_KEY = "command_pocket_opacity_v1";
const STORAGE_CATEGORIES_COLLAPSED_KEY = "command_pocket_categories_collapsed_v1";
const STORAGE_CMD_TITLES_KEY = "command_pocket_cmd_titles_v1";
const GROUP_DND_TYPE = "application/x-command-pocket-group";
const MINI_COLLAPSED_SIZE = { width: 220, height: 44 };
const MINI_EXPANDED_SIZE = { width: 220, height: 420 };

const DEFAULT_COMMANDS: CommandItem[] = [
  {
    id: "git-1",
    category: "git",
    title: "查看精簡狀態與分支",
    command: "git status -s -b",
  },
  {
    id: "git-2",
    category: "git",
    title: "查看最近 10 筆圖形化提交紀錄",
    command: "git log --oneline --graph -n 10",
  },
  {
    id: "kube-1",
    category: "kube",
    title: "列出所有 Namespace 的 Pod",
    command: "kubectl get pods -A",
  },
  {
    id: "kube-2",
    category: "kube",
    title: "即時追蹤特定 Pod 日誌",
    command: "kubectl logs -f <pod-name> -n <namespace>",
  },
  {
    id: "tauri-1",
    category: "tauri",
    title: "啟動 Tauri 開發模式",
    command: "npm run tauri dev",
  },
  {
    id: "tauri-2",
    category: "tauri",
    title: "建置正式版執行檔",
    command: "npm run tauri build",
  },
  {
    id: "rust-1",
    category: "rust",
    title: "檢查並編譯專案",
    command: "cargo check",
  },
  {
    id: "rust-2",
    category: "rust",
    title: "Release 模式建置",
    command: "cargo build --release",
  },
  {
    id: "python-1",
    category: "python",
    title: "建立虛擬環境",
    command: "python -m venv .venv",
  },
  {
    id: "python-2",
    category: "python",
    title: "啟動 FastAPI 開發伺服器",
    command: "uvicorn main:app --reload",
  },
  {
    id: "npm-1",
    category: "npm",
    title: "列出已安裝的頂層套件",
    command: "npm list --depth=0",
  },
  {
    id: "npm-2",
    category: "npm",
    title: "安全稽核套件漏洞",
    command: "npm audit",
  },
];

function parseCategories(raw: string): CategoryItem[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const result: CategoryItem[] = [];
    const seen = new Set<string>();

    for (const entry of parsed) {
      let name: string | null = null;
      let locked = false;

      if (typeof entry === "string") {
        name = entry;
      } else if (entry && typeof entry === "object" && "name" in entry) {
        const candidate = entry as Partial<CategoryItem>;
        if (typeof candidate.name === "string") {
          name = candidate.name;
          locked = candidate.locked === true;
        }
      }

      if (name === null || !name.trim()) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ name, locked });
    }

    return result;
  } catch {
    return [];
  }
}

function loadCategories(): CategoryItem[] {
  try {
    const current = localStorage.getItem(STORAGE_CATS_KEY);
    if (current !== null) return parseCategories(current);
    const legacy = localStorage.getItem(LEGACY_CATS_KEY);
    if (legacy !== null) return parseCategories(legacy);
  } catch {
    return DEFAULT_CATEGORIES.map((name) => ({ name, locked: false }));
  }
  return DEFAULT_CATEGORIES.map((name) => ({ name, locked: false }));
}

function loadItems(): CommandItem[] {
  try {
    for (const key of [STORAGE_ITEMS_KEY, ...LEGACY_ITEM_KEYS]) {
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;

      return parsed
        .filter((entry): entry is CommandItem => {
          if (!entry || typeof entry !== "object") return false;
          const candidate = entry as Partial<CommandItem>;
          return (
            typeof candidate.id === "string" &&
            typeof candidate.category === "string" &&
            typeof candidate.title === "string" &&
            typeof candidate.command === "string"
          );
        })
        .map((entry) => ({
          ...entry,
          note:
            typeof entry.note === "string" && entry.note.trim()
              ? entry.note
              : undefined,
          groupId: typeof entry.groupId === "string" ? entry.groupId : undefined,
        }));
    }
  } catch {
    return DEFAULT_COMMANDS;
  }
  return DEFAULT_COMMANDS;
}

function loadGroups(): GroupItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_GROUPS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const result: GroupItem[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;
      const candidate = entry as Partial<GroupItem>;
      if (
        typeof candidate.id !== "string" ||
        typeof candidate.category !== "string" ||
        typeof candidate.name !== "string" ||
        !candidate.name.trim()
      ) {
        continue;
      }
      result.push({
        id: candidate.id,
        category: candidate.category,
        name: candidate.name,
        collapsed: candidate.collapsed === true,
      });
    }
    return result;
  } catch {
    return [];
  }
}

type Theme = "dark" | "light";
type Lang = "zh-TW" | "en";
type FontSize = "small" | "medium" | "large";

function loadTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function loadLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_LANG_KEY) === "en" ? "en" : "zh-TW";
  } catch {
    return "zh-TW";
  }
}

function loadFontSize(): FontSize {
  try {
    const value = localStorage.getItem(STORAGE_FONT_SIZE_KEY);
    return value === "small" || value === "large" ? value : "medium";
  } catch {
    return "medium";
  }
}

function loadOpacity(): number {
  try {
    const raw = localStorage.getItem(STORAGE_OPACITY_KEY);
    if (raw === null) return 100;
    const value = Number(raw);
    if (!Number.isFinite(value)) return 100;
    return Math.min(100, Math.max(40, Math.round(value)));
  } catch {
    return 100;
  }
}

function loadCategoriesCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_CATEGORIES_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function loadCmdTitles(): boolean {
  try {
    return localStorage.getItem(STORAGE_CMD_TITLES_KEY) !== "0";
  } catch {
    return true;
  }
}

function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

const zhTW = {
  settings: "設定",
  openSettings: "開啟設定選單",
  pinWindow: "固定畫面",
  pinFailed: "固定畫面設定失敗",
  pinned: "已固定畫面",
  unpinned: "已取消固定畫面",
  pinOn: "已固定",
  pinOff: "未固定",
  expandLayout: "展開左右視窗模式",
  collapseLayout: "縮回單一視窗模式",
  toggleMiniMode: "迷你懸浮模式",
  miniModeOn: "已切換迷你懸浮模式",
  miniModeOff: "已離開迷你懸浮模式",
  expandMini: "展開完整視窗",
  minimizeWindow: "縮小視窗",
  closeWindow: "關閉視窗",
  theme: "主題",
  dark: "深色",
  light: "淺色",
  themeDark: "已切換深色主題",
  themeLight: "已切換淺色主題",
  language: "語系",
  langZH: "繁中",
  langEN: "English",
  fontSize: "字級",
  fontSmall: "小",
  fontMedium: "中",
  fontLarge: "大",
  fontSizeUpdated: "字級已調整",
  opacity: "透明度",
  category: "分類",
  command: "指令",
  group: "群組",
  ungrouped: "未分組",
  edit: "編輯",
  add: "新增",
  save: "儲存",
  cancel: "取消",
  done: "完成",
  addCategory: "新增分類",
  manageCategories: "管理所有分類（改名、鎖定、刪除）",
  manageCategoriesShort: "管理所有分類",
  manageCategoryTitle: "管理分類（鎖定後無法刪除）",
  categoryName: "分類名稱",
  categoryPlaceholder: "例如：docker、sql、linux",
  categoryExists: "這個分類已經存在了",
  categoryAdded: "分類已新增",
  categoryRenamed: "分類已重新命名",
  categoryUnlocked: "分類已解鎖",
  categoryLocked: "分類已鎖定，可避免誤刪",
  unlockBeforeDelete: "請先解鎖分類再刪除",
  categoryOrderUpdated: "分類順序已更新",
  categoryDeleted: "分類、群組與所屬指令已刪除",
  dragSort: "拖曳排序",
  dragSortItem: "拖曳排序 {name}",
  rename: "重新命名",
  renameItem: "重新命名 {name}",
  renameCategory: "重新命名分類",
  saveName: "儲存名稱",
  cancelRename: "取消改名",
  itemsUnit: "{count} 筆",
  lockCategory: "鎖定分類",
  unlockCategory: "解鎖分類",
  lockItem: "鎖定 {name}",
  unlockItem: "解鎖 {name}",
  deleteCategory: "刪除分類",
  deleteCategoryItem: "刪除分類 {name}",
  locked: "已鎖定",
  searchCategory: "搜尋分類",
  noCategoryMatch: "找不到符合的分類",
  categoriesNav: "指令分類",
  collapseCategories: "收合上方分類",
  expandCategories: "展開上方分類",
  searchCommands: "搜尋目前分類的指令說明或內容",
  searchShortcut: "Ctrl + K 搜尋",
  addCommand: "新增指令",
  addCommandIn: '在「{name}」新增指令',
  addGroup: "新增群組",
  addGroupIn: '在「{name}」新增群組',
  groupName: "群組名稱",
  groupNewName: "群組新名稱",
  groupOf: "所屬群組",
  groupPlaceholder: "例如：部署流程、常用查詢",
  groupExists: "這個群組已經存在了",
  groupAdded: "群組已新增",
  groupRenamed: "群組已重新命名",
  groupOrderUpdated: "群組順序已更新",
  deleteGroup: "刪除群組",
  deleteGroupItem: "刪除群組 {name}",
  renameGroup: "重新命名群組",
  groupDeleted: "群組已刪除，指令已回到未分組",
  collapseGroup: "收合群組",
  expandGroup: "展開群組",
  dropHere: "拖曳指令卡片到這裡",
  dragToGroup: "拖曳移動到群組",
  copy: "複製指令",
  copied: "已複製",
  copyDone: "指令已複製到剪貼簿",
  copyFailed: "複製失敗，請手動選取指令",
  editCommand: "修改指令",
  deleteCommand: "刪除指令",
  commandTitle: "標題",
  commandTitlePlaceholder: "標題可留空，例如：查看目前分支狀態",
  commandNote: "說明",
  commandNotePlaceholder: "詳細說明、使用情境或注意事項",
  commandContent: "指令內容",
  commandContentPlaceholder: "指令內容，例如：git status",
  commandAdded: "指令已新增",
  commandUpdated: "指令已更新",
  commandOrderUpdated: "指令順序已更新",
  commandDeleted: "指令已刪除",
  movedToGroup: '已移動到「{name}」',
  movedToUngrouped: "已移至未分組",
  deleteCategoryTitle: '刪除分類「{name}」？',
  deleteGroupTitle: '刪除群組「{name}」？',
  deleteCommandTitle: "刪除這筆指令？",
  deleteCategoryText:
    "分類內的 {count} 筆指令與 {groups} 個群組會一併刪除，此動作無法復原。",
  deleteGroupText: "群組內的 {count} 筆指令會回到「未分組」，不會被刪除。",
  deleteCommandText: "「{title}」將被刪除，此動作無法復原。",
  confirmDelete: "確認刪除",
  noCategories: "尚未建立分類",
  noCommandsFound: "找不到符合的指令",
  noCommandsIn: "「{name}」還沒有指令",
  emptyCategoryHint: "先點分類搜尋下方的 + 建立一個分類。",
  emptySearchHint: "試試其他關鍵字，或清空搜尋條件。",
  emptyCommandsHint: "點「+ 指令」加入第一筆。",
  statusSummary:
    "{categories} 個分類 · {groups} 個群組 · 顯示 {shown} / {total} 筆指令",
};

type Strings = typeof zhTW;

const en: Strings = {
  settings: "Settings",
  openSettings: "Open settings menu",
  pinWindow: "Keep on top",
  pinFailed: "Failed to change window pinning",
  pinned: "Window pinned on top",
  unpinned: "Window unpinned",
  pinOn: "Pinned",
  pinOff: "Not pinned",
  expandLayout: "Expand to split view",
  collapseLayout: "Collapse to single view",
  toggleMiniMode: "Mini floating mode",
  miniModeOn: "Mini floating mode enabled",
  miniModeOff: "Mini floating mode disabled",
  expandMini: "Expand full window",
  minimizeWindow: "Minimize window",
  closeWindow: "Close window",
  theme: "Theme",
  dark: "Dark",
  light: "Light",
  themeDark: "Switched to dark theme",
  themeLight: "Switched to light theme",
  language: "Language",
  langZH: "繁中",
  langEN: "English",
  fontSize: "Text size",
  fontSmall: "Small",
  fontMedium: "Medium",
  fontLarge: "Large",
  fontSizeUpdated: "Text size updated",
  opacity: "Opacity",
  category: "Category",
  command: "Command",
  group: "Group",
  ungrouped: "Ungrouped",
  edit: "Edit",
  add: "Add",
  save: "Save",
  cancel: "Cancel",
  done: "Done",
  addCategory: "Add category",
  manageCategories: "Manage all categories (rename, lock, delete)",
  manageCategoriesShort: "Manage all categories",
  manageCategoryTitle: "Manage categories (locked categories cannot be deleted)",
  categoryName: "Category name",
  categoryPlaceholder: "e.g. docker, sql, linux",
  categoryExists: "This category already exists",
  categoryAdded: "Category added",
  categoryRenamed: "Category renamed",
  categoryUnlocked: "Category unlocked",
  categoryLocked: "Category locked to prevent accidental deletion",
  unlockBeforeDelete: "Unlock the category before deleting it",
  categoryOrderUpdated: "Category order updated",
  categoryDeleted: "Category, its groups, and commands were deleted",
  dragSort: "Drag to reorder",
  dragSortItem: "Drag to reorder {name}",
  rename: "Rename",
  renameItem: "Rename {name}",
  renameCategory: "Rename category",
  saveName: "Save name",
  cancelRename: "Cancel rename",
  itemsUnit: "{count} items",
  lockCategory: "Lock category",
  unlockCategory: "Unlock category",
  lockItem: "Lock {name}",
  unlockItem: "Unlock {name}",
  deleteCategory: "Delete category",
  deleteCategoryItem: "Delete category {name}",
  locked: "Locked",
  searchCategory: "Search categories",
  noCategoryMatch: "No matching categories",
  categoriesNav: "Command categories",
  collapseCategories: "Collapse category tabs",
  expandCategories: "Expand category tabs",
  searchCommands: "Search command titles or content in this category",
  searchShortcut: "Ctrl + K to search",
  addCommand: "Add command",
  addCommandIn: 'Add command in "{name}"',
  addGroup: "Add group",
  addGroupIn: 'Add group in "{name}"',
  groupName: "Group name",
  groupNewName: "New group name",
  groupOf: "Group",
  groupPlaceholder: "e.g. Deployment, Common queries",
  groupExists: "This group already exists",
  groupAdded: "Group added",
  groupRenamed: "Group renamed",
  groupOrderUpdated: "Group order updated",
  deleteGroup: "Delete group",
  deleteGroupItem: 'Delete group "{name}"',
  renameGroup: "Rename group",
  groupDeleted: "Group deleted; commands moved to Ungrouped",
  collapseGroup: "Collapse group",
  expandGroup: "Expand group",
  dropHere: "Drag a command card here",
  dragToGroup: "Drag to move to a group",
  copy: "Copy command",
  copied: "Copied",
  copyDone: "Command copied to clipboard",
  copyFailed: "Copy failed; please select the command manually",
  editCommand: "Edit command",
  deleteCommand: "Delete command",
  commandTitle: "Title",
  commandTitlePlaceholder: "Title optional, e.g. Show current branch status",
  commandNote: "Notes",
  commandNotePlaceholder: "Details, use cases, or things to remember",
  commandContent: "Command content",
  commandContentPlaceholder: "e.g. git status",
  commandAdded: "Command added",
  commandUpdated: "Command updated",
  commandOrderUpdated: "Command order updated",
  commandDeleted: "Command deleted",
  movedToGroup: 'Moved to "{name}"',
  movedToUngrouped: "Moved to Ungrouped",
  deleteCategoryTitle: 'Delete category "{name}"?',
  deleteGroupTitle: 'Delete group "{name}"?',
  deleteCommandTitle: "Delete this command?",
  deleteCategoryText:
    "{count} commands and {groups} groups in this category will be deleted. This cannot be undone.",
  deleteGroupText:
    "{count} commands in this group will move to Ungrouped and will not be deleted.",
  deleteCommandText: '"{title}" will be deleted. This cannot be undone.',
  confirmDelete: "Delete",
  noCategories: "No categories yet",
  noCommandsFound: "No matching commands",
  noCommandsIn: '"{name}" has no commands yet',
  emptyCategoryHint: "Click + below the category search to create a category.",
  emptySearchHint: "Try another keyword or clear the search.",
  emptyCommandsHint: 'Click "+ Command" to add the first one.',
  statusSummary:
    "{categories} categories · {groups} groups · showing {shown} / {total} commands",
};

const I18N: Record<Lang, Strings> = { "zh-TW": zhTW, en };

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function CopyIcon() {
  return (
    <Icon>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Icon>
  );
}

function EditIcon() {
  return (
    <Icon>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Icon>
  );
}

function TrashIcon() {
  return (
    <Icon>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5M14 11v5" />
    </Icon>
  );
}

function CheckIcon() {
  return (
    <Icon>
      <path d="m5 13 4 4L19 7" />
    </Icon>
  );
}

function CloseIcon() {
  return (
    <Icon>
      <path d="M18 6 6 18M6 6l12 12" />
    </Icon>
  );
}

function MenuIcon() {
  return (
    <Icon>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
  );
}

function PinIcon() {
  return (
    <Icon>
      <path d="M12 17v5" />
      <path d="M9 3h6l-1 5 3 3v2H7v-2l3-3-1-5Z" />
    </Icon>
  );
}

function PlusIcon() {
  return (
    <Icon>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

function TitleIcon({ hidden }: { hidden: boolean }) {
  return (
    <Icon>
      <path d="M5 6h14M12 6v12M9 18h6" />
      {hidden && <path d="M4 4l16 16" />}
    </Icon>
  );
}

function LayoutIcon({ split }: { split: boolean }) {
  return (
    <Icon>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      {!split && <path d="M11 4v16" />}
    </Icon>
  );
}

function MiniIcon() {
  return (
    <Icon>
      <rect x="2" y="8" width="20" height="8" rx="4" />
      <path d="M7 12h.01M10 12h.01" />
    </Icon>
  );
}

function ExpandMiniIcon() {
  return (
    <Icon>
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v3" />
      <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
    </Icon>
  );
}

function MinimizeIcon() {
  return (
    <Icon>
      <path d="M5 12h14" />
    </Icon>
  );
}

function LockIcon({ locked }: { locked: boolean }) {
  return (
    <Icon>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      {locked ? (
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      ) : (
        <path d="M8 10V7a4 4 0 0 1 7.5-2" />
      )}
    </Icon>
  );
}

export default function App() {
  const [categories, setCategories] = useState<CategoryItem[]>(loadCategories);
  const [items, setItems] = useState<CommandItem[]>(loadItems);
  const [groups, setGroups] = useState<GroupItem[]>(loadGroups);
  const [activeTab, setActiveTab] = useState<Category>(() => {
    return categories[0]?.name ?? "";
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [catPanel, setCatPanel] = useState<"none" | "add" | "edit">("none");
  const [newCatName, setNewCatName] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category>("");
  const [editCatName, setEditCatName] = useState("");
  const [catError, setCatError] = useState("");
  const [draggingCat, setDraggingCat] = useState<Category | null>(null);
  const [dropCat, setDropCat] = useState<Category | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [lang, setLang] = useState<Lang>(loadLang);
  const [fontSize, setFontSize] = useState<FontSize>(loadFontSize);
  const [opacity, setOpacity] = useState(loadOpacity);
  const [categoriesCollapsed, setCategoriesCollapsed] = useState(loadCategoriesCollapsed);
  const [cmdTitlesVisible, setCmdTitlesVisible] = useState(loadCmdTitles);
  const [isWideViewport, setIsWideViewport] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches,
  );
  const [layoutOverride, setLayoutOverride] = useState<"split" | "single" | null>(null);
  const [miniMode, setMiniMode] = useState(false);
  const [miniHover, setMiniHover] = useState(false);
  const [miniCategoryOpen, setMiniCategoryOpen] = useState(false);
  const miniPanelOpen = miniHover || miniCategoryOpen;
  const isWide = layoutOverride === null ? isWideViewport : layoutOverride === "split";
  const t = I18N[lang];
  const [showGroupAdd, setShowGroupAdd] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState("");
  const [groupError, setGroupError] = useState("");
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [ungroupedCollapsed, setUngroupedCollapsed] = useState(false);
  const [cmdForm, setCmdForm] = useState<CmdForm | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [commandInput, setCommandInput] = useState("");
  const [groupSelect, setGroupSelect] = useState(UNGROUPED_KEY);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<ConfirmTarget | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [dropItem, setDropItem] = useState<{
    id: string;
    position: "before" | "after";
  } | null>(null);
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);
  const [dropGroupItem, setDropGroupItem] = useState<{
    id: string;
    position: "before" | "after";
  } | null>(null);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const categorySearchRef = useRef<HTMLInputElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const categoryRef = useRef<HTMLInputElement | null>(null);
  const groupRef = useRef<HTMLInputElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const tabsRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codePanRef = useRef<{ x: number; scrollLeft: number; moved: boolean } | null>(null);
  const suppressCodeClickRef = useRef(false);
  const collapseWidthRef = useRef<number | null>(null);
  const normalBoundsRef = useRef<{
    width: number;
    height: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_CATS_KEY, JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(STORAGE_GROUPS_KEY, JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    if (catPanel === "add") categoryRef.current?.focus();
  }, [catPanel]);

  useEffect(() => {
    if (editingCategory) categoryRef.current?.focus();
  }, [editingCategory]);

  useEffect(() => {
    if (showGroupAdd) groupRef.current?.focus();
  }, [showGroupAdd]);

  useEffect(() => {
    if (cmdForm) titleRef.current?.focus();
  }, [cmdForm]);

  useEffect(() => {
    if (confirmDialog) confirmRef.current?.focus();
  }, [confirmDialog]);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (
        el.scrollWidth <= el.clientWidth ||
        Math.abs(e.deltaY) <= Math.abs(e.deltaX)
      ) {
        return;
      }
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [categoriesCollapsed]);

  useEffect(() => {
    if (draggingId === null && draggingGroupId === null && draggingCat === null) return;

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const onDragOver = (e: DragEvent) => {
      pointerX = e.clientX;
      pointerY = e.clientY;
    };

    const onWheel = (e: WheelEvent) => {
      const tabs = tabsRef.current;
      const target = e.target instanceof Element ? e.target : null;
      if (tabs && target?.closest(".tabs")) {
        e.preventDefault();
        if (getComputedStyle(tabs).flexDirection === "column") {
          tabs.scrollTop += e.deltaY;
        } else {
          tabs.scrollLeft += e.deltaY;
        }
        return;
      }

      const list = listRef.current;
      if (!list) return;
      e.preventDefault();
      list.scrollTop += e.deltaY;
    };

    const step = () => {
      const edge = 64;

      const list = listRef.current;
      if (list && pointerY > 0) {
        const rect = list.getBoundingClientRect();
        if (pointerY < rect.top + edge) {
          list.scrollTop -= Math.max(2, Math.round((rect.top + edge - pointerY) / 4));
        } else if (pointerY > rect.bottom - edge) {
          list.scrollTop += Math.max(2, Math.round((pointerY - (rect.bottom - edge)) / 4));
        }
      }

      const tabs = tabsRef.current;
      if (tabs && pointerX > 0 && pointerY > 0) {
        const rect = tabs.getBoundingClientRect();
        if (getComputedStyle(tabs).flexDirection === "column") {
          if (pointerY < rect.top + edge) {
            tabs.scrollTop -= Math.max(2, Math.round((rect.top + edge - pointerY) / 4));
          } else if (pointerY > rect.bottom - edge) {
            tabs.scrollTop += Math.max(2, Math.round((pointerY - (rect.bottom - edge)) / 4));
          }
        } else {
          if (pointerX < rect.left + edge) {
            tabs.scrollLeft -= Math.max(2, Math.round((rect.left + edge - pointerX) / 4));
          } else if (pointerX > rect.right - edge) {
            tabs.scrollLeft += Math.max(2, Math.round((pointerX - (rect.right - edge)) / 4));
          }
        }
      }

      frame = requestAnimationFrame(step);
    };

    window.addEventListener("dragover", onDragOver);
    window.addEventListener("wheel", onWheel, { passive: false });
    frame = requestAnimationFrame(step);

    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(frame);
    };
  }, [draggingCat, draggingId, draggingGroupId]);

  useEffect(() => {
    const query = categoryQuery.trim().toLowerCase();
    if (!query) return;

    const matches = categories.filter((cat) =>
      cat.name.toLowerCase().includes(query),
    );
    if (matches.length > 0 && !matches.some((cat) => cat.name === activeTab)) {
      setActiveTab(matches[0].name);
      closeForms();
    }
  }, [categoryQuery, categories, activeTab]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (menuOpen) {
          setMenuOpen(false);
        } else if (confirmDialog) {
          setConfirmDialog(null);
        } else if (renamingGroupId) {
          setRenamingGroupId(null);
        } else if (catPanel !== "none" || showGroupAdd || cmdForm) {
          closeForms();
        } else if (document.activeElement === searchRef.current) {
          setSearch("");
          searchRef.current?.blur();
        } else if (document.activeElement === categorySearchRef.current) {
          setCategoryQuery("");
          categorySearchRef.current?.blur();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && !confirmDialog) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    menuOpen,
    confirmDialog,
    renamingGroupId,
    catPanel,
    showGroupAdd,
    cmdForm,
  ]);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_THEME_KEY, theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.view = miniMode ? "mini" : "normal";
  }, [miniMode]);

  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en" : "zh-Hant";
    try {
      localStorage.setItem(STORAGE_LANG_KEY, lang);
    } catch {}
  }, [lang]);

  useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize;
    try {
      localStorage.setItem(STORAGE_FONT_SIZE_KEY, fontSize);
    } catch {}
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.dataset.opaque = String(opacity === 100);
    try {
      localStorage.setItem(STORAGE_OPACITY_KEY, String(opacity));
    } catch {}
    if (!isTauri()) return;
    void invoke("set_window_opacity", { value: opacity / 100 }).catch(() => {});
  }, [opacity]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_CATEGORIES_COLLAPSED_KEY,
        categoriesCollapsed ? "1" : "0",
      );
    } catch {}
  }, [categoriesCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CMD_TITLES_KEY, cmdTitlesVisible ? "1" : "0");
    } catch {}
  }, [cmdTitlesVisible]);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 900px)");
    const onChange = (e: MediaQueryListEvent) => setIsWideViewport(e.matches);
    setIsWideViewport(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    getCurrentWindow()
      .isAlwaysOnTop()
      .then(setAlwaysOnTop)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest(".menu-wrap")) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current !== null) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast("");
      toastTimer.current = null;
    }, 1800);
  };

  const toggleAlwaysOnTop = async () => {
    const next = !alwaysOnTop;
    if (isTauri()) {
      try {
        await getCurrentWindow().setAlwaysOnTop(next);
      } catch {
        showToast(t.pinFailed);
        return;
      }
    }
    setAlwaysOnTop(next);
    setMenuOpen(false);
    showToast(next ? t.pinned : t.unpinned);
  };

  const minimizeWindow = async () => {
    if (!isTauri()) return;
    try {
      await getCurrentWindow().minimize();
    } catch {}
  };

  const closeWindow = async () => {
    if (!isTauri()) return;
    try {
      await getCurrentWindow().close();
    } catch {}
  };

  const startWindowDrag = (e: React.PointerEvent<HTMLElement>) => {
    if (!(e.target instanceof Element)) return;
    if (e.target.closest("button, input, .menu-popover")) return;
    if (isTauri()) void getCurrentWindow().startDragging().catch(() => {});
  };

  const toggleLayout = async () => {
    const next = isWide ? "single" : "split";
    if (next === "split") {
      collapseWidthRef.current = window.outerWidth || window.innerWidth;
    }
    setLayoutOverride(next);
    showToast(next === "split" ? t.expandLayout : t.collapseLayout);

    if (!isTauri()) return;
    try {
      const width =
        next === "split" ? 1180 : collapseWidthRef.current ?? 760;
      const height = window.outerHeight || window.innerHeight;
      await getCurrentWindow().setSize(new LogicalSize(width, height));
    } catch {}
  };

  const applyWindowBounds = async (
    width: number,
    height: number,
    anchorRight: boolean,
    pos?: { x: number; y: number },
  ) => {
    if (!isTauri()) return;
    try {
      const screenWidth = window.screen?.availWidth || window.innerWidth;
      const x = anchorRight
        ? Math.max(0, Math.round(screenWidth - width))
        : Math.round(pos?.x ?? window.screenX ?? 0);
      const y = anchorRight ? 0 : Math.round(pos?.y ?? window.screenY ?? 0);
      const win = getCurrentWindow();
      await win.setSize(new LogicalSize(width, height));
      await win.setPosition(new LogicalPosition(x, y));
    } catch {}
  };

  const setWindowSize = async (width: number, height: number) => {
    if (!isTauri()) return;
    try {
      await getCurrentWindow().setSize(new LogicalSize(width, height));
    } catch {}
  };

  const enterMiniMode = async () => {
    if (isTauri()) {
      normalBoundsRef.current = {
        width: window.outerWidth || window.innerWidth,
        height: window.outerHeight || window.innerHeight,
        x: window.screenX ?? 0,
        y: window.screenY ?? 0,
      };
    }
    setMenuOpen(false);
    setMiniMode(true);
    setMiniHover(false);
    setMiniCategoryOpen(false);
    showToast(t.miniModeOn);
    await setWindowSize(MINI_COLLAPSED_SIZE.width, MINI_COLLAPSED_SIZE.height);
  };

  const exitMiniMode = async () => {
    setMiniMode(false);
    setMiniHover(false);
    setMiniCategoryOpen(false);
    showToast(t.miniModeOff);
    const bounds = normalBoundsRef.current;
    if (bounds) {
      await applyWindowBounds(bounds.width, bounds.height, false, bounds);
      normalBoundsRef.current = null;
    }
  };

  useEffect(() => {
    if (!miniMode) return;
    const size = miniPanelOpen ? MINI_EXPANDED_SIZE : MINI_COLLAPSED_SIZE;
    void setWindowSize(size.width, size.height);
  }, [miniMode, miniPanelOpen]);

  const chooseTheme = (next: Theme) => {
    setMenuOpen(false);
    if (next === theme) return;
    setTheme(next);
    showToast(next === "dark" ? t.themeDark : t.themeLight);
  };

  const chooseLang = (next: Lang) => {
    setMenuOpen(false);
    if (next === lang) return;
    setLang(next);
  };

  const chooseFontSize = (next: FontSize) => {
    setMenuOpen(false);
    if (next === fontSize) return;
    setFontSize(next);
    showToast(t.fontSizeUpdated);
  };

  const isGroupDrag = (e: React.DragEvent<HTMLElement>) =>
    e.dataTransfer.types.includes(GROUP_DND_TYPE) || draggingGroupId !== null;

  const closeForms = () => {
    setCatPanel("none");
    setShowGroupAdd(false);
    setCmdForm(null);
    setTitleInput("");
    setNoteInput("");
    setCommandInput("");
    setNewCatName("");
    setEditingCategory("");
    setEditCatName("");
    setCatError("");
    setGroupError("");
    setRenamingGroupId(null);
    setRenameInput("");
    setDraggingCat(null);
    setDropCat(null);
    setDraggingGroupId(null);
    setDropGroupItem(null);
  };

  const toggleCatPanel = (panel: "add" | "edit") => {
    setCatError("");
    setShowGroupAdd(false);
    setCmdForm(null);

    if (catPanel === panel) {
      setCatPanel("none");
      setEditingCategory("");
      setEditCatName("");
      return;
    }

    if (panel === "add") {
      setNewCatName("");
    } else {
      setEditingCategory("");
      setEditCatName("");
    }
    setCatPanel(panel);
  };

  const startRenameCategory = (name: Category) => {
    setEditingCategory(name);
    setEditCatName(name);
    setCatError("");
  };

  const normalizedCategoryQuery = categoryQuery.trim().toLowerCase();
  const visibleCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(normalizedCategoryQuery),
  );
  const normalizedSearch = search.trim().toLowerCase();
  const categoryCounts = new Map<Category, number>();
  for (const item of items) {
    categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);
  }

  const groupsForActive = groups.filter((group) => group.category === activeTab);
  const activeCategoryItems = items.filter(
    (item) =>
      item.category === activeTab &&
        (!normalizedSearch ||
          item.title.toLowerCase().includes(normalizedSearch) ||
          item.note?.toLowerCase().includes(normalizedSearch) ||
          item.command.toLowerCase().includes(normalizedSearch)),

  );
  const ungroupedItems = activeCategoryItems.filter((item) => !item.groupId);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    if (
      categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      setCatError(t.categoryExists);
      return;
    }

    setCategories((prev) => [...prev, { name: trimmed, locked: false }]);
    setActiveTab(trimmed);
    setCategoryQuery("");
    setNewCatName("");
    setCatError("");
    setCatPanel("none");
    showToast(t.categoryAdded);
  };

  const handleRenameCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editCatName.trim();
    if (!trimmed || !editingCategory) return;

    if (trimmed === editingCategory) {
      setEditingCategory("");
      setEditCatName("");
      return;
    }

    if (
      categories.some(
        (c) =>
          c.name !== editingCategory &&
          c.name.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      setCatError(t.categoryExists);
      return;
    }

    setCategories((prev) =>
      prev.map((c) => (c.name === editingCategory ? { ...c, name: trimmed } : c)),
    );
    setGroups((prev) =>
      prev.map((g) =>
        g.category === editingCategory ? { ...g, category: trimmed } : g,
      ),
    );
    setItems((prev) =>
      prev.map((item) =>
        item.category === editingCategory ? { ...item, category: trimmed } : item,
      ),
    );
    if (activeTab === editingCategory) setActiveTab(trimmed);
    setCategoryQuery("");
    setEditingCategory("");
    setEditCatName("");
    setCatError("");
    setDraggingCat(null);
    setDropCat(null);
    showToast(t.categoryRenamed);
  };

  const toggleCategoryLock = (name: Category) => {
    const target = categories.find((c) => c.name === name);
    if (!target) return;

    setCategories((prev) =>
      prev.map((c) => (c.name === name ? { ...c, locked: !c.locked } : c)),
    );
    showToast(target.locked ? t.categoryUnlocked : t.categoryLocked);
  };

  const requestDeleteCategory = (name: Category) => {
    if (categories.find((c) => c.name === name)?.locked) {
      showToast(t.unlockBeforeDelete);
      return;
    }
    setConfirmDialog({ kind: "category", name });
  };

  const handleCatDragStart = (e: React.DragEvent<HTMLElement>, name: Category) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", name);
    setDraggingCat(name);
  };

  const handleCatDragOver = (e: React.DragEvent<HTMLElement>, target: Category) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropCat(target);
  };

  const handleCatDragLeave = (e: React.DragEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDropCat(null);
    }
  };

  const handleCatDrop = (e: React.DragEvent<HTMLElement>, target: Category) => {
    e.preventDefault();
    const name = e.dataTransfer.getData("text/plain") || draggingCat;
    setDraggingCat(null);
    setDropCat(null);
    if (!name || name === target) return;

    const from = categories.findIndex((c) => c.name === name);
    const to = categories.findIndex((c) => c.name === target);
    if (from < 0 || to < 0 || from === to) return;

    const next = [...categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setCategories(next);
    showToast(t.categoryOrderUpdated);
  };

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = groupNameInput.trim();
    if (!trimmed || !activeTab) return;

    if (
      groups.some(
        (g) =>
          g.category === activeTab &&
          g.name.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      setGroupError(t.groupExists);
      return;
    }

    setGroups((prev) => [
      ...prev,
      {
        id: `group-${Date.now()}`,
        category: activeTab,
        name: trimmed,
        collapsed: false,
      },
    ]);
    setGroupNameInput("");
    setGroupError("");
    setShowGroupAdd(false);
    showToast(t.groupAdded);
  };

  const startRenameGroup = (group: GroupItem) => {
    closeForms();
    setRenamingGroupId(group.id);
    setRenameInput(group.name);
  };

  const saveRenameGroup = () => {
    const target = groups.find((g) => g.id === renamingGroupId);
    if (!target) {
      setRenamingGroupId(null);
      return;
    }

    const trimmed = renameInput.trim();
    if (!trimmed) {
      setRenamingGroupId(null);
      return;
    }

    if (
      groups.some(
        (g) =>
          g.id !== target.id &&
          g.category === target.category &&
          g.name.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      showToast(t.groupExists);
      return;
    }

    setGroups((prev) =>
      prev.map((g) => (g.id === target.id ? { ...g, name: trimmed } : g)),
    );
    setRenamingGroupId(null);
    showToast(t.groupRenamed);
  };

  const toggleGroupCollapse = (id: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, collapsed: !g.collapsed } : g)),
    );
  };

  const requestDeleteGroup = (group: GroupItem) => {
    closeForms();
    setConfirmDialog({
      kind: "group",
      id: group.id,
      name: group.name,
      count: items.filter((item) => item.groupId === group.id).length,
    });
  };

  const handleConfirmDelete = () => {
    if (!confirmDialog) return;

    if (confirmDialog.kind === "category") {
      const { name } = confirmDialog;
      const remaining = categories.filter((c) => c.name !== name);
      setCategories(remaining);
      setItems((prev) => prev.filter((item) => item.category !== name));
      setGroups((prev) => prev.filter((g) => g.category !== name));
      if (activeTab === name) setActiveTab(remaining[0]?.name ?? "");
      if (editingCategory === name) {
        setEditingCategory("");
        setEditCatName("");
      }
      if (draggingCat === name) setDraggingCat(null);
      if (dropCat === name) setDropCat(null);
      if (copiedId && items.find((item) => item.id === copiedId)?.category === name) {
        setCopiedId(null);
      }
      showToast(t.categoryDeleted);
    } else if (confirmDialog.kind === "group") {
      const { id } = confirmDialog;
      setGroups((prev) => prev.filter((g) => g.id !== id));
      setItems((prev) =>
        prev.map((item) =>
          item.groupId === id ? { ...item, groupId: undefined } : item,
        ),
      );
      if (groupSelect === id) setGroupSelect(UNGROUPED_KEY);
      showToast(t.groupDeleted);
    } else {
      const { item } = confirmDialog;
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      if (copiedId === item.id) setCopiedId(null);
      showToast(t.commandDeleted);
    }

    setConfirmDialog(null);
  };

  const handleCopy = async (item: CommandItem) => {
    try {
      await navigator.clipboard.writeText(item.command);
      setCopiedId(item.id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === item.id ? null : prev));
      }, 1500);
      showToast(t.copyDone);
    } catch {
      showToast(t.copyFailed);
    }
  };

  const startCodePan = (e: React.PointerEvent<HTMLElement>) => {
    const isPanGesture = e.button === 1 || (e.button === 0 && (e.shiftKey || e.altKey));
    if (!isPanGesture) return;
    e.preventDefault();
    suppressCodeClickRef.current = true;
    codePanRef.current = {
      x: e.clientX,
      scrollLeft: e.currentTarget.scrollLeft,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveCodePan = (e: React.PointerEvent<HTMLElement>) => {
    const pan = codePanRef.current;
    if (!pan) return;
    const dx = e.clientX - pan.x;
    if (Math.abs(dx) > 3) pan.moved = true;
    e.currentTarget.scrollLeft = pan.scrollLeft - dx;
  };

  const endCodePan = (e: React.PointerEvent<HTMLElement>) => {
    codePanRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const openAddCmdForm = (groupId?: string) => {
    setTitleInput("");
    setNoteInput("");
    setCommandInput("");
    setGroupSelect(groupId ?? UNGROUPED_KEY);
    setCmdForm({ mode: "add" });
    setCatPanel("none");
    setShowGroupAdd(false);
    setCatError("");
    setGroupError("");
  };

  const openEditCmdForm = (item: CommandItem) => {
    setTitleInput(item.title);
    setNoteInput(item.note ?? "");
    setCommandInput(item.command);
    setGroupSelect(item.groupId ?? UNGROUPED_KEY);
    setCmdForm({ mode: "edit", item });
    setCatPanel("none");
    setShowGroupAdd(false);
    setCatError("");
    setGroupError("");
  };

  const handleSaveCmd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = titleInput.trim();
    const trimmedNote = noteInput.trim();
    const trimmedCommand = commandInput.trim();
    if (!trimmedCommand || !activeTab || !cmdForm) return;

    const groupId = groupSelect === UNGROUPED_KEY ? undefined : groupSelect;

    if (cmdForm.mode === "edit") {
      const id = cmdForm.item.id;
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                title: trimmedTitle,
                note: trimmedNote || undefined,
                command: trimmedCommand,
                groupId,
              }
            : item,
        ),
      );
      showToast(t.commandUpdated);
    } else {
      const newItem: CommandItem = {
        id: `${activeTab}-${Date.now()}`,
        category: activeTab,
        title: trimmedTitle,
        note: trimmedNote || undefined,
        command: trimmedCommand,
        groupId,
      };
      setItems((prev) => [...prev, newItem]);
      showToast(t.commandAdded);
    }

    setCmdForm(null);
    setTitleInput("");
    setNoteInput("");
    setCommandInput("");
    setGroupSelect(UNGROUPED_KEY);
  };

  const handleDragStart = (e: React.DragEvent<HTMLElement>, id: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    setDraggingId(id);
    setDropItem(null);
  };

  const clearDragState = () => {
    setDraggingId(null);
    setDropTarget(null);
    setDropItem(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>, target: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(target);
    setDropItem(null);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      clearDragState();
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>, target: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggingId;
    clearDragState();
    if (!id) return;

    const groupId = target === UNGROUPED_KEY ? undefined : target;
    if (items.find((item) => item.id === id)?.groupId === groupId) return;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, groupId } : item)),
    );
    const groupName = groups.find((g) => g.id === groupId)?.name;
    showToast(
      groupId ? fmt(t.movedToGroup, { name: groupName ?? t.group }) : t.movedToUngrouped,
    );
  };

  const handleCardDragOver = (e: React.DragEvent<HTMLElement>, item: CommandItem) => {
    if (isGroupDrag(e)) {
      setDropItem(null);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setDropTarget(item.groupId ?? UNGROUPED_KEY);
    setDropItem(draggingId === item.id ? null : { id: item.id, position });
  };

  const handleCardDragLeave = (e: React.DragEvent<HTMLElement>, item: CommandItem) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDropItem((prev) => (prev?.id === item.id ? null : prev));
    }
  };

  const handleCardDrop = (e: React.DragEvent<HTMLElement>, item: CommandItem) => {
    if (isGroupDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData("text/plain") || draggingId;
    const position = dropItem?.id === item.id ? dropItem.position : "after";
    clearDragState();
    if (!id || id === item.id) return;

    const groupId = item.groupId;
    const source = items.find((entry) => entry.id === id);
    if (!source) return;

    setItems((prev) => {
      const dragged = prev.find((entry) => entry.id === id);
      if (!dragged) return prev;
      const next = prev.filter((entry) => entry.id !== id);
      const targetIndex = next.findIndex((entry) => entry.id === item.id);
      if (targetIndex < 0) return prev;
      const insertIndex = position === "before" ? targetIndex : targetIndex + 1;
      next.splice(insertIndex, 0, { ...dragged, groupId });
      return next;
    });

    if (source.groupId === groupId) {
      showToast(t.commandOrderUpdated);
    } else {
      const groupName = groups.find((g) => g.id === groupId)?.name;
      showToast(
        groupId
          ? fmt(t.movedToGroup, { name: groupName ?? t.group })
          : t.movedToUngrouped,
      );
    }
  };

  const clearGroupDragState = () => {
    setDraggingGroupId(null);
    setDropGroupItem(null);
  };

  const handleGroupDragStart = (e: React.DragEvent<HTMLElement>, id: string) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(GROUP_DND_TYPE, id);
    e.dataTransfer.setData("text/plain", `group:${id}`);
    clearDragState();
    setDraggingGroupId(id);
    setDropGroupItem(null);
  };

  const handleGroupDragOver = (e: React.DragEvent<HTMLElement>, targetId: string) => {
    if (targetId === UNGROUPED_KEY) {
      setDropGroupItem(null);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setDropGroupItem(draggingGroupId === targetId ? null : { id: targetId, position });
  };

  const handleGroupDragLeave = (e: React.DragEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDropGroupItem(null);
    }
  };

  const reorderItemsForGroupOrder = (
    prev: CommandItem[],
    nextGroups: GroupItem[],
    category: Category,
  ) => {
    const indexes: number[] = [];
    prev.forEach((item, index) => {
      if (item.category === category) indexes.push(index);
    });
    if (indexes.length === 0) return prev;

    const ranks = new Map<string, number>();
    nextGroups
      .filter((group) => group.category === category)
      .forEach((group, index) => ranks.set(group.id, index));

    const sorted = indexes
      .map((index) => prev[index])
      .sort((a, b) => {
        const rankA = a.groupId ? (ranks.get(a.groupId) ?? -1) : -1;
        const rankB = b.groupId ? (ranks.get(b.groupId) ?? -1) : -1;
        return rankA - rankB;
      });

    const next = [...prev];
    indexes.forEach((index, i) => {
      next[index] = sorted[i];
    });
    return next;
  };

  const handleGroupDrop = (e: React.DragEvent<HTMLElement>, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const raw =
      e.dataTransfer.getData(GROUP_DND_TYPE) || e.dataTransfer.getData("text/plain");
    const id = raw.startsWith("group:") ? raw.slice("group:".length) : raw || draggingGroupId;
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    clearGroupDragState();

    if (!id || id === targetId || targetId === UNGROUPED_KEY) return;
    const sourceGroup = groups.find((group) => group.id === id);
    const targetGroup = groups.find((group) => group.id === targetId);
    if (!sourceGroup || !targetGroup || sourceGroup.category !== targetGroup.category) {
      return;
    }

    const next = [...groups];
    const from = next.findIndex((group) => group.id === id);
    if (from < 0) return;
    const [moved] = next.splice(from, 1);
    const targetIndex = next.findIndex((group) => group.id === targetId);
    if (targetIndex < 0) return;
    next.splice(position === "before" ? targetIndex : targetIndex + 1, 0, moved);

    setGroups(next);
    setItems((prev) => reorderItemsForGroupOrder(prev, next, sourceGroup.category));
    showToast(t.groupOrderUpdated);
  };

  const confirmTitle =
    confirmDialog?.kind === "category"
      ? fmt(t.deleteCategoryTitle, { name: confirmDialog.name })
      : confirmDialog?.kind === "group"
        ? fmt(t.deleteGroupTitle, { name: confirmDialog.name })
        : t.deleteCommandTitle;
  const confirmText =
    confirmDialog?.kind === "category"
      ? fmt(t.deleteCategoryText, {
          count: categoryCounts.get(confirmDialog.name) ?? 0,
          groups: groups.filter((g) => g.category === confirmDialog.name).length,
        })
      : confirmDialog?.kind === "group"
        ? fmt(t.deleteGroupText, {
            count: confirmDialog.count,
            ungrouped: t.ungrouped,
          })
        : fmt(t.deleteCommandText, {
            title:
              confirmDialog?.kind === "command"
                ? confirmDialog.item.title || confirmDialog.item.command
                : "",
          });

  const emptyTitle =
    categories.length === 0
      ? t.noCategories
      : normalizedSearch
        ? t.noCommandsFound
        : fmt(t.noCommandsIn, { name: activeTab });
  const emptyText =
    categories.length === 0
      ? t.emptyCategoryHint
      : normalizedSearch
        ? t.emptySearchHint
        : t.emptyCommandsHint;

  const renderCard = (item: CommandItem) => {
    const isCopied = copiedId === item.id;

    return (
      <article
        key={item.id}
        className={`cmd-card${draggingId === item.id ? " is-dragging" : ""}${isCopied ? " is-copied" : ""}${cmdTitlesVisible ? "" : " hide-cmd-title"}${dropItem?.id === item.id ? ` drop-${dropItem.position}` : ""}`}
        onDragOver={(e) => handleCardDragOver(e, item)}
        onDragLeave={(e) => handleCardDragLeave(e, item)}
        onDrop={(e) => handleCardDrop(e, item)}
      >
        <span
          className="drag-handle"
          draggable
          onDragStart={(e) => handleDragStart(e, item.id)}
          onDragEnd={clearDragState}
          title={t.dragToGroup}
          aria-hidden="true"
        >
          ⠿
        </span>
        <div className="cmd-main">
          <div className="cmd-title-row">
            <span className="cmd-title">{item.title}</span>
          </div>
          <div className="cmd-code-wrap">
            <code
              className="cmd-code"
              onMouseDown={() => window.getSelection()?.removeAllRanges()}
              onPointerDown={startCodePan}
              onPointerMove={moveCodePan}
              onPointerUp={endCodePan}
              onPointerCancel={endCodePan}
              onClick={() => {
                if (suppressCodeClickRef.current) {
                  suppressCodeClickRef.current = false;
                  return;
                }
                if (window.getSelection()?.toString()) return;
                void handleCopy(item);
              }}
            >
              {item.command}
            </code>
            <button
              type="button"
              className={`icon-btn cmd-copy${isCopied ? " icon-btn--copied" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                void handleCopy(item);
              }}
              title={isCopied ? t.copied : t.copy}
              aria-label={isCopied ? t.copied : t.copy}
            >
              {isCopied ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
        </div>
        <div className="cmd-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={() => openEditCmdForm(item)}
            title={t.editCommand}
            aria-label={t.editCommand}
          >
            <EditIcon />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--danger"
            onClick={() => setConfirmDialog({ kind: "command", item })}
            title={t.deleteCommand}
            aria-label={t.deleteCommand}
          >
            <TrashIcon />
          </button>
        </div>
      </article>
    );
  };

  const renderSection = (
    key: string,
    title: string,
    sectionItems: CommandItem[],
    expanded: boolean,
    onToggle: () => void,
    extra?: React.ReactNode,
    group?: GroupItem,
  ) => (
    <section
      className={`group-section${dropTarget === key ? " drop-active" : ""}${
        draggingGroupId === key ? " is-dragging" : ""
      }${dropGroupItem?.id === key ? ` drop-${dropGroupItem.position}` : ""}`}
      onDragOver={(e) =>
        isGroupDrag(e) ? handleGroupDragOver(e, key) : handleDragOver(e, key)
      }
      onDragLeave={(e) =>
        draggingGroupId !== null ? handleGroupDragLeave(e) : handleDragLeave(e)
      }
      onDrop={(e) =>
        isGroupDrag(e) ? handleGroupDrop(e, key) : handleDrop(e, key)
      }
    >
      <header className="group-header">
        {group && (
          <span
            className="drag-handle group-drag"
            draggable
            onDragStart={(e) => handleGroupDragStart(e, group.id)}
            onDragEnd={clearGroupDragState}
            title={t.dragSort}
            aria-label={fmt(t.dragSortItem, { name: title })}
            role="button"
            tabIndex={0}
          >
            ⠿
          </span>
        )}
        <button
          type="button"
          className="group-collapse"
          onClick={onToggle}
          aria-label={expanded ? t.collapseGroup : t.expandGroup}
        >
          {expanded ? "▾" : "▸"}
        </button>
        <button type="button" className="group-name" onClick={onToggle}>
          {title}
        </button>
        <span className="tab-count">{sectionItems.length}</span>
        {extra && <div className="group-actions">{extra}</div>}
      </header>
      {expanded && (
        <div className="group-items">
          {sectionItems.length === 0 ? (
            <div className="group-empty">{t.dropHere}</div>
          ) : (
            sectionItems.map(renderCard)
          )}
        </div>
      )}
    </section>
  );

  if (miniMode) {
    const miniItems = items.filter((item) => item.category === activeTab);
    return (
      <div
        className={`mini-root${miniPanelOpen ? " is-expanded" : ""}`}
        onMouseEnter={() => setMiniHover(true)}
        onMouseLeave={() => {
          setMiniHover(false);
          setMiniCategoryOpen(false);
        }}
      >
        <div className="mini-shell">
          <div className="mini-capsule" onPointerDown={startWindowDrag}>
            <span className="mini-drag" data-tauri-drag-region aria-hidden="true" />
            <button
              type="button"
              className="mini-name"
              onClick={() => setMiniCategoryOpen((prev) => !prev)}
              title={activeTab || t.noCategories}
              aria-label={activeTab || t.noCategories}
              aria-expanded={miniCategoryOpen}
            >
              <span className="mini-name-text">{activeTab || t.noCategories}</span>
              <span className="mini-chevron" aria-hidden="true">
                ▾
              </span>
            </button>
            <button
              type="button"
              className={`icon-btn mini-btn${alwaysOnTop ? " is-pinned" : ""}`}
              onClick={() => void toggleAlwaysOnTop()}
              title={`${t.pinWindow}：${alwaysOnTop ? t.pinOn : t.pinOff}`}
              aria-label={`${t.pinWindow}：${alwaysOnTop ? t.pinOn : t.pinOff}`}
              aria-pressed={alwaysOnTop}
            >
              <PinIcon />
            </button>
            <button
              type="button"
              className="icon-btn mini-btn"
              onClick={() => void exitMiniMode()}
              title={t.expandMini}
              aria-label={t.expandMini}
            >
              <ExpandMiniIcon />
            </button>
            <button
              type="button"
              className="icon-btn mini-btn"
              onClick={() => void minimizeWindow()}
              title={t.minimizeWindow}
              aria-label={t.minimizeWindow}
            >
              <MinimizeIcon />
            </button>
            <button
              type="button"
              className="icon-btn mini-btn icon-btn--danger"
              onClick={() => void closeWindow()}
              title={t.closeWindow}
              aria-label={t.closeWindow}
            >
              <CloseIcon />
            </button>
          </div>
          {miniPanelOpen && (
            <div className="mini-panel">
              <div className="mini-panel-controls">
                <input
                  type="range"
                  className="opacity-slider mini-opacity-slider"
                  min={40}
                  max={100}
                  step={5}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  title={`${t.opacity}：${opacity}%`}
                  aria-label={t.opacity}
                />
                <span className="mini-opacity-value">{opacity}%</span>
              </div>
              {miniCategoryOpen ? (
                <div className="mini-menu">
                  {categories.length === 0 ? (
                    <div className="mini-empty">{t.noCategories}</div>
                  ) : (
                    categories.map((cat) => (
                      <button
                        key={cat.name}
                        type="button"
                        className={`mini-menu-item${cat.name === activeTab ? " is-active" : ""}`}
                        onClick={() => {
                          setActiveTab(cat.name);
                          setCategoryQuery("");
                          closeForms();
                          setMiniCategoryOpen(false);
                        }}
                      >
                        {cat.locked && (
                          <span className="tab-lock">
                            <LockIcon locked />
                          </span>
                        )}
                        <span className="mini-menu-name">{cat.name}</span>
                        <span className="mini-menu-count">
                          {categoryCounts.get(cat.name) ?? 0}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : miniItems.length === 0 ? (
                <div className="mini-empty">
                  {fmt(t.noCommandsIn, { name: activeTab })}
                </div>
              ) : (
                miniItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`mini-row${copiedId === item.id ? " is-copied" : ""}`}
                    onClick={() => void handleCopy(item)}
                  >
                    {cmdTitlesVisible && item.title && (
                      <span className="mini-row-title">{item.title}</span>
                    )}
                    <span className="mini-row-code">{item.command}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app" data-layout={isWide ? "split" : "single"}>
      <header className="app-header" onPointerDown={startWindowDrag}>
        <div className="header-drag" data-tauri-drag-region />
        <input
          type="range"
          className="opacity-slider"
          min={40}
          max={100}
          step={5}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          title={`${t.opacity}：${opacity}%`}
          aria-label={t.opacity}
        />
        <button
          type="button"
          className={`icon-btn pin-btn${alwaysOnTop ? " is-pinned" : ""}`}
          onClick={toggleAlwaysOnTop}
          title={`${t.pinWindow}：${alwaysOnTop ? t.pinOn : t.pinOff}`}
          aria-label={`${t.pinWindow}：${alwaysOnTop ? t.pinOn : t.pinOff}`}
          aria-pressed={alwaysOnTop}
        >
          <PinIcon />
        </button>
        <button
          type="button"
          className={`icon-btn layout-btn${isWide ? " is-active" : ""}`}
          onClick={toggleLayout}
          title={isWide ? t.collapseLayout : t.expandLayout}
          aria-label={isWide ? t.collapseLayout : t.expandLayout}
          aria-pressed={isWide}
        >
          <LayoutIcon split={isWide} />
        </button>
        <button
          type="button"
          className={`icon-btn mini-mode-btn${miniMode ? " is-active" : ""}`}
          onClick={() => void enterMiniMode()}
          title={t.toggleMiniMode}
          aria-label={t.toggleMiniMode}
        >
          <MiniIcon />
        </button>
        <div className="menu-wrap">
          <button
            type="button"
            className={`icon-btn${menuOpen ? " is-active" : ""}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            title={t.settings}
            aria-label={t.openSettings}
          >
            <MenuIcon />
          </button>
          {menuOpen && (
            <div className="menu-popover" role="menu">
              <div className="menu-section">
                <div className="menu-section-title">{t.theme}</div>
                <div className="menu-choices" role="group" aria-label={t.theme}>
                  <button
                    type="button"
                    className={`menu-choice${theme === "dark" ? " is-selected" : ""}`}
                    aria-pressed={theme === "dark"}
                    onClick={() => chooseTheme("dark")}
                  >
                    {t.dark}
                  </button>
                  <button
                    type="button"
                    className={`menu-choice${theme === "light" ? " is-selected" : ""}`}
                    aria-pressed={theme === "light"}
                    onClick={() => chooseTheme("light")}
                  >
                    {t.light}
                  </button>
                </div>
              </div>
              <div className="menu-section">
                <div className="menu-section-title">{t.language}</div>
                <div className="menu-choices" role="group" aria-label={t.language}>
                  <button
                    type="button"
                    className={`menu-choice${lang === "zh-TW" ? " is-selected" : ""}`}
                    aria-pressed={lang === "zh-TW"}
                    onClick={() => chooseLang("zh-TW")}
                  >
                    {t.langZH}
                  </button>
                  <button
                    type="button"
                    className={`menu-choice${lang === "en" ? " is-selected" : ""}`}
                    aria-pressed={lang === "en"}
                    onClick={() => chooseLang("en")}
                  >
                    {t.langEN}
                  </button>
                </div>
              </div>
              <div className="menu-section">
                <div className="menu-section-title">{t.fontSize}</div>
                <div
                  className="menu-choices menu-choices--three"
                  role="group"
                  aria-label={t.fontSize}
                >
                  <button
                    type="button"
                    className={`menu-choice${fontSize === "small" ? " is-selected" : ""}`}
                    aria-pressed={fontSize === "small"}
                    onClick={() => chooseFontSize("small")}
                  >
                    {t.fontSmall}
                  </button>
                  <button
                    type="button"
                    className={`menu-choice${fontSize === "medium" ? " is-selected" : ""}`}
                    aria-pressed={fontSize === "medium"}
                    onClick={() => chooseFontSize("medium")}
                  >
                    {t.fontMedium}
                  </button>
                  <button
                    type="button"
                    className={`menu-choice${fontSize === "large" ? " is-selected" : ""}`}
                    aria-pressed={fontSize === "large"}
                    onClick={() => chooseFontSize("large")}
                  >
                    {t.fontLarge}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          className="icon-btn window-btn minimize-btn"
          onClick={() => void minimizeWindow()}
          title={t.minimizeWindow}
          aria-label={t.minimizeWindow}
        >
          <MinimizeIcon />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--danger window-btn close-btn"
          onClick={() => void closeWindow()}
          title={t.closeWindow}
          aria-label={t.closeWindow}
        >
          <CloseIcon />
        </button>
      </header>

      {!isWide && categoriesCollapsed ? (
        <div className="category-collapsed-bar">
          <div className="category-collapsed-select-wrap">
            <select
              className="category-collapsed-select"
              value={activeTab}
              onChange={(e) => {
                setActiveTab(e.target.value);
                setCategoryQuery("");
                closeForms();
              }}
              aria-label={t.category}
            >
              {categories.length === 0 ? (
                <option value="">{t.noCategories}</option>
              ) : (
                categories.map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.locked ? `${cat.name} · ${t.locked}` : cat.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <button
            type="button"
            className="category-collapse-btn category-collapse-btn--boxed"
            onClick={() => setCategoriesCollapsed(false)}
            title={t.expandCategories}
            aria-label={t.expandCategories}
            aria-expanded={false}
          >
            <span className="category-collapse-icon" aria-hidden="true">
              ▾
            </span>
          </button>
        </div>
      ) : (
        <div className="category-area" data-label={t.category}>
          <div className="category-search-row">
            <div className="search-wrap search-wrap--cat">
              <span className="search-icon" aria-hidden="true">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M5 7h14M5 12h14M5 17h9" />
                </svg>
              </span>
              <input
                ref={categorySearchRef}
                type="search"
                className="search-input"
                placeholder={t.searchCategory}
                value={categoryQuery}
                onChange={(e) => setCategoryQuery(e.target.value)}
                aria-label={t.searchCategory}
              />
            </div>
            <button
              type="button"
              className="category-collapse-btn"
              onClick={() => setCategoriesCollapsed(true)}
              title={t.collapseCategories}
              aria-label={t.collapseCategories}
              aria-expanded={true}
            >
              <span className="category-collapse-icon" aria-hidden="true">
                ▴
              </span>
            </button>
          </div>

      <div className="category-actions">
        <button
          type="button"
          className={`action-btn${catPanel === "add" ? " is-active" : ""}`}
          onClick={() => toggleCatPanel("add")}
          title={t.addCategory}
          aria-label={t.addCategory}
        >
          <PlusIcon />
          <span>{t.category}</span>
        </button>
        <button
          type="button"
          className={`action-btn${catPanel === "edit" ? " is-active" : ""}`}
          disabled={categories.length === 0}
          onClick={() => toggleCatPanel("edit")}
          title={t.manageCategories}
          aria-label={t.manageCategoriesShort}
        >
          <EditIcon />
          <span>{t.edit}</span>
        </button>
      </div>

      {catPanel === "add" && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">{t.addCategory}</div>
            <button
              type="button"
              className="icon-btn"
              onClick={closeForms}
              title={t.cancel}
              aria-label={`${t.cancel}${t.addCategory}`}
            >
              <CloseIcon />
            </button>
          </div>
          <form onSubmit={handleAddCategory} className="form-stack">
            <input
              ref={categoryRef}
              type="text"
              className="field"
              placeholder={t.categoryPlaceholder}
              value={newCatName}
              onChange={(e) => {
                setNewCatName(e.target.value);
                setCatError("");
              }}
              aria-label={t.categoryName}
            />
            <div className="form-actions">
              <button type="submit" className="btn btn--primary">
                {t.save}
              </button>
            </div>
          </form>
          {catError && <div className="form-error">{catError}</div>}
        </div>
      )}

      {catPanel === "edit" && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">{t.manageCategoryTitle}</div>
            <button
              type="button"
              className="icon-btn"
              onClick={closeForms}
              title={t.done}
              aria-label={`${t.done}${t.manageCategoriesShort}`}
            >
              <CloseIcon />
            </button>
          </div>
          {catError && <div className="form-error">{catError}</div>}
          <div className="manage-list">
            {categories.map((cat) => {
              const isRenaming = editingCategory === cat.name;
              return (
                <div
                  key={cat.name}
                  className={`manage-row${draggingCat === cat.name ? " is-dragging" : ""}${dropCat === cat.name && draggingCat !== cat.name ? " drop-active" : ""}`}
                  onDragOver={(e) => handleCatDragOver(e, cat.name)}
                  onDragLeave={handleCatDragLeave}
                  onDrop={(e) => handleCatDrop(e, cat.name)}
                >
                  <span
                    className="drag-handle manage-drag"
                    draggable
                    onDragStart={(e) => handleCatDragStart(e, cat.name)}
                    onDragEnd={() => {
                      setDraggingCat(null);
                      setDropCat(null);
                    }}
                    title={t.dragSort}
                    aria-label={fmt(t.dragSortItem, { name: cat.name })}
                  >
                    ⠿
                  </span>
                  {isRenaming ? (
                    <form onSubmit={handleRenameCategory} className="manage-row-form">
                      <input
                        ref={categoryRef}
                        type="text"
                        className="field"
                        value={editCatName}
                        onChange={(e) => {
                          setEditCatName(e.target.value);
                          setCatError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            e.stopPropagation();
                            setEditingCategory("");
                            setEditCatName("");
                          }
                        }}
                        aria-label={fmt(t.renameItem, { name: cat.name })}
                      />
                      <button
                        type="submit"
                        className="icon-btn"
                        title={t.saveName}
                        aria-label={t.saveName}
                      >
                        <CheckIcon />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => {
                          setEditingCategory("");
                          setEditCatName("");
                          setCatError("");
                        }}
                        title={t.cancelRename}
                        aria-label={t.cancelRename}
                      >
                        <CloseIcon />
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="manage-name">{cat.name}</span>
                      <span className="tab-count">
                        {fmt(t.itemsUnit, { count: categoryCounts.get(cat.name) ?? 0 })}
                      </span>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => startRenameCategory(cat.name)}
                        title={t.renameCategory}
                        aria-label={fmt(t.renameItem, { name: cat.name })}
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className={`icon-btn${cat.locked ? " is-locked" : ""}`}
                        onClick={() => toggleCategoryLock(cat.name)}
                        title={cat.locked ? t.unlockCategory : t.lockCategory}
                        aria-label={
                          cat.locked
                            ? fmt(t.unlockItem, { name: cat.name })
                            : fmt(t.lockItem, { name: cat.name })
                        }
                      >
                        <LockIcon locked={cat.locked} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        disabled={cat.locked}
                        onClick={() => requestDeleteCategory(cat.name)}
                        title={cat.locked ? t.unlockBeforeDelete : t.deleteCategory}
                        aria-label={fmt(t.deleteCategoryItem, { name: cat.name })}
                      >
                        <TrashIcon />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

          <div className="tabs-row">
            <nav
              className="tabs"
              ref={tabsRef}
              aria-label={t.categoriesNav}
            >
              {visibleCategories.map((cat) => {
                const active = activeTab === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    className={`tab${active ? " tab--active" : ""}`}
                    onClick={() => {
                      setActiveTab(cat.name);
                      closeForms();
                    }}
                  >
                    {cat.locked && (
                      <span className="tab-lock" title={t.locked}>
                        <LockIcon locked />
                      </span>
                    )}
                    <span>{cat.name}</span>
                    <span className="tab-count">
                      {categoryCounts.get(cat.name) ?? 0}
                    </span>
                  </button>
                );
              })}
              {normalizedCategoryQuery && visibleCategories.length === 0 && (
                <span className="tabs-empty">{t.noCategoryMatch}</span>
              )}
            </nav>
          </div>
        </div>
      )}

      <div className="command-area" data-label={t.command}>
      <div className="search-wrap search-wrap--content">
        <span className="search-icon" aria-hidden="true">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          ref={searchRef}
          type="search"
          className="search-input"
          placeholder={t.searchCommands}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t.searchCommands}
        />
        <div className="search-hint" aria-hidden="true">
          <kbd>Ctrl</kbd>
          <kbd>K</kbd>
        </div>
      </div>

      <div className="list-actions">
        <button
          type="button"
          className={`action-btn${cmdForm ? " is-active" : ""}`}
          onClick={() => openAddCmdForm()}
          disabled={!activeTab}
          title={t.addCommand}
        >
          <PlusIcon />
          <span>{t.command}</span>
        </button>
        <button
          type="button"
          className={`action-btn${showGroupAdd ? " is-active" : ""}`}
          disabled={!activeTab}
          onClick={() => {
            setShowGroupAdd((prev) => !prev);
            setCatPanel("none");
            setCmdForm(null);
            setGroupError("");
          }}
          title={t.addGroup}
        >
          <PlusIcon />
          <span>{t.group}</span>
        </button>
        <button
          type="button"
          className={`action-btn list-actions-title${cmdTitlesVisible ? " is-active" : ""}`}
          onClick={() => setCmdTitlesVisible((prev) => !prev)}
          title={cmdTitlesVisible ? undefined : t.commandTitle}
          aria-label={t.commandTitle}
          aria-pressed={cmdTitlesVisible}
        >
          <TitleIcon hidden={!cmdTitlesVisible} />
        </button>
      </div>

      {showGroupAdd && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">{fmt(t.addGroupIn, { name: activeTab })}</div>
            <button
              type="button"
              className="icon-btn"
              onClick={closeForms}
              title={t.cancel}
              aria-label={`${t.cancel}${t.addGroup}`}
            >
              <CloseIcon />
            </button>
          </div>
          <form onSubmit={handleAddGroup} className="form-stack">
            <input
              ref={groupRef}
              type="text"
              className="field"
              placeholder={t.groupPlaceholder}
              value={groupNameInput}
              onChange={(e) => {
                setGroupNameInput(e.target.value);
                setGroupError("");
              }}
              aria-label={t.groupName}
            />
            <div className="form-actions">
              <button type="submit" className="btn btn--primary">
                {t.add}
              </button>
            </div>
          </form>
          {groupError && <div className="form-error">{groupError}</div>}
        </div>
      )}

      {cmdForm && (
        <form onSubmit={handleSaveCmd} className="panel">
          <div className="panel-head">
            <div className="panel-title">
              {cmdForm.mode === "add" ? t.addCommand : t.editCommand}
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={closeForms}
              title={t.cancel}
              aria-label={t.cancel}
            >
              <CloseIcon />
            </button>
          </div>
          <input
            ref={titleRef}
            type="text"
            className="field"
            placeholder={t.commandTitlePlaceholder}
            value={titleInput}
            maxLength={40}
            onChange={(e) => setTitleInput(e.target.value)}
            aria-label={t.commandTitle}
          />
          <textarea
            className="field field--textarea"
            placeholder={t.commandNotePlaceholder}
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            aria-label={t.commandNote}
            rows={4}
          />
          <input
            type="text"
            className="field field--mono"
            placeholder={t.commandContentPlaceholder}
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            aria-label={t.commandContent}
          />
          <select
            className="field"
            value={groupSelect}
            onChange={(e) => setGroupSelect(e.target.value)}
            aria-label={t.groupOf}
          >
            <option value={UNGROUPED_KEY}>{t.ungrouped}</option>
            {groupsForActive.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <div className="form-actions">
            <button type="submit" className="btn btn--primary">
              {t.save}
            </button>
          </div>
        </form>
      )}

      {renamingGroupId && (
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            saveRenameGroup();
          }}
        >
          <div className="panel-head">
            <div className="panel-title">{t.renameGroup}</div>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setRenamingGroupId(null)}
              title={t.cancelRename}
              aria-label={t.cancelRename}
            >
              <CloseIcon />
            </button>
          </div>
          <input
            autoFocus
            type="text"
            className="field"
            placeholder={t.groupNewName}
            value={renameInput}
            onChange={(e) => setRenameInput(e.target.value)}
            aria-label={t.groupNewName}
          />
          <div className="form-actions">
            <button type="submit" className="btn btn--primary">
              {t.saveName}
            </button>
          </div>
        </form>
      )}

      <main className="list" ref={listRef}>
        {activeCategoryItems.length === 0 &&
        (normalizedSearch || groupsForActive.length === 0) ? (
          <div className="empty">
            <div className="empty-icon" aria-hidden="true">
              {"{ }"}
            </div>
            <strong>{emptyTitle}</strong>
            <span>{emptyText}</span>
          </div>
        ) : (
          <>
            {(activeCategoryItems.length > 0 || groupsForActive.length === 0) &&
              renderSection(
                UNGROUPED_KEY,
                t.ungrouped,
                ungroupedItems,
                normalizedSearch ? true : !ungroupedCollapsed,
                () => setUngroupedCollapsed((prev) => !prev),
              )}
            {groupsForActive.map((group) => {
              const groupItems = activeCategoryItems.filter(
                (item) => item.groupId === group.id,
              );
              if (normalizedSearch && groupItems.length === 0) return null;

              return renderSection(
                group.id,
                group.name,
                groupItems,
                normalizedSearch ? true : !group.collapsed,
                () => toggleGroupCollapse(group.id),
                <>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => openAddCmdForm(group.id)}
                    title={fmt(t.addCommandIn, { name: group.name })}
                    aria-label={fmt(t.addCommandIn, { name: group.name })}
                  >
                    <PlusIcon />
                  </button>
                  <button
                    type="button"
                    className={`icon-btn${renamingGroupId === group.id ? " is-active" : ""}`}
                    onClick={() => startRenameGroup(group)}
                    title={t.renameGroup}
                    aria-label={fmt(t.renameItem, { name: group.name })}
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    onClick={() => requestDeleteGroup(group)}
                    title={t.deleteGroup}
                    aria-label={fmt(t.deleteGroupItem, { name: group.name })}
                  >
                    <TrashIcon />
                  </button>
                </>,
                group,
              );
            })}
          </>
        )}
      </main>
      </div>

      <footer className="statusbar">
        <span>
          {fmt(t.statusSummary, {
            categories: categories.length,
            groups: groupsForActive.length,
            shown: activeCategoryItems.length,
            total: items.length,
          })}
        </span>
        <span>{t.searchShortcut}</span>
      </footer>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      {confirmDialog && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirmDialog(null);
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <div className="modal-title" id="confirm-title">
              {confirmTitle}
            </div>
            <p className="modal-text">{confirmText}</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn"
                onClick={() => setConfirmDialog(null)}
              >
                {t.cancel}
              </button>
              <button
                ref={confirmRef}
                type="button"
                className="btn btn--danger-solid"
                onClick={handleConfirmDelete}
              >
                {t.confirmDelete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
