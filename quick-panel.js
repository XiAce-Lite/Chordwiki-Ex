// ChordWiki 譜面ページ用の常用オプション簡易パネル
(function (global) {
  const PANEL_ID = 'rc-ex-quick-ui';
  const STORAGE_UI_POS_KEY = 'rc_ex_ui_pos';
  const STORAGE_UI_COLLAPSED_KEY = 'rc_ex_ui_collapsed';
  const UI_RIGHT_MARGIN_PX = 22;
  const DEFAULT_TOP_PX = 120;

  const QUICK_OPTION_KEYS = [
    'enabled',
    'adjustChordPos',
    'mnotoEnabled',
    'moveOverflowLyricsEnabled',
    'moveBarToLyricsEnabled',
    'extendBarUpwardEnabled',
    'alignMeasureBarsEnabled'
  ];

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function getSyncStorage() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        return chrome.storage.sync;
      }
    } catch (e) {
      void e;
    }
    return null;
  }

  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach((key) => {
        const value = props[key];
        if (key === 'className') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (value !== undefined && value !== null) {
          node.setAttribute(key, String(value));
        }
      });
    }
    (children || []).forEach((child) => {
      if (child == null) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function createToggle(id, labelText, nested) {
    const input = el('input', {
      type: 'checkbox',
      id,
      className: 'rc-ex-toggle-input'
    });
    const label = el(
      'label',
      {
        className: nested ? 'rc-ex-toggle-label rc-ex-toggle-nested' : 'rc-ex-toggle-label'
      },
      [
        input,
        el('span', { className: 'rc-ex-toggle-slider' }),
        el('span', { text: labelText })
      ]
    );
    return { label, input };
  }

  function buildPanelDom() {
    const master = createToggle('rc-ex-opt-enabled', '拡張機能を有効化');
    const adjust = createToggle('rc-ex-opt-adjust', '長いコード時の歌詞位置調整');
    const mnoto = createToggle('rc-ex-opt-mnoto', 'MNoto Sansフォント対応');
    const overflow = createToggle('rc-ex-opt-overflow', '行頭はみ出し歌詞を前行へ移動');
    const moveBar = createToggle('rc-ex-opt-move-bar', 'コード行の|を歌詞行へ移動');
    const extendBar = createToggle('rc-ex-opt-extend-bar', 'コード行に|を延伸', true);
    const alignMeasure = createToggle('rc-ex-opt-align-measure', 'ブロック内の小節線を揃える', true);

    const collapseBtn = el('button', {
      type: 'button',
      id: 'rc-ex-collapse',
      className: 'rc-ex-collapse-btn',
      'aria-expanded': 'false',
      'aria-label': 'パネルを展開/収納',
      text: '≫'
    });

    const head = el('div', { className: 'rc-ex-quick-head' }, [
      el('div', { className: 'rc-ex-quick-title', text: 'Chordwiki-Ex' }),
      collapseBtn
    ]);

    const body = el('div', { className: 'rc-ex-quick-body' }, [
      master.label,
      adjust.label,
      mnoto.label,
      overflow.label,
      moveBar.label,
      extendBar.label,
      alignMeasure.label
    ]);

    const root = el('div', {
      id: PANEL_ID,
      className: 'rc-ex-collapsed',
      role: 'complementary',
      'aria-label': 'Chordwiki-Ex クイック設定',
      'data-cw-ignore-autoscroll': '1'
    }, [head, body]);

    return {
      root,
      collapseBtn,
      inputs: {
        enabled: master.input,
        adjustChordPos: adjust.input,
        mnotoEnabled: mnoto.input,
        moveOverflowLyricsEnabled: overflow.input,
        moveBarToLyricsEnabled: moveBar.input,
        extendBarUpwardEnabled: extendBar.input,
        alignMeasureBarsEnabled: alignMeasure.input
      },
      labels: {
        adjustChordPos: adjust.label,
        mnotoEnabled: mnoto.label,
        moveOverflowLyricsEnabled: overflow.label,
        moveBarToLyricsEnabled: moveBar.label,
        extendBarUpwardEnabled: extendBar.label,
        alignMeasureBarsEnabled: alignMeasure.label
      }
    };
  }

  function readOptionDefaults(data) {
    return {
      enabled: data.enabled !== false,
      adjustChordPos: data.adjustChordPos !== false,
      mnotoEnabled: data.mnotoEnabled !== false,
      moveOverflowLyricsEnabled: data.moveOverflowLyricsEnabled !== false,
      moveBarToLyricsEnabled: data.moveBarToLyricsEnabled !== false,
      extendBarUpwardEnabled: data.extendBarUpwardEnabled === true,
      alignMeasureBarsEnabled: data.alignMeasureBarsEnabled === true
    };
  }

  function initQuickPanel() {
    try {
      if (global.__RC_EX_QUICK_PANEL_BOUND__) {
        return !!document.getElementById(PANEL_ID);
      }
      if (document.getElementById(PANEL_ID)) {
        global.__RC_EX_QUICK_PANEL_BOUND__ = true;
        return true;
      }

      const host = document.documentElement || document.body;
      if (!host) return false;

      const ui = buildPanelDom();
      host.appendChild(ui.root);
      global.__RC_EX_QUICK_PANEL_BOUND__ = true;

      let applying = false;
      let lastExpandedLeftPx = '';
      let drag = null;
      const storage = getSyncStorage();

      function syncAvailability() {
        const masterOn = ui.inputs.enabled.checked;
        const moveBarOn = masterOn && ui.inputs.moveBarToLyricsEnabled.checked;
        const subKeys = [
          'adjustChordPos',
          'mnotoEnabled',
          'moveOverflowLyricsEnabled',
          'moveBarToLyricsEnabled'
        ];
        subKeys.forEach((key) => {
          ui.inputs[key].disabled = !masterOn;
          ui.labels[key].classList.toggle('rc-ex-disabled', !masterOn);
        });
        ui.inputs.extendBarUpwardEnabled.disabled = !moveBarOn;
        ui.inputs.alignMeasureBarsEnabled.disabled = !moveBarOn;
        ui.labels.extendBarUpwardEnabled.classList.toggle('rc-ex-disabled', !moveBarOn);
        ui.labels.alignMeasureBarsEnabled.classList.toggle('rc-ex-disabled', !moveBarOn);
      }

      function applyFromStorage(data) {
        applying = true;
        const values = readOptionDefaults(data || {});
        Object.keys(ui.inputs).forEach((key) => {
          ui.inputs[key].checked = values[key];
        });
        syncAvailability();
        applying = false;
      }

      function setOption(key, value) {
        if (applying || !storage) return;
        storage.set({ [key]: value });
        if (key === 'enabled' || key === 'moveBarToLyricsEnabled') syncAvailability();
      }

      Object.keys(ui.inputs).forEach((key) => {
        ui.inputs[key].addEventListener('change', () => {
          setOption(key, ui.inputs[key].checked);
        });
      });

      function saveUiPosition() {
        if (ui.root.classList.contains('rc-ex-collapsed')) return;
        const left = parseInt(ui.root.style.left, 10);
        const top = parseInt(ui.root.style.top, 10);
        if (!Number.isFinite(left) || !Number.isFinite(top)) return;
        try {
          localStorage.setItem(STORAGE_UI_POS_KEY, JSON.stringify({ x: left, y: top }));
        } catch (e) {
          void e;
        }
      }

      function clampUiInViewport() {
        const maxTop = Math.max(0, window.innerHeight - Math.max(ui.root.offsetHeight, 1));
        let top = parseInt(ui.root.style.top, 10);
        if (!Number.isFinite(top)) {
          top = Math.round(ui.root.getBoundingClientRect().top) || DEFAULT_TOP_PX;
        }
        ui.root.style.top = clamp(top, 0, maxTop) + 'px';

        if (ui.root.classList.contains('rc-ex-collapsed')) {
          ui.root.style.left = '';
          ui.root.style.right = `max(${UI_RIGHT_MARGIN_PX}px, env(safe-area-inset-right, 0px))`;
          return;
        }

        let left = parseInt(ui.root.style.left, 10);
        if (!Number.isFinite(left)) {
          left = Math.round(ui.root.getBoundingClientRect().left);
        }
        const maxLeft = Math.max(0, window.innerWidth - Math.max(ui.root.offsetWidth, 1));
        ui.root.style.left = clamp(left, 0, maxLeft) + 'px';
        ui.root.style.right = 'auto';
      }

      function setCollapsed(collapsed) {
        if (collapsed) {
          const rect = ui.root.getBoundingClientRect();
          lastExpandedLeftPx = ui.root.style.left || (Math.round(rect.left) + 'px');
          ui.root.classList.add('rc-ex-collapsed');
          ui.root.style.left = '';
          ui.root.style.right = `max(${UI_RIGHT_MARGIN_PX}px, env(safe-area-inset-right, 0px))`;
          ui.collapseBtn.setAttribute('aria-expanded', 'false');
        } else {
          ui.root.classList.remove('rc-ex-collapsed');
          if (lastExpandedLeftPx) {
            ui.root.style.left = lastExpandedLeftPx;
            ui.root.style.right = 'auto';
          }
          ui.collapseBtn.setAttribute('aria-expanded', 'true');
          saveUiPosition();
        }
        // AutoScroller 同様、ボタン表示は常に ≫
        ui.collapseBtn.textContent = '≫';
        clampUiInViewport();
        try {
          localStorage.setItem(STORAGE_UI_COLLAPSED_KEY, collapsed ? '1' : '0');
        } catch (e) {
          void e;
        }
      }

      ui.collapseBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        setCollapsed(!ui.root.classList.contains('rc-ex-collapsed'));
      });

      const headEl = ui.root.querySelector('.rc-ex-quick-head');

      function onDragMove(ev) {
        if (!drag) return;
        const maxLeft = Math.max(0, window.innerWidth - Math.max(ui.root.offsetWidth, 1));
        const maxTop = Math.max(0, window.innerHeight - Math.max(ui.root.offsetHeight, 1));
        ui.root.style.left = clamp(ev.clientX - drag.offX, 0, maxLeft) + 'px';
        ui.root.style.top = clamp(ev.clientY - drag.offY, 0, maxTop) + 'px';
        ui.root.style.right = 'auto';
      }

      function onDragEnd() {
        if (!drag) return;
        const pointerId = drag.pointerId;
        drag = null;
        if (headEl && pointerId != null) {
          try {
            if (headEl.hasPointerCapture(pointerId)) {
              headEl.releasePointerCapture(pointerId);
            }
          } catch (e) {
            void e;
          }
        }
        ui.root.style.cursor = '';
        if (document.body) document.body.style.cursor = '';
        saveUiPosition();
      }

      headEl?.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0) return;
        if (!(ev.target instanceof Element)) return;
        if (ev.target.closest('button, input, select, textarea, label, a')) return;
        const rect = ui.root.getBoundingClientRect();
        ui.root.style.left = Math.round(rect.left) + 'px';
        ui.root.style.top = Math.round(rect.top) + 'px';
        ui.root.style.right = 'auto';
        drag = {
          offX: ev.clientX - rect.left,
          offY: ev.clientY - rect.top,
          pointerId: ev.pointerId
        };
        ui.root.style.cursor = 'move';
        if (document.body) document.body.style.cursor = 'move';
        try {
          headEl.setPointerCapture(ev.pointerId);
        } catch (e) {
          // setPointerCapture 非対応時は document へフォールバック
          document.addEventListener('pointermove', onDragMove);
          document.addEventListener('pointerup', onDragEndOnce);
          document.addEventListener('pointercancel', onDragEndOnce);
        }
        ev.preventDefault();
      });

      function onDragEndOnce() {
        document.removeEventListener('pointermove', onDragMove);
        document.removeEventListener('pointerup', onDragEndOnce);
        document.removeEventListener('pointercancel', onDragEndOnce);
        onDragEnd();
      }

      headEl?.addEventListener('pointermove', onDragMove);
      headEl?.addEventListener('pointerup', onDragEnd);
      headEl?.addEventListener('pointercancel', onDragEnd);
      headEl?.addEventListener('lostpointercapture', onDragEnd);

      // パネル内操作が AutoScroller に届かないようにする（bubble）。
      // Drop は setPointerCapture で head に届くので、かつての document pointerup 遮断問題は起きない。
      ui.root.addEventListener('pointerup', (ev) => {
        ev.stopPropagation();
      }, false);
      ui.root.addEventListener('pointerdown', (ev) => {
        ev.stopPropagation();
      }, false);

      window.addEventListener('resize', () => {
        clampUiInViewport();
        saveUiPosition();
      });

      try {
        const pos = JSON.parse(localStorage.getItem(STORAGE_UI_POS_KEY) || 'null');
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
          lastExpandedLeftPx = pos.x + 'px';
          ui.root.style.top = pos.y + 'px';
        }
      } catch (e) {
        void e;
      }

      let collapsed = true;
      try {
        collapsed = localStorage.getItem(STORAGE_UI_COLLAPSED_KEY) !== '0';
      } catch (e) {
        collapsed = true;
      }
      setCollapsed(collapsed);

      if (storage) {
        storage.get(QUICK_OPTION_KEYS, (data) => {
          applyFromStorage(data);
        });
        if (chrome.storage && chrome.storage.onChanged) {
          chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'sync') return;
            if (!QUICK_OPTION_KEYS.some((k) => changes[k])) return;
            storage.get(QUICK_OPTION_KEYS, (data) => {
              applyFromStorage(data);
            });
          });
        }
      } else {
        applyFromStorage({});
      }

      return true;
    } catch (err) {
      console.error('[Chordwiki-Ex] quick panel init failed:', err);
      return false;
    }
  }

  function bootQuickPanel() {
    const run = () => {
      if (initQuickPanel()) return true;
      return !!document.getElementById(PANEL_ID);
    };
    if (run()) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => { run(); }, { once: true });
    }
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (run() || tries >= 50) clearInterval(timer);
    }, 100);
  }

  global.RCExQuickPanel = {
    init: initQuickPanel,
    boot: bootQuickPanel,
    PANEL_ID
  };

  bootQuickPanel();
})(typeof globalThis !== 'undefined' ? globalThis : window);
