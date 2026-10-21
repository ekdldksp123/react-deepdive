import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createElement,
  createTextElement,
  TEXT_ELEMENT,
  ELEMENT_TYPE,
} from './createElement.js';

test('type과 props를 담은 객체를 만든다', () => {
  const el = createElement('div', { id: 'foo' });
  assert.equal(el.type, 'div');
  assert.equal(el.props.id, 'foo');
  assert.deepEqual(el.props.children, []);
});

test('$$typeof로 React Element임을 표시한다', () => {
  assert.equal(createElement('div', null).$$typeof, ELEMENT_TYPE);
});

test('config가 null이어도 동작한다', () => {
  const el = createElement('div', null);
  assert.deepEqual(el.props, { children: [] });
});

test('key는 props에서 빠지고 Element로 올라간다', () => {
  const el = createElement('li', { key: 'a', className: 'item' });
  assert.equal(el.key, 'a');
  assert.equal('key' in el.props, false);
  assert.equal(el.props.className, 'item');
});

test('key가 없으면 null이다', () => {
  assert.equal(createElement('li', {}).key, null);
});

test('넘겨받은 config 객체를 변경하지 않는다', () => {
  const config = { key: 'a', id: 'x' };
  createElement('div', config);
  assert.deepEqual(config, { key: 'a', id: 'x' });
});

test('텍스트 자식은 TEXT_ELEMENT로 감싼다', () => {
  assert.deepEqual(createTextElement('hi'), {
    $$typeof: ELEMENT_TYPE,
    type: TEXT_ELEMENT,
    key: null,
    props: { nodeValue: 'hi', children: [] },
  });
  const el = createElement('p', null, 'hello', 42);
  assert.equal(el.props.children[0].type, TEXT_ELEMENT);
  assert.equal(el.props.children[0].props.nodeValue, 'hello');
  assert.equal(el.props.children[1].props.nodeValue, 42);
});

test('Element 자식은 그대로 둔다', () => {
  const child = createElement('span', null, 'x');
  const el = createElement('div', null, child);
  assert.equal(el.props.children[0], child);
});

test('중첩 구조: <div><h1>title</h1><p>body</p></div>', () => {
  const el = createElement(
    'div',
    null,
    createElement('h1', null, 'title'),
    createElement('p', null, 'body'),
  );
  assert.deepEqual(
    el.props.children.map((c) => [c.type, c.props.children[0].props.nodeValue]),
    [['h1', 'title'], ['p', 'body']],
  );
});

test('type에 함수 컴포넌트도 넣을 수 있다 (호출하지 않고 담기만 한다)', () => {
  let called = false;
  const App = () => {
    called = true;
  };
  const el = createElement(App, { name: 'lee' });
  assert.equal(el.type, App);
  assert.equal(called, false);
});

test('[도전] null·undefined·boolean 자식은 버린다 ({cond && <X/>} 패턴)', () => {
  const el = createElement('div', null, null, false, true, undefined, 'ok');
  assert.equal(el.props.children.length, 1);
  assert.equal(el.props.children[0].props.nodeValue, 'ok');
});
