import { useEffect, useRef, useState } from "react";

type Category = string;

interface CategoryItem {
  name: Category;
  locked: boolean;
}

interface CommandItem {
  id: string;
  category: Category;
  title: string;
  command: string;
}

type ConfirmTarget =
  | { kind: "category"; name: Category }
  | { kind: "command"; item: CommandItem };

const DEFAULT_CATEGORIES: Category[] = [
  "git",
  "kube",
  "tauri",
  "rust",
  "python",
  "npm",
];

const STORAGE_ITEMS_KEY = "command_pocket_items_v2";
const STORAGE_CATS_KEY = "command_pocket_categories_v3";
const LEGACY_CATS_KEY = "command_pocket_categories_v2";

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

function parseCategories(raw: string | null): CategoryItem[] {
  if (!raw) return [];

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
    const current = parseCategories(localStorage.getItem(STORAGE_CATS_KEY));
    const legacy = parseCategories(localStorage.getItem(LEGACY_CATS_KEY));
    const saved = current.length > 0 ? current : legacy;
    if (saved.length > 0) return saved;
  } catch {
    return DEFAULT_CATEGORIES.map((name) => ({ name, locked: false }));
  }
  return DEFAULT_CATEGORIES.map((name) => ({ name, locked: false }));
}

function loadItems(): CommandItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_ITEMS_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as CommandItem[];
    }
  } catch {
    return DEFAULT_COMMANDS;
  }
  return DEFAULT_COMMANDS;
}

function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="10" width="16" height="11" rx="2" />
      {locked ? (
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      ) : (
        <path d="M8 10V7a4 4 0 0 1 7.5-2" />
      )}
    </svg>
  );
}

export default function App() {
  const [categories, setCategories] = useState<CategoryItem[]>(loadCategories);
  const [items, setItems] = useState<CommandItem[]>(loadItems);
  const [activeTab, setActiveTab] = useState<Category>(() => {
    return categories[0]?.name ?? "";
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catError, setCatError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [commandInput, setCommandInput] = useState("");
  const [showCmdForm, setShowCmdForm] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [scrollState, setScrollState] = useState({ left: false, right: false });
  const [confirmDialog, setConfirmDialog] = useState<ConfirmTarget | null>(null);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const categorySearchRef = useRef<HTMLInputElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const categoryRef = useRef<HTMLInputElement | null>(null);
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
    if (showCatForm) categoryRef.current?.focus();
  }, [showCatForm]);

  useEffect(() => {
    if (showCmdForm) titleRef.current?.focus();
  }, [showCmdForm]);

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
        } else if (showCatForm || showCmdForm) {
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
  }, [confirmDialog, showCatForm, showCmdForm]);

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

  const normalizedCategoryQuery = categoryQuery.trim().toLowerCase();
  const visibleCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(normalizedCategoryQuery),
  );
  const normalizedSearch = search.trim().toLowerCase();
  const filteredItems = items.filter(
    (item) =>
      item.category === activeTab &&
      (!normalizedSearch ||
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.command.toLowerCase().includes(normalizedSearch)),
  );

  const categoryCounts = new Map<Category, number>();
  for (const item of items) {
    categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);
  }

  const closeForms = () => {
    setShowCatForm(false);
    setShowCmdForm(false);
    setCatError("");
  };

  const scrollTabs = (direction: -1 | 1) => {
    tabsRef.current?.scrollBy({ left: direction * 180, behavior: "smooth" });
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    const exists = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      setCatError("這個分類已經存在了");
      return;
    }

    setCategories((prev) => [...prev, { name: trimmed, locked: false }]);
    setActiveTab(trimmed);
    setNewCatName("");
    setCatError("");
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

  const handleConfirmDelete = () => {
    if (!confirmDialog) return;

    if (confirmDialog.kind === "category") {
      const { name } = confirmDialog;
      const remaining = categories.filter((c) => c.name !== name);
      setCategories(remaining);
      setItems((prev) => prev.filter((item) => item.category !== name));
      if (activeTab === name) setActiveTab(remaining[0]?.name ?? "");
      if (copiedId && items.find((item) => item.id === copiedId)?.category === name) {
        setCopiedId(null);
      }
      showToast("分類與所屬指令已刪除");
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
    setEditingId(null);
    setTitleInput("");
    setCommandInput("");
    setShowCmdForm(true);
    setShowCatForm(false);
    setCatError("");
  };

  const openEditCmdForm = (item: CommandItem) => {
    setEditingId(item.id);
    setTitleInput(item.title);
    setCommandInput(item.command);
    setShowCmdForm(true);
    setShowCatForm(false);
    setCatError("");
  };

  const handleSaveCmd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = titleInput.trim();
    const trimmedCommand = commandInput.trim();
    if (!trimmedTitle || !trimmedCommand || !activeTab) return;

    if (editingId) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? { ...item, title: trimmedTitle, command: trimmedCommand }
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
      };
      setItems((prev) => [...prev, newItem]);
      showToast("指令已新增");
    }

    setShowCmdForm(false);
    setEditingId(null);
    setTitleInput("");
    setCommandInput("");
  };

  const confirmTitle =
    confirmDialog?.kind === "category"
      ? `刪除分類「${confirmDialog.name}」？`
      : "刪除這筆指令？";
  const confirmText =
    confirmDialog?.kind === "category"
      ? `分類內的 ${categoryCounts.get(confirmDialog.name) ?? 0} 筆指令會一併刪除，此動作無法復原。`
      : `「${confirmDialog?.kind === "command" ? confirmDialog.item.title : ""}」將被刪除，此動作無法復原。`;

  const emptyTitle =
    categories.length === 0
      ? "尚未建立分類"
      : normalizedSearch
        ? "找不到符合的指令"
        : `「${activeTab}」還沒有指令`;
  const emptyText =
    categories.length === 0
      ? "先點「+ 分類」建立一個分類，再加入指令。"
      : normalizedSearch
        ? "試試其他關鍵字，或清空搜尋條件。"
        : "點右上角「+ 新增指令」加入第一筆。";

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
          onClick={openAddCmdForm}
          disabled={categories.length === 0}
        >
          + 新增指令
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
          <button
            type="button"
            className={`tab tab-add${showCatForm ? " tab--active" : ""}`}
            onClick={() => {
              setShowCatForm((prev) => !prev);
              setShowCmdForm(false);
              setCatError("");
            }}
          >
            {showCatForm ? "完成" : "+ 分類"}
          </button>
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

      {showCatForm && (
        <div className="panel">
          <div className="panel-title">新增或修改分類</div>
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
          <div className="manage-list">
            {categories.map((cat) => (
              <div className="manage-row" key={cat.name}>
                <span className="manage-name">{cat.name}</span>
                <span className="tab-count">{categoryCounts.get(cat.name) ?? 0} 筆</span>
                <button
                  type="button"
                  className={`btn btn--sm btn--ghost${cat.locked ? " is-locked" : ""}`}
                  onClick={() => toggleCategoryLock(cat.name)}
                  title={cat.locked ? "解鎖分類" : "鎖定分類"}
                >
                  <LockIcon locked={cat.locked} />
                  {cat.locked ? "已鎖定" : "鎖定"}
                </button>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost btn--danger"
                  disabled={cat.locked}
                  onClick={() => requestDeleteCategory(cat.name)}
                  title={cat.locked ? "請先解鎖再刪除" : "刪除分類"}
                >
                  刪除
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCmdForm && (
        <form onSubmit={handleSaveCmd} className="panel">
          <div className="panel-title">
            {editingId ? `修改「${activeTab}」指令` : `新增至「${activeTab}」`}
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
          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={closeForms}>
              取消
            </button>
            <button type="submit" className="btn btn--primary">
              儲存
            </button>
          </div>
        </form>
      )}

      <main className="list">
        {filteredItems.length === 0 ? (
          <div className="empty">
            <div className="empty-icon" aria-hidden="true">
              {"{ }"}
            </div>
            <strong>{emptyTitle}</strong>
            <span>{emptyText}</span>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isCopied = copiedId === item.id;
            return (
              <article className="cmd-card" key={item.id}>
                <div className="cmd-main">
                  <div className="cmd-title-row">
                    <span className="cmd-title">{item.title}</span>
                    <span className="cmd-tag">{item.category}</span>
                  </div>
                  <code className="cmd-code">{item.command}</code>
                </div>
                <div className="cmd-actions">
                  <button
                    type="button"
                    className={`btn btn--sm${isCopied ? " btn--copied" : ""}`}
                    onClick={() => handleCopy(item)}
                  >
                    {isCopied ? "已複製" : "複製"}
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => openEditCmdForm(item)}
                  >
                    修改
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost btn--danger"
                    onClick={() => setConfirmDialog({ kind: "command", item })}
                  >
                    刪除
                  </button>
                </div>
              </article>
            );
          })
        )}
      </main>

      <footer className="statusbar">
        <span>
          {categories.length} 個分類 · 顯示 {filteredItems.length} / {items.length} 筆指令
        </span>
        <span>Ctrl + K 搜尋指令 · Esc 關閉 / 清空</span>
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
