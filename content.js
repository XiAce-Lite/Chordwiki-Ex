// コードとして成立するもの（m7-5, m9-5, D#m7-5 なども許可）
// 複数の括弧付きテンションにも対応
const chordAllowed = /^[A-G](#|b)?((?:m|M|maj|min|sus[0-9]*|add[0-9]*|dim|aug)*[0-9]*(?:-[0-9]+)?)(?:\([^)]+\)|\{[^}]+\})*(?:\/[A-G](#|b)?(?:\([^)]+\)|\{[^}]+\})*)?$/i;
// 長いコード時の歌詞位置調整（穏やか）
const CHORD_POS_MIN_DIFF_PX = 28;
const CHORD_POS_SHIFT_RATIO = 0.5;
const CHORD_POS_MAX_SHIFT_PX = 12;
const CHORD_POS_MIN_GAP_PX = 24;
// 極小フォント設定のデフォルト
let SMALL_FONT_SIZE = 14;
let SMALL_FONT_VALIGN = 7;

function replaceMajToM() {
  document.querySelectorAll('span.chord').forEach(span => {
    // 入れ子判定
    if (Array.from(span.children).length > 0) {
      //console.log("nested chord found in replaceMajToM:", span);
      return;
    } 
    // majをMに置換（大文字・小文字区別なし）
    span.textContent = span.textContent.replace(/maj/gi, 'M');
  });
}

// span.chordの直後のspan.word/wordtopの左位置が大きくずれている場合、近づける
function adjustWordLeftToChord() {
  const chordSpans = document.querySelectorAll('span.chord');
  chordSpans.forEach(chord => {
    let next = chord.nextElementSibling;
    while (next && !(next.classList && (next.classList.contains('word') || next.classList.contains('wordtop')))) {
      next = next.nextElementSibling;
    }
    if (!next) return;

    const trimmed = next.textContent.trim();
    if (trimmed === '' || /^([>\-]+)$/.test(trimmed) || trimmed.length === 1) return;
    if (!chordAllowed.test(chord.textContent.trim())) return;

    const chordLeft = chord.getBoundingClientRect().left;
    const wordLeft = next.getBoundingClientRect().left;
    const diff = wordLeft - chordLeft;
    if (diff <= CHORD_POS_MIN_DIFF_PX) return;

    let shift = -diff * CHORD_POS_SHIFT_RATIO;
    if (Math.abs(shift) > CHORD_POS_MAX_SHIFT_PX) {
      shift = shift < 0 ? -CHORD_POS_MAX_SHIFT_PX : CHORD_POS_MAX_SHIFT_PX;
    }

    let nextChord = next.nextElementSibling;
    while (nextChord && !(nextChord.classList && nextChord.classList.contains('chord'))) {
      nextChord = nextChord.nextElementSibling;
    }
    if (nextChord) {
      const nextChordLeft = nextChord.getBoundingClientRect().left;
      const newWordLeft = wordLeft + shift;
      if (nextChordLeft - newWordLeft < CHORD_POS_MIN_GAP_PX) return;
    }

    const currentMargin = parseFloat(window.getComputedStyle(next).marginLeft) || 0;
    next.style.marginLeft = (currentMargin + shift) + 'px';
  });
}

// 設定をchrome.storageから取得
function loadSmallFontSettings(callback) {
  chrome.storage && chrome.storage.sync.get(['smallFontSize', 'smallFontValign'], (data) => {
    SMALL_FONT_SIZE = Number(data.smallFontSize) || 14;
    SMALL_FONT_VALIGN = Number(data.smallFontValign) || 7;
    if (callback) callback();
  });
}
// content.js

// MNoto Sans フォント対応部分
function replaceMNotoSansText() {
  const chordSpans = Array.from(document.querySelectorAll('span.chord')).filter(span =>
    !span.querySelector('.male, .male2, .female, .female2')
  );
  chordSpans.forEach(span => {
    if (isChordLineBarOnly(span)) return;
    // 半角・全角スペースで分割
    const parts = span.textContent.split(/[ 　]+/).filter(s => s !== '');
    let fragment = document.createDocumentFragment();
    parts.forEach((part, idx1) => {
      // コード部分と非コード部分をさらに分割
      // 先頭からコード部分を抽出
      let rest = part;
      let match = rest.match(/^[A-G](#|b)?((?:m|M|maj|min|sus[0-9]*|add[0-9]*|dim|aug)*[0-9]*(?:-[0-9]+)?)(?:\([^)]+\)|\{[^}]+\})*(?:\/[A-G](#|b)?(?:\([^)]+\)|\{[^}]+\})*)?$/i);
      if (match && match[0].length > 0) {
        // コード部分
        const codeSpan = document.createElement('span');
        codeSpan.className = 'chord';
        codeSpan.textContent = match[0];
        fragment.appendChild(codeSpan);
        rest = rest.slice(match[0].length);
      }
      // 残りがあれば（記号等）
      if (rest.length > 0) {
        const specialSpan = document.createElement('span');
        specialSpan.className = 'chord';
        specialSpan.textContent = rest;
        fragment.appendChild(specialSpan);
      }
      // スペース挿入（最後以外）
      if (idx1 < parts.length - 1) fragment.appendChild(document.createTextNode(' '));
    });
    span.replaceWith(fragment);
  });

  // 2回目: 分割後の全span.chordに対してフォント指定等の処理
  const chordSpans2 = Array.from(document.querySelectorAll('span.chord')).filter(span =>
    !span.querySelector('.male, .male2, .female, .female2')
  );
  chordSpans2.forEach(span => {
    if (isChordLineBarOnly(span)) return;
    const text = span.textContent.trim();
    const specialSymbols = ['-', '=', '>', '≫', '≧','!', 'n.c', 'N.C','＞'];
    const onlyTildeOrSpace = /^[~\s]+$/.test(text);
    if (onlyTildeOrSpace) console.log("only tilde or space:", onlyTildeOrSpace, text);

    if (specialSymbols.some(s => text.includes(s)) && !chordAllowed.test(text)) {
      // 記号とコードを分割（例: >Em7-5---> → > Em7-5 --->）
      // 連続記号をまとめて分割する正規表現
      const symbolPattern = /([\-=≫≧＞>!]+|n\.c|N\.C)/gi;
      let parts = [];
      let lastIndex = 0;
      let match;
      while ((match = symbolPattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
          // 記号以外（コード等）
          parts.push(text.slice(lastIndex, match.index));
        }
        // 記号
        parts.push(match[0]);
        lastIndex = symbolPattern.lastIndex;
      }
      if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
      }
      parts = parts.map(s => s.trim()).filter(s => s);

      // 分割したspan.chordを新たに作成し、元のspanと置換
      const fragment = document.createDocumentFragment();
      parts.forEach(part => {
        const tempSpan = document.createElement('span');
        tempSpan.className = 'chord';
        tempSpan.textContent = part;
        if (chordAllowed.test(part)) {
          // コード扱いはそのまま
        } else if (specialSymbols.includes(part) || /^(?:[\-=≫≧＞>!]+|n\.c|N\.C)$/i.test(part)) {
          // specialSymbolsはナローフォント
          tempSpan.style.cssText += 'font-family: "Arial Narrow", Arial, "Roboto Condensed", "Helvetica Neue Condensed" !important; color: #3273cd !important;';
        }
        fragment.appendChild(tempSpan);
      });
      span.replaceWith(fragment);
    } else if (onlyTildeOrSpace) {
      // onlyTildeOrSpaceの場合は全体にナローフォント
      try {
        span.style.cssText += 'font-family: "Arial Narrow", Arial, "Roboto Condensed", "Helvetica Neue Condensed" !important; color: #3273cd !important;';
      } catch (error) {
        console.error('Style setting failed:', error);
      }
    }

    // MNoto Sans フォント対応
    if (!(
      span.classList.contains('chord') &&
      span.textContent.trim().includes('|') &&
      span.getAttribute('onclick') && span.getAttribute('onclick').includes('|')
    )) {
      span.textContent = span.textContent
        .replace(/\((?:[#b+\-]?\d+(?:[,.][#b+\-]?\d+)*)\)/g, match => {
          // ()内に7が含まれる場合は7を'に変換し、{}で囲む
          if (/7/.test(match)) {
            return '{' + match.slice(1, -1).replace(/7/g, "'") + '}';
          }
          return '{' + match.slice(1, -1) + '}';
        });
    }
  });
}

// <p class="line"> の最初の歌詞 span（word）を wordtop にする（chord は対象外）
function setFirstSpanToWordtop() {
  const lines = document.querySelectorAll(LINE_SELECTOR);
  lines.forEach(p => {
    const firstLyrics = getLineStartLyricsSpan(p);
    if (!firstLyrics || firstLyrics.classList.contains('wordtop')) return;
    if (!firstLyrics.classList.contains('word')) return;
    firstLyrics.classList.add('wordtop');
    firstLyrics.classList.remove('word');
    // male/female 等の子要素を壊さない（textContent 代入は使わない）
    if (firstLyrics.querySelector(VOICE_PART_SELECTOR) || firstLyrics.children.length > 0) {
      const first = firstLyrics.firstChild;
      if (first && first.nodeType === Node.TEXT_NODE) {
        first.nodeValue = first.nodeValue.replace(/^\s+/, '');
      }
      return;
    }
    let txt = firstLyrics.textContent.replace(/^\s+/, '');
    if (txt === '|') txt = '| ';
    firstLyrics.textContent = txt;
  });
}

// 全角スペース除去＋trimの共通関数
function cleanText(text) {
  return text.replace(/　/g, '').trim();
}

// 全角スペース除去後に空の要素を削除する。
function removeEmptyWordtopSpans() {
  const wordtopSpans = document.querySelectorAll('span.wordtop');

  wordtopSpans.forEach(span => {
  const cleaned = cleanText(span.textContent);
    if (cleaned === '') {
      span.remove();
    }
  });
}

function filterChordSpans(root) {
  return Array.from((root || document).querySelectorAll('span.chord')).filter(span =>
    !span.querySelector('.male, .male2, .female, .female2')
  );
}

const RC_BAR_AS_LYRIC_CLASS = 'rc-bar-as-lyric';
const RC_BAR_EXTEND_CLASS = 'rc-bar-extend';
const RC_BAR_EXTEND_GLYPH_CLASS = 'rc-bar-extend-glyph';
const LINE_SELECTOR = 'p.line';
const LYRICS_SPAN_SELECTOR = 'span.word, span.wordtop';
const VOICE_PART_SELECTOR = '.male, .male2, .female, .female2';
// ChordWiki 互換: ♠=male ♣=male2 ♥=female ♦=female2（白塗り・絵文字も拾う）
const VOICE_MARKER_CLASS_MAP = Object.freeze({
  '\u2660': 'male',
  '\u2664': 'male',
  '\u2663': 'male2',
  '\u2667': 'male2',
  '\u2665': 'female',
  '\u2661': 'female',
  '\u2666': 'female2',
  '\u2662': 'female2',
  '\u2764': 'female'
});
const VOICE_MARKER_RE = /[\u2660\u2664\u2663\u2667\u2665\u2661\u2666\u2662\u2764]/;
const INLINE_VIDEO_SHELL_ID = 'rc-inline-youtube-shell';
const INLINE_VIDEO_IFRAME_ID = 'rc-inline-youtube-iframe';
const INLINE_VIDEO_TITLE_ID = 'rc-inline-youtube-title';
const INLINE_VIDEO_OPEN_ID = 'rc-inline-youtube-open';
const INLINE_VIDEO_CLOSE_ID = 'rc-inline-youtube-close';

const inlineVideoState = {
  initialized: false,
  clickHandler: null
};
const INLINE_VIDEO_STORAGE_KEY = 'inlineVideoEnabled';

const BRACKET_BAR_ONLY_RE = /^\[\|\s*\]$/;
const BRACKET_BAR_CODE_RE = /^\[\|\s*([^\]]*)\]$/;
// ChordWiki 実 DOM（ソースの [| E] は span 上では | E、小節線のみは |）
const PIPE_BAR_ONLY_RE = /^\|$/;
const PIPE_BAR_CODE_RE = /^\|\s+(.+)$/;

function normalizeBarText(text) {
  return text
    .replace(/\uFF3B/g, '[')
    .replace(/\uFF3D/g, ']')
    .replace(/\uFF5C/g, '|');
}

// { barOnly, inner, barText } | null — barText は分割後の小節線側 chord 表示（| または [|]）
function parseBarChordParts(text) {
  const norm = normalizeBarText(text.trim());

  if (BRACKET_BAR_ONLY_RE.test(norm)) {
    return { barOnly: true, inner: '', barText: '[|]' };
  }
  const bracketCode = norm.match(BRACKET_BAR_CODE_RE);
  if (bracketCode) {
    const inner = (bracketCode[1] || '').trim();
    if (inner) return { barOnly: false, inner, barText: '[|]' };
    return { barOnly: true, inner: '', barText: '[|]' };
  }
  if (PIPE_BAR_ONLY_RE.test(norm)) {
    return { barOnly: true, inner: '', barText: '|' };
  }
  const pipeCode = norm.match(PIPE_BAR_CODE_RE);
  if (pipeCode) {
    const inner = (pipeCode[1] || '').trim();
    if (inner) return { barOnly: false, inner, barText: '|' };
  }
  return null;
}

function isPipeBarCodeText(text) {
  const parts = parseBarChordParts(normalizeBarText(text));
  return !!(parts && !parts.barOnly && parts.inner);
}

function parseYouTubeStartSeconds(url) {
  const raw = String(
    url.searchParams.get('t') ||
    url.searchParams.get('start') ||
    ''
  ).trim();
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Math.max(0, Number(raw));
  const m = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!m) return 0;
  const h = Number(m[1] || 0);
  const min = Number(m[2] || 0);
  const sec = Number(m[3] || 0);
  return h * 3600 + min * 60 + sec;
}

function parseVideoInfo(urlText) {
  try {
    const url = new URL(urlText, location.href);
    const host = url.hostname.toLowerCase();
    let provider = '';
    let videoId = '';
    if (host === 'youtu.be') {
      provider = 'youtube';
      videoId = url.pathname.replace(/^\/+/, '').split('/')[0] || '';
    } else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      provider = 'youtube';
      if (url.pathname === '/watch') {
        videoId = String(url.searchParams.get('v') || '').trim();
      } else if (url.pathname.startsWith('/embed/')) {
        videoId = url.pathname.replace('/embed/', '').split('/')[0] || '';
      } else if (url.pathname.startsWith('/shorts/')) {
        videoId = url.pathname.replace('/shorts/', '').split('/')[0] || '';
      }
    } else if (host === 'nico.ms') {
      provider = 'niconico';
      videoId = url.pathname.replace(/^\/+/, '').split('/')[0] || '';
    } else if (host.endsWith('nicovideo.jp') || host.endsWith('niconico.com')) {
      if (url.pathname.startsWith('/watch/')) {
        provider = 'niconico';
        videoId = url.pathname.replace('/watch/', '').split('/')[0] || '';
      }
    } else {
      return null;
    }
    if (provider === 'youtube') {
      if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
      return { provider, videoId, startSeconds: parseYouTubeStartSeconds(url) };
    }
    if (provider === 'niconico') {
      if (!/^[A-Za-z]{2}\d+$/.test(videoId) && !/^\d+$/.test(videoId)) return null;
      return { provider, videoId, startSeconds: 0 };
    }
    return null;
  } catch (_error) {
    return null;
  }
}

function buildInlineVideoWatchUrl(provider, videoId, startSeconds) {
  if (provider === 'niconico') {
    return `https://www.nicovideo.jp/watch/${encodeURIComponent(videoId)}`;
  }
  const start = Math.max(0, Math.trunc(Number(startSeconds) || 0));
  if (start > 0) {
    return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${start}s`;
  }
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

function buildInlineVideoEmbedUrl(provider, videoId, startSeconds) {
  if (provider === 'niconico') {
    return `https://embed.nicovideo.jp/watch/${encodeURIComponent(videoId)}?autoplay=1`;
  }
  const start = Math.max(0, Math.trunc(Number(startSeconds) || 0));
  const qs = new URLSearchParams({
    autoplay: '1',
    rel: '0',
    playsinline: '1',
    modestbranding: '1'
  });
  if (start > 0) qs.set('start', String(start));
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${qs.toString()}`;
}

function ensureInlineYouTubePlayerDom() {
  let shell = document.getElementById(INLINE_VIDEO_SHELL_ID);
  if (shell) return shell;
  shell = document.createElement('div');
  shell.id = INLINE_VIDEO_SHELL_ID;
  shell.className = 'rc-inline-youtube-shell';
  shell.hidden = true;

  const header = document.createElement('div');
  header.className = 'rc-inline-youtube-header';

  const title = document.createElement('div');
  title.id = INLINE_VIDEO_TITLE_ID;
  title.className = 'rc-inline-youtube-title';
  title.textContent = 'Now Playing';

  const actions = document.createElement('div');
  actions.className = 'rc-inline-youtube-actions';

  const openLink = document.createElement('a');
  openLink.id = INLINE_VIDEO_OPEN_ID;
  openLink.className = 'rc-inline-youtube-open';
  openLink.href = 'https://www.youtube.com/';
  openLink.target = '_blank';
  openLink.rel = 'noopener noreferrer';
  openLink.textContent = '開く';

  const closeBtn = document.createElement('button');
  closeBtn.id = INLINE_VIDEO_CLOSE_ID;
  closeBtn.type = 'button';
  closeBtn.className = 'rc-inline-youtube-close';
  closeBtn.setAttribute('aria-label', 'Close video player');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => closeInlineYouTubePlayer());

  actions.appendChild(openLink);
  actions.appendChild(closeBtn);
  header.appendChild(title);
  header.appendChild(actions);

  const frame = document.createElement('div');
  frame.className = 'rc-inline-youtube-frame';

  const iframe = document.createElement('iframe');
  iframe.id = INLINE_VIDEO_IFRAME_ID;
  iframe.title = 'Inline video player';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen = true;

  frame.appendChild(iframe);
  shell.appendChild(header);
  shell.appendChild(frame);
  (document.body || document.documentElement).appendChild(shell);
  return shell;
}

function openInlineYouTubePlayer(provider, videoId, startSeconds) {
  const shell = ensureInlineYouTubePlayerDom();
  const iframe = document.getElementById(INLINE_VIDEO_IFRAME_ID);
  const title = document.getElementById(INLINE_VIDEO_TITLE_ID);
  const openLink = document.getElementById(INLINE_VIDEO_OPEN_ID);
  if (!iframe || !title || !openLink) return;
  const start = Math.max(0, Math.trunc(Number(startSeconds) || 0));
  const label = provider === 'niconico' ? 'ニコニコ動画' : 'YouTube';
  title.textContent = provider === 'youtube' && start > 0 ? `${label} (${start}s)` : label;
  openLink.href = buildInlineVideoWatchUrl(provider, videoId, start);
  iframe.src = buildInlineVideoEmbedUrl(provider, videoId, start);
  shell.hidden = false;
}

function closeInlineYouTubePlayer() {
  const shell = document.getElementById(INLINE_VIDEO_SHELL_ID);
  const iframe = document.getElementById(INLINE_VIDEO_IFRAME_ID);
  if (iframe) iframe.src = 'about:blank';
  if (shell) shell.hidden = true;
}

function initInlineYouTubePlayer() {
  if (inlineVideoState.initialized) return;
  ensureInlineYouTubePlayerDom();
  inlineVideoState.clickHandler = (event) => {
    const anchor = event.target?.closest?.('a[href]');
    if (!anchor) return;
    const info = parseVideoInfo(anchor.href);
    if (!info) return;
    event.preventDefault();
    openInlineYouTubePlayer(info.provider, info.videoId, info.startSeconds);
  };
  document.addEventListener('click', inlineVideoState.clickHandler, true);
  inlineVideoState.initialized = true;
}

function disableInlineVideoPlayback() {
  if (inlineVideoState.clickHandler) {
    document.removeEventListener('click', inlineVideoState.clickHandler, true);
    inlineVideoState.clickHandler = null;
    inlineVideoState.initialized = false;
  }
  closeInlineYouTubePlayer();
}

function syncInlineVideoPlaybackFromStorage() {
  chrome.storage.sync.get([INLINE_VIDEO_STORAGE_KEY], (data) => {
    if (data[INLINE_VIDEO_STORAGE_KEY] === false) {
      disableInlineVideoPlayback();
    } else {
      initInlineYouTubePlayer();
    }
  });
}

function isChordLineBarOnly(span) {
  const parts = parseBarChordParts(span.textContent.trim());
  return !!(parts && parts.barOnly);
}

// コード行に残った小節線 chord（| / [|]）を歌詞行と同系の見た目にする
function markChordLineBarSpans() {
  filterChordSpans().forEach(span => {
    if (isChordLineBarOnly(span)) {
      span.classList.add(RC_BAR_AS_LYRIC_CLASS);
      span.style.removeProperty('font-family');
      span.style.removeProperty('color');
      span.style.removeProperty('top');
      span.style.removeProperty('position');
      span.style.removeProperty('vertical-align');
    } else {
      span.classList.remove(RC_BAR_AS_LYRIC_CLASS);
    }
  });
}

function findNextLyricsSpan(fromSpan) {
  let next = fromSpan.nextElementSibling;
  while (next) {
    if (next.classList && (next.classList.contains('word') || next.classList.contains('wordtop'))) {
      return next;
    }
    if (next.classList && next.classList.contains('chord')) {
      next = next.nextElementSibling;
      continue;
    }
    next = next.nextElementSibling;
  }
  return null;
}

function lyricsStartsWithBar(wordSpan) {
  if (!wordSpan) return false;
  return cleanText(wordSpan.textContent).startsWith('|');
}

function createBarCodeChordSpans(inner, onclick, barText) {
  const barSpan = document.createElement('span');
  barSpan.className = `chord ${RC_BAR_AS_LYRIC_CLASS}`;
  barSpan.textContent = barText;
  if (onclick) barSpan.setAttribute('onclick', onclick);

  const codeSpan = document.createElement('span');
  codeSpan.className = 'chord';
  codeSpan.textContent = inner;
  if (onclick) codeSpan.setAttribute('onclick', onclick);

  const fragment = document.createDocumentFragment();
  fragment.appendChild(barSpan);
  fragment.appendChild(codeSpan);
  return { barSpan, codeSpan, fragment };
}

// | / [|] → 歌詞行へ（moveBarToLyrics が true のときのみ）。直後が | 始まり歌詞なら削除
function moveOrRemoveBracketBarSpan(span, options) {
  if (!options || options.moveBarToLyrics !== true) return false;

  const text = normalizeBarText(span.textContent.trim());
  const onclick = span.getAttribute('onclick');
  const parts = parseBarChordParts(text);

  if (parts && !parts.barOnly && parts.inner) {
    const { barSpan, fragment } = createBarCodeChordSpans(parts.inner, onclick, parts.barText);
    span.replaceWith(fragment);
    moveOrRemoveBracketBarSpan(barSpan, options);
    return true;
  }

  if (!onclick || !onclick.includes('|')) return false;

  if (parts && parts.barOnly) {
    if (removeBarChordBeforeLyricsBar(span)) return true;
    const parent = span.parentNode;
    const isFirstChild = parent && parent.firstElementChild === span;
    const lyricSpan = document.createElement('span');
    lyricSpan.className = isFirstChild ? 'wordtop' : 'word';
    lyricSpan.textContent = isFirstChild ? '| ' : ' | ';
    span.replaceWith(lyricSpan);
    return true;
  }

  return false;
}

// | E 等を小節線+コードに分割するだけ（歌詞行へは移さない）
function splitPipeBarChordsOnChordLine() {
  filterChordSpans().forEach(span => {
    const parts = parseBarChordParts(span.textContent.trim());
    if (!parts || parts.barOnly || !parts.inner) return;

    const onclick = span.getAttribute('onclick');
    const { fragment } = createBarCodeChordSpans(parts.inner, onclick, parts.barText);
    span.replaceWith(fragment);
  });
}

// 小節線のみ chord の直後が歌詞の | 始まりなら chord を削除（| と | の連続対策・移動 OFF 時も）
function removeBarChordBeforeLyricsBar(span) {
  if (!span.parentNode) return false;
  const parts = parseBarChordParts(span.textContent.trim());
  if (!parts || !parts.barOnly) return false;
  if (!lyricsStartsWithBar(findNextLyricsSpan(span))) return false;
  span.remove();
  return true;
}

function removeAllRedundantBarChords() {
  filterChordSpans().forEach(span => {
    removeBarChordBeforeLyricsBar(span);
  });
}

function isLyricsSpan(span) {
  if (!span || !span.classList) return false;
  if (span.querySelector('.male, .male2, .female, .female2')) return false;
  return span.classList.contains('word') || span.classList.contains('wordtop');
}

// 行頭の歌詞 span（先頭の chord を飛ばした最初の word / wordtop）
function getLineStartLyricsSpan(p) {
  for (const child of p.children) {
    if (child.tagName !== 'SPAN') continue;
    if (child.classList.contains('chord')) continue;
    if (isLyricsSpan(child)) return child;
    break;
  }
  return null;
}

function isOverflowLyricsText(cleanedText) {
  return (
    cleanedText.length > 1 &&
    cleanedText.endsWith('|') &&
    /[^|]/.test(cleanedText) &&
    !cleanedText.startsWith('|')
  );
}

// 同一行の直前歌詞 → なければ前の p.line の最後の歌詞（comment / key / br は乗り越える）
function findPreviousWordElement(wordtop) {
  let prev = wordtop.previousElementSibling;
  while (prev) {
    if (
      prev.classList &&
      (prev.classList.contains('word') || prev.classList.contains('wordtop')) &&
      !prev.querySelector('.male, .male2, .female, .female2')
    ) {
      return prev;
    }
    prev = prev.previousElementSibling;
  }

  let parent = wordtop.parentElement;
  while (parent && !parent.matches(LINE_SELECTOR)) {
    parent = parent.parentElement;
  }
  if (!parent) return null;

  let prevP = parent.previousElementSibling;
  while (prevP && (!prevP.matches(LINE_SELECTOR) || prevP.matches('p.comment'))) {
    prevP = prevP.previousElementSibling;
  }
  if (!prevP) return null;

  const words = prevP.querySelectorAll(LYRICS_SPAN_SELECTOR);
  return words.length > 0 ? words[words.length - 1] : null;
}

// 行頭 wordtop のはみ出し歌詞を前行へ移す（ReplaceChar コア）
function moveOverflowWordtops() {
  const wordtopElements = Array.from(document.querySelectorAll('span.wordtop')).filter(
    (span) => !span.querySelector('.male, .male2, .female, .female2')
  );

  wordtopElements.forEach((wordtop) => {
    const cleanedText = cleanText(wordtop.textContent);
    if (cleanedText === '|') {
      wordtop.textContent = '| ';
      return;
    }
    if (!isOverflowLyricsText(cleanedText)) return;

    const prevWord = findPreviousWordElement(wordtop);
    if (!prevWord) return;

    const parentP = prevWord.closest('p');
    if (!parentP) return;

    const overflowText = cleanedText.replace(/\|+\s*$/, '');
    let addText = ' ' + overflowText + ' | ';
    const lastElem = parentP.lastElementChild;
    if (lastElem && lastElem.textContent && /\|\s*$/.test(lastElem.textContent)) {
      addText = ' ' + overflowText + ' |';
      // textContent 代入は male/female を壊すので末尾テキストノードだけ削る
      stripTrailingBarFromElement(lastElem);
    }
    parentP.appendChild(document.createTextNode(addText));

    while (wordtop.firstChild) wordtop.removeChild(wordtop.firstChild);
    wordtop.appendChild(document.createTextNode('| '));
  });
}

function stripTrailingBarFromElement(el) {
  if (!el) return;
  if (el.querySelector(VOICE_PART_SELECTOR) || el.children.length > 0) {
    for (let node = el.lastChild; node; node = node.previousSibling) {
      if (node.nodeType !== Node.TEXT_NODE) continue;
      const next = node.nodeValue.replace(/\|\s*$/, '');
      if (next !== node.nodeValue) {
        if (next) node.nodeValue = next;
        else node.remove();
      }
      break;
    }
    return;
  }
  el.textContent = el.textContent.replace(/\|\s*$/, '');
}

function isBarOnlyLyricsSpan(span) {
  if (!isLyricsSpan(span)) return false;
  return cleanText(span.textContent) === '|';
}

function clearLyricBarExtendMarks() {
  document.querySelectorAll(`span.${RC_BAR_EXTEND_GLYPH_CLASS}`).forEach((glyph) => {
    glyph.replaceWith(document.createTextNode('|'));
  });
  document.querySelectorAll(`span.${RC_BAR_EXTEND_CLASS}`).forEach((span) => {
    span.classList.remove(RC_BAR_EXTEND_CLASS);
  });
}

function wrapPipesInTextNode(textNode) {
  const text = textNode.nodeValue;
  if (!text || !text.includes('|') || !textNode.parentNode) return false;

  const fragment = document.createDocumentFragment();
  let remaining = text;
  while (remaining.length) {
    const idx = remaining.indexOf('|');
    if (idx === -1) {
      fragment.appendChild(document.createTextNode(remaining));
      break;
    }
    if (idx > 0) {
      fragment.appendChild(document.createTextNode(remaining.slice(0, idx)));
    }
    const glyph = document.createElement('span');
    glyph.className = RC_BAR_EXTEND_GLYPH_CLASS;
    glyph.setAttribute('aria-hidden', 'true');
    fragment.appendChild(glyph);
    remaining = remaining.slice(idx + 1);
  }
  textNode.parentNode.replaceChild(fragment, textNode);
  return true;
}

// ブラウザズーム 100% 前提: 実 DPR で 1 デバイスピクセル幅にし、左端を画素境界へ合わせる
function snapLyricBarExtendGlyphs() {
  const dpr = window.devicePixelRatio || 1;
  const hairW = 1 / dpr;
  document.querySelectorAll(`span.${RC_BAR_EXTEND_GLYPH_CLASS}`).forEach((glyph) => {
    glyph.style.setProperty('--rc-bar-hair-w', `${hairW}px`);
    glyph.style.removeProperty('--rc-bar-snap-x');
    const left = glyph.getBoundingClientRect().left;
    const snapped = Math.round(left * dpr) / dpr;
    const delta = snapped - left;
    glyph.style.setProperty('--rc-bar-snap-x', `${delta}px`);
  });
}

function scheduleSnapLyricBarExtendGlyphs() {
  snapLyricBarExtendGlyphs();
  requestAnimationFrame(() => {
    snapLyricBarExtendGlyphs();
    requestAnimationFrame(snapLyricBarExtendGlyphs);
  });
}

let barExtendSnapListening = false;
function ensureBarExtendSnapListeners() {
  if (barExtendSnapListening) return;
  barExtendSnapListening = true;
  // ウィンドウリサイズ時のみ（ズーム追従はしない = 100% 利用を想定）
  window.addEventListener('resize', () => scheduleSnapLyricBarExtendGlyphs());
}

// 素の ♠♣♥♦ を ChordWiki と同じ male/female 系 span に戻す
function wrapVoiceMarkersInTextNode(textNode) {
  const text = textNode.nodeValue;
  if (!text || !VOICE_MARKER_RE.test(text) || !textNode.parentNode) return false;
  if (textNode.parentElement && textNode.parentElement.matches(VOICE_PART_SELECTOR)) return false;

  const fragment = document.createDocumentFragment();
  for (const ch of text) {
    const cls = VOICE_MARKER_CLASS_MAP[ch];
    if (cls) {
      const marker = document.createElement('span');
      marker.className = cls;
      marker.textContent = ch;
      fragment.appendChild(marker);
    } else {
      fragment.appendChild(document.createTextNode(ch));
    }
  }
  textNode.parentNode.replaceChild(fragment, textNode);
  return true;
}

function restoreVoiceMarkersInSpan(span) {
  if (!VOICE_MARKER_RE.test(span.textContent || '')) return;

  const textNodes = [];
  const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement && node.parentElement.classList.contains(RC_BAR_EXTEND_GLYPH_CLASS)) continue;
    if (node.parentElement && node.parentElement.matches(VOICE_PART_SELECTOR)) continue;
    textNodes.push(node);
  }
  textNodes.forEach(wrapVoiceMarkersInTextNode);
}

// male/female 等の子要素を壊さないよう、テキストノード内の | だけをラップする
function wrapAllPipesInLyricSpan(span) {
  if (!span.textContent.includes('|')) return;

  const textNodes = [];
  const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement && node.parentElement.classList.contains(RC_BAR_EXTEND_GLYPH_CLASS)) {
      continue;
    }
    textNodes.push(node);
  }

  let wrapped = false;
  textNodes.forEach((textNode) => {
    if (!textNode.isConnected) return;
    if (wrapPipesInTextNode(textNode)) wrapped = true;
  });
  if (wrapped) span.classList.add(RC_BAR_EXTEND_CLASS);
  restoreVoiceMarkersInSpan(span);
}

// 歌詞内のすべての | を延伸用グリフ化（wordtop 結合後の埋め込み | も含む）
function markLyricBarExtendSpans(enabled) {
  clearLyricBarExtendMarks();
  if (enabled) {
    document.querySelectorAll(LYRICS_SPAN_SELECTOR).forEach((span) => {
      if (span.textContent.includes('|')) wrapAllPipesInLyricSpan(span);
      else restoreVoiceMarkersInSpan(span);
    });
    ensureBarExtendSnapListeners();
    scheduleSnapLyricBarExtendGlyphs();
  }
}

// 譜面全体の声部記号を ChordWiki 形式の別要素に戻す（延伸の有無に依存しない）
function restoreAllVoiceMarkers() {
  document.querySelectorAll(LYRICS_SPAN_SELECTOR).forEach(restoreVoiceMarkersInSpan);
}

// 行頭の wordtop| + word| など連続小節線を 1 つの wordtop にまとめる
function consolidateLineStartBars(p) {
  let first = p.firstElementChild;
  while (first && first.nodeType === Node.TEXT_NODE && !cleanText(first.textContent)) {
    first = first.nextElementSibling;
  }
  if (!first || first.tagName !== 'SPAN' || !isBarOnlyLyricsSpan(first)) return;

  first.textContent = '| ';
  if (first.classList.contains('word')) {
    first.classList.add('wordtop');
    first.classList.remove('word');
  }

  let next = first.nextElementSibling;
  while (next) {
    if (next.nodeType === Node.TEXT_NODE && !cleanText(next.textContent)) {
      next = next.nextElementSibling;
      continue;
    }
    if (next.nodeType !== Node.ELEMENT_NODE || next.tagName !== 'SPAN') break;
    if (!isBarOnlyLyricsSpan(next)) break;
    next.remove();
    next = first.nextElementSibling;
  }
}

// chord spanの|処理
function processChordBarsAndWordtops(options = {}) {
  const moveBarToLyrics = options.moveBarToLyrics === true;
  const moveOverflowLyrics = options.moveOverflowLyrics === true;

  const chordSpans = filterChordSpans();
  chordSpans.forEach(span => {
    const text = span.textContent.trim();

    // ->≧=≫ のいずれかのみで構成され、かつコード名として認識されない場合は極小フォント
    if (/^[\-≧=≫>!]+$/.test(text) && !chordAllowed.test(text)) {
      span.style.setProperty('font-size', SMALL_FONT_SIZE + 'px', 'important');
      span.style.setProperty('vertical-align', SMALL_FONT_VALIGN + 'px', 'important');
    }
  });

  if (moveBarToLyrics) {
    filterChordSpans().forEach(span => {
      if (moveOrRemoveBracketBarSpan(span, { moveBarToLyrics: true })) return;

      const text = span.textContent.trim();
      const norm = normalizeBarText(text);
      // | E / [| E] 等を丸ごと | にしない
      if (isPipeBarCodeText(norm)) return;

      if (
        span.classList.contains('chord') &&
        norm.includes('|') &&
        span.getAttribute('onclick') && span.getAttribute('onclick').includes('|')
      ) {
        const parent = span.parentNode;
        const isFirstChild = parent && parent.firstElementChild === span;
        const lyricSpan = document.createElement('span');
        lyricSpan.className = isFirstChild ? 'wordtop' : 'word';
        lyricSpan.textContent = isFirstChild ? '| ' : ' | ';
        span.replaceWith(lyricSpan);
      }
    });

    // 歌詞の行に移行された小節線のスペースを調整
    document.querySelectorAll(LYRICS_SPAN_SELECTOR).forEach(element => {
      const text = element.textContent.trim();
      if (text === '|') {
        const prev = element.previousElementSibling;
        if (prev && prev.classList.contains('wordtop')) {
          prev.appendChild(document.createTextNode('| '));
          element.remove();
        } else {
          const newSpan = document.createElement('span');
          newSpan.className = 'word';
          newSpan.appendChild(document.createTextNode(' |'));
          element.replaceWith(newSpan);
        }
      }
    });
    document.querySelectorAll(LINE_SELECTOR).forEach(consolidateLineStartBars);
  } else {
    splitPipeBarChordsOnChordLine();
    removeAllRedundantBarChords();
  }

  if (moveOverflowLyrics) {
    moveOverflowWordtops();
  }
}

function replaceCharMain(adjustChordPos = true, mnotoEnabled = true, domOptions = {}) {
  const moveBarToLyrics = domOptions.moveBarToLyrics === true;
  const moveOverflowLyrics = domOptions.moveOverflowLyrics !== false;
  const extendBarUpward = moveBarToLyrics && domOptions.extendBarUpward === true;

  removeEmptyWordtopSpans();
  processChordBarsAndWordtops({ moveBarToLyrics, moveOverflowLyrics });
  if (mnotoEnabled) replaceMNotoSansText();
  setFirstSpanToWordtop();
  document.querySelectorAll(LINE_SELECTOR).forEach(consolidateLineStartBars);
  replaceMajToM();
  if (adjustChordPos) adjustWordLeftToChord();
  if (!moveBarToLyrics) markChordLineBarSpans();
  markLyricBarExtendSpans(extendBarUpward);
  restoreAllVoiceMarkers();
}

const DOM_OPTION_KEYS = [
  'moveBarToLyricsEnabled',
  'moveOverflowLyricsEnabled',
  'extendBarUpwardEnabled'
];

function normalizeDomOptions(data) {
  return {
    moveBarToLyrics: data.moveBarToLyricsEnabled !== false,
    moveOverflowLyrics: data.moveOverflowLyricsEnabled !== false,
    extendBarUpward: data.extendBarUpwardEnabled === true
  };
}

function isDomOptionStorageChange(changes) {
  return DOM_OPTION_KEYS.some((k) => changes[k]);
}

function runReplaceCharDom(adjustChordPos, mnotoEnabled, domOptions) {
  loadSmallFontSettings(() => {
    replaceCharMain(
      adjustChordPos !== false,
      mnotoEnabled !== false,
      domOptions || {}
    );
    window.RCLayout?.notifyReady?.();
  });
}

function loadDomProcessingOptions(callback) {
  chrome.storage.sync.get(DOM_OPTION_KEYS, (data) => {
    callback(normalizeDomOptions(data));
  });
}

function onExtensionEnabled(adjustChordPos, mnotoEnabled) {
  window.RCLayout.loadLayoutSettings((layout) => {
    window.RCLayout.applyReplaceCharStyles({ ...layout, mnotoEnabled: mnotoEnabled !== false });
    syncInlineVideoPlaybackFromStorage();
    loadDomProcessingOptions((domOptions) => {
      runReplaceCharDom(adjustChordPos, mnotoEnabled, domOptions);
    });
  });
}

function onExtensionDisabled() {
  disableInlineVideoPlayback();
  window.RCLayout.removeReplaceCharStyles();
  location.reload();
}

chrome.storage.sync.get(['enabled', 'adjustChordPos', 'mnotoEnabled'], ({ enabled, adjustChordPos, mnotoEnabled }) => {
  if (enabled !== false) {
    onExtensionEnabled(adjustChordPos, mnotoEnabled);
  }
});

if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;

    if (changes.enabled) {
      if (changes.enabled.newValue !== false) {
        chrome.storage.sync.get(['adjustChordPos', 'mnotoEnabled'], ({ adjustChordPos, mnotoEnabled }) => {
          onExtensionEnabled(adjustChordPos, mnotoEnabled);
        });
      } else {
        onExtensionDisabled();
      }
      return;
    }

    if (window.RCLayout.isLayoutStorageChange(changes)) {
      window.RCLayout.loadLayoutSettings((layout) => {
        chrome.storage.sync.get(['mnotoEnabled'], ({ mnotoEnabled }) => {
          window.RCLayout.applyReplaceCharStyles({ ...layout, mnotoEnabled: mnotoEnabled !== false });
          window.RCLayout.notifyReady();
        });
      });
      return;
    }

    if (changes.smallFontSize || changes.smallFontValign) {
      chrome.storage.sync.get(['adjustChordPos', 'mnotoEnabled'], ({ adjustChordPos, mnotoEnabled }) => {
        loadDomProcessingOptions((domOptions) => {
          runReplaceCharDom(adjustChordPos, mnotoEnabled, domOptions);
        });
      });
      return;
    }

    if (changes[INLINE_VIDEO_STORAGE_KEY]) {
      if (changes[INLINE_VIDEO_STORAGE_KEY].newValue === false) {
        disableInlineVideoPlayback();
      } else {
        initInlineYouTubePlayer();
      }
      return;
    }

    if (changes.adjustChordPos || changes.mnotoEnabled || isDomOptionStorageChange(changes)) {
      if (isDomOptionStorageChange(changes)) {
        if (chrome.tabs) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) chrome.tabs.reload(tabs[0].id);
          });
        }
        return;
      }
      chrome.storage.sync.get(['adjustChordPos', 'mnotoEnabled'], ({ adjustChordPos, mnotoEnabled }) => {
        window.RCLayout.loadLayoutSettings((layout) => {
          window.RCLayout.applyReplaceCharStyles({ ...layout, mnotoEnabled: mnotoEnabled !== false });
        });
        loadDomProcessingOptions((domOptions) => {
          runReplaceCharDom(adjustChordPos, mnotoEnabled, domOptions);
        });
      });
    }
  });
}
