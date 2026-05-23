정리한 Issue #{{ISSUE_NUMBER}} 이해 내용을 기준으로 구현을 진행해.

목표:
{{ISSUE_GOAL}}

핵심 원칙:
{{CORE_PRINCIPLES}}

참고 문서:

- docs/plans/issue-{{ISSUE_NUMBER}}-plan.md

중요한 제약:

- 작업 시작 전 메인 브랜치의 최신화 여부를 확인하고, 작업 브랜치로 체크아웃한다.
- 브랜치 네이밍은 fix/issue-{{ISSUE_NUMBER}}-{{SHORT_NAME}} 또는 feat/issue-{{ISSUE_NUMBER}}-{{SHORT_NAME}} 형식을 사용한다.
- docs/plans/issue-{{ISSUE_NUMBER}}-plan.md는 참고만 하고, 코드 변경 대상에 포함하지 마.
- 계획서 범위를 벗어난 리팩토링이나 기능 추가는 하지 마.
- DB schema, migration, seed 파일은 수정하지 마.
- 새 API endpoint는 명시적으로 요구되지 않는 한 추가하지 마.
- {{DO_NOT_TOUCH_LIST}}

수정 대상 파일:
{{TARGET_FILES}}

구현 요구사항:
{{IMPLEMENTATION_REQUIREMENTS}}

테스트 요구사항:
{{TEST_REQUIREMENTS}}

작업 방식:

1. 먼저 실제 현재 코드 상태와 git diff를 확인한다.
2. 위 범위 안에서만 코드를 수정한다.
3. 변경이 커질 경우 백엔드 → 프론트엔드 → 테스트 순서로 나눠 진행한다.
4. 수정 후 관련 테스트를 실행한다.
5. 실패 테스트가 있으면 원인을 설명하고, Issue #{{ISSUE_NUMBER}} 범위 안에서만 수정한다.

우선 실행 권장 테스트:
{{TEST_COMMANDS}}

출력 형식:

1. 변경한 파일 목록
2. 핵심 변경 내용
3. 응답 계약 변경 요약
4. 실행한 테스트 명령
5. 테스트 결과
6. 실패한 테스트가 있다면 원인과 조치 내용
7. 남은 위험 요소
8. 커밋 전 확인해야 할 사항

주의:

- 한 번에 전체 구조를 갈아엎지 마.
- 계획서에 있는 Issue #{{ISSUE_NUMBER}} 범위만 구현해.
- 보안/인증 이슈라면 기존보다 취약한 흐름을 다시 만들지 마.
