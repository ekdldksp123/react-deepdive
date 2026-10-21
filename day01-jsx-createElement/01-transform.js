// 같은 JSX를 classic / automatic 런타임으로 변환해 결과를 나란히 비교한다.
// Babel REPL(babeljs.io/repl)에서 보는 것과 같은 결과를 로컬에서 재현.
import { transformSync } from '@babel/core';

const source = `
const el = (
  <div className="box" key="a">
    hi
    <Button onClick={handle} {...rest}>click</Button>
  </div>
);
`;

const variants = [
  { runtime: 'classic' },
  { runtime: 'automatic', development: false },
  { runtime: 'automatic', development: true },
];

for (const options of variants) {
  const { code } = transformSync(source, {
    presets: [['@babel/preset-react', options]],
    babelrc: false,
    configFile: false,
  });
  console.log(`\n===== ${JSON.stringify(options)} =====\n${code}`);
}
