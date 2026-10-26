// 오늘의 구현 과제: 재귀 render를 "작업 단위(fiber) + workLoop"로 바꾸기
// `npm test`로 fiber.test.js를 통과시키면 된다.
// 참고: pomb.us "Build your own React" Step III(Concurrent Mode)·Step IV(Fibers)

import { TEXT_ELEMENT } from '../day01-jsx-createElement/createElement.js';
import { setProp } from '../day02-render/render.js';

// fiber 모양: { type, props, dom, parent, child, sibling }
let nextUnitOfWork = null; // 다음에 처리할 fiber (null이면 지금 할 일 없음). 진행 위치가 콜 스택이 아니라 여기 남는다

// 어제 render의 1·2단계(노드 만들기 + props 반영)만 떼어 둔 것. 그대로 쓰면 된다.
export function createDom(fiber) {
  const dom =
    fiber.type === TEXT_ELEMENT
      ? document.createTextNode('')
      : document.createElement(fiber.type);
  for (const [name, value] of Object.entries(fiber.props)) {
    if (name !== 'children') setProp(dom, name, value);
  }
  return dom;
}

/**
 * 루트 fiber를 만들어 nextUnitOfWork에 넣고, workLoop를 requestIdleCallback에 예약한다.
 * 루트 fiber: { dom: container, props: { children: [element] } }
 * DOM은 여기서 건드리지 않는다. 실제 작업은 workLoop가 한다.
 */
export function render(element, container) {
  nextUnitOfWork = { dom: container, props: { children: [element] } };
  requestIdleCallback(workLoop);
}

/**
 * deadline.timeRemaining()이 1ms 이상 남은 동안 performUnitOfWork를 반복한다.
 * 할 일이 남았으면 requestIdleCallback(workLoop)로 다음 유휴 시간에 이어서 한다.
 */
export function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  if (nextUnitOfWork) requestIdleCallback(workLoop);
}

/**
 * fiber 하나를 처리하고 다음 fiber를 돌려준다.
 * 1. fiber.dom이 없으면 createDom으로 만들고, 부모 fiber의 dom에 붙인다
 * 2. props.children마다 fiber를 만들어 child·sibling·parent로 연결한다
 * 3. 다음 fiber: child → 없으면 sibling → 없으면 부모의 sibling(위로 올라가며 찾기)
 *    더 없으면 null
 */
export function performUnitOfWork(fiber) {
  // 1. DOM 만들고 부모에 붙이기 (루트 fiber는 dom이 container라 건너뛴다)
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
    fiber.parent.dom.appendChild(fiber.dom);
  }

  // 2. 자식 fiber 만들기: 첫째는 child, 나머지는 앞 형제의 sibling
  let prevSibling = null;
  for (const element of fiber.props.children) {
    const newFiber = {
      type: element.type,
      props: element.props,
      dom: null,
      parent: fiber,
      child: null,
      sibling: null,
    };
    if (prevSibling) prevSibling.sibling = newFiber;
    else fiber.child = newFiber;
    prevSibling = newFiber;
  }

  // 3. 다음 fiber 고르기
  if (fiber.child) return fiber.child;
  for (let next = fiber; next; next = next.parent) {
    if (next.sibling) return next.sibling;
  }
  return null;
}
