/* ── Block-based contenteditable editor ─────────────────── */
const Editor = {
  pageId: null,

  render(page) {
    this.pageId = page.id;
    const body = document.getElementById('pageBody');
    body.innerHTML = '<div class="block-list" id="blockList"></div>';

    const blocks = Store.getBlocksForPage(page.id);
    const list = document.getElementById('blockList');

    blocks.forEach((block, idx) => {
      list.appendChild(this.createBlockEl(block, idx));
    });

    this.renumberLists();
  },

  // ── Block Element ──────────────────────────────────────
  createBlockEl(block, index) {
    const el = document.createElement('div');
    el.className = 'block';
    el.dataset.blockId = block.id;
    el.dataset.type = block.type;
    el.dataset.indent = block.indent || 0;

    if (block.type === 'divider') {
      el.innerHTML = `
        <span class="block-add-btn" title="Add block">+</span>
        <span class="block-handle" draggable="true" title="Drag to reorder">⠿</span>
        <div class="block-content"></div>
      `;
      this.bindBlockActions(el, block);
      return el;
    }

    if (block.type === 'todo') {
      const checked = block.properties.checked;
      if (checked) el.classList.add('checked');
      el.innerHTML = `
        <span class="block-add-btn" title="Add block">+</span>
        <span class="block-handle" draggable="true" title="Drag to reorder">⠿</span>
        <div class="todo-checkbox ${checked ? 'checked' : ''}"></div>
        <div class="block-content" contenteditable="true" spellcheck="false" data-placeholder="To-do">${block.content}</div>
      `;

      el.querySelector('.todo-checkbox').addEventListener('click', () => {
        const newChecked = !block.properties.checked;
        Store.updateBlock(block.id, { properties: { ...block.properties, checked: newChecked } });
        el.querySelector('.todo-checkbox').classList.toggle('checked', newChecked);
        el.classList.toggle('checked', newChecked);
      });
    } else if (block.type === 'callout') {
      const icon = block.properties.icon || '💡';
      el.innerHTML = `
        <span class="block-add-btn" title="Add block">+</span>
        <span class="block-handle" draggable="true" title="Drag to reorder">⠿</span>
        <div class="block-content">
          <span class="callout-icon">${icon}</span>
          <div class="callout-text" contenteditable="true" spellcheck="false" data-placeholder="Type something...">${block.content}</div>
        </div>
      `;
    } else {
      const placeholder = this.getPlaceholder(block.type);
      el.innerHTML = `
        <span class="block-add-btn" title="Add block">+</span>
        <span class="block-handle" draggable="true" title="Drag to reorder">⠿</span>
        <div class="block-content" contenteditable="true" spellcheck="false" data-placeholder="${placeholder}">${block.content}</div>
      `;
    }

    this.bindBlockActions(el, block);
    return el;
  },

  getPlaceholder(type) {
    const map = {
      paragraph: "Type '/' for commands...",
      heading1: 'Heading 1',
      heading2: 'Heading 2',
      heading3: 'Heading 3',
      bulletList: 'List item',
      numberedList: 'List item',
      code: 'Code',
      quote: 'Quote',
    };
    return map[type] || "Type '/' for commands...";
  },

  // ── Bind Block Events ──────────────────────────────────
  bindBlockActions(el, block) {
    const contentEl = el.querySelector('.callout-text') || el.querySelector('.block-content[contenteditable]');

    // Add block button
    el.querySelector('.block-add-btn').addEventListener('click', () => {
      const newBlock = Store.createBlock(this.pageId, { type: 'paragraph' }, block.id);
      const newEl = this.createBlockEl(newBlock, 0);
      el.after(newEl);
      this.renumberLists();
      const ce = newEl.querySelector('.block-content[contenteditable]');
      if (ce) Utils.setCaretToStart(ce);
    });

    if (!contentEl) return;

    // Save on input
    contentEl.addEventListener('input', Utils.debounce(() => {
      Store.updateBlock(block.id, { content: contentEl.innerHTML });
    }, 300));

    // Keydown handling
    contentEl.addEventListener('keydown', (e) => {
      this.handleKeydown(e, el, block, contentEl);
    });

    // Slash command trigger
    contentEl.addEventListener('input', (e) => {
      if (e.inputType === 'insertText' && e.data === '/') {
        const text = contentEl.textContent;
        if (text === '/') {
          Commands.show(contentEl, block);
        }
      }
    });

    // Markdown shortcuts on space
    contentEl.addEventListener('beforeinput', (e) => {
      if (e.inputType === 'insertText' && e.data === ' ') {
        const text = contentEl.textContent;
        const converted = this.checkMarkdownShortcut(text, block);
        if (converted) {
          e.preventDefault();
          contentEl.innerHTML = '';
          Store.updateBlock(block.id, { content: '', type: converted.type, properties: converted.properties || block.properties });
          el.dataset.type = converted.type;
          this.refreshBlock(el, block.id);
        }
      }
    });

    // Show/hide floating toolbar on selection
    contentEl.addEventListener('mouseup', () => {
      setTimeout(() => this.checkSelection(), 10);
    });
  },

  handleKeydown(e, el, block, contentEl) {
    // Enter: split block
    if (e.key === 'Enter' && !e.shiftKey) {
      // Allow shift+enter for line break
      if (block.type === 'code') return; // Allow normal enter in code blocks

      e.preventDefault();
      const offset = Utils.getCaretOffset(contentEl);
      const fullHtml = contentEl.innerHTML;
      const textContent = contentEl.textContent;

      // Split at text caret position (approximate HTML split)
      let beforeHtml, afterHtml;
      if (offset === 0) {
        beforeHtml = '';
        afterHtml = fullHtml;
      } else if (offset >= textContent.length) {
        beforeHtml = fullHtml;
        afterHtml = '';
      } else {
        // Walk through to find the split point in HTML
        const { before, after } = this.splitHtmlAtOffset(contentEl, offset);
        beforeHtml = before;
        afterHtml = after;
      }

      // Update current block
      Store.updateBlock(block.id, { content: beforeHtml });
      contentEl.innerHTML = beforeHtml;

      // Determine new block type
      let newType = 'paragraph';
      let newProps = {};
      if (['bulletList', 'numberedList', 'todo'].includes(block.type)) {
        newType = block.type;
        if (block.type === 'todo') newProps = { checked: false };
        // If current block is now empty and new content is empty, convert current to paragraph
        if (!beforeHtml.trim() && !afterHtml.trim()) {
          Store.updateBlock(block.id, { type: 'paragraph', content: '' });
          this.refreshBlock(el, block.id);
          return;
        }
      }

      // Create new block
      const newBlock = Store.createBlock(this.pageId, {
        type: newType,
        content: afterHtml,
        properties: newProps,
        indent: block.indent,
      }, block.id);

      const newEl = this.createBlockEl(newBlock, 0);
      el.after(newEl);
      this.renumberLists();

      const newContentEl = newEl.querySelector('.callout-text') || newEl.querySelector('.block-content[contenteditable]');
      if (newContentEl) Utils.setCaretToStart(newContentEl);
      return;
    }

    // Backspace at start: merge with previous or convert to paragraph
    if (e.key === 'Backspace') {
      const offset = Utils.getCaretOffset(contentEl);
      if (offset === 0 && window.getSelection().isCollapsed) {
        e.preventDefault();

        // If not paragraph, convert to paragraph first
        if (block.type !== 'paragraph') {
          Store.updateBlock(block.id, { type: 'paragraph' });
          this.refreshBlock(el, block.id);
          return;
        }

        // Merge with previous block
        const prevEl = el.previousElementSibling;
        if (!prevEl || !prevEl.classList.contains('block')) return;

        const prevBlockId = prevEl.dataset.blockId;
        const prevBlock = Store.getBlock(prevBlockId);
        if (!prevBlock || prevBlock.type === 'divider') return;

        const prevContentEl = prevEl.querySelector('.callout-text') || prevEl.querySelector('.block-content[contenteditable]');
        if (!prevContentEl) return;

        const prevLen = prevContentEl.textContent.length;
        const mergedContent = prevContentEl.innerHTML + contentEl.innerHTML;

        Store.updateBlock(prevBlockId, { content: mergedContent });
        Store.deleteBlock(block.id);
        el.remove();

        prevContentEl.innerHTML = mergedContent;
        Utils.setCaretOffset(prevContentEl, prevLen);
        this.renumberLists();
        return;
      }
    }

    // Tab: indent
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      if (block.type === 'code') {
        // Insert tab in code block
        document.execCommand('insertText', false, '  ');
        return;
      }
      const newIndent = Math.min(6, (block.indent || 0) + 1);
      Store.updateBlock(block.id, { indent: newIndent });
      el.dataset.indent = newIndent;
      return;
    }

    // Shift+Tab: outdent
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      const newIndent = Math.max(0, (block.indent || 0) - 1);
      Store.updateBlock(block.id, { indent: newIndent });
      el.dataset.indent = newIndent;
      return;
    }

    // Arrow up: navigate to previous block
    if (e.key === 'ArrowUp') {
      const offset = Utils.getCaretOffset(contentEl);
      if (offset === 0) {
        e.preventDefault();
        const prevEl = el.previousElementSibling;
        if (prevEl && prevEl.classList.contains('block')) {
          const prevContent = prevEl.querySelector('.callout-text') || prevEl.querySelector('.block-content[contenteditable]');
          if (prevContent) Utils.setCaretToEnd(prevContent);
        }
      }
    }

    // Arrow down: navigate to next block
    if (e.key === 'ArrowDown') {
      const offset = Utils.getCaretOffset(contentEl);
      if (offset >= contentEl.textContent.length) {
        e.preventDefault();
        const nextEl = el.nextElementSibling;
        if (nextEl && nextEl.classList.contains('block')) {
          const nextContent = nextEl.querySelector('.callout-text') || nextEl.querySelector('.block-content[contenteditable]');
          if (nextContent) Utils.setCaretToStart(nextContent);
        }
      }
    }

    // Ctrl+Shift+Up/Down: move block
    if (e.ctrlKey && e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const page = Store.getPage(this.pageId);
      const idx = page.blockIds.indexOf(block.id);
      if (e.key === 'ArrowUp' && idx > 0) {
        Store.moveBlock(this.pageId, block.id, idx - 1);
        el.parentNode.insertBefore(el, el.previousElementSibling);
      } else if (e.key === 'ArrowDown' && idx < page.blockIds.length - 1) {
        Store.moveBlock(this.pageId, block.id, idx + 1);
        el.parentNode.insertBefore(el.nextElementSibling, el);
      }
      this.renumberLists();
      contentEl.focus();
      return;
    }

    // Ctrl+D: duplicate block
    if (e.ctrlKey && !e.shiftKey && e.key === 'd') {
      e.preventDefault();
      const b = Store.getBlock(block.id);
      const dup = Store.createBlock(this.pageId, {
        type: b.type,
        content: b.content,
        properties: { ...b.properties },
        indent: b.indent,
      }, block.id);
      const dupEl = this.createBlockEl(dup, 0);
      el.after(dupEl);
      this.renumberLists();
      return;
    }

    // Inline formatting shortcuts
    if (e.ctrlKey && !e.shiftKey) {
      if (e.key === 'b') { e.preventDefault(); document.execCommand('bold'); return; }
      if (e.key === 'i') { e.preventDefault(); document.execCommand('italic'); return; }
      if (e.key === 'u') { e.preventDefault(); document.execCommand('underline'); return; }
      if (e.key === 'e') {
        e.preventDefault();
        // Inline code
        const sel = window.getSelection();
        if (!sel.isCollapsed) {
          const range = sel.getRangeAt(0);
          const code = document.createElement('code');
          range.surroundContents(code);
        }
        return;
      }
      if (e.key === 'k') {
        e.preventDefault();
        const url = prompt('Enter URL:');
        if (url) document.execCommand('createLink', false, url);
        return;
      }
    }
  },

  // ── HTML splitting helper ──────────────────────────────
  splitHtmlAtOffset(el, offset) {
    const sel = window.getSelection();
    const range = document.createRange();

    // Use the existing caret position
    if (sel.rangeCount) {
      const caretRange = sel.getRangeAt(0);

      // Get content before caret
      const beforeRange = document.createRange();
      beforeRange.setStart(el, 0);
      beforeRange.setEnd(caretRange.startContainer, caretRange.startOffset);
      const beforeFrag = beforeRange.cloneContents();
      const beforeDiv = document.createElement('div');
      beforeDiv.appendChild(beforeFrag);

      // Get content after caret
      const afterRange = document.createRange();
      afterRange.setStart(caretRange.startContainer, caretRange.startOffset);
      afterRange.setEndAfter(el.lastChild || el);
      const afterFrag = afterRange.cloneContents();
      const afterDiv = document.createElement('div');
      afterDiv.appendChild(afterFrag);

      return { before: beforeDiv.innerHTML, after: afterDiv.innerHTML };
    }

    return { before: el.innerHTML, after: '' };
  },

  // ── Markdown Shortcuts ─────────────────────────────────
  checkMarkdownShortcut(text, block) {
    if (block.type !== 'paragraph') return null;
    const shortcuts = {
      '#': { type: 'heading1' },
      '##': { type: 'heading2' },
      '###': { type: 'heading3' },
      '-': { type: 'bulletList' },
      '*': { type: 'bulletList' },
      '[]': { type: 'todo', properties: { checked: false } },
      '>': { type: 'quote' },
      '```': { type: 'code' },
      '---': { type: 'divider' },
    };
    return shortcuts[text] || null;
  },

  // ── Refresh Block ──────────────────────────────────────
  refreshBlock(el, blockId) {
    const block = Store.getBlock(blockId);
    if (!block) return;
    const newEl = this.createBlockEl(block, 0);
    el.replaceWith(newEl);
    const ce = newEl.querySelector('.callout-text') || newEl.querySelector('.block-content[contenteditable]');
    if (ce) Utils.setCaretToStart(ce);
    this.renumberLists();
  },

  // ── Numbered List Counter ──────────────────────────────
  renumberLists() {
    let num = 0;
    document.querySelectorAll('#blockList .block').forEach(el => {
      if (el.dataset.type === 'numberedList') {
        num++;
        const content = el.querySelector('.block-content');
        if (content) content.dataset.number = num;
      } else {
        num = 0;
      }
    });
  },

  // ── Floating Toolbar ───────────────────────────────────
  checkSelection() {
    const sel = window.getSelection();
    const toolbar = document.getElementById('floatingToolbar');

    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      toolbar.style.display = 'none';
      return;
    }

    // Check if selection is inside a block
    const blockContent = sel.anchorNode?.parentElement?.closest?.('.block-content, .callout-text');
    if (!blockContent) {
      toolbar.style.display = 'none';
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    toolbar.style.display = 'flex';
    toolbar.style.top = (rect.top - 40) + 'px';
    toolbar.style.left = (rect.left + rect.width / 2 - toolbar.offsetWidth / 2) + 'px';
  },

  applyFormat(command) {
    if (command === 'code') {
      const sel = window.getSelection();
      if (!sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        // Check if already in code tag
        const parent = sel.anchorNode.parentElement;
        if (parent.tagName === 'CODE') {
          const text = parent.textContent;
          parent.replaceWith(document.createTextNode(text));
        } else {
          const code = document.createElement('code');
          range.surroundContents(code);
        }
      }
    } else if (command === 'link') {
      const url = prompt('Enter URL:');
      if (url) document.execCommand('createLink', false, url);
    } else {
      document.execCommand(command);
    }
  },
};

// Floating toolbar button handlers
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('floatingToolbar').addEventListener('mousedown', (e) => {
    e.preventDefault(); // Prevent losing selection
    const btn = e.target.closest('button');
    if (!btn) return;
    Editor.applyFormat(btn.dataset.command);
  });

  // Hide toolbar on selection change
  document.addEventListener('selectionchange', Utils.debounce(() => {
    Editor.checkSelection();
  }, 100));
});
