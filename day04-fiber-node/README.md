# 4일차 / 56 — Fiber 노드 구조 (2026-10-23 금)

오늘 할 일: child·sibling·return·alternate 구조를 이해하고, render 단계와 commit 단계를 나눈 performUnitOfWork 구현하기

## 1. 질문 (5분)

- [ ] Fiber는 트리를 왜 child·sibling·return 포인터로 연결할까요? 재귀 없이 순회하면 어떤 점이 좋을까요?
- [ ] alternate(current ↔ workInProgress 더블 버퍼링)는 어떤 문제를 해결하고, commit 뒤에 두 트리는 어떻게 바뀔까요?
- [ ] performUnitOfWork는 다음 작업 단위를 어떤 순서로 고를까요? (child → sibling → 부모의 sibling)
- [ ] (내 질문)

## 2. 읽기·구현 (40분)

참고:

- Rodrigo Pombo, [Build your own React](https://pomb.us/build-your-own-react/) — Step IV: Fibers(어제 복습), Step V: Render and Commit Phases, Step VI: Reconciliation 앞부분(`alternate`, `currentRoot`)
- React 소스 [packages/react-reconciler/src/ReactFiber.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiber.js)의 `FiberNode` 생성자

오늘 코드에서는 어제처럼 `parent`라고 씁니다. React 소스에서는 같은 포인터를 `return`이라고 부릅니다.

### 실험 1 — fiber 트리의 포인터 찍어 보기

```bash
npm run day04:tree
```

[01-fiber-tree.js](./01-fiber-tree.js)는 어제 만든 `performUnitOfWork`로 작은 트리(`div > h1, p > b`)를 fiber로 바꾸고, 각 fiber의 `child`·`sibling`·`parent`와 방문 순서를 표로 찍습니다. 브라우저는 필요 없습니다(jsdom으로 터미널에서 실행).

변환하는 JSX:

```jsx
<div id="app">
  <h1>a</h1>
  <p><b>b</b>!</p>
</div>
```

순서:

1. 레포 루트에서 위 명령을 실행합니다.
2. 첫 줄 `방문 순서:`는 `performUnitOfWork`가 돌려준 fiber를 차례로 이은 것입니다.
3. 아래 표는 fiber 한 줄마다 `child`·`sibling`·`parent`가 가리키는 fiber입니다. `-`는 null, `ROOT`는 container 루트 fiber, `"a"`처럼 따옴표 안은 텍스트 fiber입니다.
4. 표에서 `"a"` 줄부터 시작해 손으로 다음 fiber를 찾아가 보고, 첫 줄의 순서와 맞는지 확인합니다.

보면서 확인할 것:

- 자식이 2개인 `p`는 자식을 몇 개의 포인터로 가리키나요? 두 번째 자식 `"!"`에는 어떻게 도착하나요?
  - `child` 하나(`p.child = b`)뿐입니다. `"!"`는 `b.sibling`으로 갑니다.
- `"a"`를 처리한 다음 `p`로 가려면 어떤 포인터를 거치나요?
  - `"a"`는 `child`·`sibling`이 없으므로 `parent`로 `h1`에 올라가고, `h1.sibling`으로 `p`에 갑니다.
- 이 표에서 재귀 render의 콜스택이 하던 일을 대신하는 열은 무엇인가요?
  - `parent` 열입니다. 재귀에서는 함수가 return하면 부모로 돌아갔는데, 여기서는 `parent` 포인터를 따라 올라갑니다.

#### 실행 결과 (Node v24.12.0, jsdom 30.1.2, 2026-10-27)

```text
방문 순서: ROOT → div → h1 → "a" → p → b → "b" → "!"
```


| fiber | child | sibling | parent |
| ----- | ----- | ------- | ------ |
| ROOT  | div   | -       | -      |
| div   | h1    | -       | ROOT   |
| h1    | "a"   | p       | div    |
| "a"   | -     | -       | h1     |
| p     | b     | -       | div    |
| b     | "b"   | "!"     | p      |
| "b"   | -     | -       | b      |
| "!"   | -     | -       | p      |


### 실험 2 — FiberNode 필드 비교 (소스 읽기)

순서:

1. 브라우저에서 [https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiber.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiber.js)를 엽니다.
2. 파일 안에서 `function FiberNode(`를 검색합니다(`Cmd+F`). 생성자 본문의 `this.xxx = ...` 줄이 fiber의 필드 목록입니다. 주석(`// Instance`, `// Fiber`, `// Effects`)으로 묶여 있습니다.
3. 오늘 fiber 모양 `{ type, props, dom, parent, child, sibling, alternate }`의 필드마다 대응하는 줄을 찾아 아래 표처럼 적어 봅니다.


| 오늘 fiber    | React `FiberNode`           |
| ----------- | --------------------------- |
| `type`      | type                        |
| `props`     | pendingProps, memoizedProps |
| `dom`       | stateNode                   |
| `parent`    | return                      |
| `child`     | child                       |
| `sibling`   | sibling                     |
| `alternate` | alternate                   |


보면서 확인할 것:

- 오늘 fiber의 각 필드에 대응하는 React 필드 이름은 무엇인가요? (`dom`, `parent`, `props`는 어떻게 부르나요?)
  - `dom` → `stateNode`, `parent` → `return`, `props` → `pendingProps`(이번에 받은 props)와 `memoizedProps`(지난번에 쓴 props) 두 개. `type`·`child`·`sibling`·`alternate`는 이름이 같습니다.
- 오늘 fiber에는 없는데 React에만 있는 필드 중 눈에 띄는 것 3개는 무엇이고, 이름으로 보아 무엇에 쓰일 것 같나요?
  - `flags`·`deletions`: commit에서 할 일(추가·수정·삭제) 표시. pomb.us의 `effectTag`·`deletions`에 해당
  - `memoizedState`·`updateQueue`: 컴포넌트의 상태(hook)와 대기 중인 업데이트
  - `lanes`·`childLanes`: 업데이트의 우선순위
- `index` 필드는 무엇을 담는 것 같나요? 오늘 alternate를 "같은 자리" fiber로 찾을 때와 관계가 있나요?
  - 형제 중 몇 번째인지입니다. `ReactChildFiber.js`에서 `newFiber.index = newIndex`로 넣고, 자식 배열을 비교할 때 `oldFiber.index > newIdx`로 옛 fiber와 새 자리를 맞춥니다. 오늘 `oldFiber = oldFiber.sibling`으로 i번째끼리 짝짓는 것과 같은 일입니다. React는 여기에 `key`를 더해, 자리가 바뀌어도 같은 항목을 찾습니다.

#### 확인한 소스

- `facebook/react` main 브랜치(2026-10-27에 받음)의 `packages/react-reconciler/src/ReactFiber.js` `function FiberNode(`
- 생성자는 `// Instance`(`tag`, `key`, `elementType`, `type`, `stateNode`), `// Fiber`(`return`, `child`, `sibling`, `index`, `ref`, props·state 필드, `mode`), `// Effects`(`flags`, `subtreeFlags`, `deletions`, `lanes`, `childLanes`, `alternate`)로 묶여 있습니다.
- `index` 사용처: `ReactChildFiber.js`의 `newFiber.index = newIndex`, `if (oldFiber.index > newIdx)`

### 구현 — render 단계와 commit 단계 나누기, alternate 잇기

[fiber.js](./fiber.js)의 TODO 두 개(`performUnitOfWork`, `commitRoot`)를 채웁니다. `render`와 `workLoop`는 채워져 있습니다. 어제와 다른 점은 `wipRoot`·`currentRoot`와, 할 일이 끝나면 `commitRoot`를 부르는 한 줄입니다.

1. `performUnitOfWork(fiber)`: 어제 코드에서 `appendChild`를 빼고, 자식 fiber마다 `alternate`(옛 트리의 같은 자리 fiber)를 넣기
2. `commitRoot()`: `wipRoot` 트리를 돌며 DOM을 붙이고, `currentRoot = wipRoot`, `wipRoot = null`

```bash
npm test
```

[테스트](./fiber.test.js)는 render 도중에 멈췄을 때 화면이 비어 있는지, 두 번째 render에서 `alternate`가 옛 트리의 같은 자리 fiber를 가리키는지 확인합니다.

보면서 확인할 것:

- `appendChild`를 commit으로 옮기면, 시간이 모자라 멈췄을 때 화면에는 무엇이 보이나요?
  - 직전에 commit한 화면이 그대로 보입니다. 처음 render라면 빈 화면입니다. 그리다 만 트리는 보이지 않습니다.
- `commitRoot`에서 `currentRoot = wipRoot`를 DOM을 다 붙이기 **전에** 하면 무엇이 잘못될 수 있나요?
  - 붙이는 도중 오류가 나면 `currentRoot`는 새 트리인데 화면은 옛 트리이거나 반쯤 붙은 상태가 됩니다. 다음 render는 화면에 없는 트리를 `alternate`로 삼아 비교하게 됩니다.
- 오늘은 commit 전에 container를 통째로 비웁니다(`shortcut` 주석). 옛 DOM을 재사용하려면 `alternate`에서 무엇을 꺼내 와야 하나요?
  - `alternate.dom`입니다. `alternate.type`이 같으면 새 DOM을 만들지 않고 `alternate.dom`을 가져와 바뀐 props만 고칩니다(5일차).

#### 실행 결과 (Node v24.12.0, jsdom 30.1.2)

`npm test` → 34 passed, 0 failed (4일차 7개 포함)

처음 render한 뒤 두 번째 render를 3단위만 하고 멈췄을 때(테스트 밖에서 따로 실행):

```text
1번째 commit 뒤: <div><h1>a</h1><p>a</p></div>
2번째 render 도중 멈춤: <div><h1>a</h1><p>a</p></div> / 남은 예약 1
```

### 실험 3 — 두 번 render하고 alternate 보기

```bash
npm run day04:alternate
```

[02-alternate.js](./02-alternate.js)는 오늘 구현한 `fiber.js`로 목록을 두 번 render합니다. 새 fiber마다 `alternate`가 옛 트리의 어느 fiber인지 표로 찍습니다. 구현 전에는 `not implemented`만 나옵니다. 브라우저는 필요 없습니다.

두 번 render하는 트리:

```jsx
// 1번째
<div><h1>v1</h1><ul><li>x</li><li>y</li></ul></div>
// 2번째: 제목이 바뀌고 li가 하나 늘어남
<div><h1>v2</h1><ul><li>x</li><li>y</li><li>z</li></ul></div>
```

순서:

1. `npm test`가 통과한 뒤 위 명령을 실행합니다.
2. 위쪽 네 줄: 두 번의 commit 뒤 HTML, commit 뒤 `wipRoot`, 두 번째 루트의 `alternate`가 첫 번째 루트와 같은지(`true`/`false`)
3. 아래 표의 열
   - `fiber`: 두 번째 트리의 fiber (child → sibling 순서)
   - `alternate`: 그 fiber의 `alternate`가 가리키는 옛 fiber (`null`이면 옛 트리에 같은 자리가 없음)
   - `옛 트리 몇 번째`: 옛 트리를 같은 순서로 펼쳤을 때 몇 번째 fiber인지
   - `dom 같음`: 새 fiber와 옛 fiber가 같은 DOM 노드를 쓰는지

보면서 확인할 것:

- 두 번째 루트의 `alternate`는 무엇인가요? commit 뒤 `wipRoot`는 무엇인가요?
  - 첫 번째 루트입니다(`true`). commit 뒤 `wipRoot`는 `null`입니다.
- 새로 생긴 세 번째 `li`의 `alternate`는 무엇인가요? 왜 그런가요?
  - `null`입니다. 옛 `ul`의 자식은 `li` 2개라서 두 번째 `li`의 `sibling`이 `null`입니다. 그 자식 `"z"`도 `null`입니다.
- `dom 같음` 열은 어떻게 나오나요? 오늘 구현이 아직 하지 않는 일은 무엇인가요?
  - ROOT만 `true`(둘 다 container)이고 나머지는 모두 `false`입니다. 짝(`alternate`)은 찾았지만 `alternate.dom`을 재사용하지 않고 매번 새로 만듭니다. 바뀐 것만 고치는 일(재조정)은 아직 하지 않습니다.

#### 실행 결과 (Node v24.12.0, jsdom 30.1.2)

```text
1번째 commit 뒤 HTML: <div><h1>v1</h1><ul><li>x</li><li>y</li></ul></div>
2번째 commit 뒤 HTML: <div><h1>v2</h1><ul><li>x</li><li>y</li><li>z</li></ul></div>
commit 뒤 wipRoot: null
2번째 루트.alternate === 1번째 루트: true
```


| fiber | alternate | 옛 트리 몇 번째 | dom 같음 |
| ----- | --------- | --------- | ------ |
| ROOT  | ROOT      | 0         | true   |
| div   | div       | 1         | false  |
| h1    | h1        | 2         | false  |
| "v2"  | "v1"      | 3         | false  |
| ul    | ul        | 4         | false  |
| li    | li        | 5         | false  |
| "x"   | "x"       | 6         | false  |
| li    | li        | 7         | false  |
| "y"   | "y"       | 8         | false  |
| li    | null      | -         | -      |
| "z"   | null      | -         | -      |


### 실험 4 — 그리는 동안 화면 비교

```bash
npm run day04:serve
```

실험 페이지: [http://localhost:5173/day04-fiber-node/03-commit.html](http://localhost:5173/day04-fiber-node/03-commit.html)

서버가 출력하는 주소(`http://localhost:5173/day04-fiber-node/`)는 폴더라서 열면 `not found`가 나옵니다. 위처럼 파일 이름까지 붙여서 엽니다. 5173 포트가 이미 쓰이고 있으면(`EADDRINUSE`) 이미 떠 있는 서버를 그대로 쓰거나, `PORT=5174 npm run day04:serve`로 띄우고 주소의 포트를 바꿉니다.

페이지 구성: 위에서 좌우로 움직이는 빨간 공(메인 스레드가 막히면 멈춤), 노드 수 입력(기본 40만 = `li` 10만 개), 버튼 두 개, 그 아래 로그.

순서 (Chrome 시크릿 창에서):

1. 터미널에서 위 명령으로 서버를 띄웁니다. 실험이 끝날 때까지 끄지 않습니다.
2. 시크릿 창(`Cmd+Shift+N`)에 실험 페이지 주소를 엽니다.
3. **fiber마다 바로 붙이기 (3일차)** 버튼을 누르고, 로그가 `화면의 li 100000 / 100000`에서 멈출 때까지 기다립니다. 그동안 공이 움직이는지, 화면에 목록이 조금씩 생기는지 봅니다.
4. 페이지를 새로고침(`Cmd+R`)합니다. 이전 결과가 남아 있으면 비교가 섞입니다.
5. **commit에서 한 번에 (4일차)** 버튼을 누르고 3번과 같이 봅니다.
6. 두 로그를 복사해 둡니다. 로그 형식:
   - `1234ms: 화면의 li 5000 / 100000` — 버튼을 누른 뒤 지난 시간과, 그때 화면에 붙어 있던 `li` 개수 (200ms마다 한 줄)
   - `Long Task: 312ms` — 50ms 넘게 메인 스레드를 잡은 작업 하나의 길이
7. (선택) DevTools(`Cmd+Option+I`) → Performance 탭 → 녹화 버튼 → 버튼 클릭 → 다 붙으면 녹화 중지. Main 트랙에서 빨간 표시가 붙은 긴 작업이 어디에 있는지 봅니다.

결과에는 Chrome 버전, 창 종류(시크릿), 버튼을 직접 클릭했는지 함께 적습니다.

보면서 확인할 것:

- 3일차 방식에서는 `li` 개수가 어떻게 늘어나나요? 4일차 방식에서는요?
  - 3일차: 조금씩 늘어납니다. 처음 1초에 3만 개쯤 붙고, 그 뒤로는 갈수록 느려져 4만\~7.5만 개에서 거의 멈췄습니다(300초까지 다 붙지 않음). 붙은 DOM이 커질수록 공을 다시 그리는 데 프레임을 다 써서 idle 시간이 없어지기 때문입니다(아래 원인).
  - 4일차: 0개였다가 한 번에 10만 개가 됩니다. 첫 로그 줄이 이미 `100000 / 100000`입니다.
- 4일차 방식에서 Long Task는 언제 생기나요? 3일차와 비교해 길이는 어떤가요?
  - commit 때 한 번 크게 생깁니다(655ms, 786ms). trace를 녹화한 회차에서는 `commitRoot`가 붙이는 JS 281ms와, 이어서 브라우저가 레이아웃을 계산하는 750ms로 나뉩니다. 3일차는 50\~134ms짜리가 계속 이어집니다. 하나하나는 3일차가 짧고, 가장 긴 하나는 4일차가 5\~6배 깁니다.
- 미완성 화면을 없앤 대가로 무엇을 잃었나요?
  - commit 동안 메인 스레드가 막힙니다. 가장 긴 프레임 간격이 3일차 117\~133ms에서 4일차 650\~800ms로 늘었습니다. render 단계는 쪼갤 수 있지만, 지금 commit은 한 번에 끝까지 붙이므로 쪼갤 수 없습니다.

#### 실행 결과 (Chrome 156.0.8078.48, 2026-10-27)

측정 방식: Claude가 새 Chrome 창(`--incognito`, 빈 프로필이라 확장 프로그램 없음)을 띄우고 DevTools Protocol `Input.dispatchMouseEvent`로 버튼을 마우스 클릭했습니다(스크립트 `click()`도 사람 클릭도 아님). 버튼마다 페이지를 새로 불러왔고, 탭은 보이는 상태·포커스 있음(`visibilityState=visible`, `hasFocus()=true`)이었습니다. 가장 긴 프레임 간격은 페이지에 rAF 간격 기록을 더해 쟀습니다. 공이 움직이는지는 눈으로 보지 않았습니다(아직 직접 확인하지 않음).


|             | 3일차 (바로 붙이기)                                                           | 4일차 (commit 한 번에)                                           |
| ----------- | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| 화면의 `li`    | 248ms 15375 → 1227ms 38898 → 32초 69538 → 128초 74876 → 300초 75184 (미완료) | 880ms·1084ms 첫 줄에 100000                                    |
| Long Task   | 50\~134ms가 끝없이 (300초 동안 3477개)                                         | 655ms, 그 뒤 103\~106ms가 계속 / 2회차 58ms, 786ms, 그 뒤 103\~107ms |
| 가장 긴 프레임 간격 | 117ms, 133ms                                                           | 650ms, 800ms                                                |


3일차는 2번 쟀고 둘 다 7.5만 개 근처에서 멈췄습니다(120초에 76195, 300초에 75184).

3일차 README의 Fiber 측정(27번, 8874ms에 완료)과 다릅니다. 그쪽은 이번에 다시 재지 않았습니다.

**trace 녹화 (Performance 탭 녹화와 같은 trace를 DevTools Protocol `Tracing`으로 받음, 렌더러 메인 스레드, 클릭 시점부터)**

3일차 방식, 15초 녹화(끝났을 때 `li` 42487개):


| 구간      | 메인 스레드 작업 합 | PrePaint | Paint | Layout | idle callback (JS) |
| ------- | ----------- | -------- | ----- | ------ | ------------------ |
| 0\~1초   | 929ms       | 336ms    | 143ms | 237ms  | 98ms (20번)         |
| 4\~5초   | 981ms       | 547ms    | 320ms | 99ms   | 3ms (3번)           |
| 12\~13초 | 991ms       | 745ms    | 190ms | 51ms   | 0번                 |


- 메인 스레드가 매초 거의 다 차 있고, 대부분은 JS가 아니라 브라우저의 그리기(PrePaint·Paint)입니다. 15초 동안 PrePaint 9090ms, Paint 3825ms, idle callback 156ms였습니다.
- 50ms 넘는 작업 108개는 안을 펼쳐 보면 모두 그리기였습니다(예: 53ms = PrePaint 30.6 + Layout 13.3 + Paint 5.4).

4일차 방식, 5초 녹화:

- 187ms: idle callback 하나가 281ms 동안 돕니다. 마지막 단위가 끝나고 같은 콜백 안에서 `commitRoot`가 10만 개를 한꺼번에 붙이는 구간입니다.
- 468ms: 이어서 750ms짜리 작업이 옵니다. 붙은 DOM을 브라우저가 처음 계산하는 작업입니다(Layout 405 + 스타일 계산 152 + PrePaint 151).
- 그 뒤로는 109~112ms짜리 작업이 계속 옵니다(PrePaint 85 + Paint 19). 위 실행 결과의 `그 뒤 103~107ms`가 이것입니다.

**원인: 3일차 방식에서 목록이 다 붙지 않는 이유**

멈추는 것은 목록이고 공은 계속 움직입니다. rAF는 매 프레임 불리므로 가장 긴 프레임 간격이 117\~133ms에 그쳤습니다. 다만 trace에서 rAF 호출은 초당 53번(0\~1초)에서 23번(12~13초)으로 줄었습니다.

공 애니메이션 때문에 브라우저는 매 프레임 다시 그립니다. 그런데 그 비용(PrePaint)이 화면에 붙은 `li`가 늘수록 커집니다. 4만~7만 개쯤 되면 한 프레임을 그리는 데 프레임 예산(약 16ms)을 넘기고, 프레임 사이에 빈 시간이 남지 않습니다. `requestIdleCallback`은 빈 시간에만 불리므로 workLoop가 거의 돌지 못합니다.

확인: 3일차 버튼을 누르고 10초 뒤(45069개에서 멈춘 상태)에 공을 `display: none`으로 숨겼습니다.


|                          | 숨기기 전 3초  | 숨긴 뒤 3초           |
| ------------------------ | --------- | ----------------- |
| `requestIdleCallback` 호출 | 2번        | 28번               |
| `timeRemaining` 최대       | 0.9ms     | 13.5ms            |
| 화면의 `li`                 | 45069 그대로 | 3.1초 만에 100000 완료 |


앞서 로그를 숨겼을 때는 10초에 약 900개만 늘어 거의 그대로였습니다. 멈춘 원인은 로그가 아니라 공을 다시 그리는 일입니다. 공 하나만 움직이는데 왜 문서 전체 크기만큼 비용이 드는지(Blink 내부)는 확인하지 않았습니다.

## 3. 정리 (15분, 설명하듯)

### child·sibling·return 포인터로 연결하는 이유

1. JS 콜스택에 의존해 트리를 순회하지 못해서 직접 이어주어야 한다
2. 중간에 멈췄다가 이어할수 있게끔 하기 위해서
3. nextUnitOfWork 가 포인터 역할. 멈출때는 그 변수 하나만 남기고 함수에서 빠져나오고 다음 Idle 시간에 거기서부터 이어간다

### alternate(더블 버퍼링)가 해결하는 문제와 commit 뒤의 두 트리

새 트리는 미리 다 만든 다음 commit 에서 한번에 다 그리기 때문에 그리다 만 화면이 보이지 않는다.


|               | commit 전   | commit 뒤                              |
| :------------- | :---------- | :------------------------------------- |
| `wipRoot`     | 새로 만든 트리   | null                                  |
| `currentRoot` | 옛 트리       | 새 트리 (currentRoot = wipRoot)          |
| 옛 트리          | 화면에 그려진 트리 | 다음 render 에서 새 fiber 들의 alternate로 쓰임 |


### performUnitOfWork가 다음 작업을 고르는 순서

다음 fiber: child → 없으면 sibling → 없으면 부모의 sibling → sibling이 없는 조상이 나올때까지 parent 를 따라 계속 올라감 → 더 없으면 null → render 단계가 끝나 commitRoot 불림

### 오늘 새로 안 것 / 남은 의문

