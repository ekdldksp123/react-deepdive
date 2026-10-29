import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h } from '../day01-jsx-createElement/createElement.js';
import { render, useState, useEffect, useLayoutEffect } from './fiber.js';

let container;
let scheduled;
let log;
beforeEach(() => {
  const { window } = new JSDOM('<!doctype html><div id="root"></div>');
  globalThis.document = window.document;
  container = window.document.getElementById('root');
  scheduled = [];
  log = [];
  globalThis.requestIdleCallback = (cb) => scheduled.push(cb);
});

const flushRender = () => {
  while (scheduled.length) scheduled.shift()({ timeRemaining: () => 50 });
};
const nextTick = () => new Promise((resolve) => setTimeout(resolve, 5));
// render·commit 하고 passive effect까지 기다린다
async function renderAll(element) {
  render(element, container);
  flushRender();
  await nextTick();
}

test('useEffect는 render 중이 아니라 commit 뒤에, 그리고 바로가 아니라 한 박자 뒤에 실행된다', async () => {
  function App() {
    log.push('render');
    useEffect(() => log.push(`effect: ${container.innerHTML}`));
    return h('p', null, 'hi');
  }
  render(h(App), container);
  flushRender();
  assert.deepEqual(log, ['render'], 'commit 직후에는 아직 실행되지 않는다');
  await nextTick();
  assert.deepEqual(log, ['render', 'effect: <p>hi</p>'], '실행될 때 DOM은 이미 붙어 있다');
});

test('useLayoutEffect는 commit 직후 바로 실행되고, useEffect보다 먼저다', async () => {
  function App() {
    useEffect(() => log.push('passive'));
    useLayoutEffect(() => log.push(`layout: ${container.innerHTML}`));
    return h('p', null, 'hi');
  }
  render(h(App), container);
  flushRender();
  assert.deepEqual(log, ['layout: <p>hi</p>']);
  await nextTick();
  assert.deepEqual(log, ['layout: <p>hi</p>', 'passive']);
});

test('deps에 따라 다시 실행할지 정한다: 없음 → 매번, [] → 처음만, [x] → x가 바뀔 때', async () => {
  function App({ x, y }) {
    useEffect(() => log.push('none'));
    useEffect(() => log.push('empty'), []);
    useEffect(() => log.push(`x=${x}`), [x]);
    return h('p', null, `${x}${y}`);
  }
  await renderAll(h(App, { x: 1, y: 1 }));
  assert.deepEqual(log, ['none', 'empty', 'x=1']);
  log.length = 0;
  await renderAll(h(App, { x: 1, y: 2 }));
  assert.deepEqual(log, ['none']);
  log.length = 0;
  await renderAll(h(App, { x: 2, y: 2 }));
  assert.deepEqual(log, ['none', 'x=2']);
});

test('deps가 바뀌면 옛 cleanup을 먼저 부르고 새 setup을 부른다 (트리 전체에서 cleanup이 먼저)', async () => {
  function Item({ name, v }) {
    useEffect(() => {
      log.push(`setup ${name}${v}`);
      return () => log.push(`cleanup ${name}${v}`);
    }, [v]);
    return h('li', null, name);
  }
  const app = (v) => h('ul', null, h(Item, { name: 'a', v }), h(Item, { name: 'b', v }));
  await renderAll(app(1));
  log.length = 0;
  await renderAll(app(2));
  assert.deepEqual(log, ['cleanup a1', 'cleanup b1', 'setup a2', 'setup b2']);
});

test('컴포넌트가 지워지면 그 effect의 cleanup이 불린다', async () => {
  function Child() {
    useLayoutEffect(() => () => log.push('layout cleanup'), []);
    useEffect(() => () => log.push('passive cleanup'), []);
    return h('span', null, 'child');
  }
  function Wrapper() {
    return h(Child);
  }
  await renderAll(h('div', null, h(Wrapper)));
  await renderAll(h('div', null, h('b', null, 'gone')));
  assert.deepEqual(log, ['layout cleanup', 'passive cleanup']);
});

test('useState와 섞여도 순번이 맞고, effect 안의 setState는 다시 render를 일으킨다', async () => {
  function App() {
    const [n, setN] = useState(0);
    useEffect(() => {
      if (n < 2) setN(n + 1);
    }, [n]);
    return h('p', null, `n=${n}`);
  }
  await renderAll(h(App));
  for (let i = 0; i < 3; i++) {
    flushRender();
    await nextTick();
  }
  assert.equal(container.innerHTML, '<p>n=2</p>');
});
