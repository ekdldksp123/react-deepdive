# react-deepdive

56일 리액트 심화 학습 개인 레포. 사용자와는 한국어로 소통한다. 루틴·실행법은 README.md 참고.

## 역할 분담

- 각 일차 README의 `3. 정리` 섹션은 사용자가 직접 쓴다. Claude는 대신 쓰거나 고치지 않고, 요청하면 채점(10점 만점, 항목별 표 + 고칠 점 + 남은 의문 답변)만 한다. 서식 깨짐만 고칠 수 있다.
- `1. 질문`, `2. 읽기·구현`의 실험 결과와 해설은 Claude가 채울 수 있다. 결과는 실제로 실행한 출력만 적고, 버전(Babel·React·Node)을 함께 적는다.
- 구현 파일의 TODO는 사용자의 학습 과제다. 요청이 있을 때만 구현한다.
- 채점 요청을 받으면 파일을 다시 읽는다. 사용자가 편집기에서 저장하지 않았을 수 있으니, 바뀐 게 없으면 다시 채점하지 말고 저장했는지 묻는다.

## 새 일차 추가

1. `dayNN-topic/` 폴더 (예: `day02-render`). README 구조는 `day01-jsx-createElement/README.md`를 따른다.
2. package.json에 `dayNN:*` 스크립트 추가. 브라우저 실험 페이지는 `node scripts/serve.js dayNN-topic`으로 띄운다(`file://`에서는 ES 모듈이 막힘).
3. 테스트는 `*.test.js`로 두면 `npm test`(`node --test`)가 모든 일차를 함께 돌린다. 테스트 러너는 `node:test`만 쓴다. DOM이 필요한 테스트는 jsdom(버전 고정)으로 `globalThis.document`를 만든다.
4. 루트 README 진행 표에 한 줄 추가.

## 커밋

- 작성자는 개인 메일(ekdldksp123@naver.com)만. `@pt.zigbang.com` 금지, 커밋 전 `git config user.email` 확인. pre-commit hook(`scripts/hooks/pre-commit`)이 회사 메일을 막는다.
- 기본 브랜치 main.

## 주의

- 사용자의 마크다운 편집기가 저장할 때 `$$`를 수식 블록으로, `<X />` 같은 인라인 JSX를 `[[ORCA_RICH_MD:...]]`로 바꿔 버린 적이 있다. README를 커밋하기 전에 `grep -nE 'ORCA_RICH_MD|^\$\$$' */README.md`로 확인한다.
- day01 `createElement.js`는 학습용 단순화 버전이다(빈 자식 제거, children 항상 배열, 텍스트를 `TEXT_ELEMENT`로 감쌈, `Symbol.for('react.element')`). 이후 일차의 render 구현이 이 모양을 전제로 한다.
