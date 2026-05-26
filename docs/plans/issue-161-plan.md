# Issue #161 구현 계획: pnpm audit를 CI 보안 게이트로 추가

## Context

현재 CI에는 의존성 취약점 게이트가 없다. `pnpm audit --prod` 실행 결과 50개 취약점(high 19, moderate 26, low 5)이 확인되었으며, 모두 트랜지티브 의존성 체인 문제다. 이 이슈의 목표는 신규 high+ 취약점이 발생하면 CI가 즉시 차단하도록 게이트를 추가하는 것이다. 기존 19개 high advisory는 예외 파일에 명시적으로 관리하여 투명하게 추적한다.

---

## 1. 관련 파일 목록

| 파일                            | 상태     | 역할                                                 |
| ------------------------------- | -------- | ---------------------------------------------------- |
| `.github/workflows/ci.yml`      | **수정** | `security-audit` job 추가, `ci-success`에 포함       |
| `scripts/audit-check.sh`        | **신규** | 예외 파일을 읽어 pnpm audit을 실행하는 래퍼 스크립트 |
| `.audit-exceptions`             | **신규** | 예외 처리된 GHSA ID 목록 (주석으로 사유 포함)        |
| `docs/security/audit-policy.md` | **신규** | 예외 처리 정책 및 절차 문서                          |

---

## 2. 현재 구조 요약

**CI 구성** (`.github/workflows/ci.yml`):

```
jobs:
  lint-and-format   ─┐
  type-check        ─┤→ ci-success (PR merge gate)
  test-backend      ─┤
  test-frontend     ─┤
  e2e               ─┤ (needs: lint-and-format, type-check)
  build             ─┘ (needs: lint-and-format, type-check)
```

- `security-audit` job 없음
- `ci-success`는 모든 job을 `needs`로 집계해 PR 머지 조건 판단

**현재 high 취약점 19개** (모두 트랜지티브):

| 패키지             | advisory 수 | 경로 예시                                       |
| ------------------ | ----------- | ----------------------------------------------- |
| `next`             | 6           | `apps__frontend>next`                           |
| `axios`            | 4           | 트랜지티브                                      |
| `multer`           | 3           | `apps__backend>@nestjs/platform-express>multer` |
| `fast-uri`         | 2           | 트랜지티브                                      |
| `rollup`           | 1           | `apps__frontend>@sentry/nextjs>rollup`          |
| `fast-xml-builder` | 1           | 트랜지티브                                      |
| `lodash`           | 1           | 트랜지티브                                      |

---

## 3. 변경해야 할 지점

### 3-1. `scripts/audit-check.sh` (신규)

`.audit-exceptions` 파일에서 주석을 제거한 GHSA ID 목록을 읽어, 각 ID마다 `--ignore <id>` 플래그를 빌드해 `pnpm audit --prod --audit-level=high`를 실행하는 래퍼 스크립트.

> `pnpm audit --ignore`는 GHSA ID를 수용하며 여러 번 지정 가능함을 로컬 검증으로 확인 (pnpm 10.33.0).

```bash
#!/usr/bin/env bash
set -euo pipefail

mapfile -t IDS < <(grep -v '^#' .audit-exceptions | grep -v '^$')
IGNORE_FLAGS=()
for id in "${IDS[@]}"; do
  IGNORE_FLAGS+=(--ignore "$id")
done

pnpm audit --prod --audit-level=high "${IGNORE_FLAGS[@]}"
```

### 3-2. `.audit-exceptions` (신규)

현재 high advisory 19개를 열거. 각 항목은 GHSA ID + 사유 주석 형식.

```
# multer via @nestjs/platform-express — NestJS 업스트림 패치 대기 중
GHSA-5528-5vmv-3xc2
GHSA-v52c-386h-88mc
GHSA-xf7r-hgr6-v32p

# next — 상위 버전으로 업그레이드 시 호환성 검토 필요
GHSA-267c-6grr-h53f
...
```

### 3-3. `.github/workflows/ci.yml` (수정)

**추가할 job** (`security-audit`):

- `needs` 없음 — `pnpm audit`은 `pnpm-lock.yaml`만 필요하므로 `pnpm install` 생략 → 빠른 실행

```yaml
# ──────────────────────────────────────────────────────────
# 7. 보안 취약점 감사
# ──────────────────────────────────────────────────────────
security-audit:
  name: Security Audit
  runs-on: ubuntu-latest
  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup pnpm
      uses: pnpm/action-setup@v4
      with:
        version: ${{ env.PNPM_VERSION }}

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}

    - name: Run security audit
      run: bash scripts/audit-check.sh
```

**수정할 항목** (`ci-success` needs):

```yaml
needs: [lint-and-format, type-check, test-backend, test-frontend, e2e, build, security-audit]
```

### 3-4. `docs/security/audit-policy.md` (신규)

- 심각도 실패 기준: `high` 이상
- 예외 처리 절차: `.audit-exceptions`에 GHSA ID + 사유 추가, PR 리뷰 필수
- 예외 해제 조건: 상위 패키지 패치 릴리스 시 제거
- 검토 주기: 월 1회 (수동)

---

## 4. 잠재적 위험

| 위험                     | 내용                                               | 대응                                                               |
| ------------------------ | -------------------------------------------------- | ------------------------------------------------------------------ |
| npm audit API 일시 장애  | pnpm audit이 네트워크 오류로 실패할 수 있음        | `--ignore-registry-errors` 옵션으로 레지스트리 오류 시 exit 0 처리 |
| 예외 파일 방치           | 업스트림이 패치됐음에도 예외 제거를 빠뜨릴 수 있음 | 정책 문서에 월 1회 `pnpm audit --prod` 재검토 절차 명시            |
| `--audit-level` 범위     | moderate 26개는 현재 차단 대상 아님                | 정책 문서에 moderate는 모니터링 대상이나 블로킹 제외로 명시        |
| `scripts/` 디렉터리 없음 | 현재 루트에 `scripts/` 미존재                      | 신규 생성 필요                                                     |

---

## 5. 구현 순서

1. `scripts/audit-check.sh` 생성 및 실행 권한 부여 (`chmod +x`)
2. `.audit-exceptions` 생성 (현재 19개 GHSA ID 전체 수록)
3. 로컬 검증: `bash scripts/audit-check.sh` → exit 0 확인
4. `docs/security/audit-policy.md` 생성
5. `.github/workflows/ci.yml` 수정 — `security-audit` job 추가, `ci-success` needs 갱신
6. 커밋 → feature 브랜치 push → PR 생성

---

## 6. 테스트 전략

| 검증 항목           | 방법                                                                      |
| ------------------- | ------------------------------------------------------------------------- |
| 스크립트 정상 동작  | `bash scripts/audit-check.sh` 로컬 실행 → exit 0 확인                     |
| 새 취약점 차단 검증 | `.audit-exceptions`에서 임의 ID 하나 제거 후 실행 → exit 1 확인, 되돌리기 |
| CI job 통과         | feature 브랜치 push 후 GitHub Actions `Security Audit` job 녹색 확인      |
| ci-success 집계     | PR Checks 탭에서 `CI Passed`가 Security Audit를 포함해 통과하는지 확인    |

---

## 확인 완료

- pnpm 10.33.0의 `pnpm audit --ignore <GHSA-ID>` 플래그가 GHSA ID를 정상 수용함을 로컬 실행으로 검증 완료
