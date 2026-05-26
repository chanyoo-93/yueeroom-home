정리한 Issue #161 이해 내용을 기준으로 구현을 진행해.

목표:
CI에 pnpm audit 기반 security-audit job을 추가하고, 기존 high advisory는 명시적 예외로 관리해 신규 high 이상 취약점 발생 시 PR CI를 실패시킨다.

핵심 원칙:

- issue-161-plan.md 범위만 구현한다.
- high 이상 취약점만 CI 차단 대상으로 삼는다.
- 기존 high advisory 19개는 .audit-exceptions에 GHSA ID로 명시 관리한다.
- moderate 이하 취약점은 이번 작업에서 차단하지 않는다.
- 의존성 업그레이드나 lockfile 변경은 하지 않는다.

참고 문서:

- docs/plans/issue-161-plan.md

중요한 제약:

- 작업 시작 전 메인 브랜치의 최신화 여부를 확인하고, 작업 브랜치로 체크아웃한다.
- 브랜치 네이밍은 fix/issue-161-pnpm-audit-ci-gate 또는 feat/issue-161-pnpm-audit-ci-gate 형식을 사용한다.
- docs/plans/issue-161-plan.md는 참고만 하고, 코드 변경 대상에 포함하지 마.
- 계획서 범위를 벗어난 리팩토링이나 기능 추가는 하지 마.
- DB schema, migration, seed 파일은 수정하지 마.
- 새 API endpoint는 명시적으로 요구되지 않는 한 추가하지 마.
  - pnpm-lock.yaml
- package.json
- apps/frontend/\*\*
- apps/backend/\*\*
- packages/shared/\*\*
- 기존 테스트 파일

수정 대상 파일:

- 신규: scripts/audit-check.sh
- 신규: .audit-exceptions
- 신규: docs/security/audit-policy.md
- 수정: .github/workflows/ci.yml

구현 요구사항:

- scripts/audit-check.sh는 bash, set -euo pipefail을 사용한다.
- scripts/audit-check.sh는 .audit-exceptions에서 주석과 빈 줄을 제외한 GHSA ID를 읽는다.
- 각 GHSA ID는 pnpm audit의 --ignore 플래그로 전달한다.
- audit 명령은 pnpm audit --prod --audit-level=high 기반으로 실행한다.
- .audit-exceptions에는 현재 high advisory 19개를 GHSA ID와 사유 주석으로 기록한다.
- docs/security/audit-policy.md에는 실패 기준, 예외 추가 절차, 예외 제거 조건, 월 1회 검토 정책을 문서화한다.
- .github/workflows/ci.yml에 security-audit job을 추가한다.
- security-audit job은 checkout, pnpm setup, node setup 후 bash scripts/audit-check.sh를 실행한다.
- ci-success.needs에 security-audit을 추가한다.

테스트 요구사항:

- 예외 적용 상태에서 bash scripts/audit-check.sh가 exit 0이어야 한다.
- .audit-exceptions에서 GHSA ID 하나를 임시 제거하면 bash scripts/audit-check.sh가 exit 1이어야 하며 테스트 후 원복한다.
- PR에서 Security Audit job 결과가 보이고 CI Passed가 security-audit을 포함해 집계되어야 한다.

작업 방식:

1. 먼저 실제 현재 코드 상태와 git diff를 확인한다.
2. 위 범위 안에서만 코드를 수정한다.
3. 변경이 커질 경우 백엔드 → 프론트엔드 → 테스트 순서로 나눠 진행한다.
4. 수정 후 관련 테스트를 실행한다.
5. 실패 테스트가 있으면 원인을 설명하고, Issue #161 범위 안에서만 수정한다.

우선 실행 권장 테스트:

```bash
bash scripts/audit-check.sh
```

```bash
임시로 .audit-exceptions에서 GHSA ID 하나 제거 후 bash scripts/audit-check.sh
```

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
- 계획서에 있는 Issue #161 범위만 구현해.
- 보안/인증 이슈라면 기존보다 취약한 흐름을 다시 만들지 마.
