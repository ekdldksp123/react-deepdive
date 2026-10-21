# 1일차 / 56 — JSX와 createElement (2026-10-20 화)

오늘 할 일: JSX 변환 결과와 React Element 구조 확인, createElement 직접 구현

## 1. 질문 (5분)

- [ ] JSX는 브라우저에서 바로 실행되지 않는데, 빌드 단계에서 무엇으로 바뀌나요? (classic `React.createElement` vs automatic `jsx()` 런타임 차이)
- [ ] React Element는 어떤 객체인가요? `type`·`props`·`key`·`$$typeof`는 각각 왜 있나요?
- [ ] Element와 컴포넌트 인스턴스·DOM 노드는 어떻게 다른가요?

## 2. 읽기·구현 (40분)

### 실험 1 — 변환 결과 비교

```bash
npm run day01:transform
```

[01-transform.js](./01-transform.js)는 같은 JSX를 세 가지 설정으로 변환합니다. [Babel REPL](https://babeljs.io/repl)에 붙여 넣어도 결과는 같습니다.

- `classic`
- `automatic` + `development: false`
- `automatic` + `development: true`

#### 입력 JSX

```jsx
const el = (
  <div className="box" key="a">
    hi
    <Button onClick={handle} {...rest}>click</Button>
  </div>
);
```

#### 실행 결과 (@babel/core 8.0.7, @babel/preset-react 8.0.1)

`classic`

```js
const el = /*#__PURE__*/React.createElement("div", {
  className: "box",
  key: "a"
}, "hi", /*#__PURE__*/React.createElement(Button, {
  onClick: handle,
  ...rest
}, "click"));
```

`automatic` + `development: false`

```js
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const el = /*#__PURE__*/_jsxs("div", {
  className: "box",
  children: ["hi", /*#__PURE__*/_jsx(Button, {
    onClick: handle,
    ...rest,
    children: "click"
  })]
}, "a");
```

`automatic` + `development: true`

```js
import { jsxDEV as _jsxDEV } from "react/jsx-dev-runtime";
const el = /*#__PURE__*/_jsxDEV("div", {
  className: "box",
  children: ["hi", /*#__PURE__*/_jsxDEV(Button, {
    onClick: handle,
    ...rest,
    children: "click"
  }, void 0, false)]
}, "a", true);
```

#### 보면서 확인할 것

**`key`는 각 변환 결과에서 어디로 가나요?**

- classic: `key`가 `className`과 함께 props 객체 안에 그대로 들어갑니다. 런타임에 `createElement`가 그 객체를 훑어서 `key`를 꺼내야 합니다.
- automatic: `key`가 props에서 빠져 세 번째 인자(`"a"`)로 따로 전달됩니다. 빌드 단계에서 이미 분리해 두므로 런타임은 props를 훑지 않아도 됩니다.
- dev의 `Button`에는 key가 없어서 세 번째 인자가 `void 0`(undefined)입니다.
- 예외: `<div {...p} key="a">`처럼 spread 뒤에 `key`가 오면 automatic 모드에서도 `createElement`로 되돌아갑니다. `p` 안에 `key`가 있을 수 있어서 어느 쪽이 이기는지 빌드 단계에서 정할 수 없기 때문입니다. `key`를 spread 앞에 쓰면 `_jsx(..., "a")`로 정상 변환됩니다. (직접 변환해서 확인함)

**`children`은 각 변환 결과에서 어디로 가나요?**

- classic: 세 번째 인자부터 가변 인자로 나열됩니다(`"hi"`, `React.createElement(Button, ...)`). props에 넣는 일은 런타임의 `createElement`가 합니다.
- automatic: 처음부터 `props.children`으로 들어갑니다.
  - 자식이 하나면 값 그대로 들어갑니다(`children: "click"`).
  - 여럿이면 배열로 들어갑니다(`children: ["hi", ...]`).
  - 오늘 구현하는 `createElement`의 `...children` 가변 인자는 classic 쪽 시그니처입니다.

**`jsx`와 `jsxs`는 언제 갈리나요?**

- JSX 안에 자식을 여러 개 직접 적으면 `jsxs`(s = static children)가 쓰입니다. 바깥 `div`가 이 경우입니다.
- 자식이 0개나 1개면 `jsx`가 쓰입니다. `Button`이 이 경우입니다.
- 차이는 key 경고입니다.
  - `jsxs`의 children 배열은 소스에 고정된 정적 목록이므로 React가 key 경고를 하지 않습니다.
  - `{items.map(...)}`은 자식이 하나로 취급되어 `jsx`로 변환됩니다. 이때 그 값(배열)은 동적 목록이므로 각 항목에 key가 없으면 경고합니다.
- dev에서는 함수가 `jsxDEV` 하나로 합쳐집니다. 네 번째 인자 `isStaticChildren`이 같은 구분을 합니다(바깥 `div`는 `true`, `Button`은 `false`).

**import 문은 누가 넣나요?**

- automatic: Babel(`@babel/preset-react`)이 `react/jsx-runtime`의 import를 자동으로 넣습니다. dev에서는 `react/jsx-dev-runtime`을 넣습니다. 가져올 패키지는 `importSource` 옵션으로 바꿀 수 있습니다(예: `@emotion/react`).
- classic: import를 넣지 않고 `React.createElement`만 호출합니다. 그래서 스코프에 `React`가 있어야 하고, React 17 이전에는 JSX를 쓰는 파일마다 `import React from 'react'`가 필요했습니다. `/** @jsx h */` 프래그마로 호출 함수를 바꿀 수 있습니다(Preact 등).

> 참고: `/*#__PURE__*/`는 번들러에게 "이 호출은 부수효과가 없다"고 알려 줍니다. 결과를 아무도 쓰지 않으면 번들러가 호출 자체를 지울(tree-shaking) 수 있습니다.

### 실험 2 — 실제 Element 찍어 보기

```bash
npm run day01:inspect
NODE_ENV=production npm run day01:inspect
```

[02-inspect-element.js](./02-inspect-element.js)로 dev와 prod 출력을 비교합니다.

#### 실행 결과 (react 19.3.1, Node 24)

dev (`NODE_ENV` 미설정)

```
jsx(): {
  '$$typeof': Symbol(react.transitional.element),
  type: 'div',
  key: 'a',
  props: { children: 'hi' },
  _owner: null,
  _store: {}
}
createElement(): {
  '$$typeof': Symbol(react.transitional.element),
  type: 'div',
  key: 'a',
  props: { children: 'hi' },
  _owner: null,
  _store: {}
}
$$typeof: Symbol(react.transitional.element)
frozen? true true
props에 key가 있나? true
```

prod (`NODE_ENV=production`)

```
jsx(): {
  '$$typeof': Symbol(react.transitional.element),
  type: 'div',
  key: 'a',
  ref: null,
  props: { children: 'hi' }
}
createElement(): {
  '$$typeof': Symbol(react.transitional.element),
  type: 'div',
  key: 'a',
  ref: null,
  props: { children: 'hi' }
}
$$typeof: Symbol(react.transitional.element)
frozen? false false
props에 key가 있나? false
```

#### 보면서 확인할 것

**`jsx()`와 `createElement()`의 결과가 다른가요?**

- 같습니다. 호출 방식만 다르고(key를 세 번째 인자로 주느냐, config 안에 넣느냐) 둘 다 같은 모양의 객체를 만듭니다.
- 결국 React Element는 화면에 무엇을 그릴지 적어 둔 평범한 JS 객체입니다. DOM 노드도 아니고 컴포넌트 인스턴스도 아닙니다.

**`ref`, `_owner`, `_store`가 보이나요?**

- dev
  - `_owner`: 이 Element를 만든 컴포넌트입니다. 경고 메시지에 "Check the render method of X"를 띄우는 데 씁니다. 여기서는 컴포넌트 밖에서 만들었으므로 `null`입니다.
  - `_store`: key 검증 여부(`validated`) 같은 dev 전용 상태를 담는 곳입니다.
  - `ref`는 출력에 안 보이지만 없는 게 아닙니다. 열거되지 않는(non-enumerable) 속성으로 숨겨져 있습니다.
  - 같은 방식으로 숨겨진 `_debugInfo`, `_debugStack`, `_debugTask`도 있습니다. (`Object.getOwnPropertyNames`로 확인함)
- prod: 디버깅용 필드가 모두 빠지고 `ref: null`이 일반 속성으로 보입니다.
- React 19부터 `ref`는 일반 prop입니다(`props.ref`). `element.ref` 필드는 호환용으로만 남아 있습니다.

**`Object.isFrozen` 결과는 어떻게 다른가요?**

- dev: Element와 props가 모두 얼려(freeze) 있습니다. 렌더 중에 `props.x = 1`처럼 직접 수정하는 실수를 바로 에러로 잡기 위해서입니다.
- prod: freeze 비용을 아끼려고 얼리지 않습니다. 그래도 Element는 불변으로 다뤄야 한다는 규칙은 같습니다.

**`'key' in props` 결과는 왜 다른가요?**

- prod는 `false`입니다. key는 props가 아니라 Element 자체(`el.key`)에 붙습니다. React가 형제 목록을 비교(reconcile)할 때 쓰는 식별자이지, 컴포넌트에 넘기는 값이 아니기 때문입니다.
- dev는 `true`지만 실제 값이 있는 게 아닙니다. React가 `props.key`에 경고용 getter를 심어 둔 것입니다. 접근하면 `` `key` is not a prop `` 경고를 띄우고 `undefined`를 돌려줍니다. (직접 접근해서 확인함)
- 그래서 자식 컴포넌트에서 key 값이 필요하면 `id` 같은 다른 이름의 prop으로 따로 넘겨야 합니다.

**`$$typeof` 값은 무엇이고, 왜 Symbol인가요?**

- 값은 `Symbol(react.transitional.element)`입니다. React 18까지는 `Symbol(react.element)`였는데, React 19에서 이름이 바뀌었습니다. 버전이 섞인 Element가 조용히 동작하지 않고 바로 에러가 나게 하려는 것입니다.
- Symbol을 쓰는 이유는 XSS 방어입니다. 서버가 돌려준 JSON을 실수로 `{data}`처럼 렌더해도 JSON에는 Symbol을 담을 수 없습니다. 그래서 공격자가 만든 객체가 Element로 인정받지 못하고, React는 `$$typeof`가 맞지 않는 객체를 Element로 렌더하지 않습니다.

- 참고로 이 레포의 [createElement.js](./createElement.js)는 학습용이라 React 18 방식의 `Symbol.for('react.element')`를 씁니다.

### 구현 — createElement

[createElement.js](./createElement.js)를 구현해 [테스트](./createElement.test.js)를 통과시켰습니다.

```bash
npm test
```

마지막 `[도전]` 테스트는 `{cond && <X />}`가 `false`를 자식으로 넘길 때를 다룹니다.

## 3. 정리 (15분, 설명하듯)

### JSX → 화면에 무엇을 그릴지 적어 둔 JS 객체

1. 빌드할 때: Babel이 JSX를 함수 호출 코드로 바꿉니다.

- classic 런타임: React.createElement(...)
  - React가 항상 Import 되어 있어야 함

- automatic 런타임: \_jsx(...) 
  - key가 세 번째 인자로 분리되고 children이 props 안으로 들어감
  - import도 Babel이 자동으로 넣어줌

2. 실행할 때: 그 함수가 호출되면서 객체(Element)를 반환합니다

### React Element의 구조 

- $$typeof: 진짜 React Element라는 표시예요. Symbol이라 JSON으로는 위조할 수 없어서 XSS를 막아 줘요.

- type: 무엇을 그릴지 정해요. 'div' 같은 문자열이면 DOM 태그이고, 함수나 클래스면 컴포넌트예요.

- props: 그 대상에 넘길 값이에요. children도 여기에 들어가요.

- key: 형제 목록을 비교할 때 쓰는 식별자예요. 그래서 props가 아니에요.

  

- ref 정정: React 19부터는 props.ref로 들어가요. element.ref는 호환용으로만 남아 있어요.

### Element vs 컴포넌트 인스턴스 vs DOM 노드

Element

정체: 무엇을 그릴지 적은 객체

누가 만드나: jsx() / createElement()

수명: 렌더할 때마다 새로 만들고 버림. 수명이 가장 짧음

────────────────────────────────────────

컴포넌트 인스턴스

정체:   
 

- 함수 컴포넌트: 인스턴스가 없고, state는 React 내부의 Fiber 노드에 저장
- 클래스 컴포넌트: React가 new로 만든 객체로, state와 생명주기를 가짐

누가 만드나: React

수명: 트리의 같은 자리에 같은 type(같은 key) 이 유지되는 동안 살아있음. 마운트될 때 생기고 언마운트될 때 사라짐

────────────────────────────────────────

DOM 노드

정체: 브라우저의 실제 객체 (HTMLDivElement)

누가 만드나: react-dom이 type: 'div' 같은 Element를 보고 만들어요

수명: 호스트 Element('div'처럼 type이 문자열인 것) 하나에 대응. 같은 자리에 같은 type의 호스트 Element가 계속 들어오는 동안 (= 호스트 Fiber가 유지되는 동안) 살아 있음

### 오늘 새로 안 것 / 남은 의문

jsx, element, dom의 차이점  
머리로는 차이를 알겠는데 아직도 jsx, element가 헷갈린다..수명도ㅋㅋ