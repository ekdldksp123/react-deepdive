# 9일차 / 56 — useState 내부 (2026-10-28 수)

오늘 할 일: hook 링크드 리스트와 update queue를 이해하고, mini React에 useState 구현하기

## 1. 질문 (5분)

- [ ] hook이 조건문 안에서 호출되면 왜 깨지나요? (Fiber의 `memoizedState` 링크드 리스트와 호출 순서)
- [ ] setState를 여러 번 부르면 update queue에 어떻게 쌓이고, 다음 렌더에서 어떻게 계산되나요? (`setCount(c => c + 1)` vs `setCount(count + 1)`)
- [ ] 같은 값으로 setState하면 왜 리렌더가 생략되나요? (eagerState·`Object.is` 비교)
- [ ] (내 질문)

## 2. 읽기·구현 (40분)

참고:

- Rodrigo Pombo, [Build your own React](https://pomb.us/build-your-own-react/) — Step VIII: Hooks
- (시간이 남으면) React 소스 [packages/react-reconciler/src/ReactFiberHooks.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberHooks.js)의 `mountState`, `dispatchSetState`

오늘 코드는 6일차 `reconcileChildren`과 8일차 `updateHostComponent`·`commitWork`를 가져다 씁니다. **6·8일차 TODO를 먼저 채워야** 오늘 테스트와 실험이 돌아갑니다.

pomb.us와 React는 hook을 담는 방식이 다릅니다. 오늘은 pomb.us처럼 배열(`fiber.hooks`)로 만듭니다. React는 `fiber.memoizedState`에서 시작하는 링크드 리스트(`hook.next`)로 잇습니다.

### 구현 — hooks 배열과 useState

[fiber.js](./fiber.js)의 TODO 세 개를 채웁니다.

1. `performUnitOfWork`: 8일차 답을 그대로 가져옵니다.
2. `updateFunctionComponent`: 8일차 답에 hook 준비(`wipFiber = fiber`, `hookIndex = 0`, `fiber.hooks = []`)를 더합니다.
3. `useState(initial)`: 옛 fiber의 같은 순번 hook에서 state와 queue를 이어받고, setter를 돌려줍니다. 같은 값이면 render를 예약하지 않습니다.

`scheduleUpdate`(setState가 루트부터 다시 render를 예약)와 `commitRoot`는 채워져 있습니다.

```bash
npm test
```

[테스트](./fiber.test.js)는 초기값, setState 뒤 다시 그리기, 함수 action과 값 action, 같은 값 생략, useState 여러 개와 컴포넌트 여러 개, 부모가 다시 그려질 때 자식 state 유지를 확인합니다.

보면서 확인할 것:

- `setCount(5)`를 부른 바로 그 줄에서 화면은 바뀌나요? state는 어디에 쌓였다가 언제 계산되나요?
- 다음 render에서 hook은 옛 fiber의 hook을 무엇으로 찾나요? 이름인가요, 순번인가요?
- 같은 값 생략 조건에 "hook.queue가 비었을 때"가 붙는 이유는 무엇일까요?

### 실험 1 — 조건부 hook으로 순번 어긋나기

```bash
npm run day09:order
```

[01-hook-order.js](./01-hook-order.js)는 `if (showName)` 안에서만 `useState('kim')`를 부르는 컴포넌트를 `showName`을 true → false → true로 바꿔 가며 그립니다. render마다 화면과, `hooks[i]`가 옛 `hooks[i]`에서 무엇을 이어받았는지 찍습니다. 구현 전에는 `not implemented`만 나옵니다.

보면서 확인할 것:

- `showName=false`일 때 `age`와 `city`에는 각각 무엇이 들어가나요? 왜 그런가요?
- 세 번째 render(다시 true)에서 `city`는 왜 초기값으로 돌아가나요?
- 오늘 구현은 이 상황에서 에러를 내나요?

### 실험 2 — 실제 React의 setState

```bash
npm run day09:react
```

[02-react-state.js](./02-react-state.js)는 실제 React(react-dom, jsdom)로 다음 세 가지를 찍습니다.

1. 한 이벤트 안에서 `setCount(c => c + 1)` 세 번과 `setCount(count + 1)` 세 번의 결과와 render 횟수
2. 같은 값으로 setState했을 때의 render 횟수. 값이 처음부터 같을 때와, 값을 바꾼 직후에 같은 값을 다시 넣을 때를 나눠서 봅니다.
3. 조건부 hook(실험 1과 같은 컴포넌트)을 그렸을 때 React가 내는 에러

보면서 확인할 것:

- setState를 세 번 불렀는데 render는 몇 번인가요?
- 같은 값 setState에서 render가 0번인 경우와 1번 생기는 경우가 있나요? 오늘 구현의 생략 조건과 비교하면 어떤가요?
- React는 조건부 hook을 어떻게 알아채나요? 실험 1의 오늘 구현과 무엇이 다른가요?

## 3. 정리 (15분, 설명하듯)

### 조건문 안의 hook이 깨지는 이유

### setState가 queue에 쌓이고 다음 render에서 계산되는 과정

### 같은 값 setState에서 리렌더가 생략되는 이유

### 오늘 새로 안 것 / 남은 의문
