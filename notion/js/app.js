/* ── App bootstrap, routing, theme, global shortcuts ───── */
const App = {
  currentPageId: null,

  init() {
    this.applyTheme();
    this.applySidebarWidth();
    Sidebar.init();
    this.bindGlobalShortcuts();
    this.bindNavigation();
    this.bindPageHeader();

    // Navigate to last opened or first page
    const hash = location.hash;
    if (hash.startsWith('#page/')) {
      this.navigateTo(hash.slice(6));
    } else {
      const settings = Store.getSettings();
      if (settings.lastOpenedPageId && Store.getPage(settings.lastOpenedPageId)) {
        this.navigateTo(settings.lastOpenedPageId);
      } else {
        const roots = Store.getRootPages();
        if (roots.length) this.navigateTo(roots[0].id);
        else this.showEmptyState();
      }
    }
  },

  // ── Routing ────────────────────────────────────────────
  bindNavigation() {
    window.addEventListener('hashchange', () => {
      const hash = location.hash;
      if (hash.startsWith('#page/')) {
        this.navigateTo(hash.slice(6), false);
      }
    });
  },

  navigateTo(pageId, updateHash = true) {
    const page = Store.getPage(pageId);
    if (!page) {
      this.showEmptyState();
      return;
    }

    this.currentPageId = pageId;
    if (updateHash) location.hash = `page/${pageId}`;
    Store.updateSettings({ lastOpenedPageId: pageId });

    Sidebar.setActive(pageId);
    this.renderPageHeader(page);

    const body = document.getElementById('pageBody');
    body.innerHTML = '';

    if (page.type === 'kanban') {
      Kanban.render(page);
    } else {
      Editor.render(page);
    }
  },

  showEmptyState() {
    this.currentPageId = null;
    document.getElementById('pageHeader').style.display = 'none';
    const body = document.getElementById('pageBody');
    body.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <h2>No page selected</h2>
        <p>Select a page from the sidebar or create a new one.</p>
        <button class="btn-primary" id="emptyNewPageBtn">Create a page</button>
      </div>
    `;
    document.getElementById('emptyNewPageBtn').addEventListener('click', () => {
      const page = Store.createPage({ title: '' });
      Sidebar.renderTree();
      this.navigateTo(page.id);
    });
  },

  // ── Page Header ────────────────────────────────────────
  renderPageHeader(page) {
    const header = document.getElementById('pageHeader');
    header.style.display = '';

    // Breadcrumbs
    const crumbs = document.getElementById('breadcrumbs');
    const chain = this.getPageChain(page.id);
    crumbs.innerHTML = chain.slice(0, -1).map(p =>
      `<span class="breadcrumb-item" data-page-id="${p.id}">${p.icon} ${Utils.escapeHtml(p.title || 'Untitled')}</span><span class="breadcrumb-sep">/</span>`
    ).join('');
    crumbs.querySelectorAll('.breadcrumb-item').forEach(el => {
      el.addEventListener('click', () => this.navigateTo(el.dataset.pageId));
    });

    // Icon
    document.getElementById('pageIconBtn').textContent = page.icon;

    // Title
    const titleEl = document.getElementById('pageTitle');
    titleEl.textContent = page.title;

    // Favorite
    const favBtn = document.getElementById('favoriteBtn');
    favBtn.classList.toggle('is-favorite', page.isFavorite);

    // Page type toggle icon
    const typeBtn = document.getElementById('pageTypeToggle');
    typeBtn.title = page.type === 'kanban' ? 'Switch to page' : 'Switch to kanban';
  },

  bindPageHeader() {
    // Title editing
    const titleEl = document.getElementById('pageTitle');
    titleEl.addEventListener('input', Utils.debounce(() => {
      if (!this.currentPageId) return;
      const title = titleEl.textContent.trim();
      Store.updatePage(this.currentPageId, { title });
      Sidebar.renderTree();
    }, 400));

    titleEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // Focus first block
        const firstBlock = document.querySelector('.block-content[contenteditable]');
        if (firstBlock) Utils.setCaretToStart(firstBlock);
      }
    });

    // Icon picker
    document.getElementById('pageIconBtn').addEventListener('click', (e) => {
      if (!this.currentPageId) return;
      this.showEmojiPicker(e.target, (emoji) => {
        Store.updatePage(this.currentPageId, { icon: emoji });
        document.getElementById('pageIconBtn').textContent = emoji;
        Sidebar.renderTree();
      });
    });

    // Favorite toggle
    document.getElementById('favoriteBtn').addEventListener('click', () => {
      if (!this.currentPageId) return;
      const page = Store.getPage(this.currentPageId);
      Store.updatePage(this.currentPageId, { isFavorite: !page.isFavorite });
      document.getElementById('favoriteBtn').classList.toggle('is-favorite');
      Sidebar.renderTree();
    });

    // Page type toggle
    document.getElementById('pageTypeToggle').addEventListener('click', () => {
      if (!this.currentPageId) return;
      const page = Store.getPage(this.currentPageId);
      const newType = page.type === 'kanban' ? 'page' : 'kanban';
      Store.updatePage(this.currentPageId, { type: newType });

      // Create board if switching to kanban and none exists
      if (newType === 'kanban' && !Store.getBoardForPage(this.currentPageId)) {
        Store.createBoard(this.currentPageId);
      }

      this.navigateTo(this.currentPageId);
    });

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
      this.toggleTheme();
    });
  },

  getPageChain(pageId) {
    const chain = [];
    let current = Store.getPage(pageId);
    while (current) {
      chain.unshift(current);
      current = current.parentId ? Store.getPage(current.parentId) : null;
    }
    return chain;
  },

  // ── Theme ──────────────────────────────────────────────
  applyTheme() {
    const settings = Store.getSettings();
    document.documentElement.setAttribute('data-theme', settings.theme);
  },

  toggleTheme() {
    const settings = Store.getSettings();
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    Store.updateSettings({ theme: newTheme });
    document.documentElement.setAttribute('data-theme', newTheme);
    Utils.toast(`Switched to ${newTheme} mode`);
  },

  // ── Sidebar width ─────────────────────────────────────
  applySidebarWidth() {
    const settings = Store.getSettings();
    const sidebar = document.getElementById('sidebar');
    sidebar.style.width = settings.sidebarWidth + 'px';
    document.documentElement.style.setProperty('--sidebar-width', settings.sidebarWidth + 'px');
    if (settings.sidebarCollapsed) {
      sidebar.classList.add('collapsed');
    }
  },

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const collapsed = sidebar.classList.toggle('collapsed');
    Store.updateSettings({ sidebarCollapsed: collapsed });
  },

  // ── Global Shortcuts ──────────────────────────────────
  bindGlobalShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+N: new page
      if (e.ctrlKey && !e.shiftKey && e.key === 'n') {
        e.preventDefault();
        const page = Store.createPage({ title: '' });
        Sidebar.renderTree();
        this.navigateTo(page.id);
        setTimeout(() => document.getElementById('pageTitle').focus(), 50);
      }

      // Ctrl+/: toggle sidebar
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        this.toggleSidebar();
      }

      // Ctrl+Shift+D: toggle theme
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggleTheme();
      }

      // Ctrl+P: quick search
      if (e.ctrlKey && !e.shiftKey && e.key === 'p') {
        e.preventDefault();
        const input = document.getElementById('searchInput');
        input.focus();
        input.select();
      }

      // Escape: close any open menus
      if (e.key === 'Escape') {
        this.closeAllMenus();
      }
    });

    // Close menus on click outside
    document.addEventListener('click', (e) => {
      const ctx = document.getElementById('contextMenu');
      if (ctx.style.display !== 'none' && !ctx.contains(e.target)) {
        ctx.style.display = 'none';
      }
      const emoji = document.getElementById('emojiPicker');
      if (emoji.style.display !== 'none' && !emoji.contains(e.target) && !e.target.closest('.page-icon-btn')) {
        emoji.style.display = 'none';
      }
    });
  },

  closeAllMenus() {
    document.getElementById('contextMenu').style.display = 'none';
    document.getElementById('slashMenu').style.display = 'none';
    document.getElementById('emojiPicker').style.display = 'none';
    document.getElementById('cardModal').style.display = 'none';
  },

  // ── Emoji Picker ──────────────────────────────────────
  showEmojiPicker(anchorEl, callback) {
    const picker = document.getElementById('emojiPicker');
    const emojis = ['📝', '📄', '📋', '📌', '📎', '📁', '📂', '🗂️',
      '✅', '⭐', '💡', '🎯', '🚀', '💻', '🔧', '⚙️',
      '📊', '📈', '📉', '🗓️', '⏰', '🔔', '🔑', '🔒',
      '❤️', '🔥', '✨', '🎨', '🎵', '🌍', '🏠', '🧩',
      '🐛', '🧪', '📦', '🛒', '💬', '📱', '🖥️', '🌐',
      '🏗️', '🎬', '🎮', '📚', '🍕', '☕', '🧠', '🏆'];

    picker.innerHTML = `
      <div class="emoji-picker-grid">
        ${emojis.map(e => `<button data-emoji="${e}">${e}</button>`).join('')}
      </div>
    `;

    const rect = anchorEl.getBoundingClientRect();
    picker.style.display = 'flex';
    picker.style.top = rect.bottom + 4 + 'px';
    picker.style.left = rect.left + 'px';

    picker.querySelectorAll('button[data-emoji]').forEach(btn => {
      btn.addEventListener('click', () => {
        callback(btn.dataset.emoji);
        picker.style.display = 'none';
      });
    });
  },
};

// ── Init on DOM ready ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());
