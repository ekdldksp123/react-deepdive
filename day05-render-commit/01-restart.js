// render 도중에 새 render가 오면 render 단계 일은 몇 번 하고, commit 단계 일(ref)은 몇 번 하는지 센다
import { JSDOM } from 'jsdom';
import { createElement } from '../day01-jsx-createElement/createElement.js';
import { render } from './fiber.js';

const { document } = new JSDOM('<!doctype html><div id="root"></div>').window;
globalThis.document = document;
const container = document.getElementById('root');

// render 단계의 일 = DOM 노드 만들기. createElement 호출 수로 센다
let created = 0;
const original = document.createElement.bind(document);
document.createElement = (type) => {
  created++;
  return original(type);
};

// commit 단계의 일 = ref 호출
let refCalls = 0;
const ref = () => refCalls++;

const list = (label) =>
  createElement('ul', null, ...Array.from({ length: 5 }, (_, i) => createElement('li', { ref }, `${label}${i}`)));

// timeRemaining()이 budget번까지만 시간이 남았다고 답하는 가짜 deadline
const deadline = (budget) => ({ timeRemaining: () => (budget-- > 0 ? 50 : 0) });
const scheduled = [];
globalThis.requestIdleCallback = (cb) => scheduled.push(cb);

try {
  render(list('a'), container);
  scheduled.shift()(deadline(4)); // 몇 개만 처리하고 멈춘다
  console.log(`1번째 render 도중 멈춤: 만든 element ${created}개, ref ${refCalls}번, 화면 "${container.innerHTML}"`);

  render(list('b'), container); // 끝나기 전에 새 render
  while (scheduled.length) scheduled.shift()(deadline(Infinity));
  console.log(`2번째 render commit 뒤: 만든 element ${created}개, ref ${refCalls}번`);
  console.log(`화면: ${container.innerHTML}`);
  console.log(`실제로 화면에 있는 element: ${container.querySelectorAll('*').length}개`);
} catch (e) {
  console.log(`만든 element ${created}개, ref ${refCalls}번에서 멈춤: ${e.message} (fiber.js의 TODO를 먼저 채우세요)`);
}
