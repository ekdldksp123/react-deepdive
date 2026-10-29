# 7일차 / 56 — 복습·버퍼 (2026-10-26 월)

오늘 할 일: 1주차 노트를 면접 답변 형태로 다듬기. 아래 3개 질문에 각각 1~2분 분량으로 말하듯 답해 보기

이번 주 주제: [JSX와 createElement](../day01-jsx-createElement) · [Element → DOM 재귀 render](../day02-render) · [왜 Fiber인가](../day03-fiber) · [Fiber 노드 구조](../day04-fiber-node) · [render/commit 단계](../day05-render-commit) · [Reconciliation](../day06-reconciliation)

## 1. 질문 (5분)

- [ ] JSX가 브라우저 화면에 그려지기까지의 과정을 createElement → Fiber → commit 순서로 설명해 주세요.
- [ ] 재귀 스택 기반 재조정의 한계는 무엇이었고, Fiber의 child·sibling·return 구조는 이를 어떻게 해결하나요?
- [ ] 렌더 단계와 커밋 단계를 나누는 이유는 뭔가요? key가 없거나 index를 key로 쓰면 reconcileChildren에서 어떤 문제가 생기나요?
- [ ] (내 질문)

## 2. 읽기·구현 (40분)

### 버퍼 — 밀린 TODO 마무리

오늘은 버퍼 날이라 밀린 구현부터 끝냅니다. 질문 3의 답은 6일차 `reconcileChildren`을 직접 짜 봐야 나옵니다.

- [ ] 5일차 [fiber.js](../day05-render-commit/fiber.js)의 `commitRefs`
- [ ] 6일차 [fiber.js](../day06-reconciliation/fiber.js)의 `reconcileChildren`, `commitWork`

```bash
npm test
```

### 다시 읽기 — 함수마다 "왜 필요한가" 한 줄

아래 함수를 위에서부터 다시 읽으면서, 각 함수 위에 "왜 필요한가"를 한 줄 주석으로 답니다. "무엇을 하는가"가 아니라 "이게 없으면 무엇이 안 되는가"를 씁니다.

| 일차 | 파일 | 함수 |
| --- | --- | --- |
| 1 | [createElement.js](../day01-jsx-createElement/createElement.js) | `createElement`, `createTextElement` |
| 2 | [render.js](../day02-render/render.js) | `render`, `setProp` |
| 3 | [fiber.js](../day03-fiber/fiber.js) | `workLoop`, `performUnitOfWork` |
| 4 | [fiber.js](../day04-fiber-node/fiber.js) | `render`(`wipRoot`·`alternate`), `commitRoot` |
| 6 | [fiber.js](../day06-reconciliation/fiber.js) | `reconcileChildren`, `commitWork`, `updateDom` |

보면서 확인할 것:

- 2일차 `render`와 3일차 `performUnitOfWork`는 같은 일을 어떻게 다르게 나누나요?
- 4일차 `commitRoot`의 shortcut(container 통째로 비우기)은 6일차에서 무엇으로 바뀌었나요?
- 주석을 달다가 "왜"를 한 줄로 못 쓴 함수가 있나요? 그 함수가 1주차에서 가장 덜 이해된 곳입니다.

### 실험 1 — JSX에서 화면까지 한 번에 따라가기

```bash
npm run day07:pipeline        # 6일차 버전 (reconcileChildren 구현 뒤)
npm run day07:pipeline -- 04  # 4일차 버전
```

[01-pipeline.js](./01-pipeline.js)는 JSX 한 조각을 두 번(제목이 바뀌고 `li`가 하나 늘어남) 그립니다. 각 render마다 다음을 순서대로 찍습니다.

1. JSX
2. Babel 변환 결과(`createElement` 호출)
3. Element 트리
4. render 단계와 commit 단계에서 일어난 DOM 작업 순서(`createElement`·`appendChild`·`removeChild`, workLoop 경계 포함)
5. 화면 HTML

workLoop 한 번에 fiber 3개만 처리하도록 시간을 쪼갭니다.

보면서 확인할 것:

- `render` 줄과 `commit` 줄이 섞이나요? workLoop 경계는 어디에 생기나요?
- 두 번째 render에서 4일차 버전과 6일차 버전의 DOM 작업 수는 각각 몇 개인가요? 차이는 어떤 함수 때문인가요?
- 이 출력의 [1]~[5]에 질문 1의 답 순서를 그대로 맞춰 볼 수 있나요?

## 3. 정리 (15분, 설명하듯)

### JSX가 화면에 그려지기까지 (createElement → Fiber → commit)

### 재귀 스택 재조정의 한계와 child·sibling·return 구조

### render/commit 단계를 나누는 이유와 key 문제

### 오늘 새로 안 것 / 남은 의문
