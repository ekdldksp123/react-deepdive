// 오늘의 구현 과제: hook 리스트로 useState 만들기
// `npm test`로 fiber.test.js를 통과시키면 된다.
// 6일차 reconcileChildren, 8일차 updateHostComponent·commitWork를 가져다 쓰므로 6·8일차 TODO를 먼저 채워야 한다.
// 참고: pomb.us "Build your own React" Step VIII(Hooks), React 소스 ReactFiberHooks.js의 mountState

import { reconcileChildren, forEachFiber, deletions } from '../day06-reconciliation/fiber.js';
import { updateHostComponent, commitWork } from '../day08-function-component/fiber.js';

// fiber 모양: { type, props, dom, parent, child, sibling, alternate, effectTag, hooks }
// hooks: 함수 컴포넌트 fiber에서 useState를 부른 순서대로 쌓인 hook 배열
let nextUnitOfWork = null;
export let wipRoot = null;
export let currentRoot = null;
export let wipFiber = null; // 지금 render 중인 함수 컴포넌트 fiber
let hookIndex = 0; // wipFiber에서 이번에 부를 hook의 순번

// commit이 끝날 때마다 불릴 함수들. 10일차 useEffect가 여기에 붙는다
export const commitListeners = [];

export function render(element, container) {
  const alternate = currentRoot?.dom === container ? currentRoot : null;
  wipRoot = { dom: container, props: { children: [element] }, alternate };
  deletions.length = 0;
  nextUnitOfWork = wipRoot;
  requestIdleCallback(workLoop);
}

// setState가 부른다. 지난번 commit한 트리를 alternate로 삼아 루트부터 다시 render한다
export function scheduleUpdate() {
  wipRoot = { dom: currentRoot.dom, props: currentRoot.props, alternate: currentRoot };
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
 * 8일차 performUnitOfWork와 같다. 8일차 답을 그대로 가져온다.
 * (이 파일의 updateFunctionComponent를 불러야 하므로 import하지 않고 여기에 둔다)
 */
export function performUnitOfWork(fiber) {
  throw new Error('not implemented');
}

/**
 * 8일차 updateFunctionComponent에 hook 준비를 더한다.
 * 함수를 부르기 전에 wipFiber = fiber, hookIndex = 0, fiber.hooks = []
 */
export function updateFunctionComponent(fiber) {
  throw new Error('not implemented');
}

export function commitRoot() {
  deletions.forEach(commitWork);
  forEachFiber(wipRoot, commitWork);
  currentRoot = wipRoot;
  wipRoot = null;
  commitListeners.forEach((listener) => listener(currentRoot));
}

/**
 * 1. oldHook: 옛 fiber(wipFiber.alternate)의 hooks에서 같은 순번(hookIndex)의 hook
 * 2. hook = { state, queue: [] }. state는 oldHook이 있으면 oldHook.state, 없으면 initial
 * 3. oldHook.queue에 쌓인 action을 차례로 state에 적용한다.
 *    action이 함수면 action(state), 아니면 action 값 그대로가 새 state
 * 4. setState(action):
 *    - 대기 중인 action이 없고(hook.queue가 비었고) 적용 결과가 지금 state와 Object.is로 같으면 아무것도 안 한다
 *    - 아니면 hook.queue에 action을 넣고 scheduleUpdate()
 * 5. wipFiber.hooks에 hook을 넣고 hookIndex를 1 올린 뒤 [hook.state, setState]를 돌려준다
 */
export function useState(initial) {
  throw new Error('not implemented');
}
