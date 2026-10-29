// 실제 React에서 setState 여러 번, 같은 값 setState, 조건부 hook이 어떻게 되는지 찍는다
import { JSDOM } from 'jsdom';
import { createElement as h, useState, act } from 'react';
import { createRoot } from 'react-dom/client';
import { version } from 'react-dom';

const { window } = new JSDOM('<!doctype html><div id="root"></div>');
globalThis.window = window;
globalThis.document = window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let renders = 0;
let api = {};
function Counter() {
  renders++;
  const [count, setCount] = useState(0);
  api = { count, setCount };
  return h('p', null, count);
}

async function mount(component, props = {}) {
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(() => root.render(h(component, props)));
  return { container, root };
}

console.log(`react-dom ${version}`);

// 1. 한 이벤트 안에서 세 번 부르기
for (const [label, call] of [
  ['setCount(c => c + 1) ×3', () => [1, 2, 3].forEach(() => api.setCount((c) => c + 1))],
  ['setCount(count + 1) ×3', () => [1, 2, 3].forEach(() => api.setCount(api.count + 1))],
]) {
  const { container, root } = await mount(Counter);
  renders = 0;
  await act(() => call());
  console.log(`${label}: 화면 ${container.textContent}, 추가 render ${renders}번`);
  await act(() => root.unmount());
}

// 2. 같은 값으로 setState
{
  const { root } = await mount(Counter);
  renders = 0;
  const log = [];
  for (let i = 1; i <= 3; i++) {
    await act(() => api.setCount(0));
    log.push(renders);
  }
  console.log(`setCount(0)을 따로 3번 (현재 값 0): 누적 render ${log.join(' → ')}`);
  await act(() => api.setCount(1));
  renders = 0;
  for (let i = 1; i <= 3; i++) await act(() => api.setCount(1));
  console.log(`값을 1로 바꾼 뒤 setCount(1)을 따로 3번: 추가 render ${renders}번`);
  await act(() => root.unmount());
}

// 3. 조건부 hook
function Profile({ showName }) {
  let name = '(없음)';
  if (showName) [name] = useState('kim');
  const [age] = useState(20);
  return h('p', null, `name=${name} age=${age}`);
}
{
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(String(args[0]).split('\n')[0]);
  const { container, root } = await mount(Profile, { showName: true });
  console.log(`조건부 hook, showName=true: ${container.textContent}`);
  try {
    await act(() => root.render(h(Profile, { showName: false })));
    console.log(`showName=false: ${container.textContent}`);
  } catch (e) {
    console.log(`showName=false: 에러 — ${e.message.split('\n')[0]}`);
  }
  console.error = originalError;
  errors.forEach((e) => console.log(`  console.error: ${e}`));
}
