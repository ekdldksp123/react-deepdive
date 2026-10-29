# 5일차 / 56 — render / commit 단계 (2026-10-24 토)

오늘 할 일: 두 단계를 나누는 이유를 이해하고, 부수효과(ref)를 commit 단계에서만 일으키도록 구현하기

## 1. 질문 (5분)

- [ ] render 단계는 중단·재시작될 수 있는데 commit 단계는 왜 동기적으로 한 번에 끝나야 할까요?
- [ ] wipRoot를 따로 두고 마지막에 한 번만 DOM에 반영하지 않으면 사용자는 어떤 화면을 보게 될까요?
- [ ] render 단계에서 부수효과(DOM 조작, 구독)를 하면 안 되는 이유는? StrictMode의 이중 렌더와는 어떻게 연결될까요?
- [ ] (내 질문)

## 2. 읽기·구현 (40분)

참고:

- Rodrigo Pombo, [Build your own React](https://pomb.us/build-your-own-react/) — Step V: Render and Commit Phases
- React 소스 [packages/react-reconciler/src/ReactFiberWorkLoop.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberWorkLoop.js)의 `commitRoot`
- React 문서 [StrictMode](https://react.dev/reference/react/StrictMode)

계획의 시작 포인트(`appendChild` 빼기, `wipRoot`, `commitRoot`)는 4일차에 이미 구현했습니다. 오늘은 그 코드를 가져와서, 부수효과를 어느 단계에 두어야 하는지를 다룹니다.

### 복습 — 미완성 화면 (4일차 실험 4)

[4일차 실험 4 결과](../day04-fiber-node/README.md#실험-4--그리는-동안-화면-비교)를 다시 봅니다. 새로 실행할 것은 없습니다.

보면서 확인할 것:

- 3일차 방식(fiber마다 바로 붙이기)에서 사용자는 어떤 화면을 보았나요?
- 4일차 방식에서 화면이 바뀐 순간은 몇 번인가요? 그 대가로 생긴 Long Task는 어느 단계의 일인가요?
- commit을 3일차처럼 여러 프레임에 나눠 붙이면 무엇이 다시 생기나요?

### 구현 — ref를 commit에서만 부르기

[fiber.js](./fiber.js)의 TODO 하나(`commitRefs`)를 채웁니다. 나머지는 4일차 코드와 같고, 두 군데만 바뀌었습니다.

- `createDom`이 `ref` prop을 DOM 속성으로 넣지 않습니다.
- `commitRoot`가 DOM을 다 붙인 뒤 `commitRefs(currentRoot, wipRoot)`를 부릅니다.

`commitRefs`가 할 일:

1. 옛 트리에서 `props.ref`가 있는 fiber마다 `ref(null)`
2. 새 트리에서 `props.ref`가 있는 fiber마다 `ref(fiber.dom)`

트리를 도는 `forEachFiber`는 채워져 있습니다.

```bash
npm test
```

[테스트](./fiber.test.js)는 render 도중 멈췄을 때와 render 도중 새 render가 왔을 때 ref가 불리지 않는지, commit 때 ref가 완성된 화면에서 불리는지 확인합니다.

보면서 확인할 것:

- ref를 `performUnitOfWork`(render 단계)에서 부르면 어떤 테스트가 깨지나요? 왜 그런가요?
- 옛 ref를 `null`로 부르는 일을 새 ref보다 **먼저** 하는 이유는 무엇일까요?
- `render`를 도중에 다시 부르면, 만들던 `wipRoot`는 어떻게 되나요? 그 트리에서 만든 DOM 노드는요?

### 실험 1 — render 재시작과 부수효과 세기

```bash
npm run day05:restart
```

[01-restart.js](./01-restart.js)는 `li` 5개짜리 목록을 render하다가 도중에 멈추고, 끝나기 전에 다른 목록으로 다시 render합니다. render 단계의 일은 `document.createElement` 호출 수로, commit 단계의 일은 ref 호출 수로 셉니다. 구현 전에는 `not implemented`에서 멈춥니다.

보면서 확인할 것:

- 멈춘 시점에 화면은 어떤가요?
- 만든 element 수와 실제로 화면에 있는 element 수가 다른가요? 차이는 어디서 생겼나요?
- ref 호출 수는 어느 트리의 `li` 수와 같나요?
- 만약 `li`를 만들 때마다 서버에 구독 요청을 보냈다면 몇 번 보냈을까요?

### 실험 2 — 실제 React StrictMode

```bash
npm run day05:strict
```

[02-strict-mode.js](./02-strict-mode.js)는 실제 React(react-dom 개발 빌드, jsdom)로 같은 컴포넌트를 StrictMode 없이 한 번, StrictMode로 한 번 마운트합니다. render 함수 호출, ref, `useEffect`의 실행·정리를 일어난 순서대로 찍습니다.

보면서 확인할 것:

- StrictMode에서 render 함수는 몇 번 불리나요? 그런데 화면은 몇 번 바뀌나요?
- ref와 effect는 StrictMode에서 어떤 순서로 불리나요? `ref(null)`·`effect 정리`가 끼어 있는 이유는 무엇일까요?
- render 함수 안의 `renders++`처럼 render 단계에서 바깥 값을 바꾸면 StrictMode에서 어떻게 드러나나요?
- 실험 1에서 버려진 render와 StrictMode의 두 번째 render는 어떤 점이 닮았나요?

## 3. 정리 (15분, 설명하듯)

### commit 단계가 동기적으로 한 번에 끝나야 하는 이유

### wipRoot 없이 바로 DOM에 반영하면 보이는 화면

### render 단계에서 부수효과를 하면 안 되는 이유와 StrictMode

### 오늘 새로 안 것 / 남은 의문
