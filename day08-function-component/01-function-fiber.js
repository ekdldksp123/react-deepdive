// 함수 컴포넌트가 섞인 트리를 그리고, fiber마다 dom이 있는지와 dom이 붙는 부모를 찍는다.
// 이어서 컴포넌트 하나를 지울 때 실제로 어떤 DOM이 떼어지는지 찍는다.
import { JSDOM } from 'jsdom';
import { createElement as h, TEXT_ELEMENT } from '../day01-jsx-createElement/createElement.js';
import { render, currentRoot } from './fiber.js';
import { forEachFiber } from '../day06-reconciliation/fiber.js';

const { window } = new JSDOM('<!doctype html><div id="root"></div>');
const { document } = window;
globalThis.document = document;
globalThis.requestIdleCallback = (cb) => cb({ timeRemaining: () => 50 });
const container = document.getElementById('root');

let calls = [];

function Item({ text }) {
  calls.push(`Item(${text})`);
  return h('li', null, text);
}
function List({ items }) {
  calls.push(`List([${items}])`);
  return h('ul', null, ...items.map((text) => h(Item, { text })));
}
function Header({ title }) {
  calls.push(`Header(${title})`);
  return h('h1', null, title);
}
function App({ items }) {
  calls.push('App');
  return h('div', { id: 'app' }, h(Header, { title: 'todo' }), h(List, { items }));
}

const label = (f) =>
  typeof f.type === 'function' ? `<${f.type.name}>` : f.type === TEXT_ELEMENT ? `"${f.props.nodeValue}"` : f.type;
const depth = (f) => {
  let d = 0;
  for (let p = f.parent; p.parent; p = p.parent) d++;
  return d;
};

function printTree() {
  forEachFiber(currentRoot, (f) => {
    let hops = 0;
    let p = f.parent;
    while (!p.dom) (p = p.parent), hops++;
    const parentName = p === currentRoot ? 'container' : label(p);
    const dom = f.dom ? `dom 있음 → ${parentName}에 붙음${hops ? ` (함수 fiber ${hops}개 건너뜀)` : ''}` : 'dom 없음';
    console.log(`${'  '.repeat(depth(f))}${label(f)}  [${f.effectTag}] ${dom}`);
  });
}

const removeChild = window.Node.prototype.removeChild;
let removed = [];
window.Node.prototype.removeChild = function (child) {
  removed.push(`${this.nodeName.toLowerCase()}.removeChild(${child.nodeName.toLowerCase()} "${child.textContent}")`);
  return removeChild.call(this, child);
};

try {
  console.log('## 처음 render: App items=[a, b, c]');
  render(h(App, { items: ['a', 'b', 'c'] }), container);
  console.log(`함수 호출 순서: ${calls.join(' → ')}`);
  printTree();
  console.log(`화면: ${container.innerHTML}`);

  calls = [];
  console.log('\n## 다시 render: App items=[a] (Item 두 개 지움)');
  render(h(App, { items: ['a'] }), container);
  console.log(`함수 호출 순서: ${calls.join(' → ')}`);
  console.log(`떼어 낸 DOM: ${removed.join(', ') || '없음'}`);
  console.log(`화면: ${container.innerHTML}`);
} catch (e) {
  console.log(`${e.message} (8일차 fiber.js의 TODO와, 이 파일이 가져다 쓰는 6일차 TODO를 먼저 채우세요)`);
}
