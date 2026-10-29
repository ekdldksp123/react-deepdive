import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement } from '../day01-jsx-createElement/createElement.js';
import { render, wipRoot, currentRoot } from './fiber.js';

let container;
let scheduled;
beforeEach(() => {
  const { window } = new JSDOM('<!doctype html><div id="root"></div>');
  globalThis.document = window.document;
  container = window.document.getElementById('root');
  scheduled = [];
  globalThis.requestIdleCallback = (cb) => scheduled.push(cb);
});

// timeRemaining()이 budget번까지만 시간이 남았다고 답하는 가짜 deadline
const deadline = (budget = Infinity) => ({ timeRemaining: () => (budget-- > 0 ? 50 : 0) });
const flush = () => {
  while (scheduled.length) scheduled.shift()(deadline());
};

// ref가 불릴 때마다 [이름, 받은 값]을 calls에 남긴다
function recorder() {
  const calls = [];
  const ref = (label) => (dom) => calls.push([label, dom]);
  return { calls, ref };
}

const app = (ref, title = 'a') =>
  createElement(
    'div',
    { id: 'app', ref: ref('div') },
    createElement('h1', { ref: ref('h1') }, title),
    createElement('p', null, 'b'),
  );

test('render 단계 도중에 멈춰 있는 동안에는 ref가 불리지 않는다', () => {
  const { calls, ref } = recorder();
  render(app(ref), container);
  scheduled.shift()(deadline(2));
  assert.notEqual(wipRoot, null, '아직 render 단계 중이어야 한다');
  assert.deepEqual(calls, []);
});

test('commit 뒤 ref는 fiber.dom으로 한 번씩 불리고, 그때 트리는 이미 다 붙어 있다', () => {
  const { calls, ref } = recorder();
  const seen = [];
  render(app((label) => (dom) => {
    ref(label)(dom);
    seen.push(container.innerHTML);
  }), container);
  flush();

  assert.deepEqual(calls.map(([label]) => label), ['div', 'h1']);
  const div = currentRoot.child;
  assert.equal(calls[0][1], div.dom);
  assert.equal(calls[1][1], div.child.dom);
  const html = '<div id="app"><h1>a</h1><p>b</p></div>';
  assert.deepEqual(seen, [html, html], 'ref가 불릴 때 화면은 완성된 트리여야 한다');
});

test('ref는 DOM 속성으로 들어가지 않는다', () => {
  const { ref } = recorder();
  render(app(ref), container);
  flush();
  assert.equal(currentRoot.child.dom.ref, undefined);
});

test('render 도중 새 render가 오면 만들던 트리는 버려지고, ref는 마지막 트리 것만 불린다', () => {
  const first = recorder();
  const second = recorder();
  render(app(first.ref, 'old'), container);
  scheduled.shift()(deadline(2));

  render(app(second.ref, 'new'), container);
  flush();

  assert.deepEqual(first.calls, [], '버려진 트리의 ref는 한 번도 불리지 않는다');
  assert.deepEqual(second.calls.map(([label]) => label), ['div', 'h1']);
  assert.equal(container.innerHTML, '<div id="app"><h1>new</h1><p>b</p></div>');
});

test('다시 commit하면 옛 ref를 모두 null로 부른 다음 새 ref를 새 dom으로 부른다', () => {
  const { calls, ref } = recorder();
  render(app(ref, 'v1'), container);
  flush();
  calls.length = 0;

  render(app(ref, 'v2'), container);
  flush();

  assert.deepEqual(
    calls.map(([label, dom]) => [label, dom === null ? null : dom.isConnected]),
    [
      ['div', null],
      ['h1', null],
      ['div', true],
      ['h1', true],
    ],
  );
  assert.equal(calls[2][1], currentRoot.child.dom);
});
