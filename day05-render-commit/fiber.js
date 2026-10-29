// 오늘의 구현 과제: 부수효과(ref 호출)를 render 단계가 아니라 commit 단계에서만 일으키기
// `npm test`로 fiber.test.js를 통과시키면 된다.
// render·workLoop·performUnitOfWork·commitRoot의 DOM 붙이기는 4일차 코드 그대로다.
// 참고: pomb.us Step V, React 소스 ReactFiberWorkLoop.js의 commitRoot

import { setProp } from '../day02-render/render.js';
import { TEXT_ELEMENT } from '../day01-jsx-createElement/createElement.js';

// fiber 모양: { type, props, dom, parent, child, sibling, alternate }
let nextUnitOfWork = null;
export let wipRoot = null;
export let currentRoot = null;

// 3일차 createDom에서 ref도 건너뛴다. ref는 DOM 속성이 아니라 commit 때 부를 함수다
function createDom(fiber) {
  const dom =
    fiber.type === TEXT_ELEMENT
      ? document.createTextNode('')
      : document.createElement(fiber.type);
  for (const [name, value] of Object.entries(fiber.props)) {
    if (name !== 'children' && name !== 'ref') setProp(dom, name, value);
  }
  return dom;
}

// render 도중에 다시 불리면 wipRoot를 새로 만들어 덮어쓴다. 만들던 트리는 버려진다
export function render(element, container) {
  wipRoot = { dom: container, props: { children: [element] }, alternate: currentRoot };
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

export function performUnitOfWork(fiber) {
  if (!fiber.dom) fiber.dom = createDom(fiber);

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

  if (fiber.child) return fiber.child;
  for (let next = fiber; next; next = next.parent) {
    if (next.sibling) return next.sibling;
  }
  return null;
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

// shortcut: 재조정 전이라 container를 비우고 통째로 다시 붙인다. 재조정(effectTag) 일차에 바꾼다
export function commitRoot() {
  wipRoot.dom.replaceChildren();
  forEachFiber(wipRoot, (fiber) => fiber.parent.dom.appendChild(fiber.dom));
  commitRefs(currentRoot, wipRoot);
  currentRoot = wipRoot;
  wipRoot = null;
}

/**
 * DOM을 다 붙인 뒤 commitRoot가 부른다.
 * 1. 옛 트리(oldRoot, 첫 commit이면 null)에서 props.ref가 있는 fiber마다 ref(null)
 * 2. 새 트리(newRoot)에서 props.ref가 있는 fiber마다 ref(fiber.dom)
 * 옛 트리를 모두 떼어 낸(null) 다음에 새 트리를 붙인다(dom). forEachFiber를 쓰면 된다.
 */
export function commitRefs(oldRoot, newRoot) {
  throw new Error('not implemented');
}
