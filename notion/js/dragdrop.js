/* ── Drag-and-drop for cards + block reorder ───────────── */
const DragDrop = {
  dragType: null, // 'card' | 'block'

  init() {
    this.initCardDrag();
    this.initBlockDrag();
  },

  // ── Card Drag & Drop ──────────────────────────────────
  initCardDrag() {
    document.addEventListener('dragover', (e) => {
      if (this.dragType !== 'card') return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      // Highlight column
      const column = e.target.closest('.column-cards');
      if (column) {
        document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drag-over'));
        column.closest('.kanban-column').classList.add('drag-over');
      }
    });

    document.addEventListener('dragleave', (e) => {
      if (this.dragType !== 'card') return;
      const column = e.target.closest('.kanban-column');
      if (column && !column.contains(e.relatedTarget)) {
        column.classList.remove('drag-over');
      }
    });

    document.addEventListener('drop', (e) => {
      if (this.dragType !== 'card') return;
      e.preventDefault();
      document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drag-over'));

      const cardId = e.dataTransfer.getData('text/plain');
      if (!cardId) return;

      const column = e.target.closest('.column-cards');
      if (!column) return;
      const colId = column.dataset.columnId;
      const boardId = Kanban.boardId;

      // Calculate insertion index
      const cards = [...column.querySelectorAll('.kanban-card')];
      let insertIdx = cards.length;

      for (let i = 0; i < cards.length; i++) {
        const rect = cards[i].getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) {
          insertIdx = i;
          break;
        }
      }

      Store.moveCard(cardId, boardId, colId, insertIdx);
      Kanban.renderBoard(Store.getBoard(boardId));
    });
  },

  // ── Block Drag & Drop ─────────────────────────────────
  initBlockDrag() {
    let draggedBlockId = null;

    document.addEventListener('dragstart', (e) => {
      const handle = e.target.closest('.block-handle');
      if (!handle) return;

      const block = handle.closest('.block');
      if (!block) return;

      draggedBlockId = block.dataset.blockId;
      this.dragType = 'block';
      block.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedBlockId);
    });

    document.addEventListener('dragover', (e) => {
      if (this.dragType !== 'block') return;
      e.preventDefault();

      const blockEl = e.target.closest('.block');
      if (!blockEl || blockEl.dataset.blockId === draggedBlockId) return;

      // Clear all drag indicators
      document.querySelectorAll('.block').forEach(b => {
        b.classList.remove('drag-over-top', 'drag-over-bottom');
      });

      const rect = blockEl.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        blockEl.classList.add('drag-over-top');
      } else {
        blockEl.classList.add('drag-over-bottom');
      }
    });

    document.addEventListener('dragend', (e) => {
      if (this.dragType !== 'block') return;
      document.querySelectorAll('.block').forEach(b => {
        b.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
      });
      this.dragType = null;
      draggedBlockId = null;
    });

    document.addEventListener('drop', (e) => {
      if (this.dragType !== 'block') return;
      e.preventDefault();

      document.querySelectorAll('.block').forEach(b => {
        b.classList.remove('drag-over-top', 'drag-over-bottom');
      });

      const targetBlock = e.target.closest('.block');
      if (!targetBlock || !draggedBlockId) return;

      const pageId = Editor.pageId;
      if (!pageId) return;

      const page = Store.getPage(pageId);
      const targetId = targetBlock.dataset.blockId;
      if (targetId === draggedBlockId) return;

      const rect = targetBlock.getBoundingClientRect();
      const insertBefore = e.clientY < rect.top + rect.height / 2;

      let targetIdx = page.blockIds.indexOf(targetId);
      if (!insertBefore) targetIdx++;

      // Account for removal of the dragged block
      const dragIdx = page.blockIds.indexOf(draggedBlockId);
      if (dragIdx < targetIdx) targetIdx--;

      Store.moveBlock(pageId, draggedBlockId, targetIdx);

      // Re-render
      Editor.render(page);
    });
  },
};

// Initialize drag-and-drop when DOM is ready
document.addEventListener('DOMContentLoaded', () => DragDrop.init());
