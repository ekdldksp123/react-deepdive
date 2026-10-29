// 오늘의 구현 과제: hook 리스트에 effect를 기록하고, commit 뒤에 실행하기
// `npm test`로 fiber.test.js를 통과시키면 된다.
// 9일차 render·useState를 그대로 쓰므로 9일차(와 6·8일차) TODO를 먼저 채워야 한다.
// 참고: react.dev "Synchronizing with Effects", React 소스 ReactFiberHooks.js의 pushEffect,
//       ReactFiberCommitWork.js의 commitHookEffectListMount

import { render, useState, wipFiber, commitListeners } from '../day09-use-state/fiber.js';
import { forEachFiber, deletions } from '../day06-reconciliation/fiber.js';

export { render, useState };

// effect hook 모양: { tag: 'layout' | 'passive', create, destroy, deps, hasChanged }
// destroy: 지난번 create가 돌려준 정리 함수(없으면 undefined)

export const useEffect = (create, deps) => pushEffect('passive', create, deps);
export const useLayoutEffect = (create, deps) => pushEffect('layout', create, deps);

// passive effect를 화면을 그린 뒤로 미루는 데 쓴다. React는 Scheduler(MessageChannel)로 미룬다
export const schedulePassive = (fn) => setTimeout(fn, 0);

/**
 * render 중에(wipFiber 안에서) 불린다. effect를 hook으로 기록만 하고 실행하지 않는다.
 * 1. oldHook: wipFiber.alternate?.hooks에서 같은 순번의 hook. 순번은 wipFiber.hooks.length
 *    (9일차 useState도 hook마다 hooks에 하나씩 넣으므로 순번이 맞는다)
 * 2. hasChanged: oldHook이 없거나, deps가 없거나(undefined), deps 중 하나라도 Object.is로 다르면 true
 * 3. wipFiber.hooks에 { tag, create, destroy: oldHook?.destroy, deps, hasChanged }를 넣는다
 */
export function pushEffect(tag, create, deps) {
  throw new Error('not implemented');
}

/**
 * commit이 끝날 때마다 불린다(아래 commitListeners). 이때 DOM은 이미 다 붙어 있다.
 * 1. 지금 바로(layout):
 *    - 지워진 fiber(deletions)와 그 자손의 layout effect: destroy
 *    - root 아래 fiber의 hasChanged인 layout effect: 먼저 전부 destroy, 그다음 전부 create
 *      (create가 돌려준 값이 함수일 때만 hook.destroy에 저장. 아니면 undefined)
 * 2. schedulePassive로 미뤄서(passive): 위와 같은 일을 passive effect에 대해
 * deletions는 다음 render 때 비워지므로, passive에서 쓸 지워진 fiber 목록은 지금 복사해 둔다.
 */
export function commitEffects(root) {
  throw new Error('not implemented');
}

commitListeners.push((root) => commitEffects(root));
