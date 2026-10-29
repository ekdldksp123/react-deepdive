# 6일차 / 56 — Reconciliation (2026-10-25 일)

오늘 할 일: 타입 비교·key·effectTag를 이해하고, reconcileChildren과 commitWork 구현하기

## 1. 질문 (5분)

- [ ] React의 diff는 왜 O(n³)이 아니라 O(n)인가요? 두 가지 휴리스틱(같은 레벨에서 타입 비교, key)은 각각 무엇을 포기하고 무엇을 얻나요?
- [ ] 리스트에서 key를 index로 쓰면 재정렬·삽입 때 어떤 버그(상태 뒤섞임, 불필요한 DOM 재생성)가 생기나요?
- [ ] 타입이 바뀌면 왜 하위 트리 전체를 unmount하나요? 이때 PLACEMENT·UPDATE·DELETION effectTag는 어떻게 붙나요?
- [ ] (내 질문)

## 2. 읽기·구현 (40분)

참고:

- React 문서 [Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state) — 먼저 읽기
- Rodrigo Pombo, [Build your own React](https://pomb.us/build-your-own-react/) — Step VI: Reconciliation
- React 문서(옛 버전) [Reconciliation](https://legacy.reactjs.org/docs/reconciliation.html) — O(n) 휴리스틱 설명

오늘 코드는 직접 구현한 4일차 코드를 기반으로 합니다(5일차 ref는 넣지 않았습니다). 4일차 `commitRoot`의 shortcut(container를 비우고 통째로 다시 붙이기)을 오늘 effectTag로 바꿉니다.

### 읽기 — Preserving and Resetting State

보면서 확인할 것:

- React는 state가 "컴포넌트"에 묶인다고 하지 않고 무엇에 묶인다고 하나요?
- 같은 자리에 같은 컴포넌트가 오면 state는 어떻게 되나요? 다른 컴포넌트가 오면요?
- 같은 자리에서 state를 일부러 초기화하는 방법 두 가지는 무엇인가요?

### 구현 — reconcileChildren과 commitWork

[fiber.js](./fiber.js)의 TODO 두 개를 채웁니다.

1. `reconcileChildren(wipFiber, elements)`: 4일차 `performUnitOfWork`의 자식 만들기 루프를 떼어 낸 자리입니다. `oldFiber = wipFiber.alternate?.child`와 i번째 element를 비교해 effectTag를 붙입니다. 지울 옛 fiber는 `deletions`에 넣습니다.
2. `commitWork(fiber)`: effectTag대로 DOM을 고칩니다. `commitRoot`가 먼저 `deletions`를, 그다음 새 트리를 순서대로 넘겨 줍니다.

`render`·`workLoop`·`performUnitOfWork`·`commitRoot`와, props 차이만 반영하는 `updateDom`은 채워져 있습니다.

```bash
npm test
```

[테스트](./fiber.test.js)는 같은 type이면 DOM을 재사용하는지, type이 바뀌면 하위 트리를 새로 만드는지, 자식이 늘고 줄 때와 앞에 끼워 넣을 때 effectTag와 DOM이 어떻게 되는지 확인합니다.

보면서 확인할 것:

- 루프 조건이 `i < elements.length`만이면 어떤 경우를 놓치나요?
- DELETION fiber는 왜 새 트리(`wipRoot` 아래)에 없고 `deletions`에 따로 모아야 하나요?
- type이 바뀐 자리의 자식 fiber는 왜 전부 PLACEMENT가 되나요? (`alternate`가 무엇인지 보세요)

### 실험 1 — effectTag와 DOM 작업 세기

```bash
npm run day06:diff
```

[01-diff.js](./01-diff.js)는 같은 container에 두 번 render하면서, 두 번째 render에서 fiber마다 붙은 effectTag와 DOM 노드를 몇 개 새로 만들고 몇 번 떼어 냈는지 찍습니다. 변경은 6가지입니다: 텍스트만 바뀜, 끝에 추가, 앞에 추가, 맨 앞 삭제, 부모 type 바뀜, 가운데 type 바뀜. 구현 전에는 `not implemented`만 나옵니다.

보면서 확인할 것:

- "끝에 추가"와 "앞에 추가"는 새로 만든 노드 수가 같나요? 그런데 UPDATE는 몇 개씩인가요?
- "맨 앞 삭제"에서 실제로 떼어 낸 건 어느 `li`인가요? 화면은 맞게 나오나요?
- "부모 type 바뀜"에서 `li`는 type이 그대로인데도 새로 만드나요?
- "가운데 type 바뀜"의 결과 HTML은 순서가 맞나요? 틀렸다면 `commitWork`의 어떤 선택 때문인가요?

### 실험 2 — 실제 React에서 key = index vs key = id

```bash
npm run day06:key
```

[02-react-key.js](./02-react-key.js)는 실제 React(react-dom, jsdom)로 행마다 자기 state(`useState`로 만든 메모)를 가진 목록을 그린 뒤, 맨 앞에 항목을 끼워 넣습니다. key를 index로 줄 때와 id로 줄 때, 각 행의 이름과 메모, 그리고 `li` DOM이 옛 것인지 새 것인지 찍습니다.

보면서 확인할 것:

- key = index일 때 이름과 메모가 서로 맞나요? 맞지 않는 행은 어느 것인가요?
- key = index일 때 새로 만든 `li`는 몇 번째인가요? id일 때는요?
- key = index의 결과는 실험 1의 "앞에 추가"(key 없이 자리로 비교)와 어떤 점이 같나요?

## 3. 정리 (15분, 설명하듯)

### diff가 O(n)인 이유와 두 휴리스틱이 포기하고 얻는 것

### key를 index로 쓸 때 생기는 버그

### 타입이 바뀌면 하위 트리를 통째로 unmount하는 이유와 effectTag

### 오늘 새로 안 것 / 남은 의문
