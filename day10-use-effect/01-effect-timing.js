// 오늘 구현한 useEffect·useLayoutEffect가 render·commit·다음 작업(setTimeout) 사이 어디에서 실행되는지 찍는다
import { JSDOM } from 'jsdom';
import { createElement as h } from '../day01-jsx-createElement/createElement.js';
import { render, useEffect, useLayoutEffect } from './fiber.js';

const { window } = new JSDOM('<!doctype html><div id="root"></div>');
globalThis.document = window.document;
const container = window.document.getElementById('root');
const scheduled = [];
globalThis.requestIdleCallback = (cb) => scheduled.push(cb);

const log = (line) => console.log(`  ${line}`);
const html = () => container.innerHTML || '(빈 화면)';

function Box({ color }) {
  log(`render Box(${color}) — 화면: ${html()}`);
  useLayoutEffect(() => {
    log(`layout effect setup (${color}) — 화면: ${html()}`);
    return () => log(`layout effect cleanup (${color})`);
  }, [color]);
  useEffect(() => {
    log(`passive effect setup (${color}) — 화면: ${html()}`);
    return () => log(`passive effect cleanup (${color})`);
  }, [color]);
  return h('div', { className: color }, color);
}

async function step(title, element) {
  console.log(`\n## ${title}`);
  render(element, container);
  while (scheduled.length) scheduled.shift()({ timeRemaining: () => 50 });
  log('--- workLoop 끝 (render + commit이 끝나고 브라우저에 제어권이 돌아가는 지점)');
  await new Promise((resolve) => setTimeout(resolve, 5));
  log('--- 다음 작업 (setTimeout 5ms 뒤)');
}

try {
  await step('처음 render', h(Box, { color: 'red' }));
  await step('같은 props로 다시 render', h(Box, { color: 'red' }));
  await step('color 바뀜', h(Box, { color: 'blue' }));
  await step('Box를 지움', h('p', null, 'empty'));
} catch (e) {
  console.log(`${e.message} (10일차 TODO와, 가져다 쓰는 6·8·9일차 TODO를 먼저 채우세요)`);
}
