현재 프로젝트의 $ARGUMENTS번 이슈 작업을 진행한다.

## 작업 지시

### 1. 이슈 파악

- GitHub에서 $ARGUMENTS번 이슈를 확인한다.
- 구현 계획을 bullet 2줄 이내로 출력한다. (이후 설명 없이 바로 구현)

### 2. 브랜치 생성

아래 규칙으로 브랜치명을 조립하고, **즉시 해당 이름으로 브랜치를 생성·체크아웃한다. 확인 대기 없음.**

브랜치명 규칙: `feature/phase{phase번호}-issue{이슈번호}-{description}`

- `{phase번호}`: 이슈의 milestone 또는 label에서 확인. 없으면 사용자에게 질문.
- `{이슈번호}`: $ARGUMENTS
- `{description}`: 이슈 제목을 영문 kebab-case로 요약

```bash
# 반드시 이 형태로 실행할 것 — 브랜치명을 직접 대입
git checkout main && git pull
git checkout -b feature/phase{N}-issue{$ARGUMENTS}-{description}
```

### 3. 구현

- CLAUDE.md의 TDD 순서를 따른다: 테스트 작성 → 구현 → 통과 확인
- 테스트 실행 시 **실패 항목만 출력**한다. (성공 로그 생략)
  - 예: `pytest -q --tb=short` / `jest --silent`

### 4. 완료

- 변경사항을 커밋하고 **2단계에서 생성한 브랜치**에 푸시한다.
- PR 생성. 본문에 `Closes #$ARGUMENTS` 포함.
