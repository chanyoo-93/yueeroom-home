# Issue #161 준비 계획

## 사람이 읽는 요약

1. 네가 이해한 작업 목표

Issue #161의 목표는 CI에 `pnpm audit --prod` 기반 보안 감사 job을 추가해, `high` 이상 신규 취약점이 발견되면 PR CI가 실패하도록 만드는 것이다. 기존에 확인된 high advisory 19개는 `.audit-exceptions`에 GHSA ID로 명시 관리하고, 예외 정책은 문서화한다.

2. 수정 대상 파일

수정:

- `.github/workflows/ci.yml`

신규:

- `scripts/audit-check.sh`
- `.audit-exceptions`
- `docs/security/audit-policy.md`

변경하지 않을 파일:

- `pnpm-lock.yaml`
- `package.json`
- 프론트엔드/백엔드 애플리케이션 소스
- 기존 테스트 파일

3. 구현 순서

1. `scripts/audit-check.sh`를 생성해 `.audit-exceptions`의 GHSA ID를 `pnpm audit --ignore` 플래그로 변환한다.
1. `.audit-exceptions`에 현재 high advisory 19개를 GHSA ID와 사유 주석으로 추가한다.
1. `bash scripts/audit-check.sh`로 예외 적용 시 통과하는지 확인한다.
1. `docs/security/audit-policy.md`에 high 이상 차단 기준, 예외 추가/제거 절차, 월 1회 검토 정책을 작성한다.
1. `.github/workflows/ci.yml`에 `security-audit` job을 추가하고 `ci-success.needs`에 포함한다.
1. 예외 ID 하나를 임시 제거해 실패 동작을 확인한 뒤 되돌린다.

1. 테스트 추가/수정 계획

- 별도 애플리케이션 테스트는 추가하지 않는다.
- 핵심 검증은 셸 스크립트와 CI workflow 구성 검증이다.
- `bash scripts/audit-check.sh`가 exit 0인지 확인한다.
- `.audit-exceptions`에서 GHSA ID 하나를 임시 제거했을 때 exit 1인지 확인하고 즉시 원복한다.
- PR에서 `Security Audit` job과 `CI Passed` 집계가 함께 통과하는지 확인한다.

5. 위험 요소

- `pnpm audit`는 네트워크/API 상태에 따라 실패할 수 있다.
- 계획서와 GitHub issue 본문 사이에 moderate 취약점 개수가 다르다.
- `.audit-exceptions`가 장기간 방치될 수 있다.
- `scripts/`와 `docs/security/` 디렉터리가 현재 없어 신규 생성이 필요하다.
- 예외 목록의 GHSA ID가 최신 audit 결과와 다르면 CI가 예상과 다르게 실패할 수 있다.

6. 작업 시작 전에 확인이 필요한 점

- 최신 `pnpm audit --prod --audit-level=high` 결과에서 high advisory 19개의 GHSA ID를 다시 확정해야 한다.
- `--ignore-registry-errors`를 계획서의 위험 대응대로 적용할지 최종 확인이 필요하다.
- 현재 작업 트리에 이미 수정된 `package.json` 등 이슈와 무관한 변경이 있으므로 건드리지 않아야 한다.
- `scripts/audit-check.sh`에 실행 권한을 부여하는 방식까지 커밋에 포함해야 한다.

## machine_readable

```yaml
issue_number: 161
short_name: 'pnpm-audit-ci-gate'
issue_goal: 'CI에 pnpm audit 기반 security-audit job을 추가하고, 기존 high advisory는 명시적 예외로 관리해 신규 high 이상 취약점 발생 시 PR CI를 실패시킨다.'
core_principles:
  - 'issue-161-plan.md 범위만 구현한다.'
  - 'high 이상 취약점만 CI 차단 대상으로 삼는다.'
  - '기존 high advisory 19개는 .audit-exceptions에 GHSA ID로 명시 관리한다.'
  - 'moderate 이하 취약점은 이번 작업에서 차단하지 않는다.'
  - '의존성 업그레이드나 lockfile 변경은 하지 않는다.'
target_files:
  new:
    - 'scripts/audit-check.sh'
    - '.audit-exceptions'
    - 'docs/security/audit-policy.md'
  modify:
    - '.github/workflows/ci.yml'
  delete: []
do_not_touch:
  - 'pnpm-lock.yaml'
  - 'package.json'
  - 'apps/frontend/**'
  - 'apps/backend/**'
  - 'packages/shared/**'
  - '기존 테스트 파일'
implementation_requirements:
  - 'scripts/audit-check.sh는 bash, set -euo pipefail을 사용한다.'
  - 'scripts/audit-check.sh는 .audit-exceptions에서 주석과 빈 줄을 제외한 GHSA ID를 읽는다.'
  - '각 GHSA ID는 pnpm audit의 --ignore 플래그로 전달한다.'
  - 'audit 명령은 pnpm audit --prod --audit-level=high 기반으로 실행한다.'
  - '.audit-exceptions에는 현재 high advisory 19개를 GHSA ID와 사유 주석으로 기록한다.'
  - 'docs/security/audit-policy.md에는 실패 기준, 예외 추가 절차, 예외 제거 조건, 월 1회 검토 정책을 문서화한다.'
  - '.github/workflows/ci.yml에 security-audit job을 추가한다.'
  - 'security-audit job은 checkout, pnpm setup, node setup 후 bash scripts/audit-check.sh를 실행한다.'
  - 'ci-success.needs에 security-audit을 추가한다.'
test_requirements:
  - '예외 적용 상태에서 bash scripts/audit-check.sh가 exit 0이어야 한다.'
  - '.audit-exceptions에서 GHSA ID 하나를 임시 제거하면 bash scripts/audit-check.sh가 exit 1이어야 하며 테스트 후 원복한다.'
  - 'PR에서 Security Audit job 결과가 보이고 CI Passed가 security-audit을 포함해 집계되어야 한다.'
test_commands:
  - 'bash scripts/audit-check.sh'
  - '임시로 .audit-exceptions에서 GHSA ID 하나 제거 후 bash scripts/audit-check.sh'
risks:
  - 'npm audit API 또는 registry 장애로 pnpm audit이 실패할 수 있다.'
  - '계획서와 GitHub issue 본문 사이에 moderate 취약점 개수가 다르다.'
  - '예외 파일이 방치되면 패치된 advisory 제거가 늦어질 수 있다.'
  - '최신 audit 결과와 예외 GHSA ID 목록이 다르면 CI가 실패할 수 있다.'
  - 'scripts/ 및 docs/security/ 디렉터리가 없어 신규 생성이 필요하다.'
pre_start_checks:
  - '최신 pnpm audit --prod --audit-level=high 결과로 high advisory 19개 GHSA ID를 확정한다.'
  - '--ignore-registry-errors 적용 여부를 계획서 위험 대응 기준에 맞춰 확정한다.'
  - '현재 작업 트리의 기존 변경사항은 이슈 범위 밖이므로 수정하지 않는다.'
  - 'scripts/audit-check.sh 실행 권한 부여를 포함한다.'
```
