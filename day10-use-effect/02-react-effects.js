// 실제 React에서 useLayoutEffect·useEffect가 실행되는 시점과 cleanup 순서를 찍는다
import { JSDOM } from 'jsdom';
import { createElement as h, useEffect, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync, version } from 'react-dom';

const { window } = new JSDOM('<!doctype html><div id="root"></div>');
globalThis.window = window;
globalThis.document = window.document;
const container = window.document.getElementById('root');

const log = (line) => console.log(`  ${line}`);
const html = () => container.innerHTML || '(빈 화면)';

function Item({ name, v }) {
  log(`render ${name}${v}`);
  useLayoutEffect(() => {
    log(`layout setup ${name}${v} — 화면: ${html()}`);
    return () => log(`layout cleanup ${name}${v}`);
  }, [v]);
  useEffect(() => {
    log(`passive setup ${name}${v}`);
    return () => log(`passive cleanup ${name}${v}`);
  }, [v]);
  return h('li', null, `${name}${v}`);
}
const app = (v) => h('ul', null, h(Item, { name: 'a', v }), h(Item, { name: 'b', v }));
const wait = () => new Promise((resolve) => setTimeout(resolve, 20));

console.log(`react-dom ${version}`);
const root = createRoot(container);

console.log('\n## root.render (기본 우선순위)');
root.render(app(1));
log('--- root.render() 반환');
await wait();
log('--- 20ms 뒤');

console.log('\n## flushSync로 v 바꿈');
flushSync(() => root.render(app(2)));
log('--- flushSync() 반환');
await wait();
log('--- 20ms 뒤');

console.log('\n## unmount');
root.unmount();
log('--- unmount() 반환');
await wait();
