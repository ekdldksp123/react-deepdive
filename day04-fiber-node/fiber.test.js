import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement, TEXT_ELEMENT } from '../day01-jsx-createElement/createElement.js';
import { render, performUnitOfWork, wipRoot, currentRoot } from './fiber.js';

// Node에는 requestIdleCallback이 없으므로, 예약된 콜백을 모아 두고 직접 실행한다
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

function flush() {
  while (scheduled.length) scheduled.shift()(deadline());
}

const tree = (title = 'a') =>
  createElement(
    'div',
    { id: 'app' },
    createElement('h1', null, title),
    createElement('p', null, createElement('b', null, 'b'), '!'),
  );
const html = (title = 'a') => `<div id="app"><h1>${title}</h1><p><b>b</b>!</p></div>`;

test('render 단계 도중에 멈추면 화면에는 아무것도 붙지 않는다', () => {
  render(tree(), container);
  scheduled.shift()(deadline(3));
  assert.equal(scheduled.length, 1, '남은 작업이 있으면 다시 예약한다');
  assert.equal(container.innerHTML, '', '그리다 만 트리가 보이면 안 된다');
});

test('모든 fiber를 처리한 뒤 commit에서 한 번에 붙는다', () => {
  render(tree(), container);
  flush();
  assert.equal(container.innerHTML, html());
});

test('commit 뒤 currentRoot는 방금 만든 트리이고 wipRoot는 비워진다', () => {
  render(tree(), container);
  const root = wipRoot;
  flush();
  assert.equal(currentRoot, root);
  assert.equal(wipRoot, null);
  assert.equal(currentRoot.child.type, 'div');
});

test('두 번째 render의 fiber는 alternate로 옛 트리의 같은 자리 fiber를 가리킨다', () => {
  render(tree('a'), container);
  flush();
  const old = currentRoot;

  render(tree('z'), container);
  const wip = wipRoot;
  assert.equal(wip.alternate, old, '루트의 alternate는 지난번 commit한 루트');
  flush();

  const oldDiv = old.child;
  const newDiv = wip.child;
  assert.equal(newDiv.alternate, oldDiv);
  assert.equal(newDiv.child.alternate, oldDiv.child, 'h1끼리');
  assert.equal(newDiv.child.sibling.alternate, oldDiv.child.sibling, 'p끼리');
  assert.equal(newDiv.child.sibling.child.sibling.alternate, oldDiv.child.sibling.child.sibling, "'!'끼리");
  assert.equal(currentRoot, wip);
});

test('옛 트리에 없던 자리의 fiber는 alternate가 null이다', () => {
  render(createElement('ul', null, createElement('li', null, '1')), container);
  flush();
  render(createElement('ul', null, createElement('li', null, '1'), createElement('li', null, '2')), container);
  flush();
  const [first, second] = [currentRoot.child.child, currentRoot.child.child.sibling];
  assert.notEqual(first.alternate, null);
  assert.equal(second.alternate, null);
});

test('다시 render하면 화면은 새 트리로 바뀐다 (옛 DOM이 남지 않는다)', () => {
  render(tree('a'), container);
  flush();
  render(tree('z'), container);
  flush();
  assert.equal(container.innerHTML, html('z'));
});

test('performUnitOfWork는 DOM을 만들기만 하고 부모에 붙이지 않는다', () => {
  let fiber = { dom: container, props: { children: [tree()] }, alternate: null };
  const order = [];
  const fibers = [];
  while ((fiber = performUnitOfWork(fiber))) {
    order.push(fiber.type === TEXT_ELEMENT ? fiber.props.nodeValue : fiber.type);
    fibers.push(fiber);
  }
  assert.deepEqual(order, ['div', 'h1', 'a', 'p', 'b', 'b', '!']);
  assert.equal(container.innerHTML, '');
  assert.ok(fibers.every((f) => f.dom && f.dom.parentNode === null), 'dom은 만들었지만 아무 데도 붙지 않았다');
});
