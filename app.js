// ── State ────────────────────────────────────────────────────
const state = {
  activeLessonId: null,
  activeTab:      'vocab',
  activeVocabCat: null,
  flashcard: {
    direction:   'zh-en',
    index:       0,
    flipped:     false,
    reviewQueue: [],
    pass:        1,
    done:        false,
  },
};

function setState(updates) {
  Object.assign(state, updates);
}

// ── Router ────────────────────────────────────────────────────
function parseHash() {
  const hash = location.hash.slice(1);
  if (!hash) return { id: null, tab: null };
  const [id, tab] = hash.split('/');
  return { id: id || null, tab: tab || null };
}

function navigate(id, tab) {
  location.hash = id ? `${id}/${tab || state.activeTab || 'vocab'}` : '';
}

function handleRouteChange() {
  const { id, tab } = parseHash();
  const lessonChanged = id !== state.activeLessonId;

  if (lessonChanged) {
    setState({
      activeLessonId: id,
      activeVocabCat: null,
      flashcard: { direction: 'zh-en', index: 0, flipped: false, reviewQueue: [], pass: 1, done: false },
    });
    document.body.classList.toggle('lesson-open', !!id);
  }

  if (tab && tab !== state.activeTab) {
    setState({ activeTab: tab });
    if (tab === 'flashcards' && !lessonChanged) {
      setState({ flashcard: { ...state.flashcard, index: 0, flipped: false, reviewQueue: [], pass: 1, done: false } });
    }
  }

  render();
}

// ── DOM helpers ───────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls)  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function chevronEl() {
  const NS  = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const poly = document.createElementNS(NS, 'polyline');
  poly.setAttribute('points', '6 9 12 15 18 9');
  svg.appendChild(poly);
  const span = el('span', 'cant-chevron');
  span.appendChild(svg);
  return span;
}

function getLesson(id) {
  return LESSONS.find(l => l.id === id) || null;
}

// ── Lesson list ───────────────────────────────────────────────
function renderLessonList() {
  const nav = document.getElementById('lesson-list');
  nav.textContent = '';

  LESSONS.forEach(lesson => {
    const item = el('div', 'lesson-item' + (lesson.id === state.activeLessonId ? ' active' : ''));

    const top   = el('div', 'lesson-item-top');
    const badge = el('span', 'type-badge', lesson.type);
    const title = el('span', 'lesson-item-title', lesson.title);
    top.appendChild(badge);
    top.appendChild(title);

    const meta = el('div', 'lesson-item-meta');
    if (lesson.lessonNum) {
      meta.appendChild(el('span', '', 'L' + lesson.lessonNum));
    }
    if (lesson.wordCount) {
      meta.appendChild(el('span', '', lesson.wordCount + ' words'));
    }

    item.appendChild(top);
    item.appendChild(meta);
    item.addEventListener('click', () => navigate(lesson.id, state.activeTab));
    nav.appendChild(item);
  });
}

// ── Tab bar ───────────────────────────────────────────────────
const TABS = [
  { key: 'vocab',      label: 'Vocab'      },
  { key: 'flashcards', label: 'Flashcards' },
  { key: 'grammar',    label: 'Grammar'    },
  { key: 'discussion', label: 'Discussion' },
];

const TABS_MOBILE = [
  { key: 'vocab',      label: 'Vocab',   icon: '📖' },
  { key: 'flashcards', label: 'Cards',   icon: '🃏' },
  { key: 'grammar',    label: 'Grammar', icon: '📝' },
  { key: 'discussion', label: 'Discuss', icon: '💬' },
];

function renderTabBar(lesson) {
  const bar = document.getElementById('tab-bar');
  bar.textContent = '';
  TABS.forEach(tab => {
    const btn = el('button', 'tab-btn' + (tab.key === state.activeTab ? ' active' : ''), tab.label);
    btn.addEventListener('click', () => navigate(lesson.id, tab.key));
    bar.appendChild(btn);
  });

  const nav = document.getElementById('bottom-nav');
  nav.textContent = '';
  TABS_MOBILE.forEach(tab => {
    const btn = el('button', 'bottom-nav-btn' + (tab.key === state.activeTab ? ' active' : ''));
    const icon = el('span', 'bottom-nav-icon', tab.icon);
    const lbl  = el('span', '', tab.label);
    btn.appendChild(icon);
    btn.appendChild(lbl);
    btn.addEventListener('click', () => navigate(lesson.id, tab.key));
    nav.appendChild(btn);
  });
}

// ── Main header ───────────────────────────────────────────────
function renderMainHeader(lesson) {
  const header = document.getElementById('main-header');
  header.textContent = '';

  const back = el('button', 'back-btn', '←');
  back.addEventListener('click', () => {
    document.body.classList.remove('lesson-open');
    setState({ activeLessonId: null });
    location.hash = '';
    render();
  });

  const title = el('h1', 'main-lesson-title', lesson.title);
  header.appendChild(back);
  header.appendChild(title);
}

// ── Top-level render ──────────────────────────────────────────
function render() {
  renderLessonList();

  const lesson  = getLesson(state.activeLessonId);
  const content = document.getElementById('tab-content');
  const tabBar  = document.getElementById('tab-bar');

  if (!lesson) {
    content.textContent = '';
    content.appendChild(el('div', 'no-lesson', 'Select a lesson to begin'));
    tabBar.textContent = '';
    document.getElementById('main-header').textContent = '';
    document.getElementById('bottom-nav').textContent  = '';
    return;
  }

  renderMainHeader(lesson);
  renderTabBar(lesson);

  switch (state.activeTab) {
    case 'vocab':      renderVocab(lesson, content);      break;
    case 'flashcards': renderFlashcards(lesson, content);  break;
    case 'grammar':    renderGrammar(lesson, content);     break;
    case 'discussion': renderDiscussion(lesson, content);  break;
    default:           renderVocab(lesson, content);
  }
}

// ── Vocab tab ─────────────────────────────────────────────────
function renderVocab(lesson, container) {
  container.textContent = '';

  if (!lesson.vocabCategories || lesson.vocabCategories.length === 0) {
    container.appendChild(el('div', 'empty-state', 'No vocabulary for this lesson'));
    return;
  }

  if (!state.activeVocabCat || !lesson.vocabCategories.find(c => c.label === state.activeVocabCat)) {
    setState({ activeVocabCat: lesson.vocabCategories[0].label });
  }

  if (lesson.vocabCategories.length > 1) {
    const subtabBar = el('div', 'subtab-bar');
    lesson.vocabCategories.forEach(cat => {
      const btn = el('button', 'subtab-btn' + (cat.label === state.activeVocabCat ? ' active' : ''), cat.label);
      btn.addEventListener('click', () => {
        setState({ activeVocabCat: cat.label });
        renderVocab(lesson, container);
      });
      subtabBar.appendChild(btn);
    });
    container.appendChild(subtabBar);
  }

  const activeCat = lesson.vocabCategories.find(c => c.label === state.activeVocabCat);
  if (!activeCat) return;

  const list = el('div', 'card-list');
  activeCat.words.forEach(word => list.appendChild(buildVocabCard(word)));
  container.appendChild(list);
}

function buildVocabCard(word) {
  const card = el('div', 'expandable-card');
  const body = el('div', 'expandable-card-body');

  body.appendChild(el('div', 'vc-hanzi',   word.hanzi));
  body.appendChild(el('div', 'vc-pinyin',  word.pinyin));
  body.appendChild(el('div', 'vc-english', word.english));
  if (word.example)   body.appendChild(el('div', 'vc-example',    word.example));
  if (word.usageNote) body.appendChild(el('div', 'vc-usage-note', word.usageNote));
  card.appendChild(body);

  if (word.cantoneseChar) {
    const toggle  = el('div', 'cant-toggle-row');
    const left    = el('span', 'cant-toggle-label', 'Cantonese Notes');
    const chevron = chevronEl();
    toggle.appendChild(left);
    toggle.appendChild(chevron);
    card.appendChild(toggle);

    const content = el('div', 'cant-expand-content');
    content.appendChild(el('div', 'cant-char',     word.cantoneseChar));
    content.appendChild(el('div', 'cant-jyutping', word.jyutping));
    if (word.cantoneseExample) content.appendChild(el('div', 'cant-example', word.cantoneseExample));
    if (word.cantoneseNote)    content.appendChild(el('div', 'cant-note',    word.cantoneseNote));
    content.hidden = true;
    card.appendChild(content);

    toggle.addEventListener('click', () => {
      const open = content.hidden;
      content.hidden = !open;
      chevron.classList.toggle('open', open);
    });
  }

  return card;
}

// ── Flashcard tab ─────────────────────────────────────────────
function renderFlashcards(lesson, container) {
  container.textContent = '';

  const allWords = lesson.vocabCategories.flatMap(c => c.words);
  if (allWords.length === 0) {
    container.appendChild(el('div', 'empty-state', 'No vocabulary to practice'));
    return;
  }

  const fc   = state.flashcard;
  const deck = fc.pass === 1 ? allWords : fc.reviewQueue.map(i => allWords[i]);

  const wrap = el('div', 'flashcard-wrap');
  container.appendChild(wrap);

  // Controls
  const controls = el('div', 'fc-controls');
  const toggle   = el('div', 'fc-direction-toggle');

  ['zh-en', 'en-zh'].forEach(dir => {
    const btn = el('button', 'fc-dir-btn' + (fc.direction === dir ? ' active' : ''), dir === 'zh-en' ? 'Zh → En' : 'En → Zh');
    btn.addEventListener('click', () => {
      setState({ flashcard: { ...state.flashcard, direction: dir, index: 0, flipped: false } });
      renderFlashcards(lesson, container);
    });
    toggle.appendChild(btn);
  });

  const progressLabel = fc.done
    ? 'Complete!'
    : `${Math.min(fc.index + 1, deck.length)} / ${deck.length}${fc.pass === 2 ? ' (review)' : ''}`;

  controls.appendChild(toggle);
  controls.appendChild(el('span', 'fc-progress-text', progressLabel));
  wrap.appendChild(controls);

  // Progress bar
  const barWrap = el('div', 'fc-progress-bar');
  const fill    = el('div', 'fc-progress-fill');
  fill.style.width = fc.done ? '100%' : `${deck.length ? Math.round((fc.index / deck.length) * 100) : 0}%`;
  barWrap.appendChild(fill);
  wrap.appendChild(barWrap);

  // Done state
  if (fc.done) {
    const doneDiv     = el('div', 'fc-complete');
    const reviewCount = fc.reviewQueue.length;
    doneDiv.appendChild(el('h3', '', 'Session complete'));
    doneDiv.appendChild(el('p', '', reviewCount === 0
      ? 'Perfect — no cards to review!'
      : `${reviewCount} card${reviewCount > 1 ? 's' : ''} marked for review.`
    ));
    const restart = el('button', 'fc-restart-btn', 'Start over');
    restart.addEventListener('click', () => {
      setState({ flashcard: { direction: fc.direction, index: 0, flipped: false, reviewQueue: [], pass: 1, done: false } });
      renderFlashcards(lesson, container);
    });
    doneDiv.appendChild(restart);
    wrap.appendChild(doneDiv);
    return;
  }

  // Card
  const word = deck[fc.index];
  const card = el('div', 'fc-card');

  if (!fc.flipped) {
    // Prompt side
    if (fc.direction === 'zh-en') {
      card.appendChild(el('div', 'fc-card-main', word.hanzi));
      card.appendChild(el('div', 'fc-card-sub',  word.pinyin));
    } else {
      card.appendChild(el('div', 'fc-card-main', word.english));
    }
    card.appendChild(el('div', 'fc-card-hint', 'tap to reveal'));
    card.addEventListener('click', () => {
      setState({ flashcard: { ...state.flashcard, flipped: true } });
      renderFlashcards(lesson, container);
    });
  } else {
    // Answer side
    if (fc.direction === 'zh-en') {
      card.appendChild(el('div', 'fc-card-main', word.hanzi));
      card.appendChild(el('div', 'fc-answer',    word.english));
    } else {
      card.appendChild(el('div', 'fc-card-main', word.english));
      card.appendChild(el('div', 'fc-card-sub',  word.hanzi));
      card.appendChild(el('div', 'fc-card-sub',  word.pinyin));
    }
  }

  wrap.appendChild(card);

  // Got it / Review again (only when flipped)
  if (fc.flipped) {
    const wordIndex = fc.pass === 1 ? fc.index : fc.reviewQueue[fc.index];
    const buttons   = el('div', 'fc-buttons');

    const gotIt = el('button', 'fc-btn fc-btn-got',    'Got it ✓');
    const again = el('button', 'fc-btn fc-btn-review', 'Review again');

    gotIt.addEventListener('click', () => advanceFlashcard(lesson, container, wordIndex, true));
    again.addEventListener('click', () => advanceFlashcard(lesson, container, wordIndex, false));

    buttons.appendChild(gotIt);
    buttons.appendChild(again);
    wrap.appendChild(buttons);
  }
}

function advanceFlashcard(lesson, container, wordIndex, gotIt) {
  const fc       = state.flashcard;
  const allWords = lesson.vocabCategories.flatMap(c => c.words);
  const deck     = fc.pass === 1 ? allWords : fc.reviewQueue.map(i => allWords[i]);

  const newQueue = gotIt ? fc.reviewQueue : [...fc.reviewQueue, wordIndex];
  const newIndex = fc.index + 1;

  if (newIndex >= deck.length) {
    if (fc.pass === 1 && newQueue.length > 0) {
      setState({ flashcard: { ...fc, index: 0, flipped: false, reviewQueue: newQueue, pass: 2 } });
    } else {
      setState({ flashcard: { ...fc, reviewQueue: newQueue, done: true } });
    }
  } else {
    setState({ flashcard: { ...fc, index: newIndex, flipped: false, reviewQueue: newQueue } });
  }

  renderFlashcards(lesson, container);
}

// ── Grammar tab ───────────────────────────────────────────────
function renderGrammar(lesson, container) {
  container.textContent = '';

  if (!lesson.grammarPatterns || lesson.grammarPatterns.length === 0) {
    container.appendChild(el('div', 'empty-state', 'No grammar patterns for this lesson'));
    return;
  }

  const list = el('div', 'card-list');

  lesson.grammarPatterns.forEach(pat => {
    const BADGE_CLASS = { close: 'div-close', different: 'div-different', note: 'div-note' };
    const BADGE_LABEL = { close: '≈ close',   different: '≠ different',   note: '+ note'   };
    const badgeCls   = 'div-badge ' + (BADGE_CLASS[pat.divergence] || 'div-close');
    const badgeLabel = BADGE_LABEL[pat.divergence] || '≈ close';

    const card = el('div', 'expandable-card');
    const body = el('div', 'expandable-card-body');

    body.appendChild(el('div', 'gc-pattern', pat.pattern));
    body.appendChild(el('div', 'gc-type',    pat.typeLabel));
    if (pat.example) body.appendChild(el('div', 'gc-example', pat.example));
    card.appendChild(body);

    if (pat.cantonesePattern) {
      const toggle  = el('div', 'cant-toggle-row');
      const left    = el('span', 'cant-toggle-label', 'Cantonese Notes');
      const chevron = chevronEl();
      toggle.appendChild(left);
      toggle.appendChild(chevron);
      card.appendChild(toggle);

      const content = el('div', 'cant-expand-content');
      content.appendChild(el('span', badgeCls,        badgeLabel));
      content.appendChild(el('div', 'gc-pattern',    pat.cantonesePattern));
      content.appendChild(el('div', 'cant-jyutping', pat.cantoneseJyutping));
      if (pat.cantoneseNote)    content.appendChild(el('div', 'cant-note',    pat.cantoneseNote));
      if (pat.cantoneseExample) content.appendChild(el('div', 'cant-example', pat.cantoneseExample));
      content.hidden = true;
      card.appendChild(content);

      toggle.addEventListener('click', () => {
        const open = content.hidden;
        content.hidden = !open;
        chevron.classList.toggle('open', open);
      });
    }

    list.appendChild(card);
  });

  container.appendChild(list);
}

// ── Discussion tab ────────────────────────────────────────────
function renderDiscussion(lesson, container) {
  container.textContent = '';

  if (!lesson.discussionPrompts || lesson.discussionPrompts.length === 0) {
    container.appendChild(el('div', 'empty-state', 'No discussion prompts for this lesson'));
    return;
  }

  const list = el('div', 'discussion-list');

  lesson.discussionPrompts.forEach((prompt, i) => {
    const card = el('div', 'prompt-card');

    card.appendChild(el('div', 'prompt-num', `${i + 1}.`));
    card.appendChild(el('div', 'prompt-chinese', prompt.chinese));
    card.appendChild(el('div', 'prompt-english', prompt.english));

    const hasTags = (prompt.vocabTags && prompt.vocabTags.length > 0) || prompt.grammarTag;
    if (hasTags) {
      const tags = el('div', 'prompt-tags');
      (prompt.vocabTags || []).forEach(t => tags.appendChild(el('span', 'tag', t)));
      if (prompt.grammarTag) {
        tags.appendChild(el('span', 'tag tag-grammar', prompt.grammarTag));
      }
      card.appendChild(tags);
    }

    if (prompt.modelAnswer) {
      const details = document.createElement('details');
      details.className = 'prompt-answer';
      const summary = document.createElement('summary');
      summary.textContent = 'Model answer';
      const answerText = el('div', 'prompt-answer-text', prompt.modelAnswer);
      details.appendChild(summary);
      details.appendChild(answerText);
      card.appendChild(details);
    }

    list.appendChild(card);
  });

  container.appendChild(list);
}

// ── Init ──────────────────────────────────────────────────────
window.addEventListener('hashchange', handleRouteChange);
document.addEventListener('DOMContentLoaded', handleRouteChange);
