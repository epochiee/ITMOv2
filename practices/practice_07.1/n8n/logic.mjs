export function reviewEvent(event) {
  if (event.action === 'opened' && event.pull_request)
    return { pr: event.pull_request, mode: 'opening' };
  if (event.action !== 'created' || !event.issue?.pull_request || !event.comment
      || event.comment.user?.type === 'Bot') return;
  if (!['OWNER', 'MEMBER', 'COLLABORATOR'].includes(event.comment.author_association)) return;
  const command = (event.comment.body ?? '').trim();
  if (command === '/make_ai_review') return { pr: event.issue, mode: 'main' };
  if (command === '/make_other_ai_review') return { pr: event.issue, mode: 'other' };
}

export function parseHunks(files) {
  const hunks = [];
  const skipped = [];
  for (const file of files) {
    const lines = file.patch?.split(/\r?\n/) ?? [];
    const firstBlock = hunks.length;
    let block;
    let left;
    let right;
    let endLeft;
    let endRight;
    function finish() {
      if (!block) return;
      if (!block.anchor) throw new Error('Блок без изменённой строки: ' + file.filename);
      if (left !== endLeft || right !== endRight) throw new Error('Неполный блок diff: ' + file.filename);
      hunks.push(block);
      block = undefined;
    }
    for (const line of lines) {
      const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
      if (match) {
        finish();
        left = Number(match[1]);
        right = Number(match[3]);
        endLeft = left + Number(match[2] ?? 1);
        endRight = right + Number(match[4] ?? 1);
        block = { id: hunks.length + 1, path: file.filename, diff: line, anchor: null };
        continue;
      }
      if (!block) continue;
      block.diff += '\n' + line;
      if (line.startsWith('+')) {
        if (block.anchor?.side !== 'RIGHT') block.anchor = { line: right, side: 'RIGHT' };
        right++;
      } else if (line.startsWith('-')) {
        block.anchor ??= { line: left, side: 'LEFT' };
        left++;
      } else if (line.startsWith(' ')) {
        left++;
        right++;
      }
    }
    finish();
    if (firstBlock === hunks.length) skipped.push(file.filename);
  }
  return { hunks, skipped };
}

export function formatReview(hunks, skipped, response, commit) {
  const notes = new Map();
  for (const item of response.comments ?? []) {
    if (Number.isInteger(item.id) && typeof item.note === 'string' && !notes.has(item.id))
      notes.set(item.id, item.note.trim().slice(0, 1600));
  }
  const safe = (line) => line.replace(/@/g, '＠').replace(/</g, '‹').replace(/>/g, '›');
  const summary = safe(String(response.summary ?? '').trim().slice(0, 3500));
  return {
    commit_id: commit,
    event: 'COMMENT',
    body: (summary || 'Автоматическое ревью изменений.') +
      (skipped.length ? '\n\nФайлы без доступного текстового diff: ' + skipped.map(safe).join(', ') : ''),
    comments: hunks.map(h => ({
      path: h.path, ...h.anchor,
      body: notes.get(h.id) ? safe(notes.get(h.id)) : 'Модель не оставила отдельного замечания к этому блоку.',
    })),
  };
}

export function normalizeClassification(result) {
  const types = ['bug', 'task', 'feature'];
  const confidence = typeof result.confidence === 'number' && Number.isFinite(result.confidence)
    && result.confidence >= 0 && result.confidence <= 1 ? result.confidence : 0;
  const type = types.includes(result.type) ? result.type : 'unknown';
  return {
    type, confidence,
    route: type === 'unknown' || confidence < 0.8 ? 'unknown' : type,
  };
}

export function collectStatistics(all, groups, start, end) {
  const byType = { bug: 0, task: 0, feature: 0, 'needs-triage': 0, unclassified: 0 };
  const authors = new Map();
  const selected = Object.fromEntries(Object.entries(groups).map(([key, items]) =>
    [key, new Set(items.map(item => item.number))]));
  const seen = new Set();
  for (const issue of all) {
    if (issue.pull_request || seen.has(issue.number)) continue;
    if (Date.parse(issue.created_at) < Date.parse(start) || Date.parse(issue.created_at) >= Date.parse(end)) continue;
    seen.add(issue.number);
    const labels = new Set((issue.labels ?? []).map(label => label.name));
    const names = { bug: 'bug', task: 'task', feature: 'feature-request' };
    const matches = Object.keys(names).filter(key => labels.has(names[key]) || selected[key].has(issue.number));
    const type = labels.has('needs-triage') ? 'needs-triage' :
      matches.length === 1 ? matches[0] : 'unclassified';
    byType[type]++;
    const author = issue.user?.login ?? 'unknown';
    authors.set(author, (authors.get(author) ?? 0) + 1);
  }
  return {
    total: seen.size, byType,
    byAuthor: [...authors].sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b)),
  };
}

export function reportHtml(period, stats) {
  const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const table = (first, rows) => '<table border="1" cellpadding="6" cellspacing="0"><thead><tr><th>'
    + esc(first) + '</th><th>Количество</th></tr></thead><tbody>'
    + rows.map(([key, count]) => '<tr><td>' + esc(key) + '</td><td>' + count
    + '</td></tr>').join('') + '</tbody></table>';
  return '<h1>«Верфь» — недельный отчёт</h1><p>' + esc(period) + '</p>'
    + table('Тип обращения', [['Всего', stats.total], ...Object.entries(stats.byType)])
    + '<h2>По авторам</h2>' + (stats.byAuthor.length ? table('Автор', stats.byAuthor) : '<p>Обращений нет.</p>');
}
