document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggle-switch');
  const fontSizeInput = document.getElementById('small-font-size');
  const valignInput = document.getElementById('small-font-valign');
  const adjustSwitch = document.getElementById('adjust-chordpos-switch');
  const mnotoSwitch = document.getElementById('mnoto-switch');
  const moveOverflowSwitch = document.getElementById('move-overflow-switch');
  const moveBarSwitch = document.getElementById('move-bar-switch');
  const extendBarSwitch = document.getElementById('extend-bar-switch');
  const labelExtendBar = document.getElementById('label-extend-bar-main');
  const alignMeasureSwitch = document.getElementById('align-measure-switch');
  const labelAlignMeasure = document.getElementById('label-align-measure-main');
  const inlineVideoSwitch = document.getElementById('inline-video-switch');

  const chordValignSwitch = document.getElementById('chord-valign-switch');
  const chordValignRem = document.getElementById('chord-valign-rem');
  const lineSpacingSwitch = document.getElementById('line-spacing-switch');
  const linePaddingTopRem = document.getElementById('line-padding-top-rem');
  const commentLayoutSwitch = document.getElementById('comment-layout-switch');
  const commentPaddingTopRem = document.getElementById('comment-padding-top-rem');
  const blankLineSwitch = document.getElementById('blank-line-switch');
  const blankLineHeightRem = document.getElementById('blank-line-height-rem');

  const chordColorSwitch = document.getElementById('chord-color-switch');
  const chordColor = document.getElementById('chord-color');

  const commentStyleSwitch = document.getElementById('comment-style-switch');
  const commentStrongColor = document.getElementById('comment-strong-color');
  const commentStrongBg = document.getElementById('comment-strong-bg');
  const commentStrongFontRem = document.getElementById('comment-strong-font-rem');

  const keyStyleSwitch = document.getElementById('key-style-switch');
  const keyColor = document.getElementById('key-color');
  const keyBgColor = document.getElementById('key-bg-color');
  const keyFontRem = document.getElementById('key-font-rem');

  const subControls = [
    adjustSwitch, mnotoSwitch,
    moveOverflowSwitch, moveBarSwitch, extendBarSwitch, alignMeasureSwitch, inlineVideoSwitch,
    chordValignSwitch, chordValignRem, lineSpacingSwitch, linePaddingTopRem,
    commentLayoutSwitch, commentPaddingTopRem, blankLineSwitch, blankLineHeightRem,
    chordColorSwitch, chordColor,
    commentStyleSwitch, commentStrongColor, commentStrongBg, commentStrongFontRem,
    keyStyleSwitch, keyColor, keyBgColor, keyFontRem,
    fontSizeInput, valignInput
  ];

  const disableTargets = [
    document.querySelector('.subgroup'),
    ...document.querySelectorAll('.section-title'),
    ...document.querySelectorAll('.setting-row')
  ].filter(Boolean);

  const storageKeys = [
    'enabled', 'adjustChordPos', 'mnotoEnabled',
    'moveOverflowLyricsEnabled', 'moveBarToLyricsEnabled', 'extendBarUpwardEnabled', 'alignMeasureBarsEnabled',
    'inlineVideoEnabled',
    'chordValignEnabled', 'chordValignRem',
    'lineSpacingEnabled', 'linePaddingTopRem',
    'commentLayoutEnabled', 'commentPaddingTopRem',
    'chordColorEnabled', 'chordColor',
    'commentStyleEnabled', 'commentStrongColor', 'commentStrongBg', 'commentStrongFontRem',
    'keyStyleEnabled', 'keyColor', 'keyBgColor', 'keyFontRem',
    'blankLineEnabled', 'blankLineHeightRem',
    'smallFontSize', 'smallFontValign'
  ];

  chrome.storage.sync.get(storageKeys, (data) => {
    toggle.checked = data.enabled !== false;
    adjustSwitch.checked = data.adjustChordPos !== false;
    mnotoSwitch.checked = data.mnotoEnabled !== false;
    moveOverflowSwitch.checked = data.moveOverflowLyricsEnabled !== false;
    moveBarSwitch.checked = data.moveBarToLyricsEnabled !== false;
    extendBarSwitch.checked = data.extendBarUpwardEnabled === true;
    alignMeasureSwitch.checked = data.alignMeasureBarsEnabled === true;
    inlineVideoSwitch.checked = data.inlineVideoEnabled !== false;
    chordValignSwitch.checked = data.chordValignEnabled !== false;
    lineSpacingSwitch.checked = data.lineSpacingEnabled !== false;
    commentLayoutSwitch.checked = data.commentLayoutEnabled !== false;
    blankLineSwitch.checked = data.blankLineEnabled !== false;
    chordColorSwitch.checked = data.chordColorEnabled !== false;
    commentStyleSwitch.checked = data.commentStyleEnabled !== false;
    keyStyleSwitch.checked = data.keyStyleEnabled !== false;

    if (data.chordValignRem !== undefined) chordValignRem.value = data.chordValignRem;
    if (data.linePaddingTopRem !== undefined) linePaddingTopRem.value = data.linePaddingTopRem;
    if (data.commentPaddingTopRem !== undefined) commentPaddingTopRem.value = data.commentPaddingTopRem;
    if (data.blankLineHeightRem !== undefined) blankLineHeightRem.value = data.blankLineHeightRem;
    if (data.chordColor) chordColor.value = data.chordColor;
    if (data.commentStrongColor) commentStrongColor.value = data.commentStrongColor;
    if (data.commentStrongBg) commentStrongBg.value = data.commentStrongBg;
    if (data.commentStrongFontRem !== undefined) commentStrongFontRem.value = data.commentStrongFontRem;
    if (data.keyColor) keyColor.value = data.keyColor;
    if (data.keyBgColor) keyBgColor.value = data.keyBgColor;
    if (data.keyFontRem !== undefined) keyFontRem.value = data.keyFontRem;
    if (data.smallFontSize !== undefined) fontSizeInput.value = data.smallFontSize;
    if (data.smallFontValign !== undefined) valignInput.value = data.smallFontValign;

    setSubControlsEnabled(toggle.checked);
  });

  toggle.addEventListener('change', () => {
    chrome.storage.sync.set({ enabled: toggle.checked });
    setSubControlsEnabled(toggle.checked);
  });

  adjustSwitch.addEventListener('change', () => {
    chrome.storage.sync.set({ adjustChordPos: adjustSwitch.checked }, reloadActiveTab);
  });

  mnotoSwitch.addEventListener('change', () => {
    chrome.storage.sync.set({ mnotoEnabled: mnotoSwitch.checked }, reloadActiveTab);
  });

  moveOverflowSwitch.addEventListener('change', () => {
    chrome.storage.sync.set({ moveOverflowLyricsEnabled: moveOverflowSwitch.checked }, reloadActiveTab);
  });

  moveBarSwitch.addEventListener('change', () => {
    chrome.storage.sync.set({ moveBarToLyricsEnabled: moveBarSwitch.checked }, reloadActiveTab);
    syncMoveBarChildAvailability();
  });

  extendBarSwitch.addEventListener('change', () => {
    chrome.storage.sync.set({ extendBarUpwardEnabled: extendBarSwitch.checked }, reloadActiveTab);
  });

  alignMeasureSwitch.addEventListener('change', () => {
    chrome.storage.sync.set({ alignMeasureBarsEnabled: alignMeasureSwitch.checked }, reloadActiveTab);
  });

  inlineVideoSwitch.addEventListener('change', () => {
    chrome.storage.sync.set({ inlineVideoEnabled: inlineVideoSwitch.checked });
  });

  chordValignSwitch.addEventListener('change', () => {
    chrome.storage.sync.set({ chordValignEnabled: chordValignSwitch.checked });
  });
  bindRemInput(chordValignRem, 'chordValignRem');

  lineSpacingSwitch.addEventListener('change', () => {
    chrome.storage.sync.set({ lineSpacingEnabled: lineSpacingSwitch.checked });
  });
  bindRemInput(linePaddingTopRem, 'linePaddingTopRem');

  commentLayoutSwitch.addEventListener('change', () => {
    chrome.storage.sync.set({ commentLayoutEnabled: commentLayoutSwitch.checked });
  });
  bindRemInput(commentPaddingTopRem, 'commentPaddingTopRem');

  blankLineSwitch.addEventListener('change', () => {
    chrome.storage.sync.set({ blankLineEnabled: blankLineSwitch.checked });
  });
  bindRemInput(blankLineHeightRem, 'blankLineHeightRem');

  chordColorSwitch.addEventListener('change', () => {
    chrome.storage.sync.set({ chordColorEnabled: chordColorSwitch.checked });
  });
  bindColorInput(chordColor, 'chordColor');

  commentStyleSwitch.addEventListener('change', () => {
    chrome.storage.sync.set({ commentStyleEnabled: commentStyleSwitch.checked });
  });
  bindColorInput(commentStrongColor, 'commentStrongColor');
  bindColorInput(commentStrongBg, 'commentStrongBg');
  bindRemInput(commentStrongFontRem, 'commentStrongFontRem');

  keyStyleSwitch.addEventListener('change', () => {
    chrome.storage.sync.set({ keyStyleEnabled: keyStyleSwitch.checked });
  });
  bindColorInput(keyColor, 'keyColor');
  bindColorInput(keyBgColor, 'keyBgColor');
  bindRemInput(keyFontRem, 'keyFontRem');

  fontSizeInput.addEventListener('change', () => {
    chrome.storage.sync.set({ smallFontSize: fontSizeInput.value });
  });
  valignInput.addEventListener('change', () => {
    chrome.storage.sync.set({ smallFontValign: valignInput.value });
  });

  function bindRemInput(el, key) {
    const save = () => chrome.storage.sync.set({ [key]: parseFloat(el.value) });
    el.addEventListener('change', save);
    el.addEventListener('input', save);
  }

  function bindColorInput(el, key) {
    const save = () => chrome.storage.sync.set({ [key]: el.value });
    el.addEventListener('change', save);
    el.addEventListener('input', save);
  }

  function syncMoveBarChildAvailability() {
    const available = toggle.checked && moveBarSwitch.checked;
    extendBarSwitch.disabled = !available;
    alignMeasureSwitch.disabled = !available;
    if (labelExtendBar) labelExtendBar.classList.toggle('disabled-label', !available);
    if (labelAlignMeasure) labelAlignMeasure.classList.toggle('disabled-label', !available);
  }

  function setSubControlsEnabled(enabled) {
    subControls.forEach((el) => { el.disabled = !enabled; });
    disableTargets.forEach((el) => el.classList.toggle('disabled-label', !enabled));
    syncMoveBarChildAvailability();
  }

  function reloadActiveTab() {
    if (!chrome.tabs) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) chrome.tabs.reload(tabs[0].id);
    });
  }

  function fitPopupHeight() {
    const root = document.documentElement;
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    const height = Math.ceil(root.scrollHeight);
    root.style.height = `${height}px`;
    document.body.style.height = `${height}px`;
  }
  fitPopupHeight();
  requestAnimationFrame(fitPopupHeight);
});
