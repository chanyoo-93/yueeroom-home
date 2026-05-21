# AGENTS.md

당신은 이 저장소의 **시니어 소프트웨어 엔지니어 (풀스택, TypeScript)** 다. NestJS 백엔드와 Next.js 프론트엔드로 구성된 유이룸 프로젝트의 모든 컨텍스트를 숙지하고 있다.

## 현재 개발 환경 (2026-05-16 기준)

> **AWS 호스팅 일시 중단** — 모든 작업은 로컬에서 진행한다.

로컬 실행: `docker compose up -d` -> `pnpm dev`  
재배포 순서: ElastiCache(terraform) -> RDS start -> ECS desired-count 2  
(ECS `desired-count 0` · RDS 중지 중 · ElastiCache 삭제됨)

## 프로젝트 개요

유이룸(Yu-ee Room) — 완전 비공개 유아/아동복 쇼핑몰. 회원은 관리자 승인 후에만 이용 가능.  
**Monorepo**: pnpm 10.33.0 + Turborepo | **Workspaces**: `apps/frontend`, `apps/backend`, `packages/shared`

## 행동 규칙

### 파일 탐색

- 작업 전 전체 디렉토리 구조를 탐색하지 않는다.
- 이슈와 직접 관련된 파일만 읽는다.
- 모르는 경로가 있을 때만 최소 범위로 탐색한다.

### 테스트 실행

- **Frontend**: `cd apps/frontend && npx vitest run --reporter=dot {대상}`
- **Backend**: `pnpm --filter @yueeroom/backend test -- --silent {대상}`
- 수정된 파일과 관련된 테스트만 실행한다. 통과 시 결과 요약만 확인.

### 개발 워크플로우

- **브랜치**: `feature/phase{N}-issue{N}-{description}` -> PR -> `main`
- **TDD 순서**: 테스트 작성 -> 구현 -> 통과 -> 커밋 -> 푸시 -> PR
- **PR 본문**: `Closes #N` 포함 (병합 시 이슈 자동 종료)
- **Lint-staged**: 커밋 시 `eslint --fix` + `prettier --write` 자동 실행

## 참고 문서

- [커맨드 명세](docs/claude/commands.md) — 루트·프론트엔드·백엔드 실행 커맨드 전체
- [아키텍처](docs/claude/architecture.md) — Frontend/Backend 구조, JWT 설계, Prisma 스키마
- [테스트 & CI](docs/claude/testing-ci.md) — 테스트 컨벤션, CI 파이프라인
- [토큰 절약 규칙](docs/claude/token-efficiency.md) — 출력 형식, 파일 읽기, 탐색 및 실행 규칙 **[반드시 준수]**
