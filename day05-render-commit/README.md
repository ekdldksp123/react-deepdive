# 5일차 / 56 — render / commit 단계 (2026-10-24 토)

오늘 할 일: 두 단계를 나누는 이유를 이해하고, 부수효과(ref)를 commit 단계에서만 일으키도록 구현하기

## 1. 질문 (5분)

- [ ] render 단계는 중단·재시작될 수 있는데 commit 단계는 왜 동기적으로 한 번에 끝나야 할까요?
- [ ] wipRoot를 따로 두고 마지막에 한 번만 DOM에 반영하지 않으면 사용자는 어떤 화면을 보게 될까요?
- [ ] render 단계에서 부수효과(DOM 조작, 구독)를 하면 안 되는 이유는? StrictMode의 이중 렌더와는 어떻게 연결될까요?



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
  - 목록이 조금씩 붙는 미완성 화면입니다. 248ms에 15375개, 1227ms에 38898개였고, 7.5만 개 근처에서 멈춰 300초가 지나도 다 붙지 않았습니다.
- 4일차 방식에서 화면이 바뀐 순간은 몇 번인가요? 그 대가로 생긴 Long Task는 어느 단계의 일인가요?
  - 한 번입니다. 첫 로그 줄(880ms·1084ms)이 이미 `100000 / 100000`입니다.
  - Long Task는 commit 단계에서 생깁니다. trace에서 `commitRoot`가 10만 개를 붙이는 JS가 281ms였고, 이어서 붙은 DOM을 브라우저가 계산하는 작업이 750ms였습니다. render 단계는 workLoop로 쪼개져 있어서 긴 작업이 생기지 않았습니다.
- commit을 3일차처럼 여러 프레임에 나눠 붙이면 무엇이 다시 생기나요?
  - 프레임 사이에 화면이 그려지므로 미완성 화면이 다시 보입니다.

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
  - 비어있음. render 단계는 dom 을 만들기만 하고 붙이진 않음
- 만든 element 수와 실제로 화면에 있는 element 수가 다른가요? 차이는 어디서 생겼나요?
  - 다르다. 만든 element 수는 9개인데 반해 실제로 화면에 있는 element는 5개.
  - render() 가 wipRoot를 새로 덮어쓰기 때문에 만들던 a 트리는 버려짐
- ref 호출 수는 어느 트리의 `li` 수와 같나요?
  - 마지막으로 commit 된 b 트리의 li 5개와 같음. ref 는 commit 에서만 불리기 때문.
- 만약 `li`를 만들 때마다 서버에 구독 요청을 보냈다면 몇 번 보냈을까요?
  - render 단계에서 보냈다면 8번. 
  - commit 에서 보냈다면 정확히 5번.

한 줄로 줄이면: render는 버려질 수 있는 연습이고, commit은 한 번뿐인 실제 반영이에요. 그래서 부수효과는 commit에 둬요

### 실험 2 — 실제 React StrictMode

```bash
npm run day05:strict
```

[02-strict-mode.js](./02-strict-mode.js)는 실제 React(react-dom 개발 빌드, jsdom)로 같은 컴포넌트를 StrictMode 없이 한 번, StrictMode로 한 번 마운트합니다. render 함수 호출, ref, `useEffect`의 실행·정리를 일어난 순서대로 찍습니다.

보면서 확인할 것:

- StrictMode에서 render 함수는 몇 번 불리나요? 그런데 화면은 몇 번 바뀌나요?
  - 2번 불리고 화면은 1번 바뀜
- ref와 effect는 StrictMode에서 어떤 순서로 불리나요? `ref(null)`·`effect 정리`가 끼어 있는 이유는 무엇일까요?
  - render 가 먼저 다 불리고 나서 ref 1회 호출 후에 effect가 실행된다
- render 함수 안의 `renders++`처럼 render 단계에서 바깥 값을 바꾸면 StrictMode에서 어떻게 드러나나요?
  - Counter는 화면에 `<p>hi</p>` 하나만 나오는데, renders는 2가 돼요. 
  - 바깥 값을 바꾸면 호출 횟수 만큼 결과가 쌓이니까 숫자가 틀어지는 걸로 드러나요.
  - StrictMode는 일부러 render를 두번 불러서 "render에서 부수효과를 하고 있다"는 버그를 개발 중에 보이게 만든 장치에요. 
- 실험 1에서 버려진 render와 StrictMode의 두 번째 render는 어떤 점이 닮았나요?
  - render가 commit 보다 더 많이 불린다는 점

- 실험 1에서는 중단과 재시작 때문에 render 결과 하나가 버려졌어요. 실제 React의 concurrent 렌더링에서도 이런 일이 일어나요.

- StrictMode는 그 상황을 개발 모드에서 일부러 흉내 내요. render를 한 번 더 돌려서 "render는 몇 번 불리든 버려지든 괜찮아야 한다"를 미리 시험하는 거예요.

- 두 경우 모두 결론은 같아요. render에서 한 일은 화면에 안 나오고 사라질 수 있으니, 부수효과(구독, 바깥 값 변경)는 render 단계에 두면 안 돼요.

## 3. 정리 (15분, 설명하듯)

### commit 단계가 동기적으로 한 번에 끝나야 하는 이유

"render는 화면에 안 보이는 wipRoot에서만 일해서 멈춰도 화면이 그대로인데 commit 은 실제 dom 을 바꾸므로 중간에 멈추면 그 상태 그대로 보인다

### wipRoot 없이 바로 DOM에 반영하면 보이는 화면

requestIdleCallback 주기로 화면이 그려져서 미완성된 화면이 보여진다.

commit 동안 메인 스레드가 막힌다.

### render 단계에서 부수효과를 하면 안 되는 이유와 StrictMode

 render에서 한 일은 화면에 안 나오고 사라질 수 있기 때문에 → render 에서 구독을 보내면 정리되지 않을수 있음

StrictMode는 일부러 render를 두번 불러서 "render에서 부수효과를 하고 있다"는 버그를 개발 중에 보이게 만든 장치

### 오늘 새로 안 것 / 남은 의문
