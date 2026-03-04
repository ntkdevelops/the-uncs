/* ── Slash command menu (/commands) ─────────────────────── */
const Commands = {
  items: [
    { type: 'paragraph', icon: '📝', name: 'Text', desc: 'Plain text block' },
    { type: 'heading1', icon: 'H1', name: 'Heading 1', desc: 'Large heading' },
    { type: 'heading2', icon: 'H2', name: 'Heading 2', desc: 'Medium heading' },
    { type: 'heading3', icon: 'H3', name: 'Heading 3', desc: 'Small heading' },
    { type: 'bulletList', icon: '•', name: 'Bullet List', desc: 'Unordered list item' },
    { type: 'numberedList', icon: '1.', name: 'Numbered List', desc: 'Ordered list item' },
    { type: 'todo', icon: '☐', name: 'To-do', desc: 'Checkbox item' },
    { type: 'code', icon: '</>', name: 'Code', desc: 'Code block' },
    { type: 'quote', icon: '❝', name: 'Quote', desc: 'Block quote' },
    { type: 'divider', icon: '—', name: 'Divider', desc: 'Horizontal line' },
    { type: 'callout', icon: '💡', name: 'Callout', desc: 'Callout block with icon' },
  ],

  activeBlock: null,
  activeContentEl: null,
  selectedIndex: 0,

  show(contentEl, block) {
    this.activeBlock = block;
    this.activeContentEl = contentEl;
    this.selectedIndex = 0;

    const menu = document.getElementById('slashMenu');
    const input = document.getElementById('slashMenuInput');
    const itemsEl = document.getElementById('slashMenuItems');

    // Position near the caret
    const sel = window.getSelection();
    if (sel.rangeCount) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      menu.style.top = (rect.bottom + 4) + 'px';
      menu.style.left = rect.left + 'px';
    }

    menu.style.display = 'flex';
    input.value = '';
    input.focus();

    this.renderItems(this.items);
    this.bindInput();
  },

  hide() {
    document.getElementById('slashMenu').style.display = 'none';
    this.activeBlock = null;
    this.activeContentEl = null;
  },

  renderItems(filtered) {
    const itemsEl = document.getElementById('slashMenuItems');
    itemsEl.innerHTML = '';

    filtered.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'slash-menu-item' + (idx === this.selectedIndex ? ' active' : '');
      el.innerHTML = `
        <span class="item-icon">${item.icon}</span>
        <span class="item-info">
          <span class="item-name">${item.name}</span>
          <span class="item-desc">${item.desc}</span>
        </span>
      `;
      el.addEventListener('click', () => this.selectItem(item));
      el.addEventListener('mouseenter', () => {
        this.selectedIndex = idx;
        this.updateActive();
      });
      itemsEl.appendChild(el);
    });
  },

  updateActive() {
    document.querySelectorAll('.slash-menu-item').forEach((el, i) => {
      el.classList.toggle('active', i === this.selectedIndex);
    });
  },

  getFiltered() {
    const query = document.getElementById('slashMenuInput').value.toLowerCase();
    return this.items.filter(item =>
      item.name.toLowerCase().includes(query) || item.type.toLowerCase().includes(query)
    );
  },

  bindInput() {
    const input = document.getElementById('slashMenuInput');

    // Remove old listeners by replacing
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    newInput.addEventListener('input', () => {
      this.selectedIndex = 0;
      this.renderItems(this.getFiltered());
    });

    newInput.addEventListener('keydown', (e) => {
      const filtered = this.getFiltered();

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, filtered.length - 1);
        this.updateActive();
        // Scroll into view
        const active = document.querySelector('.slash-menu-item.active');
        if (active) active.scrollIntoView({ block: 'nearest' });
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.updateActive();
        const active = document.querySelector('.slash-menu-item.active');
        if (active) active.scrollIntoView({ block: 'nearest' });
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[this.selectedIndex]) {
          this.selectItem(filtered[this.selectedIndex]);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        this.hide();
        if (this.activeContentEl) this.activeContentEl.focus();
        return;
      }
    });

    newInput.focus();
  },

  selectItem(item) {
    if (!this.activeBlock) return;
    const block = this.activeBlock;

    // Clear the "/" from content
    Store.updateBlock(block.id, {
      type: item.type,
      content: item.type === 'divider' ? '' : '',
      properties: item.type === 'todo' ? { checked: false } : (item.type === 'callout' ? { icon: '💡' } : block.properties),
    });

    this.hide();

    // Re-render the block
    const el = document.querySelector(`[data-block-id="${block.id}"]`);
    if (el) {
      Editor.refreshBlock(el, block.id);
    }
  },
};
