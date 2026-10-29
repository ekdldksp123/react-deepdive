// 오늘 구현한 reconcileChildren·commitWork로 몇 가지 변경을 그려 보고,
// fiber마다 붙은 effectTag와 DOM 노드를 몇 개 만들고 지웠는지 찍는다
import { JSDOM } from 'jsdom';
import { createElement as h, TEXT_ELEMENT } from '../day01-jsx-createElement/createElement.js';
import { render, currentRoot, forEachFiber } from './fiber.js';

const { window } = new JSDOM('<!doctype html><div id="root"></div>');
const { document } = window;
globalThis.document = document;
globalThis.requestIdleCallback = (cb) => cb({ timeRemaining: () => 50 });

// DOM 노드를 만들고 지운 횟수
let created = 0;
let removed = 0;
for (const name of ['createElement', 'createTextNode']) {
  const original = document[name].bind(document);
  document[name] = (arg) => (created++, original(arg));
}
const removeChild = window.Node.prototype.removeChild;
window.Node.prototype.removeChild = function (child) {
  removed++;
  return removeChild.call(this, child);
};

const label = (f) => (f.type === TEXT_ELEMENT ? `"${f.props.nodeValue}"` : f.type);
const list = (tag, ...items) => h(tag, null, ...items.map((t) => (Array.isArray(t) ? h(t[0], null, t[1]) : h('li', null, t))));

function step(title, before, after) {
  const container = document.createElement('div');
  render(before, container);
  created = 0;
  removed = 0;
  render(after, container);

  const tags = [];
  forEachFiber(currentRoot, (f) => tags.push(`${label(f)}:${f.effectTag}`));
  console.log(`\n## ${title}`);
  console.log(`effectTag: ${tags.join(', ')}`);
  console.log(`DOM 노드 새로 만듦 ${created}개, 떼어 냄 ${removed}번`);
  console.log(`결과 HTML: ${container.innerHTML}`);
}

try {
  step('텍스트만 바뀜', list('ul', 'a', 'b'), list('ul', 'a', 'B'));
  step('끝에 추가', list('ul', 'a', 'b'), list('ul', 'a', 'b', 'c'));
  step('앞에 추가', list('ul', 'a', 'b', 'c'), list('ul', 'x', 'a', 'b', 'c'));
  step('맨 앞 삭제', list('ul', 'x', 'a', 'b', 'c'), list('ul', 'a', 'b', 'c'));
  step('부모 type 바뀜 (ul → ol)', list('ul', 'a', 'b', 'c'), list('ol', 'a', 'b', 'c'));
  step('가운데 type 바뀜 (li → p)', list('ul', 'a', 'b', 'c'), list('ul', 'a', ['p', 'b'], 'c'));
} catch (e) {
  console.log(`${e.message} (fiber.js의 TODO를 먼저 채우세요)`);
}
