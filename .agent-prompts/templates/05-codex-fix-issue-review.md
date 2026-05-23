Claude Code가 Issue #{{ISSUE_NUMBER}} 구현 결과를 리뷰했고, {{SEVERITY_SUMMARY}}를 지적했다.

목표:

- Issue #{{ISSUE_NUMBER}}의 핵심 구현 범위 안에서 Claude review의 {{FIX_SEVERITIES}} 항목만 수정한다.
- {{DEFERRED_SEVERITIES}} 항목은 수정하지 말고, 마지막에 “선택 수정 가능”으로만 보고한다.
- 기능 범위를 넓히거나 새로운 구조를 추가하지 않는다.

참고 문서:

- docs/plans/issue-{{ISSUE_NUMBER}}-plan.md
- 현재 git diff
- Claude review 요약

Claude review 핵심 내용:
{{CLAUDE_REVIEW_SUMMARY}}

수정 대상:
{{FIX_TARGET_FILES}}

수정하지 말 것:
{{DO_NOT_TOUCH_LIST}}

구현 요구사항:
{{FIX_REQUIREMENTS}}

테스트 요구사항:
{{FIX_TEST_REQUIREMENTS}}

Low/선택 항목 처리:
{{DEFERRED_ITEMS_POLICY}}

작업 순서:

1. 현재 git diff와 관련 파일을 확인한다.
2. 수정 계획을 5줄 이내로 요약한다.
3. 높은 심각도 항목부터 수정한다.
4. 관련 테스트를 실행한다.
5. 실패가 있으면 Issue #{{ISSUE_NUMBER}} 범위 안에서만 수정한다.

우선 실행할 테스트:
{{FIX_TEST_COMMANDS}}

출력 형식:

1. 변경한 파일 목록
2. 해결한 Claude review 항목
   {{REVIEW_ITEM_OUTPUT_LIST}}
3. 수정하지 않은 선택 항목과 이유
4. 실행한 테스트 명령
5. 테스트 결과
6. 남은 위험 요소
7. 커밋 전 확인 사항

주의:

- Claude review의 지정 심각도만 해결한다.
- 새로운 리팩토링을 하지 않는다.
- 기존 보안/인증 개선 방향을 되돌리지 않는다.
- 계획 문서를 임의로 수정하거나 커밋 대상으로 추가하지 않는다.
