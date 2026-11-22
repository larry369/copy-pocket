import { useEffect, useRef, useState } from "react";

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

const STORAGE_ITEMS_KEY = "command_pocket_items_v3";
const LEGACY_ITEMS_KEY = "command_pocket_items_v2";
const STORAGE_CATS_KEY = "command_pocket_categories_v3";
const LEGACY_CATS_KEY = "command_pocket_categories_v2";
const STORAGE_GROUPS_KEY = "command_pocket_groups_v1";

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
    for (const key of [STORAGE_ITEMS_KEY, LEGACY_ITEMS_KEY]) {
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

function ManageIcon() {
  return (
    <Icon>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
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
  const [showCatAdd, setShowCatAdd] = useState(false);
  const [showCatManage, setShowCatManage] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catError, setCatError] = useState("");
  const [showGroupAdd, setShowGroupAdd] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState("");
  const [groupError, setGroupError] = useState("");
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [ungroupedCollapsed, setUngroupedCollapsed] = useState(false);
  const [cmdForm, setCmdForm] = useState<CmdForm | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [commandInput, setCommandInput] = useState("");
  const [groupSelect, setGroupSelect] = useState(UNGROUPED_KEY);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<ConfirmTarget | null>(null);
  const [scrollState, setScrollState] = useState({ left: false, right: false });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const categorySearchRef = useRef<HTMLInputElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const categoryRef = useRef<HTMLInputElement | null>(null);
  const groupRef = useRef<HTMLInputElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const tabsRef = useRef<HTMLElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateTabScroll = () => {
    const el = tabsRef.current;
    if (!el) return;
    setScrollState({
      left: el.scrollLeft > 2,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
    });
  };

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
    if (showCatAdd) categoryRef.current?.focus();
  }, [showCatAdd]);

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
    updateTabScroll();
    const onResize = () => updateTabScroll();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [categories, categoryQuery]);

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
  }, []);

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
        if (confirmDialog) {
          setConfirmDialog(null);
        } else if (renamingGroupId) {
          setRenamingGroupId(null);
        } else if (showCatAdd || showCatManage || showGroupAdd || cmdForm) {
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
    confirmDialog,
    renamingGroupId,
    showCatAdd,
    showCatManage,
    showGroupAdd,
    cmdForm,
  ]);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current !== null) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast("");
      toastTimer.current = null;
    }, 1800);
  };

  const closeForms = () => {
    setShowCatAdd(false);
    setShowCatManage(false);
    setShowGroupAdd(false);
    setCmdForm(null);
    setCatError("");
    setGroupError("");
    setRenamingGroupId(null);
  };

  const scrollTabs = (direction: -1 | 1) => {
    tabsRef.current?.scrollBy({ left: direction * 180, behavior: "smooth" });
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
      setCatError("這個分類已經存在了");
      return;
    }

    setCategories((prev) => [...prev, { name: trimmed, locked: false }]);
    setActiveTab(trimmed);
    setNewCatName("");
    setCatError("");
    setShowCatAdd(false);
    showToast("分類已新增");
  };

  const toggleCategoryLock = (name: Category) => {
    const target = categories.find((c) => c.name === name);
    if (!target) return;

    setCategories((prev) =>
      prev.map((c) => (c.name === name ? { ...c, locked: !c.locked } : c)),
    );
    showToast(target.locked ? "分類已解鎖" : "分類已鎖定，可避免誤刪");
  };

  const requestDeleteCategory = (name: Category) => {
    if (categories.find((c) => c.name === name)?.locked) {
      showToast("請先解鎖分類再刪除");
      return;
    }
    setConfirmDialog({ kind: "category", name });
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
      setGroupError("這個群組已經存在了");
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
    showToast("群組已新增");
  };

  const startRenameGroup = (group: GroupItem) => {
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
      showToast("這個群組已經存在了");
      return;
    }

    setGroups((prev) =>
      prev.map((g) => (g.id === target.id ? { ...g, name: trimmed } : g)),
    );
    setRenamingGroupId(null);
    showToast("群組已重新命名");
  };

  const toggleGroupCollapse = (id: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, collapsed: !g.collapsed } : g)),
    );
  };

  const requestDeleteGroup = (group: GroupItem) => {
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
      if (copiedId && items.find((item) => item.id === copiedId)?.category === name) {
        setCopiedId(null);
      }
      showToast("分類、群組與所屬指令已刪除");
    } else if (confirmDialog.kind === "group") {
      const { id } = confirmDialog;
      setGroups((prev) => prev.filter((g) => g.id !== id));
      setItems((prev) =>
        prev.map((item) =>
          item.groupId === id ? { ...item, groupId: undefined } : item,
        ),
      );
      if (groupSelect === id) setGroupSelect(UNGROUPED_KEY);
      showToast("群組已刪除，指令已回到未分組");
    } else {
      const { item } = confirmDialog;
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      if (copiedId === item.id) setCopiedId(null);
      showToast("指令已刪除");
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
      showToast("指令已複製到剪貼簿");
    } catch {
      showToast("複製失敗，請手動選取指令");
    }
  };

  const openAddCmdForm = () => {
    setTitleInput("");
    setCommandInput("");
    setGroupSelect(UNGROUPED_KEY);
    setCmdForm({ mode: "add" });
    setShowCatAdd(false);
    setShowCatManage(false);
    setShowGroupAdd(false);
    setCatError("");
    setGroupError("");
  };

  const openEditCmdForm = (item: CommandItem) => {
    setTitleInput(item.title);
    setCommandInput(item.command);
    setGroupSelect(item.groupId ?? UNGROUPED_KEY);
    setCmdForm({ mode: "edit", item });
    setShowCatAdd(false);
    setShowCatManage(false);
    setShowGroupAdd(false);
    setCatError("");
    setGroupError("");
  };

  const handleSaveCmd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = titleInput.trim();
    const trimmedCommand = commandInput.trim();
    if (!trimmedTitle || !trimmedCommand || !activeTab || !cmdForm) return;

    const groupId = groupSelect === UNGROUPED_KEY ? undefined : groupSelect;

    if (cmdForm.mode === "edit") {
      const id = cmdForm.item.id;
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, title: trimmedTitle, command: trimmedCommand, groupId }
            : item,
        ),
      );
      showToast("指令已更新");
    } else {
      const newItem: CommandItem = {
        id: `${activeTab}-${Date.now()}`,
        category: activeTab,
        title: trimmedTitle,
        command: trimmedCommand,
        groupId,
      };
      setItems((prev) => [...prev, newItem]);
      showToast("指令已新增");
    }

    setCmdForm(null);
    setTitleInput("");
    setCommandInput("");
    setGroupSelect(UNGROUPED_KEY);
  };

  const handleDragStart = (e: React.DragEvent<HTMLElement>, id: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    setDraggingId(id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>, target: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(target);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDropTarget(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>, target: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggingId;
    if (!id) return;

    const groupId = target === UNGROUPED_KEY ? undefined : target;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, groupId } : item)),
    );
    const groupName = groups.find((g) => g.id === groupId)?.name;
    showToast(groupId ? `已移動到「${groupName ?? "群組"}」` : "已移至未分組");
    setDraggingId(null);
    setDropTarget(null);
  };

  const confirmTitle =
    confirmDialog?.kind === "category"
      ? `刪除分類「${confirmDialog.name}」？`
      : confirmDialog?.kind === "group"
        ? `刪除群組「${confirmDialog.name}」？`
        : "刪除這筆指令？";
  const confirmText =
    confirmDialog?.kind === "category"
      ? `分類內的 ${categoryCounts.get(confirmDialog.name) ?? 0} 筆指令與 ${groups.filter((g) => g.category === confirmDialog.name).length} 個群組會一併刪除，此動作無法復原。`
      : confirmDialog?.kind === "group"
        ? `群組內的 ${confirmDialog.count} 筆指令會回到「未分組」，不會被刪除。`
        : `「${confirmDialog?.kind === "command" ? confirmDialog.item.title : ""}」將被刪除，此動作無法復原。`;

  const emptyTitle =
    categories.length === 0
      ? "尚未建立分類"
      : normalizedSearch
        ? "找不到符合的指令"
        : `「${activeTab}」還沒有指令`;
  const emptyText =
    categories.length === 0
      ? "先點上方「新增分類」建立一個分類。"
      : normalizedSearch
        ? "試試其他關鍵字，或清空搜尋條件。"
        : "點下方「+ 新增指令」加入第一筆。";

  const renderCard = (item: CommandItem) => {
    const isCopied = copiedId === item.id;
    const groupName = item.groupId
      ? groups.find((g) => g.id === item.groupId)?.name
      : undefined;

    return (
      <article
        key={item.id}
        className={`cmd-card${draggingId === item.id ? " is-dragging" : ""}`}
        draggable
        onDragStart={(e) => handleDragStart(e, item.id)}
        onDragEnd={() => {
          setDraggingId(null);
          setDropTarget(null);
        }}
      >
        <span className="drag-handle" title="拖曳移動到群組" aria-hidden="true">
          ⠿
        </span>
        <div className="cmd-main">
          <div className="cmd-title-row">
            <span className="cmd-title">{item.title}</span>
            <span className="cmd-tag">{item.category}</span>
            {groupName && <span className="cmd-tag cmd-tag--group">{groupName}</span>}
          </div>
          <code className="cmd-code">{item.command}</code>
        </div>
        <div className="cmd-actions">
          <button
            type="button"
            className={`icon-btn${isCopied ? " icon-btn--copied" : ""}`}
            onClick={() => handleCopy(item)}
            title={isCopied ? "已複製" : "複製指令"}
            aria-label={isCopied ? "已複製" : "複製指令"}
          >
            {isCopied ? <CheckIcon /> : <CopyIcon />}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => openEditCmdForm(item)}
            title="修改指令"
            aria-label="修改指令"
          >
            <EditIcon />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--danger"
            onClick={() => setConfirmDialog({ kind: "command", item })}
            title="刪除指令"
            aria-label="刪除指令"
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
  ) => (
    <section
      className={`group-section${dropTarget === key ? " drop-active" : ""}`}
      onDragOver={(e) => handleDragOver(e, key)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, key)}
    >
      <header className="group-header">
        <button
          type="button"
          className="group-collapse"
          onClick={onToggle}
          aria-label={expanded ? "收合群組" : "展開群組"}
        >
          {expanded ? "▾" : "▸"}
        </button>
        <span className="group-name">{title}</span>
        <span className="tab-count">{sectionItems.length}</span>
        {extra && <div className="group-actions">{extra}</div>}
      </header>
      {expanded && (
        <div className="group-items">
          {sectionItems.length === 0 ? (
            <div className="group-empty">拖曳指令卡片到這裡</div>
          ) : (
            sectionItems.map(renderCard)
          )}
        </div>
      )}
    </section>
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            &gt;_
          </div>
          <div>
            <h1>Command Pocket</h1>
            <p>常用指令收納，一鍵複製</p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setShowCatAdd((prev) => !prev);
            setShowCatManage(false);
            setShowGroupAdd(false);
            setCmdForm(null);
            setCatError("");
          }}
        >
          新增分類
        </button>
      </header>

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
          placeholder="搜尋分類"
          value={categoryQuery}
          onChange={(e) => setCategoryQuery(e.target.value)}
          aria-label="搜尋分類"
        />
      </div>

      <div className="tabs-row">
        <button
          type="button"
          className="tab-scroll"
          onClick={() => scrollTabs(-1)}
          disabled={!scrollState.left}
          aria-label="向左捲動分類"
        >
          ‹
        </button>
        <nav
          className="tabs"
          ref={tabsRef}
          aria-label="指令分類"
          onScroll={updateTabScroll}
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
                <span>{cat.name}</span>
                {cat.locked && (
                  <span className="tab-lock" title="已鎖定">
                    <LockIcon locked />
                  </span>
                )}
                <span className="tab-count">
                  {categoryCounts.get(cat.name) ?? 0}
                </span>
              </button>
            );
          })}
          {normalizedCategoryQuery && visibleCategories.length === 0 && (
            <span className="tabs-empty">找不到符合的分類</span>
          )}
        </nav>
        <button
          type="button"
          className="tab-scroll"
          onClick={() => scrollTabs(1)}
          disabled={!scrollState.right}
          aria-label="向右捲動分類"
        >
          ›
        </button>
        <button
          type="button"
          className={`tab-scroll tab-manage${showCatManage ? " is-active" : ""}`}
          onClick={() => {
            setShowCatManage((prev) => !prev);
            setShowCatAdd(false);
            setShowGroupAdd(false);
            setCmdForm(null);
          }}
          title="管理分類（鎖定、刪除）"
          aria-label="管理分類"
        >
          <ManageIcon />
        </button>
      </div>

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
          placeholder="搜尋目前分類的指令說明或內容"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="搜尋指令"
        />
        <div className="search-hint" aria-hidden="true">
          <kbd>Ctrl</kbd>
          <kbd>K</kbd>
        </div>
      </div>

      {showCatAdd && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">新增分類</div>
            <button type="button" className="btn btn--sm btn--ghost" onClick={closeForms}>
              取消
            </button>
          </div>
          <form onSubmit={handleAddCategory} className="form-row">
            <input
              ref={categoryRef}
              type="text"
              className="field"
              placeholder="例如：docker、sql、linux"
              value={newCatName}
              onChange={(e) => {
                setNewCatName(e.target.value);
                setCatError("");
              }}
              aria-label="分類名稱"
            />
            <button type="submit" className="btn btn--primary">
              加入
            </button>
          </form>
          {catError && <div className="form-error">{catError}</div>}
        </div>
      )}

      {showCatManage && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">管理分類（鎖定後無法刪除）</div>
            <button type="button" className="btn btn--sm btn--ghost" onClick={closeForms}>
              完成
            </button>
          </div>
          <div className="manage-list">
            {categories.map((cat) => (
              <div className="manage-row" key={cat.name}>
                <span className="manage-name">{cat.name}</span>
                <span className="tab-count">
                  {categoryCounts.get(cat.name) ?? 0} 筆
                </span>
                <button
                  type="button"
                  className={`icon-btn${cat.locked ? " is-locked" : ""}`}
                  onClick={() => toggleCategoryLock(cat.name)}
                  title={cat.locked ? "解鎖分類" : "鎖定分類"}
                  aria-label={cat.locked ? `解鎖 ${cat.name}` : `鎖定 ${cat.name}`}
                >
                  <LockIcon locked={cat.locked} />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  disabled={cat.locked}
                  onClick={() => requestDeleteCategory(cat.name)}
                  title={cat.locked ? "請先解鎖再刪除" : "刪除分類"}
                  aria-label={`刪除分類 ${cat.name}`}
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="group-bar">
        <span className="group-bar-title">群組</span>
        <span className="group-bar-hint">點群組標題圖示可改名或刪除，拖曳卡片可歸類</span>
        <button
          type="button"
          className="btn btn--sm"
          disabled={!activeTab}
          onClick={() => {
            setShowGroupAdd((prev) => !prev);
            setShowCatAdd(false);
            setShowCatManage(false);
            setCmdForm(null);
            setGroupError("");
          }}
        >
          {showGroupAdd ? "取消" : "+ 新增群組"}
        </button>
      </div>

      {showGroupAdd && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">在「{activeTab}」新增群組</div>
            <button type="button" className="btn btn--sm btn--ghost" onClick={closeForms}>
              取消
            </button>
          </div>
          <form onSubmit={handleAddGroup} className="form-row">
            <input
              ref={groupRef}
              type="text"
              className="field"
              placeholder="例如：部署流程、常用查詢"
              value={groupNameInput}
              onChange={(e) => {
                setGroupNameInput(e.target.value);
                setGroupError("");
              }}
              aria-label="群組名稱"
            />
            <button type="submit" className="btn btn--primary">
              加入
            </button>
          </form>
          {groupError && <div className="form-error">{groupError}</div>}
        </div>
      )}

      {cmdForm && (
        <form onSubmit={handleSaveCmd} className="panel">
          <div className="panel-head">
            <div className="panel-title">
              {cmdForm.mode === "add" ? "新增指令" : "修改指令"}
            </div>
            <button type="button" className="btn btn--sm btn--ghost" onClick={closeForms}>
              取消
            </button>
          </div>
          <input
            ref={titleRef}
            type="text"
            className="field"
            placeholder="指令說明，例如：查看目前分支狀態"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            aria-label="指令說明"
          />
          <input
            type="text"
            className="field field--mono"
            placeholder="指令內容，例如：git status"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            aria-label="指令內容"
          />
          <select
            className="field"
            value={groupSelect}
            onChange={(e) => setGroupSelect(e.target.value)}
            aria-label="所屬群組"
          >
            <option value={UNGROUPED_KEY}>未分組</option>
            {groupsForActive.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <div className="form-actions">
            <button type="submit" className="btn btn--primary">
              儲存
            </button>
          </div>
        </form>
      )}

      <main className="list">
        {activeCategoryItems.length === 0 ? (
          <div className="empty">
            <div className="empty-icon" aria-hidden="true">
              {"{ }"}
            </div>
            <strong>{emptyTitle}</strong>
            <span>{emptyText}</span>
          </div>
        ) : (
          <>
            {renderSection(
              UNGROUPED_KEY,
              "未分組",
              ungroupedItems,
              normalizedSearch ? true : !ungroupedCollapsed,
              () => setUngroupedCollapsed((prev) => !prev),
            )}
            {groupsForActive.map((group) => {
              const groupItems = activeCategoryItems.filter(
                (item) => item.groupId === group.id,
              );
              if (normalizedSearch && groupItems.length === 0) return null;

              const isRenaming = renamingGroupId === group.id;
              return renderSection(
                group.id,
                group.name,
                groupItems,
                normalizedSearch ? true : !group.collapsed,
                () => toggleGroupCollapse(group.id),
                isRenaming ? (
                  <>
                    <input
                      autoFocus
                      type="text"
                      className="field group-rename"
                      value={renameInput}
                      onChange={(e) => setRenameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveRenameGroup();
                        } else if (e.key === "Escape") {
                          e.stopPropagation();
                          setRenamingGroupId(null);
                        }
                      }}
                      aria-label="群組新名稱"
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={saveRenameGroup}
                      title="儲存名稱"
                      aria-label="儲存名稱"
                    >
                      <CheckIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setRenamingGroupId(null)}
                      title="取消改名"
                      aria-label="取消改名"
                    >
                      <CloseIcon />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => startRenameGroup(group)}
                      title="重新命名群組"
                      aria-label={`重新命名 ${group.name}`}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      onClick={() => requestDeleteGroup(group)}
                      title="刪除群組"
                      aria-label={`刪除群組 ${group.name}`}
                    >
                      <TrashIcon />
                    </button>
                  </>
                ),
              );
            })}
          </>
        )}
      </main>

      <div className="list-footer">
        <button
          type="button"
          className="btn btn--add-bottom"
          onClick={openAddCmdForm}
          disabled={!activeTab}
        >
          + 新增指令
        </button>
      </div>

      <footer className="statusbar">
        <span>
          {categories.length} 個分類 · {groupsForActive.length} 個群組 · 顯示{" "}
          {activeCategoryItems.length} / {items.length} 筆指令
        </span>
        <span>拖曳卡片可移至群組 · Ctrl + K 搜尋</span>
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
                取消
              </button>
              <button
                ref={confirmRef}
                type="button"
                className="btn btn--danger-solid"
                onClick={handleConfirmDelete}
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
