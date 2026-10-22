# 2일차 / 56 — 렌더링 기초 (2026-10-21 수)

오늘 할 일: Element → DOM을 재귀로 그리는 `render(element, container)` 구현

## 1. 질문 (5분)

- [ ] React Element(평범한 객체)가 실제 DOM 노드가 되기까지 무슨 일이 일어나나요? 텍스트 노드는 왜 따로 처리하나요?
- [ ] 재귀 render는 왜 중간에 멈출 수 없나요? 트리가 크면 메인 스레드에 어떤 문제가 생기나요? (내일 배울 Fiber로 이어지는 질문)
- [ ] props는 DOM에 어떻게 반영되나요? children은 어떻게 빼고, 이벤트 핸들러(`onClick`)는 일반 속성과 어떻게 다르게 다루나요?

## 2. 읽기·구현 (40분)

참고: Rodrigo Pombo, [Build your own React](https://pomb.us/build-your-own-react/) — Step II: The render Function

### 구현 — render

어제 만든 [createElement](../day01-jsx-createElement/createElement.js)가 텍스트를 이미 `TEXT_ELEMENT`로 감싸 두므로, 오늘은 [render.js](./render.js)의 TODO만 채우면 됩니다.

1. `document.createElement(type)` 또는 `document.createTextNode('')`로 노드 만들기
2. `children`을 뺀 props 반영하기 (`onXxx`는 이벤트 리스너로)
3. children을 재귀로 `render(child, dom)`
4. `container.appendChild(dom)`

```bash
npm test
```

[테스트](./render.test.js)는 Node에서 [jsdom](https://github.com/jsdom/jsdom)으로 브라우저의 `document`를 흉내 내서 돌립니다. 마지막 `[도전]` 테스트는 `style` 객체를 다룹니다.

보면서 확인할 것:

- `children`을 빼지 않고 `dom.children = [...]`처럼 대입하면 어떤 에러가 나나요? 왜 그런가요?
- `dom.onClick = fn`으로 대입하면 클릭했을 때 왜 아무 일도 안 일어나나요?
- 텍스트 노드에 `nodeValue`를 props로 넣는 방식과, 처음부터 `createTextNode(text)`로 만드는 방식은 무엇이 다른가요?
  - → 만들어지는 노드는 같습니다(`isEqualNode` → `true`, 숫자 `42`도 둘 다 문자열 `"42"`). 다른 것은 코드 구조입니다. `nodeValue` 방식은 텍스트도 다른 props와 같은 루프로 처리하므로, 텍스트 전용 분기가 노드를 만드는 한 곳으로 줄어듭니다. `nodeValue`는 만든 뒤에도 대입해 바꿀 수 있어서, 나중에 업데이트할 때도 같은 방식으로 다룰 수 있습니다.
- `className`은 되는데 `class`를 props로 넘기면 어떻게 되나요?
  - → 에러는 나지 않지만 클래스가 적용되지 않습니다(`<div></div>`). DOM 요소에는 `class`라는 프로퍼티가 없어서, `dom['class'] = 'card'`는 아무 의미 없는 JS 값만 하나 붙입니다. HTML 속성 `class`에 대응하는 프로퍼티 이름은 `className`입니다.

#### 실행 결과 (Node v24.12.0, jsdom 30.1.2)

```text
--- 3. nodeValue 방식 vs createTextNode(text)
A nodeValue 대입: "42" string
B createTextNode: "42" string
A.isEqualNode(B): true
태그 문자열도 텍스트로: &lt;b&gt;x&lt;/b&gt;
만든 뒤 nodeValue로 바꾸기: 바뀜
--- 4. class prop
innerHTML: <div></div>
div.className: "" / div.getAttribute('class'): null
div['class']: card / 'class' in HTMLElement.prototype: false
className 비교: <div class="card"></div>
```

두 방식 모두 `'<b>x</b>'` 같은 문자열을 태그가 아니라 글자로 넣습니다. `innerHTML`로 넣을 때와 달리 HTML로 해석되지 않습니다.

### 실험 1 — 브라우저에서 그려 보기

```bash
npm run day02:serve
```

출력된 주소에서 [01-basic.html](./01-basic.html)을 열고 DevTools를 확인합니다. (ES 모듈은 `file://`로 열면 막혀서 [로컬 서버](../scripts/serve.js)를 띄웁니다.)

보면서 확인할 것:

- Console에 찍힌 Element 트리와 Elements 탭의 DOM 트리를 나란히 비교하면 무엇이 같고 무엇이 다른가요?
  - → 트리 모양과 자식 순서는 같습니다. `className`은 `class`로 바뀌고, `children`은 속성이 아니라 자식 노드가 됩니다. `TEXT_ELEMENT`는 텍스트 노드로, `onClick`은 HTML에 보이지 않는 리스너로 바뀝니다. `$$typeof`·`key`는 DOM에 옮겨지지 않습니다.
- 버튼의 이벤트 리스너는 DevTools 어디에서 보이나요? (Elements → Event Listeners 탭)
  - → 버튼을 선택하고 Event Listeners 탭을 열면 `click` → `button` `01-basic.html:17`로 보입니다. 링크는 `onClick` 함수를 정의한 줄을 가리킵니다. 나머지 항목은 Ancestors 때문에 함께 보인 확장 프로그램의 리스너입니다.

#### 실행 결과 (Chrome 156.0.8078.35, Node v24.12.0, jsdom 30.1.2)

브라우저 Elements 탭에서는 `#root` 아래에 아래 트리가 생겼습니다.

```text
div#root
└─ div#app.card
   ├─ h1  "안녕, render"
   ├─ p   "숫자도 텍스트가 된다: "  "42"   ← 텍스트 노드 두 줄로 따로 표시
   └─ button  "클릭"
```

버튼을 선택하고 Event Listeners 탭(Ancestors 체크)을 열면 아래처럼 나옵니다.

```text
▸ caip294:wallet_prompt
▾ click
   ▸ button  🗑  01-basic.html:17
▸ eip6963:requestProvider
▸ message
▸ wallet-standard:app-ready
```

같은 Element를 jsdom으로 render한 결과는 아래와 같습니다.

```html
<div id="app" class="card"><h1>안녕, render</h1><p>숫자도 텍스트가 된다: 42</p><button>클릭</button></div>
```

```text
p.childNodes: [ '3:"숫자도 텍스트가 된다: "', '3:"42"' ]
button onclick attr: null / b.onClick: undefined / b.onclick: null
(button.click() 후) clicked
```

Console에 찍힌 Element 트리는 `div` → `props.children: Array(3)` → `h1`·`p`·`button`이고, `button`의 props에는 `onClick: () => console.log('clicked')`와 `children: [TEXT_ELEMENT]`가 들어 있습니다.

#### 해설

**같은 것**

- 트리 모양이 같습니다. Element의 `type`이 그대로 태그 이름이 되고, `props.children` 배열의 순서가 그대로 자식 노드 순서가 됩니다.
- `id: 'app'`은 `id="app"`으로 그대로 옮겨집니다.

**다른 것**

- `className` → `class`: Element에서는 `className`이지만 HTML에는 `class="card"`로 보입니다. render가 `dom.className = 'card'`라는 DOM 프로퍼티에 대입하면, 브라우저가 그 값을 `class` 속성에 반영하기 때문입니다.
- `children`은 사라집니다. Element에서는 props 안의 배열이지만, DOM에서는 속성이 아니라 실제 자식 노드가 됩니다.
- `TEXT_ELEMENT`도 사라집니다. Element 트리에는 `type: 'TEXT_ELEMENT'`라는 객체가 있지만, DOM에는 그런 태그가 없고 텍스트 노드(nodeType 3)만 남습니다.
- 텍스트 노드는 합쳐지지 않습니다. `p`의 자식 `'숫자도 텍스트가 된다: '`와 `42`는 Element에서도 DOM에서도 텍스트 노드 두 개입니다. Elements 탭은 이를 `"숫자도 텍스트가 된다: "`, `"42"` 두 줄로 따로 보여 주고, `innerHTML`은 문자열로 이어 붙여 한 줄로 보여 줍니다. 숫자 `42`는 `nodeValue`에 대입되면서 문자열 `"42"`가 됩니다.
- `onClick`은 HTML에 나타나지 않습니다. `addEventListener`로 등록한 리스너는 속성이 아니어서 `onclick` 속성은 `null`이고, `b.onClick` 프로퍼티도 생기지 않았습니다. 그래도 `click()`을 호출하면 `clicked`가 찍힙니다.
- Element에만 있는 것도 있습니다. `$$typeof`·`key`는 React 내부용 표식이라 DOM에 옮겨지지 않습니다.

**이벤트 리스너는 어디에서 보이나**

- HTML 속성으로는 보이지 않습니다. Elements 탭에서 `button`을 선택하고 오른쪽 패널의 **Event Listeners** 탭을 열면 `click` 아래에 `button` 리스너가 하나 보입니다.
- 링크 `01-basic.html:17`은 리스너를 등록한 곳(`render.js`의 `addEventListener`)이 아니라 **함수가 정의된 곳**, 즉 `onClick: () => console.log('clicked')`가 적힌 줄을 가리킵니다. Console의 Element 트리에서 `onClick`의 `[[FunctionLocation]]`이 같은 `01-basic.html:17`로 나온 것과 일치합니다. 같은 함수 객체가 Element의 props에서 DOM 리스너로 그대로 넘어갔다는 뜻입니다.
- 항목 옆 휴지통 아이콘은 그 리스너를 제거합니다. 누른 뒤 버튼을 클릭하면 `clicked`가 찍히지 않습니다.
- 나머지 `caip294:wallet_prompt`, `eip6963:requestProvider`, `message`, `wallet-standard:app-ready`는 render와 무관합니다. **Ancestors**가 체크되어 있어서 버튼의 조상(`document`, `window`)에 달린 리스너까지 함께 보이는 것이고, 이름으로 보아 지갑 계열 브라우저 확장 프로그램이 등록한 것입니다. Ancestors 체크를 끄면 `click` 하나만 남습니다.
- Console에서 버튼을 선택한 채(`$0`) `getEventListeners($0)`을 실행해도 버튼 자신의 리스너 목록을 볼 수 있습니다. 이 함수는 DevTools Console에서만 쓸 수 있습니다.
- 참고로 진짜 React는 버튼마다 리스너를 달지 않고 루트 컨테이너에 이벤트를 위임합니다. 그래서 React 앱에서 같은 패널을 열면 리스너가 `#root` 쪽에 보입니다.

### 실험 2 — 재귀 render가 메인 스레드를 막는지

같은 서버에서 [02-blocking.html](./02-blocking.html)을 엽니다. 공은 `requestAnimationFrame`으로 움직이고, 버튼을 누르면 행 수만큼의 리스트를 한 번에 render합니다. 화면에 render 시간, 가장 긴 프레임 간격, Long Task(50ms 이상 메인 스레드 점유)가 찍힙니다.

보면서 확인할 것:

- 행 수를 5천 → 2만 → 10만으로 늘리면 render 시간과 공의 멈춤은 어떻게 변하나요? 60fps의 한 프레임(약 16.7ms)과 비교해 보세요.
  - → render 시간은 5천 행에서 30ms 안팎, 10만 행에서 150~500ms로 늘었습니다. 5천 행에서 이미 한 프레임의 약 2배입니다. 공이 멈춘 시간은 render 시간보다 훨씬 길었습니다(5천 행 약 200ms, 10만 행 0.9~4.3초). render가 끝난 뒤 브라우저가 새 DOM의 스타일·레이아웃·페인트를 처리하는 시간까지 더해지기 때문입니다.
- render 도중에 버튼을 다시 누르거나 입력창에 타이핑하면 언제 반응하나요?
  - → render와 그 뒤의 렌더링 작업이 모두 끝난 다음에야 반응합니다. 입력은 버려지지 않고 줄을 서 있다가, 메인 스레드가 비면 순서대로 처리됩니다.
- 재귀 함수의 어느 지점에서 "잠깐 멈추고 브라우저에 양보"하고 싶어지나요? 지금 구조로는 왜 그게 어렵나요?
  - → 자식 하나를 render하고 다음 자식으로 넘어가는 지점입니다. 그런데 지금은 "어디까지 했는지"가 JS 콜 스택에만 있습니다. 함수에서 돌아오면 그 스택이 사라지므로, 멈췄다가 이어서 할 방법이 없습니다.
- DevTools Performance 탭으로 녹화하면 Long Task가 어떻게 보이나요?
  - → Main 트랙에 `Task` 막대 하나가 길게 생기고, 50ms를 넘은 부분이 빨간 빗금으로 칠해집니다. 그 Task 안에 `Event: click`(render 재귀 불꽃 그래프) → `Recalculate style` → `Layout` → `Pre-paint`가 이어집니다. 2만 행에서 render는 약 40ms, 그 뒤 렌더링이 약 145ms였습니다.

#### 실행 결과 (Chrome 156.0.8078.35, Node v24.12.0)

Claude in Chrome으로 `02-blocking.html`을 열고 행 수마다 새로고침한 뒤 버튼을 눌렀습니다. 측정 스크립트는 DevTools 없이 페이지 안에서 돌렸습니다. 아래 "다음 프레임"은 클릭부터 그다음 `requestAnimationFrame`이 돌기까지 걸린 시간입니다.


| 행 수     | render 시간 | Long Task     | 가장 긴 프레임 간격 | 다음 프레임 | 그린 뒤 가만히 있을 때 fps |
| ------- | --------- | ------------- | ----------- | ------ | ----------------- |
| 5,000   | 30ms      | 179ms         | 200ms       | 221ms  | 60.7              |
| 20,000  | 120ms     | 150ms, 765ms  | 867ms       | 917ms  | 20.8              |
| 100,000 | 508ms     | 633ms, 3759ms | 4300ms      | 4394ms | 3.5               |


같은 행 수에서도 실행마다 차이가 컸습니다. 다른 실행에서는 20,000행 render가 31ms, 100,000행이 146ms(Long Task 842ms, 가장 긴 프레임 간격 867ms)로 나왔습니다. 그래서 정확한 숫자보다 **자릿수와 증가 방향**을 보는 편이 맞습니다.

10만 행에서 버튼을 실제로 클릭하고 곧바로 `a`, `b` 키를 눌렀을 때 기록입니다. 이벤트의 `timeStamp`(입력이 들어온 시각)과 핸들러가 실제로 돈 시각을 비교했습니다.

```text
click       입력 14487ms → 처리 14499ms
(render 끝  14695ms, 이어서 Long Task 842ms)
keydown a   입력 15410ms → 처리 15518ms   (108ms 대기)
keydown b   입력 15588ms → 처리 15633ms   (45ms 대기)
```

render가 끝난 뒤에도 공이 계속 끊겨서 원인을 좁혀 봤습니다(100,000행, 가만히 있을 때 fps).


| 조건                            | fps  |
| ----------------------------- | ---- |
| 그대로                           | 2.8  |
| 공만 `display: none`            | 4.5  |
| `#log`를 `position: fixed`로 뺌  | 5.3  |
| 리스트(`#root`)를 `display: none` | 59.1 |
| 공 애니메이션(`tick`)을 멈춤           | 60.5 |


20,000행에서 Long Animation Frame API로 프레임을 들여다보면, 한 프레임에 96~136ms가 걸렸습니다. 그 시간은 거의 다 스타일·레이아웃 시작 이후 구간이었고, 스크립트 항목은 없었습니다. 강제 레이아웃(`offsetHeight`)만 재면 1ms도 걸리지 않았습니다. 위 측정은 모두 확장 프로그램이 켜진 일반 창에서 했습니다.

**Performance 탭 녹화 (시크릿 창, 확장 프로그램 없음, 20,000행, 버튼 한 번 클릭)**

눈금에서 읽은 대략값입니다.

```text
Task  ███████████████████████████████████████  약 185ms (50ms 넘는 부분 빨간 빗금)
├─ Event: click → Function call → render → render → …   약 40ms (Scripting)
├─ Recalculate style                                    약 40ms
├─ Layout                                               약 80ms
└─ Pre-paint                                            약 20ms
그 뒤 프레임마다: 작은 Task (Pre-paint 3.68ms + Paint), 프레임 간격 15.7~17.7ms
```

- 선택 구간 2.02~2.45s 요약: Rendering 199ms, Scripting 64ms, Painting 34ms, System 3ms
- 1st/3rd party: `[unattributed]` 278.8ms, `localhost` 21.5ms (확장 프로그램 항목 없음)
- INP 229ms. Interactions 트랙의 `Pointer` 상호작용이 Task가 끝날 때까지 이어집니다.
- 그 전에 확장 프로그램이 켜진 일반 창에서 24초 녹화한 것도 있습니다. 그쪽은 처음부터 끝까지 보라색 막대가 빽빽했고, Rendering 22,152ms·Painting 41ms·Scripting 293ms였습니다. 확장 프로그램 스크립트는 넷을 합쳐 6ms 미만이었습니다.

#### 해설

**render 시간 vs 공이 멈춘 시간**

- 5천 행 render는 30ms로, 이미 한 프레임(16.7ms)을 넘습니다. 그동안 공은 최소 한 프레임을 건너뜁니다.
- 실제로 공이 멈춘 시간은 render보다 훨씬 깁니다. render는 DOM을 만들어 붙이기만 합니다. 화면에 나오려면 그 뒤에 브라우저가 스타일 계산·레이아웃·페인트를 해야 하고, 이것도 메인 스레드에서 한 번에 처리됩니다. 10만 행에서는 이 뒷단(3759ms)이 render(508ms)보다 몇 배 길었습니다.
- 스크립트로 `click()`을 호출해 쟀을 때는 Long Task가 클릭 하나에 두 개씩 찍혔습니다. 첫 번째는 Element를 만들고 render한 클릭 핸들러이고, 두 번째는 그다음 프레임의 렌더링 작업입니다. 실제 마우스 클릭에서는 둘이 Task 하나로 합쳐졌습니다(아래 Performance 탭 참고).

**입력은 언제 반응하나**

- 메인 스레드는 한 번에 하나만 합니다. render 도중이나 뒷단 렌더링 도중에 들어온 클릭·키 입력은 큐에 쌓였다가, 지금 작업이 끝나야 처리됩니다. `keydown a`가 108ms 기다린 것이 그 예입니다. 입력이 사라지지는 않고 늦게 처리될 뿐입니다.
- 측정 스크립트에서 클릭 직전에 건 `setTimeout(0)`도 같은 이유로 클릭 처리와 다음 프레임이 모두 끝난 뒤에야 실행됐습니다(5천 행 41ms, 2만 행 917ms, 10만 행 4393ms).

**그린 뒤에도 공이 끊기는 이유 (원인은 아직 모름)**

- 확장 프로그램이 켜진 일반 창에서는 그린 뒤에도 프레임마다 100ms 안팎이 렌더링에 들었습니다. 2만 행에서 20.8fps, 10만 행에서 3.5fps였습니다. 공 애니메이션(매 프레임 `style.left` 변경)을 멈추거나 리스트를 숨기면 60fps로 돌아왔습니다.
- 시크릿 창에서 녹화하니 2만 행을 그린 뒤에도 프레임 간격이 16~17ms였고, 프레임마다 Pre-paint는 4ms 정도였습니다. 즉 **render나 DOM 크기만으로 생기는 끊김이 아닙니다.** 일반 창 환경의 무언가가 원인입니다.
- 확장 프로그램의 스크립트 시간은 6ms도 안 됐습니다. 그래서 확장 프로그램이 스크립트를 돌려서가 아니라, 페이지에 끼워 넣은 요소나 기능 때문에 브라우저 렌더링 비용이 늘었을 가능성이 있습니다. 확장 프로그램을 하나씩 끄며 재 보지는 않았습니다.
- 처음에 "레이아웃보다 페인트 쪽일 것"이라고 추측했는데 틀렸습니다. 일반 창 24초 녹화에서도 Painting은 41ms뿐이고 Rendering(스타일·레이아웃·Pre-paint)이 대부분이었습니다.
- "DOM 노드가 많으면 그 자체로 비싸다"는 점은 확인됐습니다. 첫 렌더링에서 2만 행의 Layout만 약 80ms였습니다. 이것이 이후 가상 리스트(windowing)를 쓰는 이유와 이어집니다.

**어디서 양보하고 싶은가, 왜 못 하나**

- 양보하고 싶은 곳은 `for (const child of element.props.children) render(child, dom)` 루프에서 자식 하나를 끝낸 직후입니다.
- 지금 구조로는 어렵습니다. "어느 노드의 몇 번째 자식까지 했는가"가 재귀 호출의 **콜 스택**에만 저장돼 있기 때문입니다. 브라우저에 양보하려면 함수에서 돌아와야 하는데, 돌아오는 순간 그 스택이 풀려서 진행 위치가 사라집니다.
- 해결하려면 진행 위치를 콜 스택 밖의 **데이터**(다음에 할 노드를 가리키는 포인터)로 옮겨야 합니다. 그러면 작업을 노드 하나 단위로 쪼개고, `requestIdleCallback` 같은 걸로 남은 시간만큼만 처리할 수 있습니다. 이것이 내일 배울 Fiber의 출발점입니다.
- 브라우저 쪽 뒷단(스타일·레이아웃·페인트)은 JS가 잘게 쪼갤 수 없습니다. 하지만 DOM을 조금씩 붙이면 한 번에 처리할 양이 줄어듭니다.

**Performance 탭에서 본 Long Task**

- Long Task는 Main 트랙의 `Task` 막대로 보입니다. 오른쪽 위에 빨간 삼각형이 붙고, 50ms를 넘은 부분이 빨간 빗금으로 칠해집니다.
- `Event: click` 아래로 `render` → `render` → …가 아래로 깊게 쌓인 불꽃 그래프가 재귀 그 자체입니다. 깊이는 트리 깊이(`ul` → `li` → `b` → 텍스트)만큼이고, 가로로는 형제 2만 개가 촘촘한 세로줄로 나타납니다.
- 예상과 달리 render와 렌더링 작업이 **Task 하나** 안에 들어 있었습니다. 실제 클릭에서는 Chrome이 입력 처리와 그다음 렌더링(스타일·레이아웃·Pre-paint)을 한 Task 안에서 이어서 처리했습니다. 앞에서 스크립트로 `click()`을 호출해 쟀을 때는 Long Task가 두 개로 따로 찍혔는데, 이 차이 때문입니다.
- 시간은 렌더링 쪽이 더 깁니다. render(스크립트)는 약 40ms인데, 스타일 재계산·레이아웃·Pre-paint는 합쳐서 약 145ms입니다. JS를 아무리 잘게 쪼개도, 만든 DOM을 브라우저가 처리하는 시간은 그대로 남습니다.
- 그 Task가 도는 동안 Frames 트랙에는 노란색(일부만 표시된) 프레임이 찍힙니다. 메인 스레드가 막혀 새 화면을 만들지 못했다는 뜻입니다. Task가 끝나면 다시 초록색 16.7ms 프레임으로 돌아옵니다.

## 3. 정리 (15분, 설명하듯)

### Element → DOM 노드

- `className`은 `class`로 바뀌고, `children`은 속성이 아니라 자식 노드가 됨. `TEXT_ELEMENT`는 텍스트 노드로, `onClick`은 HTML에 보이지 않는 리스너로 바뀜. `$$typeof`·`key`는 DOM에 옮겨지지 않음.
- Element 트리에는 `type: 'TEXT_ELEMENT'`라는 객체가 있지만, DOM에는 그런 태그가 없고 텍스트 노드(nodeType 3)만 남음.
- render는 type을 보고 노드를 만듦(TEXT_ELEMENT면 createTextNode('')) → props를 옮김 → 자식마다 render를 다시 부름 → 부모에 붙임.

### 재귀 render와 메인 스레드

- 메인 스레드는 한 번에 하나만 할 수 있음
- "어느 노드의 몇 번째 자식까지 했는가"가 재귀 호출의 **콜 스택**에만 저장
- 양보하려면 함수에서 돌아와야 하는데, 돌아오면 콜 스택이 사라짐 > 재귀 렌더를 멈출수 없음 
- 그래서 2만 행에서는 render 40ms + 렌더링 145ms가 Task 하나로 묶였고, 그동안 공이 멈추고 키 입력이 108ms 기다림

### props·children·이벤트 반영

- id, className 같은 경우 dom의 속성으로 저장
  - className > class
- children 은 재귀 render 로 자식 노드로 변환
  - dom.children은 getter만 있어서 직접 등록해주어야 함
  - props 루프에서 건너뛰고, 자식은 재귀 render의 appendChild로 붙임
- addEventListener 로 dom에 반영
  - dom의 이벤트 핸들러는 onClick, onFocus와 이름이 달라서(onclick, onfocus) 별도로 등록해주어야 함. onClick 이라면 click 으로 on을 떼고 등록.

### 오늘 새로 안 것 / 남은 의문

Fiber 가 등장한 이유
