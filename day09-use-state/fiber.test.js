import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h } from '../day01-jsx-createElement/createElement.js';
import { render, useState, currentRoot } from './fiber.js';

let container;
let scheduled;
beforeEach(() => {
  const { window } = new JSDOM('<!doctype html><div id="root"></div>');
  globalThis.document = window.document;
  container = window.document.getElementById('root');
  scheduled = [];
  globalThis.requestIdleCallback = (cb) => scheduled.push(cb);
});

const flush = () => {
  while (scheduled.length) scheduled.shift()({ timeRemaining: () => 50 });
};
function renderNow(element) {
  render(element, container);
  flush();
}

// 렌더할 때마다 setter를 밖으로 꺼내 두는 카운터
function makeCounter() {
  const api = { renders: 0 };
  api.Counter = function Counter() {
    api.renders++;
    const [count, setCount] = useState(0);
    api.count = count;
    api.setCount = setCount;
    return h('p', null, `count ${count}`);
  };
  return api;
}

test('처음 render하면 초기값을 그린다', () => {
  const c = makeCounter();
  renderNow(h(c.Counter));
  assert.equal(container.innerHTML, '<p>count 0</p>');
});

test('setState는 다시 render를 예약하고, 다음 render에서 새 값을 그린다', () => {
  const c = makeCounter();
  renderNow(h(c.Counter));
  c.setCount(5);
  assert.equal(container.innerHTML, '<p>count 0</p>', 'setState 자리에서 바로 바뀌지 않는다');
  assert.ok(scheduled.length > 0, 'render가 예약된다');
  flush();
  assert.equal(container.innerHTML, '<p>count 5</p>');
});

test('함수 action은 쌓인 순서대로 이어서 계산한다', () => {
  const c = makeCounter();
  renderNow(h(c.Counter));
  c.setCount((n) => n + 1);
  c.setCount((n) => n + 1);
  c.setCount((n) => n + 1);
  flush();
  assert.equal(c.count, 3);
});

test('값 action은 같은 render의 count로 계산되므로 여러 번 불러도 마지막 값이 된다', () => {
  const c = makeCounter();
  renderNow(h(c.Counter));
  const { count } = c;
  c.setCount(count + 1);
  c.setCount(count + 1);
  c.setCount(count + 1);
  flush();
  assert.equal(c.count, 1);
});

test('같은 값으로 setState하면 render를 예약하지 않는다', () => {
  const c = makeCounter();
  renderNow(h(c.Counter));
  const renders = c.renders;
  c.setCount(0);
  c.setCount((n) => n);
  assert.equal(scheduled.length, 0);
  flush();
  assert.equal(c.renders, renders);
});

test('한 컴포넌트의 useState 여러 개는 부른 순서로 hooks에 쌓이고 서로 섞이지 않는다', () => {
  let setA;
  let setB;
  function Pair() {
    const [a, sa] = useState('a');
    const [b, sb] = useState('b');
    setA = sa;
    setB = sb;
    return h('p', null, `${a}${b}`);
  }
  renderNow(h(Pair));
  assert.deepEqual(currentRoot.child.hooks.map((hook) => hook.state), ['a', 'b']);
  setB('B');
  flush();
  setA('A');
  flush();
  assert.equal(container.innerHTML, '<p>AB</p>');
});

test('같은 컴포넌트 두 개는 state를 따로 가진다', () => {
  const setters = [];
  function Item({ name }) {
    const [n, setN] = useState(0);
    setters.push(setN);
    return h('li', null, `${name}${n}`);
  }
  renderNow(h('ul', null, h(Item, { name: 'a' }), h(Item, { name: 'b' })));
  setters[1](7);
  flush();
  assert.equal(container.innerHTML, '<ul><li>a0</li><li>b7</li></ul>');
});

test('부모가 다시 render돼도 같은 자리 자식의 state는 유지된다', () => {
  const c = makeCounter();
  let setLabel;
  function Parent() {
    const [label, s] = useState('x');
    setLabel = s;
    return h('div', null, h('h1', null, label), h(c.Counter));
  }
  renderNow(h(Parent));
  c.setCount(4);
  flush();
  setLabel('y');
  flush();
  assert.equal(container.innerHTML, '<div><h1>y</h1><p>count 4</p></div>');
});
