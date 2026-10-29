# 8일차 / 56 — 함수 컴포넌트 (2026-10-27 화)

오늘 할 일: mini React에 함수 컴포넌트 Fiber 처리 구현 (updateFunctionComponent / updateHostComponent 분기)

## 1. 질문 (5분)

- [ ] 함수 컴포넌트 Fiber에는 왜 DOM 노드가 없고, commit 단계에서 부모 DOM은 어떻게 찾나요?
- [ ] 렌더 단계에서 `fiber.type(props)`를 호출하는 시점과, 반환된 children이 reconcile되는 흐름은?
- [ ] 함수 컴포넌트를 지울 때 DOM 삭제는 왜 자식 Fiber까지 내려가서(`commitDeletion`) 처리해야 하나요?
- [ ] (내 질문)

## 2. 읽기·구현 (40분)

참고:

- Rodrigo Pombo, [Build your own React](https://pomb.us/build-your-own-react/) — Step VII: Function Components

오늘 코드는 6일차 `reconcileChildren`·`updateDom`을 그대로 가져다 씁니다. **6일차 TODO(`reconcileChildren`, `commitWork`)를 먼저 채워야** 오늘 테스트와 실험이 돌아갑니다.

### 구현 — 함수 컴포넌트 fiber

[fiber.js](./fiber.js)의 TODO 네 개를 채웁니다.

1. `performUnitOfWork(fiber)`: `fiber.type instanceof Function`이면 `updateFunctionComponent`, 아니면 `updateHostComponent`(채워져 있음). 다음 fiber 고르기는 4일차와 같습니다.
2. `updateFunctionComponent(fiber)`: `fiber.type(fiber.props)`로 자식 element를 얻어 reconcile합니다. DOM은 만들지 않습니다.
3. `commitWork(fiber)`: 부모 DOM을 `parent`로 거슬러 올라가며 찾고, dom이 없는 fiber는 PLACEMENT·UPDATE를 건너뜁니다. DELETION은 `commitDeletion`에 맡깁니다.
4. `commitDeletion(fiber, domParent)`: dom이 있으면 떼어 내고, 없으면 `child`로 내려갑니다.

```bash
npm test
```

[테스트](./fiber.test.js)는 함수 컴포넌트를 그리고, 겹쳐 그리고, props를 바꾸고, 지우고, 다른 컴포넌트로 바꿀 때 화면과 fiber를 확인합니다.

보면서 확인할 것:

- 4일차의 `fiber.parent.dom.appendChild(fiber.dom)`를 그대로 두면 어떤 테스트가 어떤 에러로 깨지나요?
- `Greeting`과 `Other`처럼 함수가 바뀌면 `reconcileChildren`은 type을 무엇으로 비교하나요?
- `commitDeletion`이 `child`만 따라 내려가도 되는 이유는 무엇인가요? 함수 컴포넌트가 element 여러 개(Fragment)를 돌려주면 어떻게 될까요?

### 실험 1 — 함수 fiber와 dom의 부모 찾기

```bash
npm run day08:tree
```

[01-function-fiber.js](./01-function-fiber.js)는 `App > Header, List > Item×3` 트리를 그립니다. 출력은 다음과 같습니다.

- 함수가 불린 순서
- fiber마다 dom이 있는지, dom이 어느 DOM 부모에 붙는지, 그 사이에 함수 fiber를 몇 개 건너뛰었는지
- `Item` 두 개를 지우는 두 번째 render에서 실제로 떼어 낸 DOM

구현 전에는 `not implemented`만 나옵니다.

보면서 확인할 것:

- 함수가 불리는 순서는 fiber 방문 순서(child → sibling → 부모의 sibling)와 같나요? `Header`와 `List` 중 누가 먼저인가요?
- `div`는 `<App>`의 자식인데 어디에 붙나요? `"todo"` 같은 텍스트는 함수 fiber를 건너뛰나요?
- 두 번째 render에서 `<Item>` fiber를 지웠는데, 떼어 낸 DOM은 무엇인가요?
- 두 번째 render에서도 `App`·`Header`가 다시 불리나요? 바뀐 게 없는 `Header`까지 다시 부르는 건 나중에 무엇으로 줄일 수 있을까요?

## 3. 정리 (15분, 설명하듯)

### 함수 컴포넌트 fiber에 DOM이 없는 이유와 부모 DOM 찾기

### `fiber.type(props)`를 부르는 시점과 children이 reconcile되는 흐름

### 함수 컴포넌트를 지울 때 자식까지 내려가는 이유

### 오늘 새로 안 것 / 남은 의문
