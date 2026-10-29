// 조건문 안에서 useState를 부르면 hook 순번이 어긋나는 것을 오늘 구현한 useState로 본다
import { JSDOM } from 'jsdom';
import { createElement as h } from '../day01-jsx-createElement/createElement.js';
import { render, useState, currentRoot } from './fiber.js';

const { document } = new JSDOM('<!doctype html><div id="root"></div>').window;
globalThis.document = document;
globalThis.requestIdleCallback = (cb) => cb({ timeRemaining: () => 50 });
const container = document.getElementById('root');

function Profile({ showName }) {
  let name = '(없음)';
  if (showName) [name] = useState('kim'); // 조건부 hook
  const [age] = useState(20);
  const [city] = useState('seoul');
  return h('p', null, `name=${name} age=${age} city=${city}`);
}

function show(showName) {
  render(h(Profile, { showName }), container);
  const fiber = currentRoot.child;
  console.log(`\n## showName=${showName}`);
  console.log(`화면: ${container.textContent}`);
  fiber.hooks.forEach((hook, i) => {
    const old = fiber.alternate?.hooks?.[i];
    console.log(`  hooks[${i}] state=${JSON.stringify(hook.state)}  ← 옛 hooks[${i}]: ${old ? JSON.stringify(old.state) : '없음(초기값 사용)'}`);
  });
}

try {
  show(true);
  show(false);
  show(true);
} catch (e) {
  console.log(`${e.message} (9일차 TODO와, 가져다 쓰는 6·8일차 TODO를 먼저 채우세요)`);
}
