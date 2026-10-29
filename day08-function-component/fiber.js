// 오늘의 구현 과제: 함수 컴포넌트 fiber 처리하기
// `npm test`로 fiber.test.js를 통과시키면 된다.
// 6일차 reconcileChildren·updateDom을 그대로 가져다 쓰므로 6일차 TODO를 먼저 채워야 한다.
// 참고: pomb.us "Build your own React" Step VII(Function Components)

import { createDom } from '../day03-fiber/fiber.js';
import { reconcileChildren, updateDom, forEachFiber, deletions } from '../day06-reconciliation/fiber.js';

// fiber 모양: { type, props, dom, parent, child, sibling, alternate, effectTag }
// 함수 컴포넌트 fiber는 type이 함수이고 dom이 없다(null)
let nextUnitOfWork = null;
export let wipRoot = null;
export let currentRoot = null;

export function render(element, container) {
  const alternate = currentRoot?.dom === container ? currentRoot : null;
  wipRoot = { dom: container, props: { children: [element] }, alternate };
  deletions.length = 0;
  nextUnitOfWork = wipRoot;
  requestIdleCallback(workLoop);
}

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
 * fiber.type이 함수면 updateFunctionComponent, 아니면 updateHostComponent로 자식을 만든다.
 * 다음 fiber 고르기(child → sibling → 부모의 sibling)는 4일차와 같다.
 */
export function performUnitOfWork(fiber) {
  throw new Error('not implemented');
}

// 4일차 performUnitOfWork의 앞부분: DOM을 만들고(없으면) props.children을 reconcile한다
export function updateHostComponent(fiber) {
  if (!fiber.dom) fiber.dom = createDom(fiber);
  reconcileChildren(fiber, fiber.props.children);
}

/**
 * 함수를 props로 호출해 자식 element를 얻고, 그 하나를 자식으로 reconcile한다.
 * DOM은 만들지 않는다.
 */
export function updateFunctionComponent(fiber) {
  throw new Error('not implemented');
}

export function commitRoot() {
  deletions.forEach(commitWork);
  forEachFiber(wipRoot, commitWork);
  currentRoot = wipRoot;
  wipRoot = null;
}

/**
 * 6일차 commitWork에 두 가지를 더한다.
 * 1. 부모 DOM: fiber.parent에 dom이 없으면(함수 컴포넌트) dom이 있는 fiber를 만날 때까지 parent로 올라간다
 * 2. dom이 없는 fiber(함수 컴포넌트)는 PLACEMENT·UPDATE 때 할 일이 없다
 * 3. DELETION은 commitDeletion(fiber, 부모 DOM)에 맡긴다
 */
export function commitWork(fiber) {
  throw new Error('not implemented');
}

/**
 * fiber에 dom이 있으면 domParent에서 떼어 낸다.
 * 없으면(함수 컴포넌트) dom이 있는 자식을 찾아 child로 내려간다.
 */
export function commitDeletion(fiber, domParent) {
  throw new Error('not implemented');
}
