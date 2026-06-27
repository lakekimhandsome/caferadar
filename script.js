/**
 * CafeRadar — Main Application Script
 * MVP: localStorage 기반 카페 근무 후기 · 구인/구직 커뮤니티
 *
 * 향후 확장 예정:
 * - Supabase 연동 (DB 저장)
 * - 실제 회원 인증 (OAuth, JWT)
 * - 점주 인증 (구인글 verified 플래그)
 * - 댓글 / 신고 기능
 * - 관리자 페이지
 */

/* =============================================
   Constants & Configuration
   ============================================= */

const STORAGE_KEYS = {
  REVIEWS: 'caferadar_reviews',
  USERS: 'caferadar_users',
  SESSION: 'caferadar_session',
  HIRING: 'caferadar_hiring',
  SEEKING: 'caferadar_seeking',
};

const RECENT_LIMIT = 5;

/** 구인글 작성자 유형 — 향후 점주 인증 연동 시 사용 */
const AUTHOR_TYPE = {
  GUEST: 'guest',
  OWNER: 'owner',
};

/** 초기 데모 후기 */
const SEED_REVIEWS = [
  {
    id: 'seed-1',
    cafeName: '블루보틀 성수',
    region: '서울 성동구',
    workPeriod: '2024.03 ~ 2024.08',
    position: '바리스타',
    hourlyWage: '11,000원',
    atmosphere: '체계적이고 프로페셔널',
    pros: '브루잉 교육이 탄탄하고 매장이 항상 깔끔합니다. 동료들과의 소통도 원활해요.',
    cons: '피크타임에는 주문량이 많아 체력 소모가 큽니다. 초반 적응 기간이 다소 길어요.',
    rating: 5,
    createdAt: '2025-12-10T09:00:00.000Z',
  },
  {
    id: 'seed-2',
    cafeName: '스타벅스 강남역점',
    region: '서울 강남구',
    workPeriod: '2023.06 ~ 2024.01',
    position: '바리스타',
    hourlyWage: '10,620원',
    atmosphere: '바쁘지만 팀워크 좋음',
    pros: '복리후생(커피 무료, 할인)이 좋고 브랜드 경력으로 이력서에도 도움이 됩니다.',
    cons: '주말·공휴일 근무 비중이 높고, 러시아워 스트레스가 상당합니다.',
    rating: 4,
    createdAt: '2025-11-28T14:30:00.000Z',
  },
  {
    id: 'seed-3',
    cafeName: '카페 온더루프',
    region: '서울 마포구',
    workPeriod: '2024.09 ~ 2025.02',
    position: '알바',
    hourlyWage: '10,300원',
    atmosphere: '아늑하고 소규모',
    pros: '사장님이 친절하고 메뉴 개발에도 참여할 수 있어 배울 게 많아요.',
    cons: '매장 규모가 작아 혼자 근무하는 시간이 많고, 휴게 공간이 부족합니다.',
    rating: 3,
    createdAt: '2025-11-15T11:00:00.000Z',
  },
  {
    id: 'seed-4',
    cafeName: '투썸플레이스 홍대점',
    region: '서울 마포구',
    workPeriod: '2023.01 ~ 2023.08',
    position: '홀서빙',
    hourlyWage: '10,030원',
    atmosphere: '젊은 층 손님이 많아 활기참',
    pros: '근무 시간대 선택이 유연하고, 디저트류를 맛볼 기회가 많습니다.',
    cons: '홀과 주방 업무를 겸해야 해서 멀티태스킹이 필수입니다.',
    rating: 4,
    createdAt: '2025-10-20T16:45:00.000Z',
  },
  {
    id: 'seed-5',
    cafeName: '카페 드 로와',
    region: '경기 수원시',
    workPeriod: '2024.05 ~ 2024.11',
    position: '파트타임',
    hourlyWage: '10,500원',
    atmosphere: '조용하고 여유로움',
    pros: '주말 오전 타임이라 학생에게 적합하고, 원두 로스팅을 직접 볼 수 있어요.',
    cons: '지하철역에서 거리가 있고, 손님 수가 적어 지루할 때가 있습니다.',
    rating: 4,
    createdAt: '2025-10-05T08:20:00.000Z',
  },
];

/** 초기 데모 구인글 */
const SEED_HIRING = [
  {
    id: 'hire-seed-1',
    cafeName: '카페 레이어드',
    region: '서울 용산구',
    position: '바리스타',
    hourlyWage: '11,000원',
    workHours: '주 4일, 10:00~18:00',
    contact: '카카오톡: layered_cafe',
    description: '라떼아트 가능자 우대. 따뜻한 분위기의 동네 카페입니다.',
    authorType: AUTHOR_TYPE.GUEST,
    userId: null,
    verified: false,
    createdAt: '2025-12-01T10:00:00.000Z',
  },
  {
    id: 'hire-seed-2',
    cafeName: '모닝커피 성수',
    region: '서울 성동구',
    position: '알바',
    hourlyWage: '10,500원',
    workHours: '주말 09:00~15:00',
    contact: '010-1234-5678',
    description: '주말 오전 근무 가능한 분을 찾습니다. 초보자도 환영해요.',
    authorType: AUTHOR_TYPE.GUEST,
    userId: null,
    verified: false,
    createdAt: '2025-11-20T14:00:00.000Z',
  },
];

/** 초기 데모 구직글 */
const SEED_SEEKING = [
  {
    id: 'seek-seed-1',
    nickname: '커피러버',
    region: '서울 마포구',
    position: '바리스타',
    experience: '바리스타 2년',
    availableHours: '평일 오후, 주말',
    intro: '라떼아트와 핸드드립 경험이 있습니다. 성실하고 밝은 성격입니다.',
    contact: '카카오톡: coffee_lover',
    userId: 'demo-user',
    createdAt: '2025-11-25T09:00:00.000Z',
  },
];

/* =============================================
   State
   ============================================= */

const state = {
  reviews: [],
  hiring: [],
  seeking: [],
  users: [],
  currentUser: null,
  searchQuery: '',
  regionFilter: 'all',
  activeJobTab: 'hiring',
  selectedRating: 0,
};

/* =============================================
   DOM References
   ============================================= */

const DOM = {
  header: document.getElementById('header'),
  navToggle: document.getElementById('nav-toggle'),
  navLinks: document.getElementById('nav-links'),
  navAuthGuest: document.getElementById('nav-auth-guest'),
  navAuthUser: document.getElementById('nav-auth-user'),
  navNickname: document.getElementById('nav-nickname'),
  searchInput: document.getElementById('search-input'),
  mobileSearchInput: document.getElementById('mobile-search-input'),
  recentReviews: document.getElementById('recent-reviews'),
  reviewList: document.getElementById('review-list'),
  reviewsCountText: document.getElementById('reviews-count-text'),
  filterChips: document.getElementById('filter-chips'),
  emptyState: document.getElementById('empty-state'),
  statCount: document.getElementById('stat-count'),
  statRegions: document.getElementById('stat-regions'),
  statRating: document.getElementById('stat-rating'),
  jobsCountText: document.getElementById('jobs-count-text'),
  jobsPanelDesc: document.getElementById('jobs-panel-desc'),
  jobsWriteBtnText: document.getElementById('jobs-write-btn-text'),
  hiringList: document.getElementById('hiring-list'),
  seekingList: document.getElementById('seeking-list'),
  hiringEmpty: document.getElementById('hiring-empty'),
  seekingEmpty: document.getElementById('seeking-empty'),
  panelHiring: document.getElementById('panel-hiring'),
  panelSeeking: document.getElementById('panel-seeking'),
  writeModal: document.getElementById('write-modal'),
  detailModal: document.getElementById('detail-modal'),
  authModal: document.getElementById('auth-modal'),
  mypageModal: document.getElementById('mypage-modal'),
  hiringModal: document.getElementById('hiring-modal'),
  seekingModal: document.getElementById('seeking-modal'),
  jobDetailModal: document.getElementById('job-detail-modal'),
  reviewForm: document.getElementById('review-form'),
  loginForm: document.getElementById('login-form'),
  signupForm: document.getElementById('signup-form'),
  hiringForm: document.getElementById('hiring-form'),
  seekingForm: document.getElementById('seeking-form'),
  starRating: document.getElementById('star-rating'),
  ratingInput: document.getElementById('rating'),
  ratingHint: document.getElementById('rating-hint'),
  detailTitle: document.getElementById('detail-title'),
  detailRegion: document.getElementById('detail-region'),
  detailBody: document.getElementById('detail-body'),
  mypageBody: document.getElementById('mypage-body'),
  jobDetailTitle: document.getElementById('job-detail-title'),
  jobDetailSubtitle: document.getElementById('job-detail-subtitle'),
  jobDetailBody: document.getElementById('job-detail-body'),
  toast: document.getElementById('toast'),
};

/* =============================================
   Storage Module
   향후 Supabase 등 DB 연동 시 이 레이어를 API 호출로 대체
   ============================================= */

const Storage = {
  load(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },
};

/* =============================================
   Auth Module
   향후: Supabase Auth, OAuth, JWT 세션으로 대체
   ============================================= */

const Auth = {
  /** MVP용 간단 해시 — 프로덕션에서는 bcrypt/서버 해시 사용 */
  hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = ((hash << 5) - hash) + password.charCodeAt(i);
      hash |= 0;
    }
    return `hash_${Math.abs(hash)}_${password.length}`;
  },

  loadUsers() {
    const users = Storage.load(STORAGE_KEYS.USERS);
    return Array.isArray(users) ? users : [];
  },

  saveUsers(users) {
    Storage.save(STORAGE_KEYS.USERS, users);
  },

  getSession() {
    return Storage.load(STORAGE_KEYS.SESSION);
  },

  setSession(userId) {
    Storage.save(STORAGE_KEYS.SESSION, { userId });
  },

  clearSession() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  },

  getCurrentUser() {
    const session = this.getSession();
    if (!session?.userId) return null;
    return state.users.find((u) => u.id === session.userId) || null;
  },

  register(nickname, email, password) {
    if (state.users.some((u) => u.email === email.toLowerCase())) {
      return { success: false, message: '이미 사용 중인 이메일입니다.' };
    }
    if (password.length < 6) {
      return { success: false, message: '비밀번호는 6자 이상이어야 합니다.' };
    }

    const user = {
      id: generateId('user'),
      nickname: nickname.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: this.hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    state.users.push(user);
    this.saveUsers(state.users);
    this.setSession(user.id);
    state.currentUser = user;

    return { success: true, message: '회원가입이 완료되었습니다!' };
  },

  login(email, password) {
    const user = state.users.find((u) => u.email === email.trim().toLowerCase());
    if (!user || user.passwordHash !== this.hashPassword(password)) {
      return { success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' };
    }

    this.setSession(user.id);
    state.currentUser = user;
    return { success: true, message: `${user.nickname}님, 환영합니다!` };
  },

  logout() {
    this.clearSession();
    state.currentUser = null;
  },

  isLoggedIn() {
    return !!state.currentUser;
  },

  requireLogin(message = '로그인이 필요한 기능입니다.') {
    if (this.isLoggedIn()) return true;
    showToast(message);
    openAuthModal('login');
    return false;
  },
};

/* =============================================
   Jobs Module — 구인/구직
   향후: 점주 인증(verified), 관리자 승인, DB 연동
   ============================================= */

const Jobs = {
  loadHiring() {
    const data = Storage.load(STORAGE_KEYS.HIRING);
    return Array.isArray(data) ? data : null;
  },

  saveHiring(list) {
    Storage.save(STORAGE_KEYS.HIRING, list);
  },

  loadSeeking() {
    const data = Storage.load(STORAGE_KEYS.SEEKING);
    return Array.isArray(data) ? data : null;
  },

  saveSeeking(list) {
    Storage.save(STORAGE_KEYS.SEEKING, list);
  },

  /**
   * 구인글 생성
   * @param {Object} data - 폼 데이터
   * @param {Object|null} user - 로그인 사용자 (없으면 비회원)
   * 향후: user가 있고 점주 인증 완료 시 authorType='owner', verified=true
   */
  createHiringPost(data, user = null) {
    return {
      id: generateId('hire'),
      cafeName: data.cafeName.trim(),
      region: data.region.trim(),
      position: data.position,
      hourlyWage: data.hourlyWage.trim(),
      workHours: data.workHours.trim(),
      contact: data.contact.trim(),
      description: data.description?.trim() || '',
      authorType: user ? AUTHOR_TYPE.OWNER : AUTHOR_TYPE.GUEST,
      userId: user?.id || null,
      verified: false,
      createdAt: new Date().toISOString(),
    };
  },

  /** 구직글 생성 — 로그인 필수 */
  createSeekingPost(data, user) {
    return {
      id: generateId('seek'),
      nickname: user.nickname,
      region: data.region.trim(),
      position: data.position,
      experience: data.experience.trim(),
      availableHours: data.availableHours.trim(),
      intro: data.intro.trim(),
      contact: data.contact.trim(),
      userId: user.id,
      createdAt: new Date().toISOString(),
    };
  },
};

/* =============================================
   Utility Functions
   ============================================= */

function generateId(prefix = 'item') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function renderStars(rating) {
  const full = Math.round(Number(rating)) || 0;
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getReviewSummary(review) {
  const source = review.pros || review.atmosphere || review.cons || '';
  const trimmed = source.trim();
  return trimmed.length <= 60 ? trimmed : trimmed.slice(0, 60) + '…';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text, query) {
  if (!query.trim()) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const regex = new RegExp(`(${escapeRegex(query.trim())})`, 'gi');
  return escaped.replace(regex, '<span class="search-highlight">$1</span>');
}

function getUniqueRegions(reviews) {
  return [...new Set(reviews.map((r) => r.region))].sort((a, b) => a.localeCompare(b, 'ko'));
}

/**
 * 통합 검색 매칭
 * 카페명, 지역, 직무 기준 (향후 태그·키워드 확장 가능)
 */
function matchesSearch(item, fields, query) {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return fields.some((field) => (item[field] || '').toLowerCase().includes(q));
}

/* =============================================
   Filter
   ============================================= */

function getFilteredReviews() {
  let result = [...state.reviews];

  if (state.regionFilter !== 'all') {
    result = result.filter((r) => r.region === state.regionFilter);
  }

  if (state.searchQuery.trim()) {
    result = result.filter((r) =>
      matchesSearch(r, ['cafeName', 'region', 'position'], state.searchQuery)
    );
  }

  return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getFilteredHiring() {
  let result = [...state.hiring];

  if (state.searchQuery.trim()) {
    result = result.filter((h) =>
      matchesSearch(h, ['cafeName', 'region', 'position'], state.searchQuery)
    );
  }

  return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getFilteredSeeking() {
  let result = [...state.seeking];

  if (state.searchQuery.trim()) {
    result = result.filter((s) =>
      matchesSearch(s, ['nickname', 'region', 'position'], state.searchQuery)
    );
  }

  return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/* =============================================
   Render — Reviews
   ============================================= */

function createReviewCardHTML(review, options = {}) {
  const { highlight = false } = options;
  const query = highlight ? state.searchQuery : '';

  return `
    <article class="review-card" data-type="review" data-id="${review.id}" tabindex="0" role="button">
      <div class="review-card-header">
        <h3 class="review-cafe-name">${highlightText(review.cafeName, query)}</h3>
        <span class="review-stars" aria-label="${review.rating}점">${renderStars(review.rating)}</span>
      </div>
      <div class="review-meta">
        <span class="review-tag">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${highlightText(review.region, query)}
        </span>
        <span class="review-tag">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          ${escapeHtml(review.workPeriod)}
        </span>
      </div>
      <p class="review-summary">${escapeHtml(getReviewSummary(review))}</p>
      <div class="review-footer">
        <span class="review-position">${highlightText(review.position, query)}</span>
        <time class="review-date" datetime="${review.createdAt}">${formatDate(review.createdAt)}</time>
      </div>
    </article>
  `;
}

function renderRecentReviews() {
  const recent = [...state.reviews]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, RECENT_LIMIT);

  if (recent.length === 0) {
    DOM.recentReviews.innerHTML = `
      <p style="grid-column:1/-1;text-align:center;color:var(--color-text-muted);padding:32px 0;">
        아직 등록된 후기가 없습니다. 첫 후기를 작성해 보세요!
      </p>`;
    return;
  }

  DOM.recentReviews.innerHTML = recent.map((r) => createReviewCardHTML(r)).join('');
  bindReviewCardEvents(DOM.recentReviews);
}

function renderReviewList() {
  const filtered = getFilteredReviews();
  const q = state.searchQuery.trim();

  DOM.reviewsCountText.textContent = q
    ? `"${q}" 검색 결과 ${filtered.length}건`
    : `총 ${filtered.length}개의 후기가 있습니다.`;

  if (filtered.length === 0) {
    DOM.reviewList.innerHTML = '';
    DOM.emptyState.classList.remove('hidden');

    const emptyTitle = DOM.emptyState.querySelector('.empty-title');
    const emptyText = DOM.emptyState.querySelector('.empty-text');

    if (q) {
      emptyTitle.textContent = '검색 결과가 없어요';
      emptyText.textContent = '다른 키워드로 검색하거나, 새 후기를 작성해 보세요.';
    } else if (state.regionFilter !== 'all') {
      emptyTitle.textContent = '해당 지역의 후기가 없어요';
      emptyText.textContent = '다른 지역을 선택하거나 후기를 작성해 보세요.';
    } else {
      emptyTitle.textContent = '아직 등록된 후기가 없어요';
      emptyText.textContent = '첫 번째 후기를 작성하고 다른 근무자들에게 도움을 주세요.';
    }
    return;
  }

  DOM.emptyState.classList.add('hidden');
  DOM.reviewList.innerHTML = filtered.map((r) => createReviewCardHTML(r, { highlight: true })).join('');
  bindReviewCardEvents(DOM.reviewList);
}

function renderRegionFilters() {
  const regions = getUniqueRegions(state.reviews);
  const chips = regions.map(
    (region) =>
      `<button type="button" class="chip${state.regionFilter === region ? ' chip-active' : ''}" data-region="${escapeHtml(region)}">${escapeHtml(region)}</button>`
  ).join('');

  DOM.filterChips.innerHTML = `
    <button type="button" class="chip${state.regionFilter === 'all' ? ' chip-active' : ''}" data-region="all">전체</button>
    ${chips}
  `;
}

function updateStats() {
  const count = state.reviews.length;
  DOM.statCount.textContent = count;
  DOM.statRegions.textContent = getUniqueRegions(state.reviews).length;
  DOM.statRating.textContent = count === 0
    ? '—'
    : (state.reviews.reduce((s, r) => s + r.rating, 0) / count).toFixed(1);
}

function renderReviewDetail(review) {
  DOM.detailTitle.textContent = review.cafeName;
  DOM.detailRegion.textContent = review.region;
  DOM.detailBody.innerHTML = `
    <div class="detail-rating">
      <span class="detail-stars">${renderStars(review.rating)}</span>
      <span class="detail-rating-text">${review.rating}.0 / 5</span>
    </div>
    <div class="detail-grid">
      <div class="detail-item"><p class="detail-label">근무기간</p><p class="detail-value">${escapeHtml(review.workPeriod)}</p></div>
      <div class="detail-item"><p class="detail-label">직무</p><p class="detail-value">${escapeHtml(review.position)}</p></div>
      <div class="detail-item"><p class="detail-label">시급</p><p class="detail-value">${escapeHtml(review.hourlyWage || '미입력')}</p></div>
      <div class="detail-item"><p class="detail-label">근무 분위기</p><p class="detail-value">${escapeHtml(review.atmosphere || '미입력')}</p></div>
    </div>
    ${review.pros ? `<div class="detail-section"><h4 class="detail-section-title">장점</h4><p class="detail-section-text">${escapeHtml(review.pros)}</p></div>` : ''}
    ${review.cons ? `<div class="detail-section"><h4 class="detail-section-title">단점</h4><p class="detail-section-text cons">${escapeHtml(review.cons)}</p></div>` : ''}
    <p style="font-size:0.75rem;color:var(--gray-400);margin-top:16px;">작성일: ${formatDate(review.createdAt)}</p>
  `;
}

/* =============================================
   Render — Jobs
   ============================================= */

function createHiringCardHTML(post) {
  const q = state.searchQuery;
  const summary = post.description || `${post.workHours} · 시급 ${post.hourlyWage}`;
  const badgeClass = post.verified ? 'job-badge-hiring' : 'job-badge-guest';
  const badgeText = post.verified ? '인증 매장' : '구인';

  return `
    <article class="job-card" data-type="hiring" data-id="${post.id}" tabindex="0" role="button">
      <div class="job-card-header">
        <h3 class="job-card-title">${highlightText(post.cafeName, q)}</h3>
        <span class="job-badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="review-meta">
        <span class="review-tag">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${highlightText(post.region, q)}
        </span>
        <span class="review-tag">${escapeHtml(post.workHours)}</span>
      </div>
      <p class="job-summary">${escapeHtml(summary.length > 80 ? summary.slice(0, 80) + '…' : summary)}</p>
      <div class="job-card-footer">
        <span class="job-card-position">${highlightText(post.position, q)} · ${escapeHtml(post.hourlyWage)}</span>
        <time class="job-card-date">${formatDate(post.createdAt)}</time>
      </div>
    </article>
  `;
}

function createSeekingCardHTML(post) {
  const q = state.searchQuery;

  return `
    <article class="job-card" data-type="seeking" data-id="${post.id}" tabindex="0" role="button">
      <div class="job-card-header">
        <h3 class="job-card-title">${highlightText(post.nickname, q)}</h3>
        <span class="job-badge job-badge-seeking">구직</span>
      </div>
      <div class="review-meta">
        <span class="review-tag">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${highlightText(post.region, q)}
        </span>
        <span class="review-tag">${escapeHtml(post.experience)}</span>
      </div>
      <p class="job-summary">${escapeHtml(post.intro.length > 80 ? post.intro.slice(0, 80) + '…' : post.intro)}</p>
      <div class="job-card-footer">
        <span class="job-card-position">${highlightText(post.position, q)} · ${escapeHtml(post.availableHours)}</span>
        <time class="job-card-date">${formatDate(post.createdAt)}</time>
      </div>
    </article>
  `;
}

function renderHiringList() {
  const filtered = getFilteredHiring();
  const q = state.searchQuery.trim();

  if (filtered.length === 0) {
    DOM.hiringList.innerHTML = '';
    DOM.hiringEmpty.classList.remove('hidden');
    updateEmptyState(DOM.hiringEmpty, q, '구인글');
    return;
  }

  DOM.hiringEmpty.classList.add('hidden');
  DOM.hiringList.innerHTML = filtered.map(createHiringCardHTML).join('');
  bindJobCardEvents(DOM.hiringList);
}

function renderSeekingList() {
  const filtered = getFilteredSeeking();
  const q = state.searchQuery.trim();

  if (filtered.length === 0) {
    DOM.seekingList.innerHTML = '';
    DOM.seekingEmpty.classList.remove('hidden');
    updateEmptyState(DOM.seekingEmpty, q, '구직글');
    return;
  }

  DOM.seekingEmpty.classList.add('hidden');
  DOM.seekingList.innerHTML = filtered.map(createSeekingCardHTML).join('');
  bindJobCardEvents(DOM.seekingList);
}

function renderJobsSection() {
  const hiringCount = getFilteredHiring().length;
  const seekingCount = getFilteredSeeking().length;
  const q = state.searchQuery.trim();

  DOM.jobsCountText.textContent = q
    ? `검색 결과 — 구인 ${hiringCount}건 · 구직 ${seekingCount}건`
    : `구인 ${state.hiring.length}건 · 구직 ${state.seeking.length}건`;

  renderHiringList();
  renderSeekingList();
}

function updateEmptyState(container, query, typeLabel) {
  const title = container.querySelector('.empty-title');
  const text = container.querySelector('.empty-text');
  if (query) {
    title.textContent = '검색 결과가 없어요';
    text.textContent = `다른 키워드로 검색하거나, 새 ${typeLabel}을 작성해 보세요.`;
  }
}

function renderHiringDetail(post) {
  DOM.jobDetailTitle.textContent = post.cafeName;
  DOM.jobDetailSubtitle.textContent = post.region;
  DOM.jobDetailBody.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><p class="detail-label">모집 직무</p><p class="detail-value">${escapeHtml(post.position)}</p></div>
      <div class="detail-item"><p class="detail-label">시급</p><p class="detail-value">${escapeHtml(post.hourlyWage)}</p></div>
      <div class="detail-item"><p class="detail-label">근무 시간</p><p class="detail-value">${escapeHtml(post.workHours)}</p></div>
      <div class="detail-item"><p class="detail-label">연락 방법</p><p class="detail-value">${escapeHtml(post.contact)}</p></div>
    </div>
    ${post.description ? `<div class="detail-section"><h4 class="detail-section-title">상세 설명</h4><p class="detail-section-text">${escapeHtml(post.description)}</p></div>` : ''}
    <p style="font-size:0.75rem;color:var(--gray-400);margin-top:16px;">
      ${post.verified ? '✓ 인증된 매장' : '미인증 게시글'} · ${formatDate(post.createdAt)}
    </p>
  `;
}

function renderSeekingDetail(post) {
  DOM.jobDetailTitle.textContent = post.nickname;
  DOM.jobDetailSubtitle.textContent = post.region;
  DOM.jobDetailBody.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><p class="detail-label">희망 직무</p><p class="detail-value">${escapeHtml(post.position)}</p></div>
      <div class="detail-item"><p class="detail-label">경력</p><p class="detail-value">${escapeHtml(post.experience)}</p></div>
      <div class="detail-item"><p class="detail-label">가능 시간</p><p class="detail-value">${escapeHtml(post.availableHours)}</p></div>
      <div class="detail-item"><p class="detail-label">연락 방법</p><p class="detail-value">${escapeHtml(post.contact)}</p></div>
    </div>
    <div class="detail-section"><h4 class="detail-section-title">자기소개</h4><p class="detail-section-text">${escapeHtml(post.intro)}</p></div>
    <p style="font-size:0.75rem;color:var(--gray-400);margin-top:16px;">작성일: ${formatDate(post.createdAt)}</p>
  `;
}

/* =============================================
   Render — Auth Nav & My Page
   ============================================= */

function renderAuthNav() {
  const loggedIn = Auth.isLoggedIn();

  DOM.navAuthGuest.classList.toggle('hidden', loggedIn);
  DOM.navAuthUser.classList.toggle('hidden', !loggedIn);

  if (loggedIn) {
    DOM.navNickname.textContent = state.currentUser.nickname;
  }
}

function renderMyPage() {
  const user = state.currentUser;
  if (!user) return;

  const mySeeking = state.seeking.filter((s) => s.userId === user.id);
  const initial = user.nickname.charAt(0).toUpperCase();

  DOM.mypageBody.innerHTML = `
    <div class="mypage-profile">
      <div class="mypage-avatar">${escapeHtml(initial)}</div>
      <div>
        <p class="mypage-name">${escapeHtml(user.nickname)}</p>
        <p class="mypage-email">${escapeHtml(user.email)}</p>
      </div>
    </div>
    <h3 class="mypage-section-title">내 구직글 (${mySeeking.length})</h3>
    <div class="mypage-list">
      ${mySeeking.length === 0
        ? '<p class="mypage-empty">등록한 구직글이 없습니다.</p>'
        : mySeeking.map((s) => `
          <div class="mypage-item">
            <span class="mypage-item-title">${escapeHtml(s.region)} · ${escapeHtml(s.position)}</span>
            <time style="font-size:0.75rem;color:var(--gray-400)">${formatDate(s.createdAt)}</time>
          </div>`).join('')}
    </div>
    <p style="font-size:0.8125rem;color:var(--gray-400);margin-top:20px;">
      가입일: ${formatDate(user.createdAt)}
    </p>
  `;
}

function switchJobTab(tab) {
  state.activeJobTab = tab;

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle('tab-active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });

  DOM.panelHiring.classList.toggle('hidden', tab !== 'hiring');
  DOM.panelSeeking.classList.toggle('hidden', tab !== 'seeking');

  DOM.jobsPanelDesc.textContent = tab === 'hiring'
    ? '카페에서 함께 일할 분을 모집하는 공고입니다.'
    : '카페에서 일하고 싶은 분들의 자기소개입니다.';

  DOM.jobsWriteBtnText.textContent = tab === 'hiring' ? '구인글 작성' : '구직글 작성';
}

function renderAll() {
  updateStats();
  renderRegionFilters();
  renderRecentReviews();
  renderReviewList();
  renderJobsSection();
  renderAuthNav();
}

/* =============================================
   Modal Management
   ============================================= */

function openModal(modal) {
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
  modal.classList.add('hidden');
  if (!document.querySelector('.modal-overlay:not(.hidden)')) {
    document.body.style.overflow = '';
  }
}

function openWriteModal() {
  resetReviewForm();
  openModal(DOM.writeModal);
  DOM.reviewForm.querySelector('#cafe-name').focus();
}

function closeWriteModal() {
  closeModal(DOM.writeModal);
}

function openReviewDetail(id) {
  const review = state.reviews.find((r) => r.id === id);
  if (!review) return;
  renderReviewDetail(review);
  openModal(DOM.detailModal);
}

function closeDetailModal() {
  closeModal(DOM.detailModal);
}

function openAuthModal(tab = 'signup') {
  switchAuthTab(tab);
  openModal(DOM.authModal);
  const form = tab === 'login' ? DOM.loginForm : DOM.signupForm;
  form.querySelector('input')?.focus();
}

function closeAuthModal() {
  closeModal(DOM.authModal);
  DOM.loginForm.reset();
  DOM.signupForm.reset();
  DOM.loginForm.querySelectorAll('.error').forEach((el) => el.classList.remove('error'));
  DOM.signupForm.querySelectorAll('.error').forEach((el) => el.classList.remove('error'));
}

function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.querySelectorAll('.auth-tab').forEach((t) => {
    t.classList.toggle('auth-tab-active', t.dataset.authTab === tab);
  });
  DOM.loginForm.classList.toggle('hidden', !isLogin);
  DOM.signupForm.classList.toggle('hidden', isLogin);
  document.getElementById('auth-modal-title').textContent = isLogin ? '로그인' : '회원가입';
}

function openMyPage() {
  renderMyPage();
  openModal(DOM.mypageModal);
}

function closeMyPage() {
  closeModal(DOM.mypageModal);
}

function openHiringModal() {
  DOM.hiringForm.reset();
  openModal(DOM.hiringModal);
  DOM.hiringForm.querySelector('#hiring-cafe').focus();
}

function closeHiringModal() {
  closeModal(DOM.hiringModal);
}

function openSeekingModal() {
  if (!Auth.requireLogin('구직글 작성은 로그인 후 이용할 수 있습니다.')) return;
  DOM.seekingForm.reset();
  document.getElementById('seeking-nickname').value = state.currentUser.nickname;
  openModal(DOM.seekingModal);
  DOM.seekingForm.querySelector('#seeking-region').focus();
}

function closeSeekingModal() {
  closeModal(DOM.seekingModal);
}

function openJobDetail(type, id) {
  if (type === 'hiring') {
    const post = state.hiring.find((h) => h.id === id);
    if (!post) return;
    renderHiringDetail(post);
  } else {
    const post = state.seeking.find((s) => s.id === id);
    if (!post) return;
    renderSeekingDetail(post);
  }
  openModal(DOM.jobDetailModal);
}

function closeJobDetail() {
  closeModal(DOM.jobDetailModal);
}

function closeAllModals() {
  [DOM.writeModal, DOM.detailModal, DOM.authModal, DOM.mypageModal,
    DOM.hiringModal, DOM.seekingModal, DOM.jobDetailModal].forEach(closeModal);
  document.body.style.overflow = '';
}

function handleJobsWriteClick() {
  if (state.activeJobTab === 'hiring') {
    openHiringModal();
  } else {
    openSeekingModal();
  }
}

/* =============================================
   Form Handling
   ============================================= */

function resetReviewForm() {
  DOM.reviewForm.reset();
  state.selectedRating = 0;
  DOM.ratingInput.value = '0';
  updateStarButtons();
  DOM.ratingHint.textContent = '별점을 선택해주세요';
  DOM.ratingHint.classList.remove('error');
  DOM.reviewForm.querySelectorAll('.error').forEach((el) => el.classList.remove('error'));
}

function updateStarButtons() {
  DOM.starRating.querySelectorAll('.star-btn').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.value) <= state.selectedRating);
  });
}

function validateRequired(form, fields) {
  let valid = true;
  fields.forEach(({ name, id }) => {
    const el = form.querySelector(`[name="${name}"]`) || document.getElementById(id);
    const value = form.querySelector(`[name="${name}"]`)?.value?.trim();
    if (!value) {
      el?.classList.add('error');
      valid = false;
    } else {
      el?.classList.remove('error');
    }
  });
  return valid;
}

function handleReviewSubmit(e) {
  e.preventDefault();
  const formData = new FormData(DOM.reviewForm);

  const valid = validateRequired(DOM.reviewForm, [
    { name: 'cafeName' }, { name: 'region' }, { name: 'workPeriod' }, { name: 'position' },
  ]);

  const rating = Number(formData.get('rating'));
  if (!rating || rating < 1) {
    DOM.ratingHint.textContent = '별점을 선택해주세요';
    DOM.ratingHint.classList.add('error');
    if (!valid) { showToast('필수 항목을 모두 입력해주세요.'); return; }
    showToast('별점을 선택해주세요.');
    return;
  }
  if (!valid) { showToast('필수 항목을 모두 입력해주세요.'); return; }

  state.reviews.unshift({
    id: generateId('review'),
    cafeName: formData.get('cafeName').trim(),
    region: formData.get('region').trim(),
    workPeriod: formData.get('workPeriod').trim(),
    position: formData.get('position'),
    hourlyWage: formData.get('hourlyWage')?.trim() || '',
    atmosphere: formData.get('atmosphere')?.trim() || '',
    pros: formData.get('pros')?.trim() || '',
    cons: formData.get('cons')?.trim() || '',
    rating,
    createdAt: new Date().toISOString(),
  });

  Storage.save(STORAGE_KEYS.REVIEWS, state.reviews);
  closeWriteModal();
  renderAll();
  showToast('후기가 등록되었습니다!');
  document.getElementById('reviews').scrollIntoView({ behavior: 'smooth' });
}

function handleSignupSubmit(e) {
  e.preventDefault();
  const fd = new FormData(DOM.signupForm);
  const nickname = fd.get('nickname')?.trim();
  const email = fd.get('email')?.trim();
  const password = fd.get('password');

  if (!nickname || !email || !password) {
    showToast('모든 항목을 입력해주세요.');
    return;
  }

  const result = Auth.register(nickname, email, password);
  showToast(result.message);
  if (result.success) {
    closeAuthModal();
    renderAuthNav();
  }
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const fd = new FormData(DOM.loginForm);
  const email = fd.get('email')?.trim();
  const password = fd.get('password');

  if (!email || !password) {
    showToast('이메일과 비밀번호를 입력해주세요.');
    return;
  }

  const result = Auth.login(email, password);
  showToast(result.message);
  if (result.success) {
    closeAuthModal();
    renderAuthNav();
  }
}

function handleHiringSubmit(e) {
  e.preventDefault();
  const fd = new FormData(DOM.hiringForm);

  const valid = validateRequired(DOM.hiringForm, [
    { name: 'cafeName' }, { name: 'region' }, { name: 'position' },
    { name: 'hourlyWage' }, { name: 'workHours' }, { name: 'contact' },
  ]);
  if (!valid) { showToast('필수 항목을 모두 입력해주세요.'); return; }

  const post = Jobs.createHiringPost({
    cafeName: fd.get('cafeName'),
    region: fd.get('region'),
    position: fd.get('position'),
    hourlyWage: fd.get('hourlyWage'),
    workHours: fd.get('workHours'),
    contact: fd.get('contact'),
    description: fd.get('description'),
  }, state.currentUser);

  state.hiring.unshift(post);
  Jobs.saveHiring(state.hiring);
  closeHiringModal();
  renderJobsSection();
  showToast('구인글이 등록되었습니다!');
  document.getElementById('jobs').scrollIntoView({ behavior: 'smooth' });
}

function handleSeekingSubmit(e) {
  e.preventDefault();
  if (!Auth.isLoggedIn()) return;

  const fd = new FormData(DOM.seekingForm);
  const valid = validateRequired(DOM.seekingForm, [
    { name: 'region' }, { name: 'position' }, { name: 'experience' },
    { name: 'availableHours' }, { name: 'intro' }, { name: 'contact' },
  ]);
  if (!valid) { showToast('필수 항목을 모두 입력해주세요.'); return; }

  const post = Jobs.createSeekingPost({
    region: fd.get('region'),
    position: fd.get('position'),
    experience: fd.get('experience'),
    availableHours: fd.get('availableHours'),
    intro: fd.get('intro'),
    contact: fd.get('contact'),
  }, state.currentUser);

  state.seeking.unshift(post);
  Jobs.saveSeeking(state.seeking);
  closeSeekingModal();
  renderJobsSection();
  showToast('구직글이 등록되었습니다!');
}

/* =============================================
   Toast
   ============================================= */

let toastTimer = null;

function showToast(message) {
  DOM.toast.textContent = message;
  DOM.toast.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => DOM.toast.classList.add('hidden'), 3000);
}

/* =============================================
   Event Binding
   ============================================= */

function bindReviewCardEvents(container) {
  container.querySelectorAll('.review-card').forEach((card) => {
    const handler = () => openReviewDetail(card.dataset.id);
    card.addEventListener('click', handler);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
    });
  });
}

function bindJobCardEvents(container) {
  container.querySelectorAll('.job-card').forEach((card) => {
    const handler = () => openJobDetail(card.dataset.type, card.dataset.id);
    card.addEventListener('click', handler);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
    });
  });
}

function closeMobileNav() {
  DOM.navLinks.classList.remove('open');
  DOM.navToggle.classList.remove('active');
  DOM.navToggle.setAttribute('aria-expanded', 'false');
}

function bindEvents() {
  window.addEventListener('scroll', () => {
    DOM.header.classList.toggle('scrolled', window.scrollY > 10);
  });

  DOM.navToggle.addEventListener('click', () => {
    const isOpen = DOM.navLinks.classList.toggle('open');
    DOM.navToggle.classList.toggle('active', isOpen);
    DOM.navToggle.setAttribute('aria-expanded', isOpen);
  });

  DOM.navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMobileNav);
  });

  // 후기 작성
  ['hero-cta-btn', 'nav-write-btn', 'list-write-btn', 'empty-write-btn'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', () => { closeMobileNav(); openWriteModal(); });
  });

  // Auth
  document.getElementById('nav-login-btn')?.addEventListener('click', () => { closeMobileNav(); openAuthModal('login'); });
  document.getElementById('nav-signup-btn')?.addEventListener('click', () => { closeMobileNav(); openAuthModal('signup'); });
  document.getElementById('nav-mypage-btn')?.addEventListener('click', () => { closeMobileNav(); openMyPage(); });
  document.getElementById('nav-logout-btn')?.addEventListener('click', () => {
    Auth.logout();
    renderAuthNav();
    showToast('로그아웃되었습니다.');
    closeMobileNav();
  });

  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.authTab));
  });

  // Jobs
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchJobTab(btn.dataset.tab));
  });

  document.getElementById('jobs-write-btn')?.addEventListener('click', handleJobsWriteClick);
  document.getElementById('hiring-empty-btn')?.addEventListener('click', openHiringModal);
  document.getElementById('seeking-empty-btn')?.addEventListener('click', openSeekingModal);

  // Modal close
  document.getElementById('modal-close')?.addEventListener('click', closeWriteModal);
  document.getElementById('form-cancel')?.addEventListener('click', closeWriteModal);
  document.getElementById('detail-close')?.addEventListener('click', closeDetailModal);
  document.getElementById('auth-close')?.addEventListener('click', closeAuthModal);
  document.getElementById('login-cancel')?.addEventListener('click', closeAuthModal);
  document.getElementById('signup-cancel')?.addEventListener('click', closeAuthModal);
  document.getElementById('mypage-close')?.addEventListener('click', closeMyPage);
  document.getElementById('hiring-close')?.addEventListener('click', closeHiringModal);
  document.getElementById('hiring-cancel')?.addEventListener('click', closeHiringModal);
  document.getElementById('seeking-close')?.addEventListener('click', closeSeekingModal);
  document.getElementById('seeking-cancel')?.addEventListener('click', closeSeekingModal);
  document.getElementById('job-detail-close')?.addEventListener('click', closeJobDetail);

  [DOM.writeModal, DOM.detailModal, DOM.authModal, DOM.mypageModal,
    DOM.hiringModal, DOM.seekingModal, DOM.jobDetailModal].forEach((modal) => {
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });

  // Forms
  DOM.reviewForm.addEventListener('submit', handleReviewSubmit);
  DOM.signupForm.addEventListener('submit', handleSignupSubmit);
  DOM.loginForm.addEventListener('submit', handleLoginSubmit);
  DOM.hiringForm.addEventListener('submit', handleHiringSubmit);
  DOM.seekingForm.addEventListener('submit', handleSeekingSubmit);

  DOM.starRating.querySelectorAll('.star-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedRating = Number(btn.dataset.value);
      DOM.ratingInput.value = state.selectedRating;
      updateStarButtons();
      DOM.ratingHint.textContent = `${state.selectedRating}점을 선택했습니다`;
      DOM.ratingHint.classList.remove('error');
    });
  });

  // 통합 검색 (후기 + 구인/구직)
  let searchTimer = null;

  function handleSearchInput(value, sourceInput) {
    state.searchQuery = value;
    if (sourceInput !== DOM.searchInput) DOM.searchInput.value = value;
    if (sourceInput !== DOM.mobileSearchInput) DOM.mobileSearchInput.value = value;

    renderReviewList();
    renderJobsSection();

    if (value.trim() && sourceInput === DOM.searchInput) {
      const hasReview = getFilteredReviews().length > 0;
      const hasJob = getFilteredHiring().length + getFilteredSeeking().length > 0;
      document.getElementById(hasReview ? 'reviews' : hasJob ? 'jobs' : 'reviews')
        .scrollIntoView({ behavior: 'smooth' });
    }
  }

  [DOM.searchInput, DOM.mobileSearchInput].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => handleSearchInput(e.target.value, e.target), 250);
    });
  });

  DOM.filterChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    state.regionFilter = chip.dataset.region;
    renderRegionFilters();
    renderReviewList();
  });
}

/* =============================================
   Initialization
   ============================================= */

function initData() {
  const storedReviews = Storage.load(STORAGE_KEYS.REVIEWS);
  state.reviews = Array.isArray(storedReviews) ? storedReviews : [...SEED_REVIEWS];
  if (!storedReviews) Storage.save(STORAGE_KEYS.REVIEWS, state.reviews);

  const storedHiring = Jobs.loadHiring();
  state.hiring = storedHiring ?? [...SEED_HIRING];
  if (!storedHiring) Jobs.saveHiring(state.hiring);

  const storedSeeking = Jobs.loadSeeking();
  state.seeking = storedSeeking ?? [...SEED_SEEKING];
  if (!storedSeeking) Jobs.saveSeeking(state.seeking);

  state.users = Auth.loadUsers();
  state.currentUser = Auth.getCurrentUser();
}

function init() {
  initData();
  switchJobTab('hiring');
  bindEvents();
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
