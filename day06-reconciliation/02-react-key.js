// 실제 React에서 key를 index로 줄 때와 id로 줄 때, 앞에 항목을 끼워 넣으면
// 각 행의 state(입력값)와 DOM 노드가 어떻게 되는지 찍는다
import { JSDOM } from 'jsdom';
import { createElement as h, useState, act } from 'react';
import { createRoot } from 'react-dom/client';
import { version } from 'react-dom';

const { window } = new JSDOM('<!doctype html><div id="root"></div>');
globalThis.window = window;
globalThis.document = window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// 행마다 자기 state(메모)를 가진다. 처음 값은 "<이름>의 메모"
function Row({ name }) {
  const [memo] = useState(`${name}의 메모`);
  return h('li', null, `${name}: ${memo}`);
}

function List({ items, keyBy }) {
  return h('ul', null, items.map((item, i) => h(Row, { key: keyBy === 'index' ? i : item.id, name: item.name })));
}

const before = [
  { id: 'a', name: '사과' },
  { id: 'b', name: '바나나' },
];
const after = [{ id: 'c', name: '체리' }, ...before];

async function run(keyBy) {
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(() => root.render(h(List, { items: before, keyBy })));
  const oldLis = [...container.querySelectorAll('li')];

  await act(() => root.render(h(List, { items: after, keyBy })));
  const lis = [...container.querySelectorAll('li')];

  console.log(`\n## key = ${keyBy}`);
  lis.forEach((li, i) => {
    const reused = oldLis.indexOf(li);
    console.log(`  ${i}번째 li: "${li.textContent}"  DOM: ${reused === -1 ? '새로 만듦' : `옛 ${reused}번째 li 재사용`}`);
  });
  await act(() => root.unmount());
}

console.log(`react-dom ${version}`);
console.log(`처음: ${before.map((x) => x.name).join(', ')} → 앞에 체리 추가`);
await run('index');
await run('id');
