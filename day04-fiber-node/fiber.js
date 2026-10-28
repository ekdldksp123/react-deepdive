// 오늘의 구현 과제: render 단계와 commit 단계를 나누고, alternate로 옛 트리와 새 트리를 잇기
// `npm test`로 fiber.test.js를 통과시키면 된다.
// 참고: pomb.us "Build your own React" Step V(Render and Commit Phases)·Step VI 앞부분(alternate)

import { createDom } from '../day03-fiber/fiber.js';

// fiber 모양: { type, props, dom, parent, child, sibling, alternate }
// React 소스에서는 parent를 return이라고 부른다
let nextUnitOfWork = null;
export let wipRoot = null; // 지금 만드는 중인 트리(workInProgress)의 루트
export let currentRoot = null; // 마지막으로 화면에 commit한 트리(current)의 루트

/**
 * 새 루트 fiber를 wipRoot에 두고 작업을 시작한다.
 * alternate는 지난번에 commit한 루트(없으면 null)를 가리킨다.
 */
export function render(element, container) {
  wipRoot = { dom: container, props: { children: [element] }, alternate: currentRoot };
  nextUnitOfWork = wipRoot;
  requestIdleCallback(workLoop);
}

// 어제와 같다. 다른 점은 할 일이 다 끝났을 때 commitRoot를 한 번 부르는 것뿐
export function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  if (!nextUnitOfWork && wipRoot) commitRoot();
  if (nextUnitOfWork) requestIdleCallback(workLoop);
}

/**
 * fiber 하나를 처리하고 다음 fiber를 돌려준다. 어제와 달리 DOM에 붙이지 않는다.
 * 1. fiber.dom이 없으면 createDom으로 만들기만 한다 (appendChild는 commit에서)
 * 2. props.children마다 fiber를 만들어 child·sibling·parent로 연결한다
 *    alternate: 옛 트리에서 같은 자리(같은 부모의 i번째 자식)에 있던 fiber, 없으면 null
 *    (fiber.alternate.child에서 시작해 sibling을 따라가면 된다)
 * 3. 다음 fiber: child → 없으면 sibling → 없으면 부모의 sibling, 더 없으면 null
 */
export function performUnitOfWork(fiber) {
  // 1. DOM은 만들기만 한다. 붙이는 건 commitRoot가 한 번에 한다
  if (!fiber.dom) fiber.dom = createDom(fiber);

  // 2. 자식 fiber 만들기. oldFiber는 옛 트리의 같은 자리 fiber
  let oldFiber = fiber.alternate?.child ?? null;
  let prevSibling = null;
  for (const element of fiber.props.children) {
    const newFiber = {
      type: element.type,
      props: element.props,
      dom: null,
      parent: fiber,
      child: null,
      sibling: null,
      alternate: oldFiber,
    };
    oldFiber = oldFiber?.sibling ?? null;
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

/**
 * wipRoot 트리를 child·sibling 순서로 돌며 각 fiber.dom을 부모 dom에 붙인다.
 * 다 붙였으면 currentRoot = wipRoot, wipRoot = null.
 *
 * shortcut: 재조정(옛 DOM 재사용)은 다음 단계라, 붙이기 전에 container를 비운다
 * (wipRoot.dom.replaceChildren()). 5일차 이후에 effectTag로 바꾼다.
 */
export function commitRoot() {
  wipRoot.dom.replaceChildren();
  // performUnitOfWork와 같은 순서로 돈다. pomb.us의 재귀 commitWork는 형제 10만 개(실험 4)에서 스택이 넘친다
  let fiber = wipRoot.child;
  while (fiber) {
    fiber.parent.dom.appendChild(fiber.dom);
    if (fiber.child) {
      fiber = fiber.child;
      continue;
    }
    while (fiber && !fiber.sibling) fiber = fiber.parent;
    fiber = fiber?.sibling;
  }
  currentRoot = wipRoot;
  wipRoot = null;
}
