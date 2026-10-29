// 오늘의 구현 과제: 옛 fiber와 새 element를 비교해 effectTag를 붙이고(reconcileChildren),
// commit에서 effectTag대로 DOM을 고치기(commitWork)
// `npm test`로 fiber.test.js를 통과시키면 된다.
// 참고: pomb.us "Build your own React" Step VI(Reconciliation)

import { createDom } from '../day03-fiber/fiber.js';
import { setProp } from '../day02-render/render.js';

// fiber 모양: { type, props, dom, parent, child, sibling, alternate, effectTag }
// effectTag: 'PLACEMENT'(새로 붙이기) | 'UPDATE'(DOM 재사용, props만 고치기) | 'DELETION'(떼어 내기)
let nextUnitOfWork = null;
export let wipRoot = null;
export let currentRoot = null;
export const deletions = []; // 이번 render에서 지울 옛 fiber들. 새 트리에는 없으니 따로 모은다 (8일차도 같이 쓴다)

// 옛 트리는 같은 container에 그렸을 때만 비교 대상이다
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

// 4일차와 같다. 자식 fiber 만들기만 reconcileChildren으로 떼어 냈다
export function performUnitOfWork(fiber) {
  if (!fiber.dom) fiber.dom = createDom(fiber);
  reconcileChildren(fiber, fiber.props.children);

  if (fiber.child) return fiber.child;
  for (let next = fiber; next; next = next.parent) {
    if (next.sibling) return next.sibling;
  }
  return null;
}

/**
 * wipFiber의 자식 element들과 옛 자식 fiber(wipFiber.alternate?.child부터 sibling으로)를
 * 같은 자리(i번째)끼리 비교해 새 자식 fiber를 만들고 child·sibling으로 잇는다.
 * - 같은 type: dom과 alternate는 옛 fiber 것을 그대로, props는 새 element 것, effectTag 'UPDATE'
 * - type이 다르고 새 element가 있음: dom null, alternate null, effectTag 'PLACEMENT'
 * - type이 다르고 옛 fiber가 있음: 옛 fiber에 effectTag 'DELETION'을 붙여 deletions에 넣는다
 * 새 element와 옛 fiber 중 하나라도 남아 있는 동안 반복한다.
 */
export function reconcileChildren(wipFiber, elements) {
  throw new Error('not implemented');
}

// props 차이만 DOM에 반영한다. 사라진 이벤트는 떼고, 바뀌거나 새로 생긴 prop은 setProp으로 넣는다
// shortcut: 사라진 일반 prop은 ''로 덮고, style은 키 단위로 지우지 않는다. 필요해지면 removeAttribute·style 비교를 더한다
export function updateDom(dom, prevProps, nextProps) {
  for (const [name, value] of Object.entries(prevProps)) {
    if (name === 'children' || nextProps[name] === value) continue;
    if (/^on[A-Z]/.test(name)) dom.removeEventListener(name.slice(2).toLowerCase(), value);
    else if (!(name in nextProps)) dom[name] = '';
  }
  for (const [name, value] of Object.entries(nextProps)) {
    if (name === 'children' || prevProps[name] === value) continue;
    setProp(dom, name, value);
  }
}

// root 아래 fiber를 child → sibling 순서로 돌며 visit(fiber)를 부른다 (root 자신은 제외)
export function forEachFiber(root, visit) {
  let fiber = root.child;
  while (fiber) {
    visit(fiber);
    if (fiber.child) {
      fiber = fiber.child;
      continue;
    }
    while (fiber && fiber !== root && !fiber.sibling) fiber = fiber.parent;
    fiber = fiber === root ? null : fiber?.sibling;
  }
}

export function commitRoot() {
  deletions.forEach(commitWork);
  forEachFiber(wipRoot, commitWork);
  currentRoot = wipRoot;
  wipRoot = null;
}

/**
 * fiber 하나의 effectTag대로 DOM을 고친다. 자식은 commitRoot가 따로 돌므로 신경 쓰지 않는다.
 * - 'PLACEMENT': 부모 fiber의 dom에 appendChild (pomb.us와 같은 방식)
 * - 'UPDATE': updateDom(fiber.dom, fiber.alternate.props, fiber.props)
 * - 'DELETION': 부모 fiber의 dom에서 removeChild
 */
export function commitWork(fiber) {
  throw new Error('not implemented');
}
