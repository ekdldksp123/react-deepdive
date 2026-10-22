// 사용자의 마크다운 편집기가 저장하면서 깨뜨린 README 서식을 찾는다.
// node scripts/check-readme.js [--fix] [--staged] [파일...]
//   인자가 없으면 루트와 모든 일차의 README.md를 검사한다.
//   --fix: 파일 끝 줄바꿈만 고친다. 나머지는 의도한 표기일 수 있어 보고만 한다.
//   --staged: 작업 트리 대신 스테이징된 내용을 검사한다 (pre-commit hook용).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const args = process.argv.slice(2);
const fix = args.includes('--fix');
const staged = args.includes('--staged');
let files = args.filter((a) => !a.startsWith('--'));

if (files.length === 0) {
  files = ['README.md', ...readdirSync(root)
    .filter((d) => /^day\d+/.test(d))
    .map((d) => `${d}/README.md`)
    .filter((f) => existsSync(join(root, f)))];
}

// 코드 블록 밖에서만 보는 규칙 (블록 안의 >, ~~ 등은 정상 표기일 수 있다)
const rules = [
  { re: /ORCA_RICH_MD/, msg: '인라인 JSX가 [[ORCA_RICH_MD:...]]로 바뀜', anywhere: true },
  { re: /^\$\$$/, msg: '단독 $$ 줄 (수식 블록으로 바뀜)' },
  { re: /&(gt|lt|amp);/, msg: '>, <, &가 HTML 엔티티로 바뀜' },
  { re: /~~/, msg: '~가 ~~로 바뀜 (의도한 취소선이면 무시)' },
];

const read = (f) =>
  staged
    ? execFileSync('git', ['show', `:${f}`], { cwd: root, encoding: 'utf8' })
    : readFileSync(join(root, f), 'utf8');

let problems = 0;
for (const file of files) {
  const text = read(file);
  let inFence = false;
  text.split('\n').forEach((line, i) => {
    if (/^\s*```/.test(line)) inFence = !inFence;
    for (const { re, msg, anywhere } of rules) {
      if ((anywhere || !inFence) && re.test(line)) {
        console.log(`${file}:${i + 1}: ${msg}\n    ${line.trim()}`);
        problems++;
      }
    }
  });

  if (text.length > 0 && !text.endsWith('\n')) {
    if (fix && !staged) {
      writeFileSync(join(root, file), text + '\n');
      console.log(`${file}: 파일 끝 줄바꿈 추가함`);
    } else {
      console.log(`${file}: 파일 끝 줄바꿈 없음 (npm run check -- --fix)`);
      problems++;
    }
  }
}

if (problems > 0) {
  console.log(`\n${problems}건. 고친 뒤 다시 실행하세요.`);
  process.exit(1);
}
console.log(`README ${files.length}개 서식 이상 없음`);
