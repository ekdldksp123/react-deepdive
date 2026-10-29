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

function renderNow(element) {
  render(element, container);
  while (scheduled.length) scheduled.shift()({ timeRemaining: () => 50 });
}

function Greeting({ name }) {
  return h('h1', null, `hi ${name}`);
}

function App({ names }) {
  return h('div', { id: 'app' }, ...names.map((name) => h(Greeting, { name })));
}

test('함수 컴포넌트를 props로 호출해 그 결과를 그린다', () => {
  renderNow(h(Greeting, { name: 'kim' }));
  assert.equal(container.innerHTML, '<h1>hi kim</h1>');
});

test('함수 컴포넌트 fiber는 dom이 없고, 자식 fiber가 함수의 반환값이다', () => {
  renderNow(h(Greeting, { name: 'kim' }));
  const fiber = currentRoot.child;
  assert.equal(fiber.type, Greeting);
  assert.equal(fiber.dom, null);
  assert.equal(fiber.child.type, 'h1');
  assert.equal(fiber.child.sibling, null);
});

test('함수 컴포넌트가 겹쳐 있어도 dom은 dom이 있는 조상에 붙는다', () => {
  const Wrapper = () => h(App, { names: ['a', 'b'] });
  renderNow(h(Wrapper));
  assert.equal(container.innerHTML, '<div id="app"><h1>hi a</h1><h1>hi b</h1></div>');
  assert.equal(container.firstChild.parentNode, container, 'div는 container(루트 fiber의 dom)에 붙는다');
});

test('props가 바뀌면 같은 DOM을 재사용해 내용만 고친다', () => {
  renderNow(h(App, { names: ['a', 'b'] }));
  const [h1a] = container.querySelectorAll('h1');
  renderNow(h(App, { names: ['A', 'b'] }));
  assert.equal(container.innerHTML, '<div id="app"><h1>hi A</h1><h1>hi b</h1></div>');
  assert.equal(container.querySelector('h1'), h1a);
});

test('함수 컴포넌트를 지우면 그 아래 dom을 찾아 떼어 낸다', () => {
  renderNow(h(App, { names: ['a', 'b', 'c'] }));
  renderNow(h(App, { names: ['a'] }));
  assert.equal(container.innerHTML, '<div id="app"><h1>hi a</h1></div>');
});

test('함수 컴포넌트가 다른 함수 컴포넌트로 바뀌면 옛 dom을 떼고 새 dom을 붙인다', () => {
  const Other = () => h('p', null, 'other');
  renderNow(h('main', null, h(Greeting, { name: 'kim' })));
  renderNow(h('main', null, h(Other)));
  assert.equal(container.innerHTML, '<main><p>other</p></main>');
});

test('루트 바로 아래 함수 컴포넌트를 지워도 dom이 사라진다', () => {
  renderNow(h(Greeting, { name: 'kim' }));
  renderNow(h('p', null, 'x'));
  assert.equal(container.innerHTML, '<p>x</p>');
});
