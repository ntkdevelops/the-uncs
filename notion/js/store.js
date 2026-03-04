/* ── Data store (localStorage CRUD) ─────────────────────── */
const Store = {
  STORAGE_KEY: 'notion_data',

  _data: null,

  _load() {
    if (this._data) return this._data;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this._data = raw ? JSON.parse(raw) : null;
    } catch {
      this._data = null;
    }
    if (!this._data) {
      this._data = this._createDefault();
      this._save();
    }
    return this._data;
  },

  _save() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._data));
  },

  _createDefault() {
    const pageId = Utils.generateId();
    const now = Date.now();

    const blocks = {};
    const blockIds = [];

    const makeBlock = (type, content, props = {}) => {
      const id = Utils.generateId();
      blocks[id] = { id, pageId, type, content, properties: props, indent: 0, createdAt: now, updatedAt: now };
      blockIds.push(id);
      return id;
    };

    makeBlock('heading1', 'Welcome to Imperium');
    makeBlock('paragraph', 'This is your personal planning space. Start writing, organizing, and tracking your work.');
    makeBlock('heading2', 'Getting Started');
    makeBlock('todo', 'Create a new page from the sidebar', { checked: false });
    makeBlock('todo', 'Try the slash command menu — type <code>/</code> in any block', { checked: false });
    makeBlock('todo', 'Use <b>Ctrl+B</b> for bold, <b>Ctrl+I</b> for italic', { checked: false });
    makeBlock('todo', 'Switch to kanban view using the board icon above', { checked: false });
    makeBlock('heading2', 'Tips');
    makeBlock('bulletList', 'Use <b>Tab</b> to indent and <b>Shift+Tab</b> to outdent');
    makeBlock('bulletList', 'Drag blocks using the handle on the left');
    makeBlock('bulletList', 'Toggle dark mode with <b>Ctrl+Shift+D</b>');
    makeBlock('quote', 'The best way to predict the future is to create it.');
    makeBlock('callout', 'All data is stored in your browser\'s localStorage — nothing is sent to a server.');
    makeBlock('divider', '');

    return {
      pages: {
        [pageId]: {
          id: pageId,
          title: 'Getting Started',
          icon: '📝',
          type: 'page',
          parentId: null,
          childPageIds: [],
          blockIds,
          createdAt: now,
          updatedAt: now,
          isFavorite: false,
          isExpanded: true,
        }
      },
      blocks,
      boards: {},
      cards: {},
      settings: {
        theme: 'light',
        sidebarWidth: 260,
        sidebarCollapsed: false,
        lastOpenedPageId: pageId,
      },
      trash: {
        pages: {},
        blocks: {},
      }
    };
  },

  // ── Pages ──────────────────────────────────────────────
  getPages() {
    return this._load().pages;
  },

  getPage(id) {
    return this._load().pages[id] || null;
  },

  getRootPages() {
    const pages = this._load().pages;
    return Object.values(pages).filter(p => !p.parentId).sort((a, b) => a.createdAt - b.createdAt);
  },

  createPage(opts = {}) {
    const data = this._load();
    const id = Utils.generateId();
    const now = Date.now();
    const page = {
      id,
      title: opts.title || '',
      icon: opts.icon || '📄',
      type: opts.type || 'page',
      parentId: opts.parentId || null,
      childPageIds: [],
      blockIds: [],
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
      isExpanded: false,
    };
    data.pages[id] = page;

    if (page.parentId && data.pages[page.parentId]) {
      data.pages[page.parentId].childPageIds.push(id);
      data.pages[page.parentId].isExpanded = true;
    }

    // Create default empty paragraph
    const blockId = Utils.generateId();
    data.blocks[blockId] = {
      id: blockId, pageId: id, type: 'paragraph', content: '',
      properties: {}, indent: 0, createdAt: now, updatedAt: now,
    };
    page.blockIds.push(blockId);

    this._save();
    return page;
  },

  updatePage(id, updates) {
    const data = this._load();
    if (!data.pages[id]) return null;
    Object.assign(data.pages[id], updates, { updatedAt: Date.now() });
    this._save();
    return data.pages[id];
  },

  deletePage(id) {
    const data = this._load();
    const page = data.pages[id];
    if (!page) return;

    // Move to trash
    data.trash.pages[id] = { ...page, deletedAt: Date.now() };

    // Move blocks to trash
    for (const bid of page.blockIds) {
      if (data.blocks[bid]) {
        data.trash.blocks[bid] = { ...data.blocks[bid], deletedAt: Date.now() };
        delete data.blocks[bid];
      }
    }

    // Remove from parent
    if (page.parentId && data.pages[page.parentId]) {
      const parent = data.pages[page.parentId];
      parent.childPageIds = parent.childPageIds.filter(c => c !== id);
    }

    // Recursively delete children
    for (const childId of page.childPageIds) {
      this.deletePage(childId);
    }

    // Clean up boards/cards if kanban
    if (page.type === 'kanban') {
      for (const [bid, board] of Object.entries(data.boards)) {
        if (board.pageId === id) {
          for (const col of board.columns) {
            for (const cid of col.cardIds) delete data.cards[cid];
          }
          delete data.boards[bid];
        }
      }
    }

    delete data.pages[id];
    this._save();
  },

  restorePage(id) {
    const data = this._load();
    const trashed = data.trash.pages[id];
    if (!trashed) return null;

    delete trashed.deletedAt;
    data.pages[id] = trashed;
    delete data.trash.pages[id];

    // Restore blocks
    for (const bid of trashed.blockIds) {
      if (data.trash.blocks[bid]) {
        delete data.trash.blocks[bid].deletedAt;
        data.blocks[bid] = data.trash.blocks[bid];
        delete data.trash.blocks[bid];
      }
    }

    // Re-attach to parent if parent still exists
    if (trashed.parentId && data.pages[trashed.parentId]) {
      const parent = data.pages[trashed.parentId];
      if (!parent.childPageIds.includes(id)) {
        parent.childPageIds.push(id);
      }
    } else {
      data.pages[id].parentId = null;
    }

    this._save();
    return data.pages[id];
  },

  permanentlyDeletePage(id) {
    const data = this._load();
    const trashed = data.trash.pages[id];
    if (!trashed) return;
    for (const bid of trashed.blockIds) {
      delete data.trash.blocks[bid];
    }
    delete data.trash.pages[id];
    this._save();
  },

  duplicatePage(id) {
    const data = this._load();
    const orig = data.pages[id];
    if (!orig) return null;

    const newPage = this.createPage({
      title: orig.title + ' (copy)',
      icon: orig.icon,
      type: orig.type,
      parentId: orig.parentId,
    });

    // Duplicate blocks
    const origBlocks = orig.blockIds.map(bid => data.blocks[bid]).filter(Boolean);
    newPage.blockIds = [];
    for (const block of origBlocks) {
      const newBlockId = Utils.generateId();
      data.blocks[newBlockId] = {
        ...block,
        id: newBlockId,
        pageId: newPage.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      newPage.blockIds.push(newBlockId);
    }

    // Duplicate board if kanban
    if (orig.type === 'kanban') {
      for (const board of Object.values(data.boards)) {
        if (board.pageId === id) {
          const newBoardId = Utils.generateId();
          const newCols = board.columns.map(col => {
            const newCardIds = col.cardIds.map(cid => {
              const card = data.cards[cid];
              if (!card) return null;
              const newCardId = Utils.generateId();
              data.cards[newCardId] = { ...card, id: newCardId, boardId: newBoardId };
              return newCardId;
            }).filter(Boolean);
            return { ...col, id: Utils.generateId(), cardIds: newCardIds };
          });
          data.boards[newBoardId] = { id: newBoardId, pageId: newPage.id, columns: newCols };
        }
      }
    }

    this._save();
    return newPage;
  },

  getTrashedPages() {
    return Object.values(this._load().trash.pages).sort((a, b) => b.deletedAt - a.deletedAt);
  },

  getFavoritePages() {
    return Object.values(this._load().pages).filter(p => p.isFavorite).sort((a, b) => a.title.localeCompare(b.title));
  },

  // ── Blocks ─────────────────────────────────────────────
  getBlock(id) {
    return this._load().blocks[id] || null;
  },

  getBlocksForPage(pageId) {
    const data = this._load();
    const page = data.pages[pageId];
    if (!page) return [];
    return page.blockIds.map(id => data.blocks[id]).filter(Boolean);
  },

  createBlock(pageId, opts = {}, afterBlockId = null) {
    const data = this._load();
    const page = data.pages[pageId];
    if (!page) return null;

    const id = Utils.generateId();
    const now = Date.now();
    const block = {
      id,
      pageId,
      type: opts.type || 'paragraph',
      content: opts.content || '',
      properties: opts.properties || {},
      indent: opts.indent || 0,
      createdAt: now,
      updatedAt: now,
    };
    data.blocks[id] = block;

    if (afterBlockId) {
      const idx = page.blockIds.indexOf(afterBlockId);
      page.blockIds.splice(idx + 1, 0, id);
    } else {
      page.blockIds.push(id);
    }

    page.updatedAt = now;
    this._save();
    return block;
  },

  updateBlock(id, updates) {
    const data = this._load();
    if (!data.blocks[id]) return null;
    Object.assign(data.blocks[id], updates, { updatedAt: Date.now() });
    this._save();
    return data.blocks[id];
  },

  deleteBlock(id) {
    const data = this._load();
    const block = data.blocks[id];
    if (!block) return;
    const page = data.pages[block.pageId];
    if (page) {
      page.blockIds = page.blockIds.filter(bid => bid !== id);
      // Ensure at least one block
      if (page.blockIds.length === 0) {
        const newId = Utils.generateId();
        data.blocks[newId] = {
          id: newId, pageId: page.id, type: 'paragraph', content: '',
          properties: {}, indent: 0, createdAt: Date.now(), updatedAt: Date.now(),
        };
        page.blockIds.push(newId);
      }
    }
    delete data.blocks[id];
    this._save();
  },

  moveBlock(pageId, blockId, newIndex) {
    const data = this._load();
    const page = data.pages[pageId];
    if (!page) return;
    const oldIdx = page.blockIds.indexOf(blockId);
    if (oldIdx === -1) return;
    page.blockIds.splice(oldIdx, 1);
    page.blockIds.splice(newIndex, 0, blockId);
    this._save();
  },

  // ── Boards ─────────────────────────────────────────────
  getBoard(id) {
    return this._load().boards[id] || null;
  },

  getBoardForPage(pageId) {
    const boards = this._load().boards;
    return Object.values(boards).find(b => b.pageId === pageId) || null;
  },

  createBoard(pageId) {
    const data = this._load();
    const id = Utils.generateId();
    const board = {
      id,
      pageId,
      columns: [
        { id: Utils.generateId(), title: 'To Do', color: 'gray', cardIds: [] },
        { id: Utils.generateId(), title: 'In Progress', color: 'blue', cardIds: [] },
        { id: Utils.generateId(), title: 'Done', color: 'green', cardIds: [] },
      ],
    };
    data.boards[id] = board;
    this._save();
    return board;
  },

  updateBoard(id, updates) {
    const data = this._load();
    if (!data.boards[id]) return null;
    Object.assign(data.boards[id], updates);
    this._save();
    return data.boards[id];
  },

  addColumn(boardId, title = 'New Column', color = 'gray') {
    const data = this._load();
    const board = data.boards[boardId];
    if (!board) return null;
    const col = { id: Utils.generateId(), title, color, cardIds: [] };
    board.columns.push(col);
    this._save();
    return col;
  },

  updateColumn(boardId, colId, updates) {
    const data = this._load();
    const board = data.boards[boardId];
    if (!board) return;
    const col = board.columns.find(c => c.id === colId);
    if (col) Object.assign(col, updates);
    this._save();
  },

  deleteColumn(boardId, colId) {
    const data = this._load();
    const board = data.boards[boardId];
    if (!board) return;
    const col = board.columns.find(c => c.id === colId);
    if (col) {
      for (const cid of col.cardIds) delete data.cards[cid];
      board.columns = board.columns.filter(c => c.id !== colId);
    }
    this._save();
  },

  moveColumn(boardId, fromIdx, toIdx) {
    const data = this._load();
    const board = data.boards[boardId];
    if (!board) return;
    const [col] = board.columns.splice(fromIdx, 1);
    board.columns.splice(toIdx, 0, col);
    this._save();
  },

  // ── Cards ──────────────────────────────────────────────
  getCard(id) {
    return this._load().cards[id] || null;
  },

  createCard(boardId, colId, opts = {}) {
    const data = this._load();
    const board = data.boards[boardId];
    if (!board) return null;
    const col = board.columns.find(c => c.id === colId);
    if (!col) return null;

    const id = Utils.generateId();
    const card = {
      id,
      boardId,
      title: opts.title || 'Untitled',
      description: opts.description || '',
      labels: opts.labels || [],
      priority: opts.priority || '',
      dueDate: opts.dueDate || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    data.cards[id] = card;
    col.cardIds.push(id);
    this._save();
    return card;
  },

  updateCard(id, updates) {
    const data = this._load();
    if (!data.cards[id]) return null;
    Object.assign(data.cards[id], updates, { updatedAt: Date.now() });
    this._save();
    return data.cards[id];
  },

  deleteCard(id) {
    const data = this._load();
    const card = data.cards[id];
    if (!card) return;
    const board = data.boards[card.boardId];
    if (board) {
      for (const col of board.columns) {
        col.cardIds = col.cardIds.filter(c => c !== id);
      }
    }
    delete data.cards[id];
    this._save();
  },

  moveCard(cardId, toBoardId, toColId, toIndex) {
    const data = this._load();
    const card = data.cards[cardId];
    if (!card) return;

    // Remove from current column
    const fromBoard = data.boards[card.boardId];
    if (fromBoard) {
      for (const col of fromBoard.columns) {
        col.cardIds = col.cardIds.filter(c => c !== cardId);
      }
    }

    // Add to target column
    const toBoard = data.boards[toBoardId];
    if (!toBoard) return;
    const toCol = toBoard.columns.find(c => c.id === toColId);
    if (!toCol) return;
    toCol.cardIds.splice(toIndex, 0, cardId);
    card.boardId = toBoardId;
    this._save();
  },

  // ── Settings ───────────────────────────────────────────
  getSettings() {
    return this._load().settings;
  },

  updateSettings(updates) {
    const data = this._load();
    Object.assign(data.settings, updates);
    this._save();
    return data.settings;
  },

  // ── Search ─────────────────────────────────────────────
  search(query) {
    if (!query) return [];
    const q = query.toLowerCase();
    const data = this._load();
    const results = [];

    for (const page of Object.values(data.pages)) {
      if (page.title.toLowerCase().includes(q)) {
        results.push({ type: 'page', page, match: 'title' });
        continue;
      }
      for (const bid of page.blockIds) {
        const block = data.blocks[bid];
        if (block) {
          const text = block.content.replace(/<[^>]+>/g, '').toLowerCase();
          if (text.includes(q)) {
            results.push({ type: 'page', page, match: 'content' });
            break;
          }
        }
      }
    }

    return results;
  },
};
