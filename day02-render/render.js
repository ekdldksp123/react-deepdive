// 오늘의 구현 과제: Element 트리를 실제 DOM으로 그리는 render(element, container)
// `npm test`로 render.test.js를 통과시키면 된다.

import { TEXT_ELEMENT } from '../day01-jsx-createElement/createElement.js';

// onClick, onMouseEnter처럼 on 뒤가 대문자인 prop만 이벤트로 본다
const isEvent = (name) => /^on[A-Z]/.test(name);
const toEventType = (name) => name.slice(2).toLowerCase(); // onClick → click

export function setProp(dom, name, value) {
  if (isEvent(name)) {
    // dom.onClick = fn은 아무 의미 없는 속성일 뿐이라 리스너로 등록해야 한다
    dom.addEventListener(toEventType(name), value);
  } else if (name === 'style') {
    // dom.style = {...}는 무시되므로 개별 속성으로 복사한다
    Object.assign(dom.style, value);
  } else {
    // className, id, nodeValue 등은 DOM 프로퍼티에 그대로 대입한다
    dom[name] = value;
  }
}

/**
 * 1. element.type에 맞는 DOM 노드를 만든다 (TEXT_ELEMENT면 텍스트 노드)
 * 2. children을 뺀 props를 DOM에 반영한다 (onXxx는 이벤트 리스너로)
 * 3. children을 재귀로 render해서 방금 만든 노드 아래에 붙인다
 * 4. 만든 노드를 container에 붙인다
 */
export function render(element, container) {
  const dom =
    element.type === TEXT_ELEMENT
      ? document.createTextNode('')
      : document.createElement(element.type);

  for (const [name, value] of Object.entries(element.props)) {
    // children은 DOM 속성이 아니라 아래에서 재귀로 그릴 대상이다
    if (name === 'children') continue;
    setProp(dom, name, value);
  }

  // 자식을 전부 그리기 전에는 돌아오지 않는다 (중간에 멈출 방법이 없다)
  for (const child of element.props.children) {
    render(child, dom);
  }

  container.appendChild(dom);
}
