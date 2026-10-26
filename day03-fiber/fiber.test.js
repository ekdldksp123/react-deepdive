import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement, TEXT_ELEMENT } from '../day01-jsx-createElement/createElement.js';
import { render, workLoop, performUnitOfWork } from './fiber.js';

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

// 예약된 workLoop를 할 일이 없어질 때까지 실행한다
function flush() {
  while (scheduled.length) scheduled.shift()(deadline());
}

const tree = () =>
  createElement(
    'div',
    { id: 'app' },
    createElement('h1', null, 'a'),
    createElement('p', null, createElement('b', null, 'b'), '!'),
  );
const html = '<div id="app"><h1>a</h1><p><b>b</b>!</p></div>';

test('render는 DOM을 바로 건드리지 않고 workLoop를 예약만 한다', () => {
  render(tree(), container);
  assert.equal(container.innerHTML, '');
  assert.equal(scheduled.length, 1);
});

test('유휴 시간이 충분하면 workLoop 한 번에 트리를 다 그린다', () => {
  render(tree(), container);
  scheduled.shift()(deadline());
  assert.equal(container.innerHTML, html);
  assert.equal(scheduled.length, 0, '할 일이 없으면 다시 예약하지 않는다');
});

test('시간이 모자라면 멈췄다가 다음 유휴 시간에 이어서 그린다', () => {
  const rows = Array.from({ length: 5 }, (_, i) => createElement('li', null, `${i}`));
  render(createElement('ul', null, ...rows), container);

  scheduled.shift()(deadline(3));
  assert.notEqual(container.innerHTML, '<ul><li>0</li><li>1</li><li>2</li><li>3</li><li>4</li></ul>');
  assert.equal(scheduled.length, 1, '남은 작업이 있으면 다시 예약한다');

  flush();
  assert.equal(container.innerHTML, '<ul><li>0</li><li>1</li><li>2</li><li>3</li><li>4</li></ul>');
});

test('performUnitOfWork는 child → sibling → 부모의 sibling 순서로 다음 fiber를 고른다', () => {
  const order = [];
  let fiber = { dom: container, props: { children: [tree()] } };
  while ((fiber = performUnitOfWork(fiber))) {
    order.push(fiber.type === TEXT_ELEMENT ? fiber.props.nodeValue : fiber.type);
  }
  assert.deepEqual(order, ['div', 'h1', 'a', 'p', 'b', 'b', '!']);
});

test('fiber는 child·sibling·parent로 연결되고 자기 dom을 가진다', () => {
  const root = { dom: container, props: { children: [tree()] } };
  const div = performUnitOfWork(root);
  const h1 = performUnitOfWork(div);

  assert.equal(root.child, div);
  assert.equal(div.parent, root);
  assert.equal(div.child, h1);
  assert.equal(h1.sibling.type, 'p');
  assert.equal(h1.sibling.parent, div);
  assert.equal(div.dom, container.firstChild);
});

test('props와 이벤트도 어제 render처럼 반영된다', () => {
  let clicks = 0;
  render(createElement('button', { className: 'go', onClick: () => clicks++ }, 'go'), container);
  flush();
  container.querySelector('button').click();
  assert.equal(container.innerHTML, '<button class="go">go</button>');
  assert.equal(clicks, 1);
});
