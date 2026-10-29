# 10일차 / 56 — useEffect 내부 (2026-10-29 목)

오늘 할 일: passive·layout effect가 언제 실행되는지 정리하고, mini React에 useEffect 구현하기

## 1. 질문 (5분)

- [ ] useEffect와 useLayoutEffect는 commit 단계에서 각각 언제 실행되고, 왜 시점이 다른가요?
- [ ] deps 비교는 어디서 일어나고, 의존성이 바뀌면 cleanup → setup 순서는 어떻게 보장되나요?
- [ ] effect가 Fiber의 flags와 updateQueue(effect 리스트)에 어떻게 기록되나요?
- [ ] (내 질문)

## 2. 읽기·구현 (40분)

참고:

- React 문서 [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects) — 먼저 훑기
- React 문서 [useLayoutEffect](https://react.dev/reference/react/useLayoutEffect)
- (소스를 보고 싶으면) [ReactFiberHooks.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberHooks.js)의 `pushEffect`, [ReactFiberCommitWork.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberCommitWork.js)의 `commitHookEffectListMount`

오늘 코드는 9일차 `render`·`useState`를 그대로 씁니다. **6·8·9일차 TODO를 먼저 채워야** 오늘 테스트와 실험이 돌아갑니다.

오늘은 effect를 9일차 `fiber.hooks` 배열에 `{ tag, create, destroy, deps, hasChanged }`로 넣습니다. React는 hook 리스트와 별도로 fiber의 `updateQueue`에 effect 리스트를 만들고, 실행할 effect가 있으면 fiber `flags`에 표시합니다.

### 구현 — effect 기록하고 commit 뒤에 실행하기

[fiber.js](./fiber.js)의 TODO 두 개를 채웁니다.

1. `pushEffect(tag, create, deps)`: render 중에 불립니다. 옛 hook의 deps와 비교해 `hasChanged`를 정하고 hook으로 기록만 합니다.
2. `commitEffects(root)`: commit이 끝날 때마다 불립니다.
   - layout effect는 바로 실행합니다.
   - passive effect는 `schedulePassive`(setTimeout)로 미뤄서 실행합니다.
   - 둘 다 cleanup을 트리 전체에서 먼저 하고 setup을 합니다. 지워진 컴포넌트는 cleanup만 합니다.

`useEffect`·`useLayoutEffect`(둘 다 `pushEffect`를 부르는 한 줄), `schedulePassive`, `commitListeners` 연결은 채워져 있습니다.

```bash
npm test
```

[테스트](./fiber.test.js)는 다음을 확인합니다.

- passive가 commit 직후가 아니라 한 박자 뒤에 실행되는지
- layout이 passive보다 먼저인지
- deps 세 가지 경우(없음 / `[]` / `[x]`)
- cleanup → setup 순서
- 컴포넌트가 지워질 때 cleanup이 불리는지
- useState와 섞여도 순번이 맞는지

보면서 확인할 것:

- `pushEffect`에서 바로 `create()`를 부르면 어떤 테스트가 깨지나요? 왜 그런가요?
- deps 비교는 render 단계와 commit 단계 중 어디서 하나요? 실행은 어디서 하나요?
- 트리 전체 cleanup을 먼저 하지 않고 effect마다 "cleanup → setup"을 하면 순서가 어떻게 달라지나요?

### 실험 1 — 오늘 구현의 실행 시점

```bash
npm run day10:timing
```

[01-effect-timing.js](./01-effect-timing.js)는 layout effect와 passive effect가 하나씩 있는 `Box`를 네 번 그립니다.

1. 처음
2. 같은 props
3. color 바뀜
4. 지움

render, effect setup·cleanup, workLoop가 끝난 지점, 다음 작업(setTimeout) 지점을 순서대로 찍고, 각 시점의 화면 HTML도 함께 찍습니다. 구현 전에는 `not implemented`만 나옵니다.

보면서 확인할 것:

- render 중에 찍힌 화면과 layout effect 안에서 찍힌 화면은 어떻게 다른가요?
- "workLoop 끝" 줄은 layout과 passive 사이 중 어디에 오나요? 브라우저였다면 그 지점에서 무엇을 할 수 있을까요?
- 같은 props로 다시 그릴 때 effect가 하나도 안 찍히는 이유는 무엇인가요?

### 실험 2 — 실제 React의 실행 시점

```bash
npm run day10:react
```

[02-react-effects.js](./02-react-effects.js)는 실제 React(react-dom, jsdom)로 `Item` 두 개짜리 목록을 세 번 다룹니다.

1. `root.render`(기본 우선순위)로 처음 그리기
2. `flushSync`로 `v` 바꾸기
3. `unmount`

각 단계에서 render, layout·passive의 setup·cleanup, 호출이 반환된 지점을 순서대로 찍습니다.

보면서 확인할 것:

- `root.render()`가 반환된 시점에 render는 끝났나요? 오늘 구현의 `render`와 비교하면 어떤가요?
- 두 `Item`의 cleanup과 setup은 어떤 순서로 섞이나요? 오늘 구현과 같은가요?
- `flushSync`일 때 passive effect는 `flushSync()`가 반환되기 전과 후 중 언제 실행되나요? 기본 우선순위일 때와 다른가요?

## 3. 정리 (15분, 설명하듯)

### useEffect와 useLayoutEffect의 실행 시점과 이유

### deps 비교 위치와 cleanup → setup 순서

### effect가 fiber에 기록되는 방식 (flags, updateQueue)

### 오늘 새로 안 것 / 남은 의문
