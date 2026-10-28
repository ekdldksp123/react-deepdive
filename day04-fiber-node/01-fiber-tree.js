// 어제 만든 performUnitOfWork로 작은 트리를 fiber로 바꾸고, 각 fiber의 포인터와 방문 순서를 찍는다
import { JSDOM } from 'jsdom';
import { createElement, TEXT_ELEMENT } from '../day01-jsx-createElement/createElement.js';
import { performUnitOfWork } from '../day03-fiber/fiber.js';

globalThis.document = new JSDOM('<!doctype html><div id="root"></div>').window.document;

const tree = createElement(
  'div',
  { id: 'app' },
  createElement('h1', null, 'a'),
  createElement('p', null, createElement('b', null, 'b'), '!'),
);

const name = (f) => (!f ? '-' : !f.type ? 'ROOT' : f.type === TEXT_ELEMENT ? `"${f.props.nodeValue}"` : f.type);

const root = { dom: document.getElementById('root'), props: { children: [tree] } };
const visited = [root];
for (let f = performUnitOfWork(root); f; f = performUnitOfWork(f)) visited.push(f);

console.log('방문 순서:', visited.map(name).join(' → '));
console.table(
  visited.map((f) => ({ fiber: name(f), child: name(f.child), sibling: name(f.sibling), parent: name(f.parent) })),
);
