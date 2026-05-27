// コードとして成立するもの（m7-5, m9-5, D#m7-5 なども許可）
// 複数の括弧付きテンションにも対応
const chordAllowed = /^[A-G](#|b)?((?:m|M|maj|min|sus[0-9]*|add[0-9]*|dim|aug)*[0-9]*(?:-[0-9]+)?)(?:\([^)]+\)|\{[^}]+\})*(?:\/[A-G](#|b)?(?:\([^)]+\)|\{[^}]+\})*)?$/i;
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
    // 次の兄弟要素でspan.wordまたはspan.wordtopを探す
    let next = chord.nextElementSibling;
    while (next && !(next.classList && (next.classList.contains('word') || next.classList.contains('wordtop')))) {
      next = next.nextElementSibling;
  }
  if (!next) return;
  // テキストが空、または > と - のみ（複合・連続含む）、または1文字のみなら対象外
  const trimmed = next.textContent.trim();
  if (trimmed === '' || /^([>\-]+)$/.test(trimmed) || trimmed.length === 1) return;

  // span.chordのテキストがコード名の場合のみ調整
  if (!chordAllowed.test(chord.textContent.trim())) return;
    // 位置取得
    const chordLeft = chord.getBoundingClientRect().left;
    const wordLeft = next.getBoundingClientRect().left;
    const diff = wordLeft - chordLeft;
    // ずれが20px以上なら、diffの半分だけ近づける。ただし連続するchord間は1.5rem(24px)以上空ける
    if (diff > 20) {
      const minChordGap = 24; // 1.5rem=24px想定
      let allowShift = true;
      let nextChord = next.nextElementSibling;
      while (nextChord && !(nextChord.classList && nextChord.classList.contains('chord'))) {
        nextChord = nextChord.nextElementSibling;
      }
      if (nextChord) {
        const nextChordLeft = nextChord.getBoundingClientRect().left;
            const newWordLeft = wordLeft + (-diff * 0.75);
        if (nextChordLeft - newWordLeft < minChordGap) {
          allowShift = false;
        }
      }
      if (allowShift) {
            let shift = -diff * 0.75;
        if (Math.abs(shift) > 20) {
          shift = shift < 0 ? -16 : 16;
        }
        const currentMargin = parseFloat(window.getComputedStyle(next).marginLeft) || 0;
        next.style.marginLeft = (currentMargin + shift) + 'px';
      }
    }
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
  const lines = document.querySelectorAll('p.line');
  lines.forEach(p => {
    const firstLyrics = getLineStartLyricsSpan(p);
    if (!firstLyrics || firstLyrics.classList.contains('wordtop')) return;
    if (!firstLyrics.classList.contains('word')) return;
    firstLyrics.classList.add('wordtop');
    firstLyrics.classList.remove('word');
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

// 直前にセクション区切り（コメント行・Key 行など）があるか
function isSectionBoundaryBeforeLine(p) {
  let prev = p.previousElementSibling;
  while (prev) {
    if (prev.tagName === 'BR') {
      prev = prev.previousElementSibling;
      continue;
    }
    if (prev.matches && prev.matches('p.line.comment')) return true;
    if (prev.matches && prev.matches('p.key')) return true;
    if (prev.matches && prev.matches('p.line')) return false;
    prev = prev.previousElementSibling;
  }
  return false;
}

// 直前の歌詞行（p.line、comment 除く）の最後の .word / .wordtop（同一行内は見ない）
function findImmediatePreviousLineLastWord(span) {
  const p = span.closest('p.line');
  if (!p) return null;
  let prevP = p.previousElementSibling;
  while (prevP && (!prevP.matches('p.line') || prevP.matches('p.comment'))) {
    prevP = prevP.previousElementSibling;
  }
  if (!prevP) return null;
  const words = prevP.querySelectorAll('span.word, span.wordtop');
  return words.length > 0 ? words[words.length - 1] : null;
}

function filterChordSpans(root) {
  return Array.from((root || document).querySelectorAll('span.chord')).filter(span =>
    !span.querySelector('.male, .male2, .female, .female2')
  );
}

const RC_BAR_AS_LYRIC_CLASS = 'rc-bar-as-lyric';

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
    span.outerHTML = isFirstChild
      ? `<span class="wordtop">| </span>`
      : `<span class="word"> | </span>`;
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

// 直前行を探す際に、コメント行/Key 行を跨がない版
function findPreviousLineLastWordWithoutCrossingBoundary(p) {
  let prev = p.previousElementSibling;
  while (prev) {
    if (prev.tagName === 'BR') {
      prev = prev.previousElementSibling;
      continue;
    }
    if (prev.matches && (prev.matches('p.line.comment') || prev.matches('p.key'))) {
      return null;
    }
    if (prev.matches && prev.matches('p.line')) {
      const words = prev.querySelectorAll('span.word, span.wordtop');
      return words.length > 0 ? words[words.length - 1] : null;
    }
    prev = prev.previousElementSibling;
  }
  return null;
}

function appendOverflowToPreviousLine(prevWord, cleanedText) {
  const parentP = prevWord.closest('p');
  if (!parentP) return false;
  const overflowText = cleanedText.replace(/\|+\s*$/, '');
  let addText = ' ' + overflowText + ' | ';
  const lastElem = parentP.lastElementChild;
  if (lastElem && lastElem.textContent && /\|\s*$/.test(lastElem.textContent)) {
    addText = ' ' + overflowText + ' |';
    lastElem.textContent = lastElem.textContent.replace(/\|\s*$/, '');
  }
  // テキストノードで追加すると後段の trailing overflow 回収で再移動しやすいため、
  // 歌詞 span として固定して連鎖移動を防ぐ。
  const moved = document.createElement('span');
  moved.className = 'word';
  moved.setAttribute('data-rc-overflow-moved', '1');
  moved.textContent = addText;
  parentP.appendChild(moved);
  return true;
}

function reduceLyricsSpanToBarWordtop(lyricsSpan) {
  while (lyricsSpan.firstChild) lyricsSpan.removeChild(lyricsSpan.firstChild);
  lyricsSpan.appendChild(document.createTextNode('| '));
  if (lyricsSpan.classList.contains('word')) {
    lyricsSpan.classList.add('wordtop');
    lyricsSpan.classList.remove('word');
  }
}

function isBarOnlyLyricsSpan(span) {
  if (!isLyricsSpan(span)) return false;
  return cleanText(span.textContent) === '|';
}

function lineHasLeadingBar(p) {
  for (const child of p.children) {
    if (child.tagName !== 'SPAN') continue;
    if (isBarOnlyLyricsSpan(child)) return true;
    if (child.classList.contains('chord') && parseBarChordParts(child.textContent.trim())) {
      return true;
    }
    return false;
  }
  return false;
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

function ensureLineStartBarWordtop(p) {
  consolidateLineStartBars(p);
  if (lineHasLeadingBar(p)) return;
  const bar = document.createElement('span');
  bar.className = 'wordtop';
  bar.textContent = '| ';
  p.insertBefore(bar, p.firstChild);
}

function findFirstBarElement(p) {
  for (const child of p.children) {
    if (child.tagName !== 'SPAN') continue;
    if (child.classList.contains('wordtop') && cleanText(child.textContent).startsWith('|')) {
      return child;
    }
    if (child.classList.contains('chord') && parseBarChordParts(child.textContent.trim())) {
      return child;
    }
    if (child.classList.contains('word')) {
      const t = cleanText(child.textContent);
      if (t === '|' || t.startsWith('|')) return child;
    }
  }
  return null;
}

// 行頭に小節線より前のはみ出し歌詞（例: Take it）がある場合、前行へ移す
function processLineStartStrayLyrics(p) {
  if (isSectionBoundaryBeforeLine(p)) return;

  const start = getLineStartLyricsSpan(p);
  const firstBar = findFirstBarElement(p);
  if (!start || !firstBar) return;
  const order = Array.from(p.children).filter((c) => c.tagName === 'SPAN');
  if (order.indexOf(start) >= order.indexOf(firstBar)) return;

  const cleaned = cleanText(start.textContent);
  if (!cleaned || cleaned.startsWith('|')) return;

  if (isOverflowLyricsText(cleaned)) {
    moveOverflowFromLyricsSpan(start);
    return;
  }

  const prevWord = findImmediatePreviousLineLastWord(start);
  if (!prevWord) return;
  const withBar = cleaned.endsWith('|') ? cleaned : `${cleaned} |`;
  if (!appendOverflowToPreviousLine(prevWord, withBar)) return;
  start.remove();
}

function isLineStartBeforeBar(lyricsSpan) {
  const p = lyricsSpan.closest('p.line');
  if (!p) return false;
  const firstBar = findFirstBarElement(p);
  if (!firstBar) return getLineStartLyricsSpan(p) === lyricsSpan;
  const order = Array.from(p.children).filter((c) => c.tagName === 'SPAN');
  const spanIdx = order.indexOf(lyricsSpan);
  const barIdx = order.indexOf(firstBar);
  return spanIdx >= 0 && barIdx >= 0 && spanIdx < barIdx;
}

function moveOverflowFromLyricsSpan(lyricsSpan) {
  const cleanedText = cleanText(lyricsSpan.textContent);
  if (cleanedText === '|') {
    lyricsSpan.textContent = '| ';
    return;
  }
  if (!isOverflowLyricsText(cleanedText)) return;
  if (!isLineStartBeforeBar(lyricsSpan)) return;
  const line = lyricsSpan.closest('p.line');
  if (line && isSectionBoundaryBeforeLine(line)) return;
  const prevWord = findImmediatePreviousLineLastWord(lyricsSpan);
  if (!prevWord || !appendOverflowToPreviousLine(prevWord, cleanedText)) return;
  reduceLyricsSpanToBarWordtop(lyricsSpan);
}

function collectOverflowLyricsTargets() {
  const seen = new Set();
  const targets = [];
  const add = (span) => {
    if (!isLyricsSpan(span) || seen.has(span)) return;
    seen.add(span);
    targets.push(span);
  };
  document.querySelectorAll('span.wordtop').forEach(add);
  document.querySelectorAll('p.line').forEach((p) => {
    add(getLineStartLyricsSpan(p));
  });
  return targets;
}

// 行末テキストノード（例: " Take it  |"）を前行へ移動
function processParagraphTrailingOverflow(p) {
  const nodes = Array.from(p.childNodes);
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (node.nodeType !== Node.TEXT_NODE) break;
    const cleaned = cleanText(node.textContent);
    if (!cleaned) {
      node.remove();
      continue;
    }
    if (cleaned === '|') {
      node.remove();
      ensureLineStartBarWordtop(p);
      break;
    }
    if (!isOverflowLyricsText(cleaned)) break;
    const prevWord = findPreviousLineLastWordWithoutCrossingBoundary(p);
    if (prevWord && appendOverflowToPreviousLine(prevWord, cleaned)) {
      node.remove();
      ensureLineStartBarWordtop(p);
    }
    break;
  }
}

// chord spanの|処理
function processChordBarsAndWordtops(options = {}) {
  const moveBarToLyrics = options.moveBarToLyrics === true;

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
        if (isFirstChild) {
          span.outerHTML = `<span class="wordtop">| </span>`;
        } else {
          span.outerHTML = `<span class="word"> | </span>`;
        }
      }
    });

    // 歌詞の行に移行された小節線のスペースを調整
    document.querySelectorAll('span.word, span.wordtop').forEach(element => {
      const text = element.textContent.trim();
      if (text === '|') {
        const prev = element.previousElementSibling;
        if (prev && prev.classList.contains('wordtop')) {
          element.remove();
        } else {
          const newSpan = document.createElement('span');
          newSpan.className = 'word';
          newSpan.appendChild(document.createTextNode(' |'));
          element.replaceWith(newSpan);
        }
      }
    });
    document.querySelectorAll('p.line').forEach(consolidateLineStartBars);
  } else {
    splitPipeBarChordsOnChordLine();
    removeAllRedundantBarChords();
  }
}

function replaceCharMain(adjustChordPos = true, mnotoEnabled = true, domOptions = {}) {
  const moveBarToLyrics = domOptions.moveBarToLyrics === true;
  const moveOverflowLyrics = domOptions.moveOverflowLyrics !== false;

  removeEmptyWordtopSpans();
  if (moveOverflowLyrics) {
    document.querySelectorAll('p.line').forEach(processLineStartStrayLyrics);
  }
  processChordBarsAndWordtops({ moveBarToLyrics });
  if (mnotoEnabled) replaceMNotoSansText();
  if (moveOverflowLyrics) {
    collectOverflowLyricsTargets().forEach(moveOverflowFromLyricsSpan);
    document.querySelectorAll('p.line').forEach(processParagraphTrailingOverflow);
  }
  setFirstSpanToWordtop();
  document.querySelectorAll('p.line').forEach(consolidateLineStartBars);
  replaceMajToM();
  if (adjustChordPos) adjustWordLeftToChord();
  if (!moveBarToLyrics) markChordLineBarSpans();
}

const DOM_OPTION_KEYS = [
  'moveBarToLyricsEnabled',
  'moveOverflowLyricsEnabled'
];

function normalizeDomOptions(data) {
  return {
    moveBarToLyrics: data.moveBarToLyricsEnabled !== false,
    moveOverflowLyrics: data.moveOverflowLyricsEnabled !== false
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
    loadDomProcessingOptions((domOptions) => {
      runReplaceCharDom(adjustChordPos, mnotoEnabled, domOptions);
    });
  });
}

function onExtensionDisabled() {
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
