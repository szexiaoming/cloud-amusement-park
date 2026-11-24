/**
 * The district card ("cozy journal / notice board") shown when a district is
 * clicked. Content is data-driven from DISTRICTS in config.js.
 */
export function createMemoryCard() {
  const root = document.getElementById('memory-card');

  const closeBtn = document.createElement('button');
  closeBtn.className = 'mc-close';
  closeBtn.type = 'button';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', '关闭');

  const head = document.createElement('div');
  head.className = 'mc-head';
  const letter = document.createElement('span');
  letter.className = 'mc-letter';
  const titles = document.createElement('div');
  titles.className = 'mc-titles';
  const name = document.createElement('h2');
  name.className = 'mc-name';
  const english = document.createElement('div');
  english.className = 'mc-english';
  titles.append(name, english);
  head.append(letter, titles);

  const theme = document.createElement('div');
  theme.className = 'mc-theme';

  const tags = document.createElement('div');
  tags.className = 'mc-tags';

  const story = document.createElement('p');
  story.className = 'mc-story';

  const projects = document.createElement('div');
  projects.className = 'mc-projects';

  const note = document.createElement('div');
  note.className = 'mc-note';

  root.append(closeBtn, head, theme, tags, story, projects, note);

  let current = null;

  const clear = (el) => {
    while (el.firstChild) el.removeChild(el.firstChild);
  };

  function chip(text, cls) {
    const s = document.createElement('span');
    s.className = cls;
    s.textContent = text;
    return s;
  }

  function renderProjects(list) {
    clear(projects);
    if (!list || !list.length) {
      projects.style.display = 'none';
      return;
    }
    projects.style.display = 'block';
    for (const p of list) {
      const card = document.createElement('div');
      card.className = 'mc-project';

      if (p.title) {
        const title = document.createElement('div');
        title.className = 'mc-proj-title';
        title.textContent = p.title;
        card.append(title);
      }
      if (p.summary) {
        const sum = document.createElement('div');
        sum.className = 'mc-proj-summary';
        sum.textContent = p.summary;
        card.append(sum);
      }
      if (p.stack && p.stack.length) {
        const stack = document.createElement('div');
        stack.className = 'mc-stack';
        for (const s of p.stack) stack.append(chip(s, 'mc-chip'));
        card.append(stack);
      }
      if (p.links && p.links.length) {
        const links = document.createElement('div');
        links.className = 'mc-links';
        for (const l of p.links) {
          const a = document.createElement('a');
          a.href = l.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = l.label || '查看';
          links.append(a);
        }
        card.append(links);
      }
      projects.append(card);
    }
  }

  function open(place) {
    current = place;
    letter.textContent = place.letter || '';
    name.textContent = place.name || '';
    english.textContent = place.englishName || '';
    theme.textContent = place.theme || '';
    story.textContent = place.story || '';

    clear(tags);
    for (const t of place.tags || []) tags.append(chip(t, 'mc-tag'));

    renderProjects(place.projects);

    if (place.note) {
      note.textContent = place.note;
      note.style.display = 'block';
    } else {
      note.style.display = 'none';
    }
    story.style.display = place.story ? 'block' : 'none';
    theme.style.display = place.theme ? 'block' : 'none';
    tags.style.display = place.tags && place.tags.length ? 'flex' : 'none';

    root.classList.add('open');
    root.setAttribute('aria-hidden', 'false');
    root.scrollTop = 0;
  }

  function close() {
    current = null;
    root.classList.remove('open');
    root.setAttribute('aria-hidden', 'true');
  }

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  return { open, close, isOpen: () => !!current };
}
