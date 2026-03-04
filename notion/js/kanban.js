/* ── Kanban board view ─────────────────────────────────── */
const Kanban = {
  boardId: null,
  pageId: null,

  render(page) {
    this.pageId = page.id;
    let board = Store.getBoardForPage(page.id);
    if (!board) board = Store.createBoard(page.id);
    this.boardId = board.id;

    const body = document.getElementById('pageBody');
    body.innerHTML = '<div class="kanban-board" id="kanbanBoard"></div>';

    this.renderBoard(board);
  },

  renderBoard(board) {
    const boardEl = document.getElementById('kanbanBoard');
    boardEl.innerHTML = '';

    board.columns.forEach((col, colIdx) => {
      boardEl.appendChild(this.createColumnEl(col, colIdx, board));
    });

    // Add column button
    const addBtn = document.createElement('button');
    addBtn.className = 'add-column-btn';
    addBtn.textContent = '+ Add Column';
    addBtn.addEventListener('click', () => {
      const title = prompt('Column title:', 'New Column');
      if (!title) return;
      Store.addColumn(this.boardId, title, 'gray');
      this.renderBoard(Store.getBoard(this.boardId));
    });
    boardEl.appendChild(addBtn);
  },

  createColumnEl(col, colIdx, board) {
    const el = document.createElement('div');
    el.className = 'kanban-column';
    el.dataset.columnId = col.id;

    const colorMap = {
      gray: 'var(--gray)', red: 'var(--red)', orange: 'var(--orange)',
      yellow: 'var(--yellow)', green: 'var(--green)', blue: 'var(--blue)',
      purple: 'var(--purple)', pink: 'var(--pink)',
    };

    el.innerHTML = `
      <div class="column-header">
        <span class="column-color-dot" style="background:${colorMap[col.color] || colorMap.gray}"></span>
        <span class="column-title" contenteditable="true" spellcheck="false">${Utils.escapeHtml(col.title)}</span>
        <span class="column-count">${col.cardIds.length}</span>
        <button class="column-menu-btn" title="Column options">⋯</button>
      </div>
      <div class="column-cards" data-column-id="${col.id}"></div>
      <button class="add-card-btn">+ New</button>
    `;

    // Column title editing
    const titleEl = el.querySelector('.column-title');
    titleEl.addEventListener('input', Utils.debounce(() => {
      Store.updateColumn(this.boardId, col.id, { title: titleEl.textContent.trim() });
    }, 400));
    titleEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); }
    });

    // Column menu
    el.querySelector('.column-menu-btn').addEventListener('click', (e) => {
      this.showColumnMenu(e, col);
    });

    // Render cards
    const cardsContainer = el.querySelector('.column-cards');
    col.cardIds.forEach(cardId => {
      const card = Store.getCard(cardId);
      if (card) cardsContainer.appendChild(this.createCardEl(card));
    });

    // Add card
    el.querySelector('.add-card-btn').addEventListener('click', () => {
      this.showAddCardForm(cardsContainer, col);
    });

    return el;
  },

  createCardEl(card) {
    const el = document.createElement('div');
    el.className = 'kanban-card';
    el.dataset.cardId = card.id;
    el.draggable = true;

    let labelsHtml = '';
    if (card.labels.length) {
      labelsHtml = '<div class="card-labels">' +
        card.labels.map(l => `<span class="card-label label-${l}">${l}</span>`).join('') +
        '</div>';
    }

    let metaHtml = '';
    const metaParts = [];
    if (card.priority) metaParts.push(`<span class="card-priority ${card.priority}">${card.priority}</span>`);
    if (card.dueDate) metaParts.push(`<span>📅 ${Utils.formatDateShort(card.dueDate)}</span>`);
    if (metaParts.length) metaHtml = `<div class="card-meta">${metaParts.join('')}</div>`;

    el.innerHTML = `
      ${labelsHtml}
      <div class="card-title">${Utils.escapeHtml(card.title)}</div>
      ${metaHtml}
    `;

    el.addEventListener('click', () => this.showCardModal(card));

    // Drag events
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', card.id);
      e.dataTransfer.effectAllowed = 'move';
      el.classList.add('dragging');
      DragDrop.dragType = 'card';
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      DragDrop.dragType = null;
    });

    return el;
  },

  // ── Add Card Form ──────────────────────────────────────
  showAddCardForm(container, col) {
    // Remove any existing form
    container.querySelectorAll('.inline-form').forEach(f => f.remove());

    const form = document.createElement('div');
    form.className = 'inline-form';
    form.innerHTML = `
      <input type="text" class="card-title-input" placeholder="Card title" autofocus>
      <div class="inline-form-actions">
        <button class="btn-primary" style="padding:4px 12px;font-size:12px;">Add</button>
        <button class="btn-secondary" style="padding:4px 12px;font-size:12px;">Cancel</button>
      </div>
    `;

    container.appendChild(form);
    const input = form.querySelector('.card-title-input');
    input.focus();

    const addCard = () => {
      const title = input.value.trim();
      if (!title) { form.remove(); return; }
      Store.createCard(this.boardId, col.id, { title });
      form.remove();
      this.renderBoard(Store.getBoard(this.boardId));
    };

    form.querySelector('.btn-primary').addEventListener('click', addCard);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addCard();
      if (e.key === 'Escape') form.remove();
    });
    form.querySelector('.btn-secondary').addEventListener('click', () => form.remove());
  },

  // ── Column Menu ────────────────────────────────────────
  showColumnMenu(e, col) {
    const menu = document.getElementById('contextMenu');
    const colors = ['gray', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'];

    menu.innerHTML = `
      <div class="context-menu-item" data-action="rename">✏️ Rename</div>
      <div class="context-menu-divider"></div>
      ${colors.map(c => `<div class="context-menu-item" data-action="color" data-color="${c}">
        <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:var(--${c});vertical-align:middle;"></span>
        ${c.charAt(0).toUpperCase() + c.slice(1)}
      </div>`).join('')}
      <div class="context-menu-divider"></div>
      <div class="context-menu-item danger" data-action="delete">🗑️ Delete column</div>
    `;

    menu.style.display = 'block';
    menu.style.top = e.clientY + 'px';
    menu.style.left = e.clientX + 'px';

    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
      if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
    });

    menu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        menu.style.display = 'none';
        const action = item.dataset.action;
        if (action === 'rename') {
          const title = prompt('Column title:', col.title);
          if (title) {
            Store.updateColumn(this.boardId, col.id, { title });
            this.renderBoard(Store.getBoard(this.boardId));
          }
        } else if (action === 'color') {
          Store.updateColumn(this.boardId, col.id, { color: item.dataset.color });
          this.renderBoard(Store.getBoard(this.boardId));
        } else if (action === 'delete') {
          if (confirm(`Delete column "${col.title}" and all its cards?`)) {
            Store.deleteColumn(this.boardId, col.id);
            this.renderBoard(Store.getBoard(this.boardId));
          }
        }
      });
    });
  },

  // ── Card Detail Modal ──────────────────────────────────
  showCardModal(card) {
    const modal = document.getElementById('cardModal');
    const body = document.getElementById('cardModalBody');
    const allLabels = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'];

    body.innerHTML = `
      <div class="modal-field">
        <label>Title</label>
        <input type="text" id="cardTitleInput" value="${Utils.escapeHtml(card.title)}">
      </div>
      <div class="modal-field">
        <label>Description</label>
        <textarea id="cardDescInput">${Utils.escapeHtml(card.description)}</textarea>
      </div>
      <div class="modal-field">
        <label>Priority</label>
        <select id="cardPriorityInput">
          <option value="">None</option>
          <option value="urgent" ${card.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
          <option value="high" ${card.priority === 'high' ? 'selected' : ''}>High</option>
          <option value="medium" ${card.priority === 'medium' ? 'selected' : ''}>Medium</option>
          <option value="low" ${card.priority === 'low' ? 'selected' : ''}>Low</option>
        </select>
      </div>
      <div class="modal-field">
        <label>Due Date</label>
        <input type="date" id="cardDueInput" value="${card.dueDate || ''}">
      </div>
      <div class="modal-field">
        <label>Labels</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${allLabels.map(l => `
            <button class="card-label label-${l} label-toggle ${card.labels.includes(l) ? 'active' : ''}"
                    data-label="${l}" style="cursor:pointer;padding:4px 10px;font-size:12px;border:2px solid transparent;border-radius:4px;">
              ${l}
            </button>
          `).join('')}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" id="cardDeleteBtn" style="margin-right:auto;color:var(--danger);">Delete card</button>
        <button class="btn-secondary" id="cardCancelBtn">Cancel</button>
        <button class="btn-primary" id="cardSaveBtn">Save</button>
      </div>
    `;

    modal.style.display = 'flex';

    // Label toggles
    const selectedLabels = new Set(card.labels);
    body.querySelectorAll('.label-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const label = btn.dataset.label;
        if (selectedLabels.has(label)) {
          selectedLabels.delete(label);
          btn.style.borderColor = 'transparent';
          btn.classList.remove('active');
        } else {
          selectedLabels.add(label);
          btn.style.borderColor = 'var(--text-primary)';
          btn.classList.add('active');
        }
      });
      if (selectedLabels.has(btn.dataset.label)) {
        btn.style.borderColor = 'var(--text-primary)';
      }
    });

    // Save
    document.getElementById('cardSaveBtn').addEventListener('click', () => {
      Store.updateCard(card.id, {
        title: document.getElementById('cardTitleInput').value.trim() || 'Untitled',
        description: document.getElementById('cardDescInput').value,
        priority: document.getElementById('cardPriorityInput').value,
        dueDate: document.getElementById('cardDueInput').value || null,
        labels: [...selectedLabels],
      });
      modal.style.display = 'none';
      this.renderBoard(Store.getBoard(this.boardId));
    });

    // Cancel
    document.getElementById('cardCancelBtn').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Delete
    document.getElementById('cardDeleteBtn').addEventListener('click', () => {
      Store.deleteCard(card.id);
      modal.style.display = 'none';
      this.renderBoard(Store.getBoard(this.boardId));
    });

    // Close modal
    document.getElementById('cardModalClose').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  },
};
