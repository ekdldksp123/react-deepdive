import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement } from '../day01-jsx-createElement/createElement.js';
import { render } from './render.js';

// Node에는 DOM이 없으므로 jsdom으로 브라우저의 document를 흉내 낸다
let container;
beforeEach(() => {
  const { window } = new JSDOM('<!doctype html><div id="root"></div>');
  globalThis.document = window.document;
  container = window.document.getElementById('root');
});

test('호스트 Element는 같은 태그의 DOM 노드가 되어 container에 붙는다', () => {
  render(createElement('section', null), container);
  assert.equal(container.innerHTML, '<section></section>');
});

test('TEXT_ELEMENT는 텍스트 노드가 된다', () => {
  render(createElement('p', null, 'hi'), container);
  const text = container.firstChild.firstChild;
  assert.equal(text.nodeType, 3); // Node.TEXT_NODE
  assert.equal(text.nodeValue, 'hi');
});

test('숫자 텍스트도 그린다', () => {
  render(createElement('span', null, 42), container);
  assert.equal(container.textContent, '42');
});

test('props는 DOM 속성으로 반영된다 (id, className)', () => {
  render(createElement('div', { id: 'box', className: 'card' }), container);
  assert.equal(container.innerHTML, '<div id="box" class="card"></div>');
});

test('children은 속성으로 붙이지 않는다', () => {
  // DOM의 children은 getter만 있어서, 모듈(strict mode)에서 대입하면 TypeError가 난다
  assert.doesNotThrow(() => render(createElement('div', null, 'x'), container));
});

test('중첩된 children을 순서대로 재귀 렌더한다', () => {
  render(
    createElement(
      'ul',
      { className: 'list' },
      createElement('li', null, 'a'),
      createElement('li', null, createElement('b', null, 'b'), '!'),
    ),
    container,
  );
  assert.equal(
    container.innerHTML,
    '<ul class="list"><li>a</li><li><b>b</b>!</li></ul>',
  );
});

test('onClick은 속성이 아니라 click 이벤트 리스너로 등록한다', () => {
  let clicks = 0;
  render(createElement('button', { onClick: () => clicks++ }, 'go'), container);
  const button = container.querySelector('button');
  button.click();
  button.click();
  assert.equal(clicks, 2);
  assert.equal(button.hasAttribute('onclick'), false);
});

test('render는 기존 내용을 지우지 않고 뒤에 붙인다', () => {
  render(createElement('i', null), container);
  render(createElement('b', null), container);
  assert.equal(container.innerHTML, '<i></i><b></b>');
});

test('[도전] style 객체를 인라인 스타일로 반영한다', () => {
  render(createElement('div', { style: { color: 'red', fontSize: '12px' } }), container);
  const div = container.firstChild;
  assert.equal(div.style.color, 'red');
  assert.equal(div.style.fontSize, '12px');
});
