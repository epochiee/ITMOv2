import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const workflow = JSON.parse(readFileSync(new URL('./pr-review.json', import.meta.url), 'utf8'));
const nodes = Object.fromEntries(workflow.nodes.map(node => [node.name, node]));
const pullRequest = { number: 12 };
const repository = { id: 101, full_name: 'epochiee/eve-industry-planner' };
const comment = body => ({
  action: 'created', repository, issue: { ...pullRequest, pull_request: {} },
  comment: { body, author_association: 'OWNER' },
});

function runCode(name, items, responses = {}) {
  const result = runInNewContext('(function () {\n' + nodes[name].parameters.jsCode + '\n})()', {
    $input: { first: () => items[0], all: () => items },
    $: key => ({ first: () => ({ json: responses[key] }) }),
  });
  return JSON.parse(JSON.stringify(result));
}

function next(name, branch = 0) {
  return workflow.connections[name].main[branch].map(connection => connection.node);
}

test('opening and exact commands select the expected mode and repository', () => {
  const route = body => runCode('Команда или открытие PR', [{ json: { body } }]);
  const opening = route({ action: 'opened', repository, pull_request: pullRequest });
  assert.deepEqual(opening[0].json, {
    base: 'https://api.github.com/repos/epochiee/eve-industry-planner', number: 12, key: '101:12', mode: 'opening',
  });
  assert.equal(route(comment(' /make_ai_review '))[0].json.mode, 'main');
  assert.equal(route(comment('/make_other_ai_review'))[0].json.mode, 'other');
  assert.deepEqual(route(comment('/make_ai_review please')), []);
  assert.deepEqual(route({ action: 'synchronize', repository, pull_request: pullRequest }), []);
  assert.deepEqual(route({ ...comment('/make_ai_review'), repository: { ...repository, full_name: 'example/fork' } }), []);
  assert.deepEqual(route({ ...comment('/make_ai_review'), issue: pullRequest }), []);
  const bot = comment('/make_ai_review');
  bot.comment.user = { type: 'Bot' };
  assert.deepEqual(route(bot), []);
});

test('main branch checks table before review and both branches write only after publishing', () => {
  const gate = 'ID PR отсутствует в таблице';
  const save = 'Записать ID проверенного PR';
  assert.deepEqual(next('Принудительно второй моделью?'), ['Получить PR и commit SHA']);
  assert.deepEqual(next('Принудительно второй моделью?', 1), [gate]);
  assert.equal(nodes[gate].parameters.operation, 'rowNotExists');
  assert.equal(nodes[gate].alwaysOutputData, undefined);
  assert.deepEqual(next(gate), ['Получить PR и commit SHA']);
  assert.deepEqual(next('Выбор модели по команде'), ['Ревью второй моделью']);
  assert.deepEqual(next('Выбор модели по команде', 1), ['Ревью основной моделью']);
  assert.equal(nodes['Модель A'].parameters.model.value, 'openai/gpt-5');
  assert.equal(nodes['Модель B'].parameters.model.value, 'qwen/qwen3.7-max');
  assert.deepEqual(next('Опубликовать ревью в PR'), [save]);
  assert.equal(nodes[save].parameters.operation, 'upsert');
  assert.deepEqual(nodes[save].parameters.dataTableId, nodes[gate].parameters.dataTableId);
});

const paths = {
  event: 'Команда или открытие PR',
  pr: 'Получить PR и commit SHA',
  prepare: 'Разбить diff на блоки',
  assemble: 'Подготовить точечные комментарии',
};
const responses = {
  [paths.event]: { key: '101:12', mode: 'other' },
  [paths.pr]: { changed_files: 2, id: 987, head: { sha: 'ab'.repeat(20) } },
};

test('exported code nodes anchor each hunk and handle a file without a patch', () => {
  const files = [{ filename: 'server/calculate.ts', patch: [
    '@@ -3,3 +3,3 @@', ' context', '-before', '+after', ' context',
    '@@ -20,2 +20,1 @@', ' context', '-removed',
    '\\ No newline at end of file',
  ].join('\n') }, { filename: 'image.png' }];
  const prepared = runCode(paths.prepare, [{ json: { body: files } }], responses)[0].json;
  assert.deepEqual(prepared.skipped, ['image.png']);
  assert.equal(prepared.prId, '987');
  const input = { output: { summary: 'Сводка', comments: [{ id: 2, note: 'Удаление' }, { id: 1, note: 'Замена' }] } };
  const result = runCode(paths.assemble, [{ json: input }], { [paths.prepare]: prepared })[0].json;
  assert.equal(result.model, 'qwen/qwen3.7-max');
  assert.equal(result.review.commit_id, responses[paths.pr].head.sha);
  assert.deepEqual(result.review.comments, [
    { path: 'server/calculate.ts', line: 4, side: 'RIGHT', body: 'Замена' },
    { path: 'server/calculate.ts', line: 21, side: 'LEFT', body: 'Удаление' },
  ]);
});

test('exported code rejects incomplete GitHub responses before model calls', () => {
  const patch = { filename: 'server/calculate.ts', patch: '@@ -1,2 +1,2 @@\n-before\n+after' };
  assert.throws(() => runCode(paths.prepare, [{ json: { body: [patch] } }], responses), /неполный список/);
  assert.throws(() => runCode(paths.prepare, [{ json: { body: [patch, { filename: 'image.png' }] } }], responses),
    /Неполный блок/);
});
