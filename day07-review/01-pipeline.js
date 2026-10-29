// JSX 한 조각이 화면에 붙기까지를 처음부터 끝까지 찍는다
// JSX → (Babel) createElement 호출 → Element 트리 → render 단계(fiber, DOM 만들기) → commit 단계(DOM 붙이기)
// 사용법: node day07-review/01-pipeline.js [04|06]  (기본 06: 6일차 reconcile 버전, 04: 4일차 버전)
import { transformSync } from '@babel/core';
import { JSDOM } from 'jsdom';
import { createElement } from '../day01-jsx-createElement/createElement.js';

const day = process.argv[2] ?? '06';
const dir = { '04': 'day04-fiber-node', '06': 'day06-reconciliation' }[day];
const fiber = await import(`../${dir}/fiber.js`);

const jsx = (title, items) => `
<div id="app">
  <h1>${title}</h1>
  <ul>${items.map((t) => `<li>${t}</li>`).join('')}</ul>
</div>`;

// 1. JSX → createElement 호출 코드
function compile(source) {
  const { code } = transformSync(`(${source})`, {
    presets: [['@babel/preset-react', { runtime: 'classic', pragma: 'createElement' }]],
    babelrc: false,
    configFile: false,
  });
  return code;
}

// 2. Element 트리를 한 줄씩
function printElement(el, depth = 0) {
  const pad = '  '.repeat(depth);
  if (el.type === 'TEXT_ELEMENT') return console.log(`${pad}"${el.props.nodeValue}"`);
  const { children, ...props } = el.props;
  console.log(`${pad}${el.type} ${JSON.stringify(props)}`);
  children.forEach((c) => printElement(c, depth + 1));
}

// 3·4. render 단계와 commit 단계에서 일어나는 DOM 작업을 순서대로 남긴다
const { window } = new JSDOM('<!doctype html><div id="root"></div>');
const { document } = window;
globalThis.document = document;
const container = document.getElementById('root');

let ops = [];
const name = (n) => (n.nodeType === 3 ? `"${n.nodeValue}"` : n.nodeName.toLowerCase());
const original = { createElement: document.createElement.bind(document), createTextNode: document.createTextNode.bind(document) };
document.createElement = (t) => (ops.push(`render  createElement(${t})`), original.createElement(t));
document.createTextNode = (t) => (ops.push('render  createTextNode'), original.createTextNode(t));
for (const method of ['appendChild', 'removeChild']) {
  const fn = window.Node.prototype[method];
  window.Node.prototype[method] = function (child) {
    ops.push(`commit  ${name(this)}.${method}(${name(child)})`);
    return fn.call(this, child);
  };
}
const replaceChildren = window.Element.prototype.replaceChildren;
window.Element.prototype.replaceChildren = function (...nodes) {
  ops.push(`commit  ${name(this)}.replaceChildren() — 옛 DOM 통째로 비우기`);
  return replaceChildren.apply(this, nodes);
};

// workLoop 한 번에 fiber 3개만 처리하도록 시간을 쪼갠다
let slices = 0;
globalThis.requestIdleCallback = (cb) => {
  slices++;
  ops.push(`--- workLoop #${slices}`);
  let budget = 3;
  cb({ timeRemaining: () => (budget-- > 0 ? 50 : 0) });
};

function show(title, items) {
  const source = jsx(title, items);
  console.log(`\n========== render(${JSON.stringify(title)}, ${JSON.stringify(items)}) — ${dir} ==========`);
  console.log('\n[1] JSX');
  console.log(source.trim());
  const code = compile(source);
  console.log('\n[2] Babel 변환 결과');
  console.log(code);
  const element = new Function('createElement', `return ${code}`)(createElement);
  console.log('\n[3] Element 트리');
  printElement(element);

  ops = [];
  slices = 0;
  fiber.render(element, container);
  console.log('\n[4] render 단계 → commit 단계 DOM 작업 순서');
  ops.forEach((op) => console.log(`  ${op}`));
  console.log(`\n[5] 화면: ${container.innerHTML}`);
}

try {
  show('v1', ['a', 'b']);
  show('v2', ['a', 'b', 'c']);
} catch (e) {
  console.log(`\n${e.message} — ${dir}/fiber.js의 TODO를 먼저 채우거나, 4일차 버전으로 실행하세요: npm run day07:pipeline -- 04`);
}
