// ChordWiki 譜面レイアウト CSS（Stylebot 代替 + UI 調整）
(function () {
  const STYLE_ID = 'rc-replacechar-styles';
  const MNOTO_FAMILY = 'MNoto Sans alpha V2';
  const FONT_FILE = 'fonts/MNotoSans-alpha-ExtraBold-v2.ttf';
  const SHEET_BR_CLASS = 'rc-blank-br';

  const LAYOUT_DEFAULTS = {
    chordValignEnabled: true,
    chordValignRem: -1.0625,
    lineSpacingEnabled: true,
    linePaddingTopRem: 0.8,
    commentLayoutEnabled: true,
    commentPaddingTopRem: 0.5,
    chordColorEnabled: true,
    chordColor: '#3273cd',
    commentStyleEnabled: true,
    commentStrongColor: '#4a4a4a',
    commentStrongBg: '#e6e6e6',
    commentStrongFontRem: 0.9375,
    keyStyleEnabled: true,
    keyColor: '#ff0000',
    keyBgColor: '#e6e6e6',
    keyFontRem: 1,
    blankLineEnabled: true,
    blankLineHeightRem: 0.5
  };

  const LAYOUT_STORAGE_KEYS = [
    'chordValignEnabled', 'chordValignRem',
    'lineSpacingEnabled', 'linePaddingTopRem',
    'commentLayoutEnabled', 'commentPaddingTopRem',
    'chordColorEnabled', 'chordColor',
    'commentStyleEnabled', 'commentStrongColor', 'commentStrongBg', 'commentStrongFontRem',
    'keyStyleEnabled', 'keyColor', 'keyBgColor', 'keyFontRem',
    'blankLineEnabled', 'blankLineHeightRem',
    'mnotoEnabled'
  ];

  function getSheetRoot() {
    return document.querySelector('.main div[oncopy]') || document.querySelector('div[oncopy]');
  }

  function isSheetBlankBr(br) {
    if (!br || br.tagName !== 'BR') return false;
    const root = getSheetRoot();
    if (!root || !root.contains(br)) return false;
    const isLine = (el) => el && el.matches && el.matches('p.line');
    return isLine(br.previousElementSibling) || isLine(br.nextElementSibling);
  }

  function markSheetBlankBrs() {
    document.querySelectorAll(`br.${SHEET_BR_CLASS}`).forEach((br) => br.classList.remove(SHEET_BR_CLASS));
    const root = getSheetRoot();
    if (!root) return;
    root.querySelectorAll('br').forEach((br) => {
      if (isSheetBlankBr(br)) br.classList.add(SHEET_BR_CLASS);
    });
  }

  function unmarkSheetBlankBrs() {
    document.querySelectorAll(`br.${SHEET_BR_CLASS}`).forEach((br) => br.classList.remove(SHEET_BR_CLASS));
  }

  function sheetScope() {
    return '.main div[oncopy]';
  }

  function chordSelector() {
    return `${sheetScope()} span.chord:not(:has(.male, .male2, .female, .female2)):not(.rc-bar-as-lyric)`;
  }

  function chordBarOnLineSelector() {
    return `${sheetScope()} span.chord.rc-bar-as-lyric:not(:has(.male, .male2, .female, .female2))`;
  }

  function numRem(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizeHex(value, fallback) {
    if (typeof value !== 'string') return fallback;
    const t = value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(t) || /^#[0-9A-Fa-f]{3}$/.test(t)) return t;
    return fallback;
  }

  function normalizeLayoutSettings(data) {
    return {
      chordValignEnabled: data.chordValignEnabled !== false,
      chordValignRem: numRem(data.chordValignRem, LAYOUT_DEFAULTS.chordValignRem),
      lineSpacingEnabled: data.lineSpacingEnabled !== false,
      linePaddingTopRem: numRem(data.linePaddingTopRem, LAYOUT_DEFAULTS.linePaddingTopRem),
      commentLayoutEnabled: data.commentLayoutEnabled !== false,
      commentPaddingTopRem: numRem(data.commentPaddingTopRem, LAYOUT_DEFAULTS.commentPaddingTopRem),
      chordColorEnabled: data.chordColorEnabled !== false,
      chordColor: normalizeHex(data.chordColor, LAYOUT_DEFAULTS.chordColor),
      commentStyleEnabled: data.commentStyleEnabled !== false,
      commentStrongColor: normalizeHex(data.commentStrongColor, LAYOUT_DEFAULTS.commentStrongColor),
      commentStrongBg: normalizeHex(data.commentStrongBg, LAYOUT_DEFAULTS.commentStrongBg),
      commentStrongFontRem: numRem(data.commentStrongFontRem, LAYOUT_DEFAULTS.commentStrongFontRem),
      keyStyleEnabled: data.keyStyleEnabled !== false,
      keyColor: normalizeHex(data.keyColor, LAYOUT_DEFAULTS.keyColor),
      keyBgColor: normalizeHex(data.keyBgColor, LAYOUT_DEFAULTS.keyBgColor),
      keyFontRem: numRem(data.keyFontRem, LAYOUT_DEFAULTS.keyFontRem),
      blankLineEnabled: data.blankLineEnabled !== false,
      blankLineHeightRem: numRem(data.blankLineHeightRem, LAYOUT_DEFAULTS.blankLineHeightRem),
      mnotoEnabled: data.mnotoEnabled !== false
    };
  }

  function buildStylesheet(s) {
    const scope = sheetScope();
    const fontUrl = chrome.runtime.getURL(FONT_FILE);
    let css = '';

    if (s.mnotoEnabled) {
      css += `@font-face {
  font-family: '${MNOTO_FAMILY}';
  src: url('${fontUrl}') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
`;
    }

    css += `body {
  line-height: 1rem !important;
  font-size: 1rem !important;
}

${scope} span.chord {
  font-size: 1rem !important;
}
`;

    if (s.mnotoEnabled) {
      css += `${chordSelector()} {
  font-family: '${MNOTO_FAMILY}', sans-serif !important;
}
`;
    }

    css += `${scope} p.line {
  font-size: 1rem !important;
  padding-bottom: 0 !important;
}

${scope} p.line.comment {
  width: fit-content !important;
  margin-bottom: 0.25rem !important;
}

${scope} p.key {
  display: inline-block !important;
  margin-top: 0.625rem !important;
  margin-bottom: 0.1875rem !important;
  padding-left: 0.375rem !important;
}

div.ratestar,
div.itunes_side,
div.amazon_side,
div.extra_side,
footer.footer,
#headeradarea,
#aswift_2 {
  display: none !important;
}

div.main {
  padding: 0 0 0 6rem !important;
}

h1.title {
  text-align: left !important;
  font-size: 1.25rem !important;
  border-style: none !important;
  padding-top: 0 !important;
}

h2.subtitle {
  text-align: left !important;
  font-size: 0.875rem !important;
}

#side {
  float: right !important;
  padding-top: 5rem !important;
  position: sticky !important;
}

#key {
  width: fit-content !important;
  font-size: 1.0625rem !important;
  float: right !important;
  margin-right: -10rem !important;
  position: sticky !important;
}

#key strong {
  display: none !important;
}
`;

    if (s.chordColorEnabled) {
      css += `${chordSelector()} {
  color: ${s.chordColor} !important;
}
`;
    }

    css += `${scope} span.chord.rc-bar-as-lyric {
  color: inherit !important;
  font-family: inherit !important;
  vertical-align: baseline !important;
}

`;

    if (s.chordValignEnabled) {
      css += `${chordSelector()} {
  position: relative !important;
  top: ${s.chordValignRem}rem !important;
}
${chordBarOnLineSelector()} {
  position: relative !important;
  top: ${s.chordValignRem}rem !important;
}
`;
    }

    if (s.lineSpacingEnabled) {
      css += `${scope} p.line:not(.comment) {
  padding-top: ${s.linePaddingTopRem}rem !important;
}
`;
    }

    if (s.commentLayoutEnabled) {
      css += `${scope} p.line.comment {
  padding-top: ${s.commentPaddingTopRem}rem !important;
}
`;
    }

    if (s.commentStyleEnabled) {
      css += `${scope} p.line.comment strong {
  color: ${s.commentStrongColor} !important;
  background-color: ${s.commentStrongBg} !important;
  font-size: ${s.commentStrongFontRem}rem !important;
  padding: 0 0.375rem !important;
  margin: 0.625rem 0 !important;
}
`;
    }

    if (s.keyStyleEnabled) {
      css += `${scope} p.key {
  color: ${s.keyColor} !important;
  background-color: ${s.keyBgColor} !important;
  font-size: ${s.keyFontRem}rem !important;
}
`;
    }

    if (s.blankLineEnabled) {
      css += `${scope} br.${SHEET_BR_CLASS} {
  display: block !important;
  font-size: 0 !important;
  line-height: ${s.blankLineHeightRem}rem !important;
  height: ${s.blankLineHeightRem}rem !important;
  margin: 0 !important;
  padding: 0 !important;
}
`;
    }

    return css;
  }

  function upsertStyle(css) {
    let el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = css;
  }

  function applyReplaceCharStyles(settings) {
    const s = normalizeLayoutSettings(settings || {});
    markSheetBlankBrs();
    upsertStyle(buildStylesheet(s));
  }

  function removeReplaceCharStyles() {
    document.getElementById(STYLE_ID)?.remove();
    unmarkSheetBlankBrs();
  }

  function loadLayoutSettings(callback) {
    chrome.storage.sync.get(LAYOUT_STORAGE_KEYS, (data) => {
      callback(normalizeLayoutSettings({ ...LAYOUT_DEFAULTS, ...data }));
    });
  }

  function isLayoutStorageChange(changes) {
    return LAYOUT_STORAGE_KEYS.some((k) => changes[k]);
  }

  window.RCLayout = {
    LAYOUT_DEFAULTS,
    LAYOUT_STORAGE_KEYS,
    applyReplaceCharStyles,
    removeReplaceCharStyles,
    loadLayoutSettings,
    isLayoutStorageChange,
    normalizeLayoutSettings
  };
})();
