# 3일차 / 56 — 왜 Fiber인가 (2026-10-22 목)

오늘 할 일: 스택 재조정의 한계 이해, requestIdleCallback 기반 workLoop 구현

## 1. 질문 (5분)

- [ ] React 15의 스택 재조정(Stack Reconciler)은 왜 렌더링을 중간에 멈출 수 없었고, 그게 프레임 드랍으로 이어진 이유는?
- [ ] Fiber는 재귀 호출 스택을 어떤 구조로 바꿔서 "작업 단위 쪼개기·중단·재개"를 가능하게 했나?
- [ ] React는 왜 실제로는 requestIdleCallback이 아니라 자체 Scheduler(MessageChannel)를 쓰나?

## 2. 읽기·구현 (40분)

참고:

- Rodrigo Pombo, [Build your own React](https://pomb.us/build-your-own-react/) — Step III: Concurrent Mode, Step IV: Fibers
- Andrew Clark, [React Fiber Architecture](https://github.com/acdlite/react-fiber-architecture)

### 실험 1 — 재귀 render의 Long Task 먼저 보기

```bash
npm run day03:serve
```

출력된 주소에서 [01-stack-vs-fiber.html](./01-stack-vs-fiber.html)을 열고 **재귀 render (2일차)** 버튼을 누릅니다. 노드 수 기본값은 1만 개입니다(`li` 하나에 `li`·`b`·텍스트 2개). 시크릿 창에서 DevTools Performance 탭으로 녹화해 보세요.

보면서 확인할 것:

- 40만 개 노드에서 `render` 시간과 Long Task 길이는 각각 얼마인가요? 둘은 왜 다른가요?
  - render: 130ms
  - Long Task: 879ms
  - 둘이 다른 이유: render 시간은 JS가 DOM을 만드는 시간만 잰 것이고, Long Task는 그 뒤에 브라우저가 새 DOM을 스타일, 레이아웃, 페인트하는 시간까지 포함하기 때문
- Performance 탭의 `render` → `render` → … 불꽃 그래프에서, 브라우저가 끼어들 수 있는 틈이 있나요?
  - 아니요
- 2일차 실험 2(2만~10만 행)와 비교해, 노드 수가 줄어도 Long Task가 생기나요?
  - 네

#### 실행 결과 (버튼 직접 클릭, 창 종류·Chrome 버전은 이번에 확인하지 않음)

**Live metrics (노드 40만 개, 재귀 render 한 번 클릭 뒤 키보드 몇 번)**

```text
재귀 render: 130ms
Long Task: 879ms, 67ms
가장 긴 프레임 간격: 917ms
그 뒤 Long Task가 계속 찍힘: 51~151ms (대부분 108~125ms)
```


| Live metrics            | 값                                 |
| ----------------------- | --------------------------------- |
| INP                     | 960ms (`pointer`, `button#stack`) |
| 키보드 입력 (`button#stack`) | 120ms, 160ms, 184ms               |
| LCP                     | 0.08s                             |
| CLS                     | 0.27 (45 shifts)                  |


1만 개에서는 render 6~11ms, Long Task 없음이었습니다(실험 2 결과 참고).

**Performance 녹화 (노드 40만 개, 0~25.6초)**

```text
재귀 render: 94ms / Long Task: 847ms / 가장 긴 프레임 간격: 887ms
그 뒤 Long Task: 54~219ms (대부분 130~140ms)가 녹화 끝까지 이어짐
```

- 전체 Summary: Rendering 19,026ms, Painting 4,903ms, Scripting 335ms, System 284ms, Experience 81ms (합계 25,630ms)
- 1st/3rd party: `[unattributed]` 16,526.2ms, `localhost` 120.1ms (확장 프로그램 항목 없음)
- 클릭 직후 Task: 노란색(Scripting) 호출이 아래로 깊게 쌓이고, 바로 보라색(Rendering)이 이어집니다.
- 그 뒤 Task 하나(130.70ms)를 고른 Summary: Scripting 0ms, Rendering 109ms, Painting 21ms, System 1ms
- Frames 트랙은 녹화 내내 노란색, Layout shifts는 20초 근처를 빼고 계속 찍혔습니다.

#### 해설

- render는 130ms인데 Long Task는 879ms입니다. 녹화에서도 클릭 Task 안에서 Scripting 뒤에 Rendering이 이어졌습니다. 나머지 시간은 render가 끝난 뒤 브라우저가 새 DOM을 처리한 시간입니다.
- INP 960ms는 클릭부터 다음 화면이 그려지기까지 걸린 시간입니다. 가장 긴 프레임 간격 917ms와 비슷합니다.
- 다 그린 뒤 계속 찍힌 Long Task는 JS가 아니라 브라우저 렌더링입니다(고른 Task에서 Scripting 0ms). 무엇이 매 프레임 이 렌더링을 일으키는지(공 애니메이션인지, 로그가 길어지며 리스트를 미는 것인지)와 Rendering 109ms가 스타일인지 레이아웃인지는 아직 확인하지 않았습니다.
- CLS는 로그 줄이 늘어나면서 아래 리스트를 밀어낸 것으로 보입니다. render와는 관계없는 실험 페이지 구조 때문입니다. (아직 직접 확인하지 않음)

### 구현 — fiber와 workLoop

[fiber.js](./fiber.js)의 TODO 세 개(`render`, `workLoop`, `performUnitOfWork`)를 채웁니다. `createDom`은 어제 render의 앞부분을 떼어 둔 것이라 그대로 씁니다.

1. `render`: 루트 fiber를 `nextUnitOfWork`에 넣고 `requestIdleCallback(workLoop)` 예약
2. `workLoop(deadline)`: 시간이 남은 동안 `nextUnitOfWork = performUnitOfWork(nextUnitOfWork)`, 남은 일이 있으면 다시 예약
3. `performUnitOfWork(fiber)`: DOM 만들고 부모에 붙이기 → 자식 fiber 만들어 연결 → 다음 fiber 돌려주기

```bash
npm test
```

[테스트](./fiber.test.js)는 Node에 없는 `requestIdleCallback`을 가짜로 바꿔 끼우고, `timeRemaining()`이 정해진 횟수만 시간이 남았다고 답하는 가짜 `deadline`을 넘깁니다.

보면서 확인할 것:

- 어제 재귀 render에서 "어디까지 했는지"를 담던 것은 무엇이었고, 오늘은 무엇이 그 역할을 하나요?
  - 어제 : JS 콜스택
  - 오늘 : `nextUnitOfWork`

- 다음 fiber를 고를 때 왜 child → sibling → 부모의 sibling 순서인가요? 부모로 올라가는 데 `parent` 포인터가 왜 필요한가요?
  - 깊이 우선 탐색이라서. 
  - parent 포인터가 필요한 이유: 재귀에서는 함수가 끝나면 콜 스택이 알아서 부모 호출로 돌아가 줬습니다. 오늘은 콜 스택을 쓰지 않으니 돌아갈 곳을 직접 가리켜야 합니다. 한 서브트리를 다 처리하고 나서 parent를 타고 올라가야 그 부모의 sibling(다음 할 일)을 찾을 수 있습니다.
- `deadline.timeRemaining()`을 일하기 **전에** 확인하는 것과 **후에** 확인하는 것은 무엇이 다른가요? (pomb.us 코드는 어느 쪽인가요?)
  - [pomb.us](http://pomb.us)는 후에 확인. 
  - 후에 확인: 시간이 0이어도 fiber 하나는 처리합니다. 바쁜 페이지에서도 조금씩은 진행되지만, 남은 시간을 fiber 하나만큼 넘길 수 있습니다
  - 전에 확인: 시간이 없으면 하나도 안 합니다. 남은 시간을 넘기지는 않지만, 계속 바쁘면 진행이 멈출 수 있습니다
- 지금 구현은 fiber마다 바로 `appendChild`합니다. 중간에 멈추면 화면에는 무엇이 보이나요? 이게 왜 문제인가요?
  - 무엇이 보이는지: 그때까지 appendChild한 노드만 보임
  - 왜 문제인가: 사용자가 미완성 UI를 보게 됨. 나중에 업데이트까지 하면 옛 화면과 새 화면이 섞여 보일 수도 있음

### 실험 2 — 구현한 workLoop로 다시 그리기

같은 페이지를 새로고침하고 **Fiber render (3일차)** 버튼을 누릅니다. workLoop가 몇 번 나눠 돌았는지, 각 조각의 시작 시 `timeRemaining`이 찍힙니다. 노드 수를 1만 → 5만 → 10만으로 늘려 재귀 render와 비교해 보세요.

보면서 확인할 것:

- Long Task와 가장 긴 프레임 간격은 재귀 render와 비교해 어떻게 달라졌나요? 대신 늘어난 것은 무엇인가요?
  - Long Task: 재귀 render는 783ms 하나였고, Fiber는 50~68ms 여러 개로 쪼개졌습니다
  - 재귀 render는 1초 안팎에 다 그렸지만, Fiber는 workLoop 27번에 8874ms가 걸렸습니다. 화면이 멈추지 않는 대신 다 그릴 때까지 훨씬 오래 걸렸습니다

- `timeRemaining`은 최대 몇 ms까지 나오나요? 공이 움직이는 동안과 멈춘 동안에 차이가 있나요?
  - 최대값: 15.8ms(한 프레임 16.7ms 보다 조금 짧음)
  - 공을 움직일때와 멈췄을때는 비교하지 않았음
- 그리는 도중 Elements 탭에서 `ul` 아래 `li` 개수가 조금씩 늘어나나요?
  - 빠르게 늘어남.  그리는 도중 화면에 반쯤 그려진 리스트가 보임.
- Long Task가 그래도 남는다면, JS가 아니라 어디서 생긴 시간인가요? (2일차 실험 2의 스타일·레이아웃 참고)
  - 브라우저의 스타일·레이아웃·페인트

#### 실행 결과 (시크릿 창, 버튼 직접 클릭, Chrome 버전은 이번에 확인하지 않음)

노드 40만 개, 방식마다 새로고침한 뒤 한 번씩 눌렀습니다.


|                  | 재귀 render                   | Fiber render                                             |
| ---------------- | --------------------------- | -------------------------------------------------------- |
| JS 실행            | render 78ms (한 번에)          | workLoop #1\~#3 시작 시 `timeRemaining` 5.5 / 10.9 / 11.2ms |
| 그리는 동안 Long Task | 748ms, 64ms                 | 51ms, 68ms, 50ms, 64ms                                   |
| 가장 긴 프레임 간격      | 783ms                       | (기록 못 함)                                                 |
| 다 그린 뒤           | 112\~133ms Long Task가 계속 찍힘 | (기록 못 함)                                                 |


- Fiber 쪽은 `Fiber 완료` 줄이 찍히기 전에 화면을 캡처해서, workLoop 총 횟수와 전체 시간은 기록하지 못했습니다.
- 그리는 도중에도 `li`가 화면에 보였습니다.

1만 개에서는 차이가 없었습니다. 재귀 render 6~11ms, Fiber는 workLoop 1번(시작 시 `timeRemaining` 10.1~15.1ms)에 끝났고, Long Task는 없었습니다. 이때는 새로고침 없이 여러 번 눌렀고, 창 종류는 확인하지 않았습니다.

**두 번째 측정 (노드 40만 개, Performance 탭 Live metrics 함께, 창 종류는 확인하지 않음)**


|             | 재귀 render                       | Fiber render                                            |
| ----------- | ------------------------------- | ------------------------------------------------------- |
| JS 실행       | render 138ms                    | workLoop #1\~#3 시작 시 `timeRemaining` 2.1 / 15.8 / 2.9ms |
| Long Task   | 832ms, 59ms, 그 뒤 106\~129ms가 계속 | 50ms(workLoop #1 전), 53ms, 50ms, 54ms, 51ms             |
| 가장 긴 프레임 간격 | 850ms                           | (기록 못 함)                                                |
| 다 그리기까지     | (한 번에)                          | workLoop 27번, 시작부터 8874ms                               |
| INP         | 912ms                           | 96ms                                                    |
| CLS         | 0.20                            | 그리는 도중 0.00, 완료 시점 0.45                                 |


#### 해설

- 재귀 render는 JS 78ms 뒤에 브라우저 렌더링까지 한 Task로 이어져 748ms 동안 막혔습니다. Fiber는 JS를 `timeRemaining` 안에서 끊어서 Long Task가 50~68ms로 줄었습니다.
- Fiber에도 Long Task가 남는 건 Step IV가 fiber마다 바로 `appendChild`하기 때문으로 보입니다. 프레임마다 늘어난 DOM을 브라우저가 다시 스타일·레이아웃해야 합니다. 그리다 만 화면이 보이는 것도 같은 이유이고, Step V(Render·Commit 분리)가 이 문제를 다룹니다. (Performance 탭으로는 아직 직접 확인하지 않음)
- 재귀 render 뒤에 계속 찍힌 약 113ms Long Task는 JS가 아니라 브라우저 렌더링입니다(실험 1 녹화). 무엇이 매 프레임 렌더링을 일으키는지는 아직 확인하지 않았습니다.
- INP가 912ms → 96ms로 줄었습니다. Fiber는 첫 조각만 처리하고 화면에 양보해서, 클릭 뒤 다음 화면이 빨리 나왔습니다.
- 대신 다 그리기까지 8874ms(workLoop 27번)가 걸렸습니다. 재귀 render는 1초 안팎이었습니다. 조각 사이가 평균 약 330ms로 벌어진 이유는 Fiber 쪽을 녹화해 봐야 압니다.
- Fiber 쪽 첫 50ms Long Task는 workLoop #1보다 먼저 찍혔습니다. fiber 작업이 아니라 클릭 핸들러가 Element 트리(10만 행)를 `createElement`로 만드는 시간으로 보입니다. (아직 직접 확인하지 않음)

### 실험 3 — requestIdleCallback vs MessageChannel

같은 서버에서 [02-ric-vs-messagechannel.html](./02-ric-vs-messagechannel.html)을 엽니다. 세 방식으로 콜백을 1초 동안 계속 다시 예약하고, 불린 횟수와 최대 간격을 셉니다. 체크박스를 켜면 매 프레임 12ms씩 메인 스레드를 막아 바쁜 페이지를 흉내 냅니다.

보면서 확인할 것:

- 1초에 `requestIdleCallback`은 몇 번 불리나요? 무엇에 맞춰 불리는 것 같나요?
  - 62회
- 바쁜 페이지에서 `timeRemaining`은 어떻게 변하나요? 일을 할 시간이 충분한가요?
  - 최소 3.3 최대 4.7ms. 충분하지 않은듯
- `setTimeout(0)`은 왜 `MessageChannel`보다 훨씬 적게 불리나요?
  - 메인스레드를 가로채기 때문에?
- 탭을 백그라운드로 보내 두고 측정하면 결과가 어떻게 바뀌나요?
  - 모르겠다
- 이 결과로 볼 때, React Scheduler가 `requestIdleCallback` 대신 `MessageChannel`을 쓰는 이유는 무엇일까요? (참고: [React Scheduler 소스](https://github.com/facebook/react/blob/main/packages/scheduler/src/forks/Scheduler.js)의 `frameInterval`, `shouldYieldToHost`)
  - `requestIdleCallback` 는 메인 스레드가 바쁘던 안바쁘던 1초에 62회 호출되는데 MessageChannel은 비교도 안될정도로 훨씬 많이 호출됨

#### 실행 결과 (버튼 직접 클릭, Chrome 버전은 이번에 확인하지 않음)

창 종류는 이번 측정에서 따로 확인하지 않았습니다(실험 2와 같은 시크릿 창으로 보임). 바쁨 켬 → 끔 순서로 한 번씩 쟀습니다.


| 방식                  | 바쁨 끔                                            | 바쁨 켬 (매 프레임 12ms 점유)                          |
| ------------------- | ----------------------------------------------- | --------------------------------------------- |
| requestIdleCallback | 62회, 최대 간격 17.6ms, `timeRemaining` 14.5\~16.3ms | 62회, 최대 간격 17.8ms, `timeRemaining` 3.3\~4.7ms |
| MessageChannel      | 598,930회, 최대 간격 1.2ms                           | 169,155회, 최대 간격 12.3ms                        |
| setTimeout(0)       | 227회, 최대 간격 5.5ms                               | 121회, 최대 간격 16.5ms                            |


백그라운드 탭 측정은 아직 하지 않았습니다.

처음 측정에서는 MessageChannel·setTimeout 줄이 찍히지 않았습니다. 실험 페이지가 간격을 배열에 모아 `Math.max(...gaps)`로 펼쳤는데, 13만 개쯤부터 `RangeError`가 나서였습니다(Node v24.12.0에서 확인). 측정 중에 버튼을 다시 누르면 측정이 겹치는 문제도 있었습니다. 둘 다 고친 뒤 다시 잰 결과입니다.

#### 해설

- `requestIdleCallback`은 바쁨과 상관없이 1초에 62번, 대략 프레임마다 한 번 불렸습니다. 바쁜 페이지에서는 `timeRemaining`이 3.3~4.7ms로 줄었습니다. 16.7ms에서 점유한 12ms를 뺀 정도입니다.
- MessageChannel은 프레임과 상관없이 계속 불렸습니다(1초에 17만~60만 번). 바쁠 때 최대 간격 12.3ms는 12ms 점유 구간 동안 기다린 시간입니다.
- `setTimeout(0)`은 1초에 227번, 약 4.4ms 간격이었습니다. 브라우저가 중첩된 타이머를 최소 4ms로 늦추기 때문으로 보입니다. (아직 직접 확인하지 않음)

## 3. 정리 (15분, 설명하듯)

### 스택 재조정은 왜 멈출 수 없었나

기존 React(Fiber 이전)의 재조정 과정은 **JavaScript 엔진의 콜 스택(Call Stack) 메커니즘**에 전적으로 의존하고 있어서 동기적이고 중단이 불가능했습니다. JavaScript 엔진은 함수가 호출되면 콜 스택에 쌓이고, 그 함수가 완전히 실행을 끝내고 리턴될 때까지(스택이 빌 때까지) 제어권을 반환하지 않습니다. 즉, 재귀 함수(Recursive function)를 이용해 컴포넌트 트리를 순회하던 기존 방식은 **중간에 멈추거나(Pause), 나중에 이어서 하거나(Resume), 우선순위를 바꾸는(Prioritization) 것이 아예 불가능**했습니다

- **(Claude 보충) 프레임 드랍과 실험 1 근거:** 콜스택이 빌 때까지 브라우저는 화면을 그리지도, 입력을 처리하지도 못합니다. 실험 1에서 40만 노드를 그릴 때 불꽃 그래프에 브라우저가 끼어들 틈이 없었고, Long Task 879ms, 클릭 뒤 다음 화면까지(INP) 960ms가 걸렸습니다. 16.7ms마다 와야 할 프레임이 50개 넘게 밀린 셈입니다.

### Fiber는 무엇을 무엇으로 바꿨나

기존의 함수 호출 스택 기반의 재귀적 트리 순회 방식을 "객체 기반의 가상 스택(Virtual Stack)과 연결 리스트(Linked List) 구조"로 바꾸었습니다.


| **구분**    | **기존 (Stack Reconciliation)** | **개선 후 (Fiber Reconciliation)**       |
| --------- | ----------------------------- | ------------------------------------- |
| **자료 구조** | JavaScript 콜 스택 (Call Stack)  | **Fiber 노드 객체들의 트리 (Linked List)**    |
| **작업 단위** | 컴포넌트 함수 호출 전체 (동기)            | **개별 Fiber 노드 단위 (작은 단위로 쪼갬)**        |
| **제어권**   | 브라우저/엔진 스택에 종속 (중단 불가)        | **React가 직접 제어 (중단, 재개, 취소 가능)**      |
| **우선순위**  | 모든 작업이 동일한 우선순위               | **중요도에 따른 작업 우선순위 지정 (Scheduler 연동)** |


- **Fiber 노드의 정체:** 각 컴포넌트는 이제 하나의 **Fiber 객체**로 매핑됩니다. 이 객체는 `child`, `sibling`, `return`(parent) 포인터를 가져서, 재귀 함수 없이도 다음에 어떤 컴포넌트를 처리해야 할지 **연결 리스트 형태로 직접 추적**할 수 있습니다.
- **작업의 분할 (Incremental Rendering):** 렌더링 작업을 작은 단위(Fiber 단위)로 쪼개고, 브라우저가 바쁠 때는 작업을 잠시 멈추고 메인 스레드 제어권을 브라우저에 돌려준 뒤, 유휴 시간에 남은 작업을 이어서(Resume) 수행할 수 있게 되었습니다.
- **(Claude 보충) 실험 2 근거:** 진행 위치가 콜스택이 아니라 `nextUnitOfWork`에 남아서, 멈췄다가 그 fiber부터 이어서 할 수 있습니다. 40만 노드에서 Long Task는 748ms 한 덩어리 → 50~68ms 여러 개, INP는 912ms → 96ms로 줄었습니다. 대가로 다 그리기까지 8874ms(workLoop 27번)가 걸렸고, fiber마다 바로 `appendChild`해서 그리다 만 화면이 보였습니다.

### requestIdleCallback 대신 Scheduler를 쓰는 이유

React 팀이 브라우저의 내장 API인 `requestIdleCallback` 대신 별도의 **Scheduler** 패키지를 직접 구현해서 쓰는 이유는 **브라우저 지원 문제와 정교한 우선순위 제어의 한계** 때문입니다.

- **브라우저 지원 및 일관성 문제 (**`requestIdleCallback`**의 한계)**
  - 사파리(Safari) 등 일부 주요 브라우저에서 `requestIdleCallback`을 제대로 지원하지 않거나 지원이 늦었으며, 모바일 환경이나 기기 성능에 따라 유휴 시간(Idle time)을 보장받기 어려웠습니다.
  - 브라우저마다 구현 방식이 달라 일관된 사용자 경험을 제공하기 힘들었습니다.
- **정교한 우선순위(Priority) 관리의 부재**
  - `requestIdleCallback`은 단순히 "브라우저가 한가할 때" 콜백을 실행해 줄 뿐, **"사용자 입력(Click, Type)은 즉시 처리하고, 데이터 로딩에 따른 UI 업데이트는 그 다음에, 백그라운드 리스트 렌더링은 나중에"** 같은 세밀한 우선순위 큐(Priority Queue) 시스템을 직접 제어할 수 없습니다.
- **자체적인 타임 슬라이싱(Time Slicing) 제어**
  - Scheduler는 자체적인 타이머 메커니즘(`MessageChannel` 등 활용)을 이용해 프레임 예산(약 5ms 등) 내에서 작업을 수행하고, 시간이 초과되면 즉시 메인 스레드를 양보하는 **정교한 타임 슬라이싱**을 구현합니다. 이를 통해 React가 렌더링 우선순위를 완전히 통제할 수 있게 됩니다.
- **(Claude 보충) 실험 3 근거:** rIC는 바쁘든 아니든 1초에 62회, 즉 프레임마다 한 번만 불렸고, 바쁠 때 `timeRemaining`은 3.3~4.7ms뿐이었습니다. MessageChannel은 프레임과 상관없이 1초에 17만~60만 회 불렸습니다. 그래서 Scheduler는 5ms(`frameInterval`)마다 스스로 양보하고 곧바로 이어서 일할 수 있습니다. 다만 React가 정하는 건 양보 시점까지이고, 브라우저가 언제 그릴지는 통제하지 못합니다.

### 오늘 새로 안 것 / 남은 의문

[pomb.us](http://pomb.us) 흐름대로 fiber 공부하니까 오히려 헷갈리고 대혼돈.. 대충 알겠는데 몇번 더 봐야될듯
