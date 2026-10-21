// 오늘의 구현 과제: React.createElement(type, props, ...children) 직접 만들기
// `npm test`로 createElement.test.js를 통과시키면 된다.

export const TEXT_ELEMENT = 'TEXT_ELEMENT';
export const ELEMENT_TYPE = Symbol.for('react.element');

/**
 * 문자열·숫자 자식을 다른 Element와 같은 모양으로 감싼다.
 * 결과: { $$typeof, type: TEXT_ELEMENT, key: null, props: { nodeValue, children: [] } }
 */
export function createTextElement(text) {
  return {
    $$typeof: ELEMENT_TYPE,
    type: TEXT_ELEMENT,
    key: null,
    props: { nodeValue: text, children: [] },
  };
}

// {cond && <X />}가 남기는 false, 빈 값(null·undefined)은 아무것도 그리지 않는다
function isEmptyChild(child) {
  return child == null || typeof child === 'boolean';
}

/**
 * 결과: { $$typeof, type, key, props: { ...config(key 제외), children: [...] } }
 * - key는 props가 아니라 Element에 올라간다 (없으면 null)
 * - 문자열·숫자 자식은 createTextElement로 감싼다
 */
export function createElement(type, config, ...children) {
  // 구조 분해로 key를 떼어 내면 config 원본은 건드리지 않고 새 props 객체가 생긴다
  const { key = null, ...props } = config ?? {};

  // {items.map(...)}처럼 배열로 들어온 자식은 펼쳐서 형제로 만든다
  props.children = children
    .flat(Infinity)
    .filter((child) => !isEmptyChild(child))
    .map((child) => (typeof child === 'object' ? child : createTextElement(child)));

  return {
    $$typeof: ELEMENT_TYPE,
    type,
    key,
    props,
  };
}
