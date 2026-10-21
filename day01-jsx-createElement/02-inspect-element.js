// JSX가 만들어낸 React Element를 실제로 찍어 본다.
// (JSX 없이 automatic 런타임이 호출하는 jsx()를 직접 부른다)
// NODE_ENV=production 으로도 돌려서 dev 빌드와 무엇이 다른지 비교해 볼 것.
import { jsx } from 'react/jsx-runtime';
import { createElement } from 'react';

const viaJsx = jsx('div', { children: 'hi' }, 'a');
const viaCreateElement = createElement('div', { key: 'a' }, 'hi');

console.log('jsx():', viaJsx);
console.log('createElement():', viaCreateElement);
console.log('$$typeof:', viaJsx.$$typeof);
console.log('frozen?', Object.isFrozen(viaJsx), Object.isFrozen(viaJsx.props));
console.log("props에 key가 있나?", 'key' in viaJsx.props);
