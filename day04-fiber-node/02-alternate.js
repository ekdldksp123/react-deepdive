// 오늘 구현한 fiber.js로 두 번 render하고, 새 fiber마다 alternate가 옛 트리의 어느 fiber인지 찍는다
import { JSDOM } from 'jsdom';
import { createElement, TEXT_ELEMENT } from '../day01-jsx-createElement/createElement.js';
import * as fiber from './fiber.js';

const { document } = new JSDOM('<!doctype html><div id="root"></div>').window;
globalThis.document = document;
const container = document.getElementById('root');

// Node에는 requestIdleCallback이 없으므로 시간이 넉넉한 deadline으로 바로 실행한다
globalThis.requestIdleCallback = (cb) => cb({ timeRemaining: () => 50 });

const name = (f) => (!f ? 'null' : !f.type ? 'ROOT' : f.type === TEXT_ELEMENT ? `"${f.props.nodeValue}"` : f.type);
const list = (title, ...items) =>
  createElement('div', null, createElement('h1', null, title), createElement('ul', null, ...items.map((t) => createElement('li', null, t))));

// fiber 트리를 child → sibling 순서로 펼친다
function walk(root) {
  const out = [];
  for (let f = root; f; ) {
    out.push(f);
    if (f.child) f = f.child;
    else {
      while (f && !f.sibling) f = f.parent;
      f = f?.sibling;
    }
  }
  return out;
}

try {
  fiber.render(list('v1', 'x', 'y'), container);
  const first = fiber.currentRoot;
  console.log('1번째 commit 뒤 HTML:', container.innerHTML);

  fiber.render(list('v2', 'x', 'y', 'z'), container);
  const second = fiber.currentRoot;
  console.log('2번째 commit 뒤 HTML:', container.innerHTML);
  console.log('commit 뒤 wipRoot:', fiber.wipRoot);
  console.log('2번째 루트.alternate === 1번째 루트:', second.alternate === first);

  const oldFibers = walk(first);
  console.table(
    walk(second).map((f) => ({
      fiber: name(f),
      alternate: name(f.alternate),
      '옛 트리 몇 번째': f.alternate ? oldFibers.indexOf(f.alternate) : '-',
      'dom 같음': f.alternate ? f.dom === f.alternate.dom : '-',
    })),
  );
} catch (e) {
  console.log(`${e.message} (fiber.js의 TODO를 먼저 채우세요)`);
}
