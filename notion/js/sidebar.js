/* ── Sidebar: page tree, search, favorites, resize ─────── */
const Sidebar = {
  init() {
    this.renderTree();
    this.bindNewPage();
    this.bindSearch();
    this.bindResize();
    this.bindTrash();
    this.bindToggle();
  },

  // ── Page Tree ──────────────────────────────────────────
  renderTree() {
    const treeEl = document.getElementById('pageTree');
    const favEl = document.getElementById('favoritesList');
    const favSection = document.getElementById('favoritesSection');

    // Favorites
    const favorites = Store.getFavoritePages();
    if (favorites.length) {
      favSection.style.display = '';
      favEl.innerHTML = '';
      favorites.forEach(p => favEl.appendChild(this.createTreeItem(p, 0)));
    } else {
      favSection.style.display = 'none';
    }

    // Page tree
    treeEl.innerHTML = '';
    const roots = Store.getRootPages();
    roots.forEach(p => this.renderPageItem(treeEl, p, 0));

    // Trash
    this.renderTrash();
  },

  renderPageItem(container, page, depth) {
    const item = this.createTreeItem(page, depth);
    container.appendChild(item);

    if (page.isExpanded && page.childPageIds.length) {
      const childContainer = document.createElement('div');
      childContainer.className = 'page-tree-children';
      page.childPageIds.forEach(cid => {
        const child = Store.getPage(cid);
        if (child) this.renderPageItem(childContainer, child, depth + 1);
      });
      container.appendChild(childContainer);
    }
  },

  createTreeItem(page, depth) {
    const item = document.createElement('div');
    item.className = 'page-tree-item';
    item.dataset.pageId = page.id;
    item.style.paddingLeft = (8 + depth * 16) + 'px';

    if (App.currentPageId === page.id) item.classList.add('active');

    const hasChildren = page.childPageIds && page.childPageIds.length > 0;

    item.innerHTML = `
      <span class="expand-btn ${page.isExpanded ? 'expanded' : ''} ${!hasChildren ? 'no-children' : ''}" data-page-id="${page.id}">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M4 2l4 4-4 4"/></svg>
      </span>
      <span class="page-icon">${page.icon}</span>
      <span class="page-name">${Utils.escapeHtml(page.title || 'Untitled')}</span>
      <span class="tree-actions">
        <button class="tree-action-btn add-subpage-btn" data-page-id="${page.id}" title="Add sub-page">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
        </button>
        <button class="tree-action-btn more-btn" data-page-id="${page.id}" title="More actions">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><circle cx="6" cy="2.5" r="1.2"/><circle cx="6" cy="6" r="1.2"/><circle cx="6" cy="9.5" r="1.2"/></svg>
        </button>
      </span>
    `;

    // Click to navigate
    item.addEventListener('click', (e) => {
      if (e.target.closest('.expand-btn') || e.target.closest('.tree-actions')) return;
      App.navigateTo(page.id);
    });

    // Expand/collapse
    const expandBtn = item.querySelector('.expand-btn');
    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!hasChildren) return;
      Store.updatePage(page.id, { isExpanded: !page.isExpanded });
      this.renderTree();
    });

    // Add sub-page
    const addBtn = item.querySelector('.add-subpage-btn');
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const child = Store.createPage({ parentId: page.id });
      Store.updatePage(page.id, { isExpanded: true });
      this.renderTree();
      App.navigateTo(child.id);
    });

    // Context menu / more button
    const moreBtn = item.querySelector('.more-btn');
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showContextMenu(e, page);
    });

    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e, page);
    });

    return item;
  },

  setActive(pageId) {
    document.querySelectorAll('.page-tree-item').forEach(el => {
      el.classList.toggle('active', el.dataset.pageId === pageId);
    });
  },

  // ── Context Menu ───────────────────────────────────────
  showContextMenu(e, page) {
    const menu = document.getElementById('contextMenu');
    menu.innerHTML = `
      <div class="context-menu-item" data-action="rename">✏️ Rename</div>
      <div class="context-menu-item" data-action="duplicate">📋 Duplicate</div>
      <div class="context-menu-item" data-action="favorite">${page.isFavorite ? '⭐ Unfavorite' : '☆ Add to favorites'}</div>
      <div class="context-menu-item" data-action="subpage">📄 Add sub-page</div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item danger" data-action="delete">🗑️ Delete</div>
    `;

    menu.style.display = 'block';
    menu.style.top = e.clientY + 'px';
    menu.style.left = e.clientX + 'px';

    // Keep menu in viewport
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
      if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
    });

    menu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        menu.style.display = 'none';
        this.handleContextAction(item.dataset.action, page);
      });
    });
  },

  handleContextAction(action, page) {
    switch (action) {
      case 'rename':
        App.navigateTo(page.id);
        setTimeout(() => {
          const titleEl = document.getElementById('pageTitle');
          titleEl.focus();
          const range = document.createRange();
          range.selectNodeContents(titleEl);
          window.getSelection().removeAllRanges();
          window.getSelection().addRange(range);
        }, 50);
        break;

      case 'duplicate': {
        const dup = Store.duplicatePage(page.id);
        this.renderTree();
        App.navigateTo(dup.id);
        Utils.toast('Page duplicated');
        break;
      }

      case 'favorite':
        Store.updatePage(page.id, { isFavorite: !page.isFavorite });
        this.renderTree();
        break;

      case 'subpage': {
        const child = Store.createPage({ parentId: page.id });
        Store.updatePage(page.id, { isExpanded: true });
        this.renderTree();
        App.navigateTo(child.id);
        break;
      }

      case 'delete':
        Store.deletePage(page.id);
        this.renderTree();
        if (App.currentPageId === page.id) {
          const roots = Store.getRootPages();
          if (roots.length) App.navigateTo(roots[0].id);
          else App.showEmptyState();
        }
        Utils.toast('Moved to trash');
        break;
    }
  },

  // ── New Page ───────────────────────────────────────────
  bindNewPage() {
    document.getElementById('newPageBtn').addEventListener('click', () => {
      const page = Store.createPage({ title: '' });
      this.renderTree();
      App.navigateTo(page.id);
      setTimeout(() => document.getElementById('pageTitle').focus(), 50);
    });
  },

  // ── Search ─────────────────────────────────────────────
  bindSearch() {
    const input = document.getElementById('searchInput');
    const treeEl = document.getElementById('pageTree');

    input.addEventListener('input', Utils.debounce(() => {
      const query = input.value.trim();
      if (!query) {
        this.renderTree();
        return;
      }

      const results = Store.search(query);
      treeEl.innerHTML = '';

      if (results.length === 0) {
        treeEl.innerHTML = '<div style="padding:12px 14px;color:var(--text-tertiary);font-size:13px;">No results found</div>';
        return;
      }

      results.forEach(r => {
        const item = this.createTreeItem(r.page, 0);
        treeEl.appendChild(item);
      });
    }, 200));
  },

  // ── Trash ──────────────────────────────────────────────
  bindTrash() {
    document.getElementById('trashToggle').addEventListener('click', () => {
      const list = document.getElementById('trashList');
      list.style.display = list.style.display === 'none' ? '' : 'none';
    });
  },

  renderTrash() {
    const list = document.getElementById('trashList');
    const trashed = Store.getTrashedPages();

    if (trashed.length === 0) {
      list.innerHTML = '<div style="padding:8px 14px;color:var(--text-tertiary);font-size:13px;">Trash is empty</div>';
      return;
    }

    list.innerHTML = '';
    trashed.forEach(page => {
      const item = document.createElement('div');
      item.className = 'page-tree-item';
      item.style.paddingLeft = '8px';
      item.innerHTML = `
        <span class="page-icon">${page.icon}</span>
        <span class="page-name" style="color:var(--text-secondary)">${Utils.escapeHtml(page.title || 'Untitled')}</span>
        <span class="tree-actions" style="display:flex">
          <button class="tree-action-btn restore-btn" title="Restore">↩️</button>
          <button class="tree-action-btn perm-delete-btn" title="Delete permanently">✕</button>
        </span>
      `;

      item.querySelector('.restore-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        Store.restorePage(page.id);
        this.renderTree();
        Utils.toast('Page restored');
      });

      item.querySelector('.perm-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        Store.permanentlyDeletePage(page.id);
        this.renderTrash();
        Utils.toast('Permanently deleted');
      });

      list.appendChild(item);
    });
  },

  // ── Resize Handle ─────────────────────────────────────
  bindResize() {
    const handle = document.getElementById('sidebarResizeHandle');
    const sidebar = document.getElementById('sidebar');
    let startX, startWidth;

    const onMouseMove = (e) => {
      const newWidth = Math.min(480, Math.max(200, startWidth + e.clientX - startX));
      sidebar.style.width = newWidth + 'px';
      document.documentElement.style.setProperty('--sidebar-width', newWidth + 'px');
    };

    const onMouseUp = () => {
      handle.classList.remove('active');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      Store.updateSettings({ sidebarWidth: parseInt(sidebar.style.width) });
    };

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startX = e.clientX;
      startWidth = sidebar.offsetWidth;
      handle.classList.add('active');
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  },

  // ── Toggle ─────────────────────────────────────────────
  bindToggle() {
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      App.toggleSidebar();
    });
  },
};
