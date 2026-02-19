# STATUS

## 현재 단계

Phase 4: 포스팅/성과

## 구현 로드맵

### Phase 0: 프로젝트 셋업 ✅ 완료
- [x] 기능 정의서 분리 (docs/features/)
- [x] Cursor Rules 설정
- [x] STATUS.md 생성
- [x] 기술 스택 최종 확정
- [x] 프로젝트 초기화 (client/ + server/)
- [x] DB 스키마 설계

### Phase 1: 인프라/인증 (MVP 기반) ✅ 완료
- [x] F-001 인증 및 사용자 관리
- [x] 공통 레이아웃, 라우팅, 미들웨어

### Phase 2: 콘텐츠 소스/템플릿 ✅ 완료
- [x] F-002 소스 크롤링
- [x] F-003 프롬프트 관리
- [x] F-004 이미지 처리 템플릿 관리

### Phase 3: 핵심 생산 플로우 ✅ 완료
- [x] F-005 원고 생성
- [x] F-006 원고 편집 및 관리

### Phase 4: 포스팅/성과
- [x] F-007 포스팅 관리
- [x] F-008 성과 추적
- [x] F-009 대시보드

### Phase 5: 운영 안정화
- [ ] 스케줄러 안정화
- [ ] 에러 핸들링/재시도
- [ ] 로그/모니터링

## 최근 작업

### 2026-02-19 (24차) - 배포용 gitignore 정리
- **공통**
  - 업로드/로그/런타임 파일 제외 규칙 보강 (root/server/client)

### 2026-02-19 (23차) - 소스 기사 생성자 표시
- **백엔드 (server/)**
  - 소스 기사별 원고 생성자 목록 조회 추가
- **프론트엔드 (client/)**
  - 소스 기사 카드에 원고 생성자 표시

### 2026-02-19 (22차) - 로고 심볼 명확화
- **프론트엔드 (client/)**
  - 펜촉 심볼 디테일 보강 (슬릿/가로바 추가)
  - 파비콘 심볼 동일하게 업데이트

### 2026-02-19 (21차) - 성과 집계 페이지 추가
- **프론트엔드 (client/)**
  - 성과 집계 전용 페이지 추가 (순위/조회/댓글 기준 정렬)
  - 사이드바에 성과 집계 메뉴 추가

### 2026-02-19 (20차) - 로고 컨셉 D/F 적용
- **프론트엔드 (client/)**
  - D 컨셉: 펜촉+도트 심볼 로고 적용 (사이드바)
  - F 컨셉: 워드마크 로고 적용 (로그인/회원가입)

### 2026-02-19 (19차) - 페이지 전환/로고 개선
- **프론트엔드 (client/)**
  - 페이지 이동 시 부드러운 전환 애니메이션 적용
  - 브랜드 컨셉에 맞는 CF 모노그램 로고로 교체

### 2026-02-19 (18차) - 로고/버튼 테마 정리
- **프론트엔드 (client/)**
  - 글로벌 버튼 스타일 추가 및 주요 버튼 테마 통일
  - 로그인/회원가입/관리 페이지에 로고 마크 적용
  - 원고/포스팅/관리 화면 버튼 톤 정리

### 2026-02-19 (17차) - 프론트엔드 디자인 개선
- **프론트엔드 (client/)**
  - 글로벌 배경/카드 스타일 추가로 고급스러운 톤 적용
  - 사이드바/네비게이션 스타일 개선 및 호버 애니메이션 추가
  - 로그인/회원가입/대시보드/소스 목록 UI에 프리미엄 스타일 적용

### 2026-02-19 (12차) - 변환 이미지 S3 저장
- **백엔드 (server/)**
  - 변환/생성 이미지 S3 업로드 로직 추가
  - 원고 삭제 시 S3 또는 로컬 이미지 정리 지원
  - S3 환경 변수 예시 추가 (.env.example)

### 2026-02-19 (13차) - LLM 모델 선택/연동
- **백엔드 (server/)**
  - 프롬프트에 모델 제공사/모델명 저장 (DB 스키마 + 마이그레이션)
  - 프롬프트 모델 컬럼 마이그레이션 SQL 추가 (운영 DB 업데이트)
  - LLM 호출 시 OpenAI/Claude/Gemini API 연동
  - 원고 생성 작업에 모델 정보 전달
  - API 키 환경 변수 예시 추가 (.env.example)
- **프론트엔드 (client/)**
  - 프롬프트 편집에서 모델 제공사/모델명 선택 UI 추가

### 2026-02-19 (14차) - 원고 생성 실패 처리
- **백엔드 (server/)**
  - LLM 응답이 비어있을 때 생성 실패 처리
  - 원고 상태에 failed 추가 (마이그레이션 + 스키마 반영)
- **프론트엔드 (client/)**
  - 생성 실패 상태 UI 및 리스트 표시 추가

### 2026-02-19 (15차) - 이미지 컨텍스트/배치 개선
- **백엔드 (server/)**
  - 신규 이미지 생성 시 원문 컨텍스트 전달 (제목/키워드/본문)
  - 문단 기반 이미지 삽입 로직 개선 (문단 사이 배치)

### 2026-02-19 (16차) - Gemini 이미지 API 연동
- **백엔드 (server/)**
  - 이미지 변환/생성에 Gemini 이미지 모델 연동
  - 원본/신규 이미지 생성 파일 확장자 정리 (png)
  - GEMINI_IMAGE_MODEL 환경 변수 추가 (.env.example)

### 2026-02-19 (11차) - F-009 대시보드 구현
- **백엔드 (server/)**
  - 대시보드 요약/최근 포스팅 API 추가
  - 관리자 대시보드 요약/랭킹 API 추가
- **프론트엔드 (client/)**
  - 대시보드 페이지 데이터 연동 및 UI 구성
  - 최근 포스팅 성과 리스트, 빠른 접근, 관리자 랭킹 위젯

### 2026-02-19 (10차) - F-008 성과 추적 구현
- **백엔드 (server/)**
  - 성과 수집 스케줄러 추가: 매시 정각 + 초기 수집
  - 성과 수집 mock 로직 추가 (조회/댓글/순위 랜덤 증가)
  - 원고 목록 조회에 최신 성과 요약 포함 (latest_rank/views/comments, tracking status)
- **프론트엔드 (client/)**
  - 성과 상세 페이지 추가 (요약 카드, 진행률, 추이 차트, 데이터 테이블)
  - 원고 목록에 성과 요약 표시 및 성과 상세 이동 버튼
  - 원고 편집 페이지에 성과 상세 이동 버튼
  - 성과 조회 API 클라이언트/타입 추가

### 2026-02-19 (9차) - F-007 포스팅 관리 구현
- **백엔드 (server/)**
  - 원고 목록 조회에 포스팅 정보 포함: postings LEFT JOIN 추가
  - 목록 응답에 posting_url/platform/keyword/posted_at 필드 추가
- **프론트엔드 (client/)**
  - 포스팅 완료 모달 컴포넌트 추가: URL/플랫폼/키워드 입력, 자동 플랫폼 감지
  - 원고 편집 페이지에 포스팅 완료 처리 버튼 및 URL 링크 표시
  - 원고 목록에 포스팅 완료 처리 버튼/URL 표시 + 상태 업데이트
  - 포스팅 완료/조회 API 클라이언트 추가

### 2026-02-18 (8차) - F-006 원고 편집 및 관리 구현
- **백엔드 (server/)**
  - DB 쿼리 추가: server/src/db/queries/manuscripts.ts
    - update(id, {title, content_html}), deleteById(id), findByUserFiltered(상태 필터, 페이지네이션), findAllFiltered(관리자용)
  - API 라우트 추가: server/src/routes/manuscripts.ts
    - PUT /api/manuscripts/:id (원고 수정 — 제목+본문, 본인 원고만)
    - DELETE /api/manuscripts/:id (원고 삭제 — 이미지 파일 디스크 정리 포함)
    - GET /api/manuscripts 개선 (상태 필터, 페이지네이션 지원)
  - 관리자 API 라우트: server/src/routes/admin/manuscripts.ts
    - GET /api/admin/manuscripts (전체 원고 목록 조회, 상태 필터, 페이지네이션)
  - app.ts에 관리자 원고 라우트 등록
- **프론트엔드 (client/)**
  - TipTap 에디터 의존성 설치 (@tiptap/react, starter-kit, 서식 확장 11개)
  - 커스텀 FontSize 확장: client/src/extensions/fontSize.ts
  - 타입 업데이트: client/src/types/manuscript.ts (ManuscriptUpdateRequest, prompt_snapshot/user_name 추가, 페이지네이션)
  - API 서비스 업데이트: client/src/services/manuscript.ts (update, delete, 필터 파라미터)
  - 원고 편집 페이지: client/src/pages/ManuscriptEditPage.tsx (S-011)
    - TipTap WYSIWYG 편집기 (굵기, 기울임, 밑줄, 취소선, 글자 색상, 글자 크기, 정렬, 인용구, 링크, 이미지)
    - HTML 복사 기능 (네이버 편집기 호환 — ClipboardItem text/html)
    - 30초 자동 저장 + 수동 저장
    - 제목 인라인 편집
    - 원본 기사 정보 하단 표시
  - 내 원고 목록 페이지: client/src/pages/ManuscriptListPage.tsx (S-012)
    - 상태별 필터 탭 (전체/생성 완료/포스팅 완료)
    - 테이블형 목록 (제목, 상태 배지, 원본 기사, 생성일)
    - 편집/삭제 버튼, 삭제 확인 다이얼로그
    - 페이지네이션
  - TipTap 에디터 스타일: client/src/index.css (서식 요소 전체 스타일링)
  - App.tsx 라우팅: Placeholder 제거, 실제 페이지 연결

### 2026-02-18 (7차) - F-005 원고 생성 구현
- **백엔드 (server/)**
  - DB 쿼리 함수: server/src/db/queries/manuscripts.ts (원고 CRUD, 이미지 관리)
  - DB 쿼리 함수: server/src/db/queries/jobQueue.ts (작업 큐 생성, 클레임, 완료/실패 처리)
  - 소스 작업자 관리: server/src/db/queries/sources.ts에 addWorker/removeWorker 추가
  - LLM 추상화 레이어: server/src/services/llm.ts (mock 구현, 실제 API 교체 가능)
  - 이미지 AI 추상화 레이어: server/src/services/imageAi.ts (mock 구현, 나노바나나 등 교체 가능)
  - 원고 생성 오케스트레이터: server/src/services/manuscriptGenerator.ts
    - 프롬프트 변수 치환 ({원문}, {키워드}), LLM 호출, 이미지 처리/생성, HTML 내 이미지 자동 배치
  - 백그라운드 작업 워커: server/src/jobs/manuscript-worker.ts
    - job_queue 폴링 (3초 간격), 실패 시 재시도 (max_attempts), 소스 작업자 자동 해제
  - API 라우트: server/src/routes/manuscripts.ts
    - POST /api/manuscripts/generate (원고 생성 요청 → 작업 큐 등록)
    - GET /api/manuscripts/:id/status (생성 진행 상태 폴링)
    - GET /api/manuscripts (내 원고 목록)
    - GET /api/manuscripts/:id (원고 상세)
- **프론트엔드 (client/)**
  - 타입: client/src/types/manuscript.ts
  - API 서비스: client/src/services/manuscript.ts
  - 원고 생성 페이지: client/src/pages/ManuscriptGeneratePage.tsx
    - S-009: 좌우 분할 레이아웃 (소스 미리보기 + 설정 패널)
    - 프롬프트/이미지 템플릿 드롭다운, 키워드 입력, 글 길이 선택, 이미지 생성 개수 슬라이더
    - S-010: 생성 중 진행 상태 표시 (단계별 프로그레스)
    - 생성 완료 시 원고 확인/재생성 선택
  - SourceListPage 업데이트: 각 소스 카드에 "원고 생성" 버튼 + "원본 보기" 링크 추가
  - App.tsx 라우팅: /manuscripts/generate, /manuscripts/:id, /manuscripts

### 2026-02-18 (6차) - F-004 이미지 처리 템플릿 관리 구현
- **백엔드 (server/)**
  - DB 쿼리 함수: server/src/db/queries/imageTemplates.ts (CRUD, 활성화/비활성화, 삭제 시 스냅샷 보존)
  - 공개 API 라우트: server/src/routes/imageTemplates.ts
    - GET /api/image-templates (일반 사용자: 활성만, 관리자: 전체)
    - GET /api/image-templates/:id (상세 조회)
  - 관리자 API 라우트: server/src/routes/admin/imageTemplates.ts
    - POST /api/admin/image-templates (생성, 처리 방식 유효성 검증)
    - PUT /api/admin/image-templates/:id (수정)
    - PATCH /api/admin/image-templates/:id/toggle (활성화/비활성화)
    - DELETE /api/admin/image-templates/:id (삭제, 원고 스냅샷 보존 후 FK 해제)
- **프론트엔드 (client/)**
  - 타입: client/src/types/imageTemplate.ts
  - API 서비스: client/src/services/imageTemplate.ts
  - 이미지 템플릿 관리 페이지: client/src/pages/admin/ImageTemplateManagementPage.tsx
    - 테이블형 목록, 처리 방식/스타일/워터마크 표시, 상태 토글, 수정/삭제 버튼
  - 이미지 템플릿 편집 페이지: client/src/pages/admin/ImageTemplateEditPage.tsx
    - 생성/수정 폼, 원본 처리 방식 라디오 선택, 스타일 프리셋 + 직접 입력, 워터마크 토글
  - App.tsx 라우팅: /admin/image-templates, /admin/image-templates/new, /admin/image-templates/:id/edit

### 2026-02-18 (5차) - F-003 프롬프트 관리 구현
- **백엔드 (server/)**
  - DB 쿼리 함수: server/src/db/queries/prompts.ts (CRUD, 활성화/비활성화, 삭제 시 스냅샷 보존)
  - 공개 API 라우트: server/src/routes/prompts.ts
    - GET /api/prompts (일반 사용자: 활성만, 관리자: 전체)
    - GET /api/prompts/:id (상세 조회)
  - 관리자 API 라우트: server/src/routes/admin/prompts.ts
    - POST /api/admin/prompts (생성, {원문} 변수 필수 검증)
    - PUT /api/admin/prompts/:id (수정)
    - PATCH /api/admin/prompts/:id/toggle (활성화/비활성화)
    - DELETE /api/admin/prompts/:id (삭제, 원고 스냅샷 보존 후 FK 해제)
- **프론트엔드 (client/)**
  - 타입: client/src/types/prompt.ts
  - API 서비스: client/src/services/prompt.ts
  - 프롬프트 관리 페이지: client/src/pages/admin/PromptManagementPage.tsx
    - 테이블형 목록, 상태 토글, 수정/삭제 버튼
  - 프롬프트 편집 페이지: client/src/pages/admin/PromptEditPage.tsx
    - 생성/수정 폼, 변수 삽입 버튼, {원문} 필수 검증
  - App.tsx 라우팅: /admin/prompts, /admin/prompts/new, /admin/prompts/:id/edit

### 2026-02-18 (4차) - F-002 소스 크롤링 구현
- **백엔드 (server/)**
  - 크롤링 사이트 설정: server/src/config/crawl-sites.ts (사이트별 셀렉터 정의, 확장 가능)
  - DB 쿼리 함수: server/src/db/queries/sources.ts (sources CRUD, 만료 삭제, 카테고리 조회)
  - 크롤러 서비스: server/src/services/crawler.ts (기사 수집, 이미지 다운로드, 중복 방지)
  - 스케줄러: server/src/jobs/crawl-scheduler.ts (매시 정각 크롤링 + 만료 기사 정리)
  - API 라우트: server/src/routes/sources.ts
    - GET /api/sources (목록, 페이지네이션, 카테고리 필터, 검색)
    - GET /api/sources/:id (상세, 원문 HTML + 이미지)
  - 정적 파일 서빙: /uploads 경로로 다운로드된 이미지 접근 가능
- **프론트엔드 (client/)**
  - 타입: client/src/types/source.ts
  - API 서비스: client/src/services/source.ts
  - 소스 기사 목록: client/src/pages/SourceListPage.tsx
    - 카드형 레이아웃, 카테고리 필터, 제목 검색
    - 페이지네이션, 작업 중 사용자 표시
  - App.tsx 라우팅: /sources 경로에 실제 페이지 연결
  - Vite 프록시: /uploads 경로 추가
- **의존성 추가**: axios, cheerio

### 2026-02-18 (3차) - F-001 인증 구현
- **백엔드 (server/)**
  - DB 쿼리 함수: server/src/db/queries/users.ts (CRUD, 검색, 카운트)
  - JWT 인증 미들웨어: server/src/middleware/auth.ts (authenticate, requireAdmin, generateToken)
  - 인증 라우트: server/src/routes/auth.ts
    - POST /api/auth/register (첫 유저 자동 관리자)
    - POST /api/auth/login (상태별 에러 메시지)
    - GET /api/auth/me
    - POST /api/auth/logout
    - GET /api/auth/check-username/:username
  - 관리자 사용자관리 라우트: server/src/routes/admin/users.ts
    - GET /api/admin/users, GET /api/admin/users/pending
    - PATCH approve, reject, role, deactivate
    - 마지막 관리자 보호 로직 포함
- **프론트엔드 (client/)**
  - 타입: client/src/types/auth.ts
  - API 서비스: client/src/services/api.ts (공통 fetch + JWT 자동 주입), auth.ts
  - Auth Context: client/src/hooks/useAuth.tsx (AuthProvider, useAuth)
  - 로그인 페이지: client/src/pages/LoginPage.tsx
  - 회원가입 페이지: client/src/pages/RegisterPage.tsx (아이디 중복 실시간 확인, 유효성 검증)
  - 공통 레이아웃: client/src/components/layout/AppLayout.tsx (사이드바 + 관리자 메뉴)
  - ProtectedRoute: client/src/components/layout/ProtectedRoute.tsx
  - 사용자 관리: client/src/pages/admin/UserManagementPage.tsx (대기/전체 탭)
  - 대시보드 플레이스홀더: client/src/pages/DashboardPage.tsx
  - App.tsx 라우팅: 인증/비인증 분리, 관리자 전용 라우트

### 2026-02-18 (2차)
- client/ 초기화 완료: Vite + React 19 + TypeScript + Tailwind CSS v4 + React Router
- server/ 초기화 완료: Express 5 + TypeScript + mysql2 + jsonwebtoken + bcrypt + node-cron
- DB 스키마 설계 완료 (server/src/db/schema.sql)

### 2026-02-18 (1차)
- project.md를 기능별 9개 파일로 분리 완료
- Cursor Rules 설정, STATUS.md 생성, 기술 스택 최종 확정

## 결정 기록

### 2026-02-18: 이미지 템플릿 프롬프트 기반 설계
- 초기에는 원본 처리 방식을 enum(redraw/2d/color/custom)으로 분류했으나, 어차피 이미지 AI에 전달하는 건 프롬프트이므로 불필요한 중간 매핑 제거
- 관리자가 원본 이미지 처리 프롬프트를 직접 작성하는 방식으로 단순화
- 워터마크 제거는 별도 API 호출 없이 프롬프트에 지시를 추가하는 방식 (비용 절감)
- DB 컬럼: original_processing_type/config/new_image_style 제거 → original_image_prompt로 통합

### 2026-02-19: 변환 이미지 S3 저장
- 원고 생성 과정에서 생성/변환된 이미지는 S3에 저장
- file_path는 S3 key, file_url은 접근 가능한 퍼블릭 URL로 저장

### 2026-02-19: 프롬프트별 LLM 모델 선택
- 프롬프트 템플릿에 모델 제공사/모델명을 저장하여 원고 생성에 반영

### 2026-02-18: 인증 구현 방식
- JWT를 Authorization: Bearer 헤더로 전달
- 클라이언트: localStorage에 token/user 저장
- AuthProvider가 앱 시작 시 /api/auth/me로 토큰 유효성 검증
- 첫 번째 가입자는 자동 관리자 + 즉시 승인 (별도 초기 설정 불필요)
- 401 응답 시 자동 로그아웃 처리

### 2026-02-18: 프로젝트 구조
- client/: Vite + React + Tailwind (포트 5173, /api → localhost:3000 프록시)
- server/: Express + tsx (포트 3000, hot reload)
- @/ 경로 alias로 import 경로 단순화

### 2026-02-18: DB 스키마 설계 원칙
- 원고 생성 시 프롬프트/이미지 템플릿/소스 기사를 스냅샷으로 보존
- source → manuscript는 ON DELETE SET NULL
- manuscript → posting → performance_tracking은 CASCADE
- job_queue 테이블로 비동기 작업 관리

### 2026-02-18: 기술 스택 확정
- Frontend: React (Vite) + Tailwind CSS
- Backend: Express + Node.js
- DB: MySQL (raw SQL, ORM 사용 안 함)
- Auth: JWT 직접 구현
- LLM: 여러 LLM 사용 (추상화 레이어)
- Image AI: 나노바나나 (추상화 레이어)
- Editor: TipTap (네이버 호환 WYSIWYG)
- Queue: DB 기반 작업 큐 직접 구현
- Scheduler: node-cron

## 오픈 이슈

- 나노바나나 API 연동 방식 확인 필요
- 사용할 LLM 목록 및 API 키 확인 필요

### 2026-02-18: 크롤러 설계 방식
- 사이트별 설정(CrawlSiteConfig)으로 크롤링 대상/파싱 규칙 정의
- server/src/config/crawl-sites.ts에서 사이트 추가/수정 가능
- URL SHA-256 해시로 중복 방지 (sources.url_hash 컬럼)
- 이미지는 uploads/sources/{sourceId}/ 경로에 저장, 원본 URL도 DB에 보존
- 만료 기사 삭제 시 원고에 사용된 기사는 스냅샷 보존 후 FK 해제
- 크롤러 동시 실행 방지 (isRunning 플래그)

## 다음 작업

Phase 5: 운영 안정화
