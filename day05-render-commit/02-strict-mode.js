// 실제 React(개발 빌드)에서 StrictMode가 render·ref·effect를 몇 번 부르는지 순서대로 찍는다
import { JSDOM } from 'jsdom';
import { createElement as h, StrictMode, useEffect, act } from 'react';
import { createRoot } from 'react-dom/client';
import { version } from 'react-dom';

const { window } = new JSDOM('<!doctype html><div id="root"></div>');
globalThis.window = window;
globalThis.document = window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let log = [];
let renders = 0;

function Counter() {
  renders++; // render 단계의 부수효과 (해서는 안 되는 일)
  log.push(`render #${renders}`);
  useEffect(() => {
    log.push('effect 실행');
    return () => log.push('effect 정리');
  }, []);
  const ref = (dom) => {
    log.push(dom ? 'ref(dom)' : 'ref(null)');
  };
  return h('p', { ref }, 'hi');
}

async function mount(label, strict) {
  log = [];
  renders = 0;
  const root = createRoot(document.getElementById('root'));
  await act(() => root.render(strict ? h(StrictMode, null, h(Counter)) : h(Counter)));
  console.log(`${label}: ${log.join(' → ')}`);
  console.log(`  render 함수 호출 ${renders}번, 화면: ${document.getElementById('root').innerHTML}`);
  await act(() => root.unmount());
}

console.log(`react-dom ${version}, NODE_ENV=${process.env.NODE_ENV ?? '(없음, 개발 빌드)'}`);
await mount('StrictMode 없음', false);
await mount('StrictMode', true);
