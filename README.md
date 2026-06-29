# CafeRadar ☕

카페 근무자들이 자신이 근무했던 카페의 근무 환경을 공유하고, 카페에서 일하려는 사람들이 참고할 수 있는 **커뮤니티형 웹 서비스**입니다.

> "일하기 전에, 근무 환경부터 확인하세요."

## 주요 기능

| 기능 | 설명 |
|------|------|
| **회원가입 / 로그인** | Supabase Authentication (이메일 · 비밀번호 · 닉네임) |
| **근무 후기** | 로그인 회원만 작성, 전체 공개 조회 |
| **구인글** | 비회원도 작성 가능, Supabase DB 저장 |
| **검색** | 후기: 카페명·지역 / 구인: 카페명·지역·직무 |
| **마이페이지** | 닉네임, 내가 작성한 후기 목록 |
| **GitHub Pages** | 빌드 없이 정적 배포 가능 |

## 사용 기술

- HTML5, CSS3
- JavaScript (Vanilla ES Modules)
- [Supabase JS SDK](https://supabase.com/docs/reference/javascript/introduction) (CDN)
- Supabase Auth + PostgreSQL

## 프로젝트 구조

```
caferadar/
├── index.html          # 메인 페이지
├── style.css           # 스타일
├── favicon.svg
├── js/
│   ├── config.js       # ★ Supabase URL / Anon Key 설정
│   ├── supabase.js     # Supabase 클라이언트
│   ├── auth.js         # 회원가입 · 로그인 · 로그아웃
│   ├── reviews.js      # 후기 CRUD
│   ├── jobs.js         # 구인글 CRUD
│   ├── ui.js           # DOM · 렌더링 · 모달
│   ├── utils.js        # 유틸리티
│   └── app.js          # 앱 진입점
├── supabase/
│   └── schema.sql      # DB 테이블 · RLS · 트리거
└── README.md
```

---

## Supabase 설정 방법

### 1. 프로젝트 생성

1. [Supabase](https://supabase.com) 에서 새 프로젝트를 생성합니다.
2. **Project Settings → API** 에서 아래 값을 복사합니다.
   - `Project URL`
   - `anon public` key

### 2. 클라이언트 설정

`js/config.js` 파일 상단의 값을 교체합니다.

```javascript
export const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

> 이 두 값만 바꾸면 앱이 Supabase와 연동됩니다.

### 3. Authentication 설정

Supabase Dashboard → **Authentication → Providers → Email**

| 항목 | 권장 설정 |
|------|-----------|
| Enable Email provider | ✅ 켜기 |
| Confirm email | 개발 중에는 **끄기** (즉시 로그인). 운영 시 켜기 |
| Minimum password length | 6 |

**Authentication → URL Configuration**

| 항목 | 값 예시 |
|------|---------|
| Site URL | `https://YOUR_USERNAME.github.io/caferadar/` |
| Redirect URLs | `https://YOUR_USERNAME.github.io/caferadar/**`, `http://localhost:8080/**` |

로컬 개발과 GitHub Pages 배포 URL을 모두 Redirect URLs에 추가하세요.

### 4. Database 생성

Supabase Dashboard → **SQL Editor** → New query

`supabase/schema.sql` 파일 내용을 **전체 복사 후 실행**합니다.

생성되는 테이블:

| 테이블 | 설명 |
|--------|------|
| `profiles` | id, nickname, created_at |
| `reviews` | id, user_id, cafe_name, region, position, wage, period, atmosphere, pros, cons, rating, created_at |
| `jobs` | id, user_id, cafe_name, region, position, wage, work_time, contact, description, status, created_at |

RLS(Row Level Security) 정책:

- **profiles** — 전체 조회, 본인만 생성·수정
- **reviews** — 전체 조회, 로그인 회원만 작성, 작성자만 수정·삭제
- **jobs** — 전체 조회, 로그인 작성자는 직접 작성 / 비회원은 RPC, 작성자만 직접 수정·삭제

이미 DB가 있는 경우 [`supabase/migration_rls.sql`](supabase/migration_rls.sql) 을 SQL Editor에서 실행하세요.

> 이미 DB를 생성한 경우 마이그레이션 SQL을 SQL Editor에서 실행하세요.  
> v2 → v3_reapply → v3_fix_pgcrypto → **migration_withdraw_reapply.sql** (탈퇴) → **migration_nickname_unique.sql** (닉네임 중복 확인) → **migration_rls.sql** (RLS 정책) → **migration_admin.sql** (관리자 삭제 권한)

### 5. 관리자 설정

1. `supabase/migration_admin.sql`을 SQL Editor에서 실행합니다.
2. 관리자로 지정할 **이메일을 등록**합니다. 여러 명을 한 번에 넣을 수 있습니다.

```sql
insert into public.admin_emails (email) values
  ('admin1@example.com'),
  ('admin2@example.com')
on conflict (email) do nothing;
```

3. 해당 이메일로 **회원가입 후 로그인**하면 관리자 권한이 적용됩니다.

관리자로 로그인하면 본인 글이 아닌 **후기·구인글·구직글** 상세 화면에서 **관리자 삭제** 버튼이 보입니다.

| 작업 | SQL |
|------|-----|
| 관리자 추가 | `insert into public.admin_emails (email) values ('이메일');` |
| 관리자 해제 | `delete from public.admin_emails where email = '이메일';` |
| 목록 확인 | Supabase Table Editor → `admin_emails` |

> 이미 `migration_admin.sql`만 실행한 경우, `migration_admin_emails.sql`을 추가로 실행하세요.

회원가입 시 `profiles` 행은 DB 트리거(`handle_new_user`)로 자동 생성됩니다.

---

## SQL 테이블 생성 스크립트

전체 스크립트는 [`supabase/schema.sql`](supabase/schema.sql) 를 참고하세요.

핵심 테이블 예시:

```sql
-- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now()
);

-- reviews
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cafe_name text not null,
  region text not null,
  position text not null,
  wage text,
  period text not null,
  atmosphere text,
  pros text,
  cons text,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

-- jobs
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  cafe_name text not null,
  region text not null,
  position text not null,
  wage text not null,
  work_time text not null,
  contact text not null,
  description text,
  created_at timestamptz not null default now()
);
```

RLS 정책과 프로필 자동 생성 트리거는 `schema.sql`에 포함되어 있습니다.

---

## 로컬 실행

ES Module을 사용하므로 **로컬 서버**로 실행하는 것을 권장합니다.

```bash
cd caferadar

# Python 3
python3 -m http.server 8080

# 또는 npx
npx serve .
```

브라우저에서 `http://localhost:8080` 으로 접속합니다.

---

## GitHub Pages 배포 방법

### 1. 저장소 설정

1. GitHub에 `caferadar` 저장소를 push합니다.
2. **Settings → Pages**
3. Source: **Deploy from a branch**
4. Branch: `main` / `/ (root)`
5. Save

### 2. Supabase URL 등록

배포 URL이 `https://YOUR_USERNAME.github.io/caferadar/` 라면,

Supabase **Authentication → URL Configuration** 에 위 URL을 Site URL 및 Redirect URLs에 등록합니다.

### 3. config.js 확인

`js/config.js`에 올바른 `SUPABASE_URL`, `SUPABASE_ANON_KEY`가 설정되어 있는지 확인합니다.

> `anon` key는 클라이언트에 노출되어도 됩니다. RLS로 데이터 접근이 보호됩니다.

### 4. 배포 확인

Pages 빌드 완료 후 접속하여 아래를 확인합니다.

- [ ] 후기 · 구인글 목록 로드
- [ ] 회원가입 / 로그인
- [ ] 후기 작성 (로그인 필요)
- [ ] 구인글 작성 (비회원 가능)
- [ ] 새로고침 후 데이터 유지

---

## 라이선스

이 프로젝트는 학습 및 포트폴리오 목적으로 제작되었습니다.

---

Made with ☕ by CafeRadar Team
