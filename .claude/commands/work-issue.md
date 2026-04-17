현재 프로젝트의 $ARGUMENTS번 이슈 작업을 진행한다.

## 작업 지시

### 1. 이슈 파악 및 계획 수립

- GitHub에서 $ARGUMENTS번 이슈 내용을 확인한다.
- 이슈 요구사항을 분석하고 구현 계획을 3줄 이내 bullet로 출력한다.
- 승인 대기 없이 즉시 구현을 시작한다.

### 2. 브랜치 관리

- `main` 브랜치에서 분기한다.
- 브랜치명 규칙: `feature/phase{phase번호}-issue{이슈번호}-{description}`
  - `{phase번호}`: GitHub 이슈의 milestone 또는 label에서 확인한다. 없으면 사용자에게 질문한다.
  - `{이슈번호}`: $ARGUMENTS (예: 42)
  - `{description}`: 이슈 제목을 영문 kebab-case로 요약 (예: add-login-page)
- 브랜치를 생성하기 전에 조립된 브랜치명을 출력하고 확인한다.
  - 예시: `feature/phase2-issue42-add-login-page`

### 3. 구현

- 계획에 따라 단계적으로 구현한다.
- CLAUDE.md의 TDD 순서를 준수한다: 테스트 파일 작성 → 구현 → 테스트 통과 확인
- 테스트 실행은 CLAUDE.md의 테스트 실행 규칙을 따른다.

### 4. 작업 완료 후

- 변경사항을 커밋하고 원격 브랜치에 푸시한다.
- PR을 생성한다. PR 본문에 `Closes #$ARGUMENTS` 태그를 포함한다.
