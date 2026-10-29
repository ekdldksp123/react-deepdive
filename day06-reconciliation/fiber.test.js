import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h } from '../day01-jsx-createElement/createElement.js';
import { render, currentRoot } from './fiber.js';

let window;
let container;
let scheduled;
beforeEach(() => {
  ({ window } = new JSDOM('<!doctype html><div id="root"></div>'));
  globalThis.document = window.document;
  container = window.document.getElementById('root');
  scheduled = [];
  globalThis.requestIdleCallback = (cb) => scheduled.push(cb);
});

// render하고 commit까지 끝낸다
function renderNow(element) {
  render(element, container);
  while (scheduled.length) scheduled.shift()({ timeRemaining: () => 50 });
}

const list = (...items) => h('ul', null, ...items.map((t) => h('li', null, t)));
const lis = () => [...container.querySelectorAll('li')];

test('처음 render하면 모든 fiber가 PLACEMENT로 붙는다', () => {
  renderNow(list('a', 'b'));
  assert.equal(container.innerHTML, '<ul><li>a</li><li>b</li></ul>');
  const ul = currentRoot.child;
  assert.equal(ul.effectTag, 'PLACEMENT');
  assert.equal(ul.child.effectTag, 'PLACEMENT');
});

test('같은 자리 같은 type이면 DOM을 재사용하고 UPDATE로 props만 고친다', () => {
  renderNow(h('div', { id: 'a', className: 'x' }, 'hi'));
  const div = container.firstChild;
  const text = div.firstChild;

  renderNow(h('div', { id: 'b' }, 'bye'));
  assert.equal(container.firstChild, div, 'div DOM은 그대로');
  assert.equal(div.firstChild, text, '텍스트 노드도 그대로');
  assert.equal(container.innerHTML.replace(' class=""', ''), '<div id="b">bye</div>');
  assert.equal(div.className, '', '사라진 prop은 지운다');
  assert.equal(currentRoot.child.effectTag, 'UPDATE');
  assert.equal(currentRoot.child.child.effectTag, 'UPDATE');
});

test('이벤트 핸들러가 바뀌면 옛 리스너는 떼고 새 리스너만 남긴다', () => {
  const calls = [];
  renderNow(h('button', { onClick: () => calls.push('old') }, 'x'));
  renderNow(h('button', { onClick: () => calls.push('new') }, 'x'));
  container.firstChild.dispatchEvent(new window.MouseEvent('click'));
  assert.deepEqual(calls, ['new']);
});

test('type이 바뀌면 그 자리의 하위 트리를 통째로 새로 만들고 옛 DOM은 떼어 낸다', () => {
  renderNow(h('div', null, h('b', null, 'x')));
  const oldB = container.querySelector('b');

  renderNow(h('section', null, h('b', null, 'x')));
  assert.equal(container.innerHTML, '<section><b>x</b></section>');
  assert.notEqual(container.querySelector('b'), oldB, 'type이 같은 자식 b도 새로 만든다');
  const section = currentRoot.child;
  assert.equal(section.effectTag, 'PLACEMENT');
  assert.equal(section.child.effectTag, 'PLACEMENT');
  assert.equal(section.alternate, null);
});

test('자식이 줄면 남은 옛 fiber는 DELETION으로 떼어 낸다', () => {
  renderNow(list('a', 'b', 'c'));
  const [a] = lis();
  renderNow(list('a'));
  assert.equal(container.innerHTML, '<ul><li>a</li></ul>');
  assert.equal(lis()[0], a);
});

test('자식이 늘면 뒤에 PLACEMENT로 붙는다', () => {
  renderNow(list('a'));
  const [a] = lis();
  renderNow(list('a', 'b'));
  assert.equal(container.innerHTML, '<ul><li>a</li><li>b</li></ul>');
  assert.equal(lis()[0], a);
  assert.equal(currentRoot.child.child.sibling.effectTag, 'PLACEMENT');
});

test('key 없이 자리로 비교하므로, 앞에 끼워 넣으면 기존 li는 내용만 바뀌고 새 li는 끝에 생긴다', () => {
  renderNow(list('a', 'b', 'c'));
  const before = lis();
  renderNow(list('x', 'a', 'b', 'c'));
  const after = lis();
  assert.equal(container.innerHTML, '<ul><li>x</li><li>a</li><li>b</li><li>c</li></ul>');
  assert.deepEqual(after.slice(0, 3), before, '앞 세 li는 옛 DOM 그대로 (텍스트만 x·a·b로 바뀜)');
  assert.ok(!before.includes(after[3]), '마지막 li만 새로 만든다');
});
