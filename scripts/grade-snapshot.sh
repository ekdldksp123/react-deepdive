#!/bin/sh
# 채점 전에 "3. 정리" 섹션이 지난 채점 때와 같은지 판정한다.
#   scripts/grade-snapshot.sh day02-render            → FIRST | SAME | CHANGED (+ 지난 점수, 저장 시각)
#   scripts/grade-snapshot.sh day02-render --save 9   → 채점 후 지금 내용과 점수를 기록
# 기록은 .git/deepdive-grade/ 아래에 두어 커밋되지 않는다.
set -e
day="${1:?사용법: $0 dayNN-topic [--save 점수]}"
cd "$(dirname "$0")/.."
readme="$day/README.md"
[ -f "$readme" ] || { echo "$readme 없음" >&2; exit 1; }

dir="$(git rev-parse --git-dir)/deepdive-grade"
mkdir -p "$dir"
hash=$(sed -n '/^## 3\. 정리/,$p' "$readme" | shasum | cut -d' ' -f1)
saved="$(stat -f '%Sm' -t '%Y-%m-%d %H:%M:%S' "$readme")"

if [ "$2" = "--save" ]; then
  echo "$hash ${3:?점수를 함께 주세요}" > "$dir/$day"
  echo "기록함: $day ${3}점"
  exit 0
fi

if [ ! -f "$dir/$day" ]; then
  echo "FIRST (저장 시각 $saved)"
elif [ "$(cut -d' ' -f1 "$dir/$day")" = "$hash" ]; then
  echo "SAME 지난번 $(cut -d' ' -f2 "$dir/$day")점 (저장 시각 $saved)"
else
  echo "CHANGED 지난번 $(cut -d' ' -f2 "$dir/$day")점 (저장 시각 $saved)"
fi
