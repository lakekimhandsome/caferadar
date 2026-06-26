/**
 * CafeRadar — Main Application Script
 * MVP: localStorage 기반 카페 근무 후기 커뮤니티
 */

/* =============================================
   Constants & Configuration
   ============================================= */

const STORAGE_KEY = 'caferadar_reviews';
const RECENT_LIMIT = 5;

/** 초기 데모 데이터 (localStorage가 비어 있을 때만 사용) */
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

/* =============================================
   State
   ============================================= */

const state = {
  reviews: [],
  searchQuery: '',
  regionFilter: 'all',
  selectedRating: 0,
};

/* =============================================
   DOM References
   ============================================= */

const DOM = {
  header: document.getElementById('header'),
  navToggle: document.getElementById('nav-toggle'),
  navLinks: document.getElementById('nav-links'),
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
  writeModal: document.getElementById('write-modal'),
  detailModal: document.getElementById('detail-modal'),
  reviewForm: document.getElementById('review-form'),
  starRating: document.getElementById('star-rating'),
  ratingInput: document.getElementById('rating'),
  ratingHint: document.getElementById('rating-hint'),
  detailTitle: document.getElementById('detail-title'),
  detailRegion: document.getElementById('detail-region'),
  detailBody: document.getElementById('detail-body'),
  toast: document.getElementById('toast'),
};

/* =============================================
   Storage Module
   ============================================= */

const Storage = {
  /** localStorage에서 후기 목록 불러오기 */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },

  /** 후기 목록 저장 */
  save(reviews) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  },
};

/* =============================================
   Utility Functions
   ============================================= */

/** 고유 ID 생성 */
function generateId() {
  return `review-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 별점 숫자 → ★/☆ 문자열 */
function renderStars(rating) {
  const full = Math.round(Number(rating)) || 0;
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

/** 날짜 포맷 (상대적) */
function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** 한 줄 요약 생성 (장점 또는 분위기 기반) */
function getSummary(review) {
  const source = review.pros || review.atmosphere || review.cons || '';
  const trimmed = source.trim();
  if (trimmed.length <= 60) return trimmed;
  return trimmed.slice(0, 60) + '…';
}

/** 검색어 하이라이트 */
function highlightText(text, query) {
  if (!query.trim()) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const regex = new RegExp(`(${escapeRegex(query.trim())})`, 'gi');
  return escaped.replace(regex, '<span class="search-highlight">$1</span>');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 고유 지역 목록 추출 */
function getUniqueRegions(reviews) {
  const regions = reviews.map((r) => r.region);
  return [...new Set(regions)].sort((a, b) => a.localeCompare(b, 'ko'));
}

/* =============================================
   Filter & Sort
   ============================================= */

/** 검색 + 지역 필터 적용 */
function getFilteredReviews() {
  let result = [...state.reviews];

  if (state.regionFilter !== 'all') {
    result = result.filter((r) => r.region === state.regionFilter);
  }

  if (state.searchQuery.trim()) {
    const q = state.searchQuery.trim().toLowerCase();
    result = result.filter((r) => r.cafeName.toLowerCase().includes(q));
  }

  return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/* =============================================
   Render Functions
   ============================================= */

/** 후기 카드 HTML 생성 */
function createReviewCardHTML(review, options = {}) {
  const { highlight = false } = options;
  const query = highlight ? state.searchQuery : '';

  return `
    <article class="review-card" data-id="${review.id}" tabindex="0" role="button" aria-label="${escapeHtml(review.cafeName)} 후기 보기">
      <div class="review-card-header">
        <h3 class="review-cafe-name">${highlightText(review.cafeName, query)}</h3>
        <span class="review-stars" aria-label="${review.rating}점">${renderStars(review.rating)}</span>
      </div>
      <div class="review-meta">
        <span class="review-tag">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${escapeHtml(review.region)}
        </span>
        <span class="review-tag">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          ${escapeHtml(review.workPeriod)}
        </span>
      </div>
      <p class="review-summary">${escapeHtml(getSummary(review))}</p>
      <div class="review-footer">
        <span class="review-position">${escapeHtml(review.position)}</span>
        <time class="review-date" datetime="${review.createdAt}">${formatDate(review.createdAt)}</time>
      </div>
    </article>
  `;
}

/** 최근 후기 섹션 렌더링 */
function renderRecentReviews() {
  const recent = state.reviews
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, RECENT_LIMIT);

  if (recent.length === 0) {
    DOM.recentReviews.innerHTML = `
      <p style="grid-column: 1/-1; text-align:center; color: var(--color-text-muted); padding: 32px 0;">
        아직 등록된 후기가 없습니다. 첫 후기를 작성해 보세요!
      </p>`;
    return;
  }

  DOM.recentReviews.innerHTML = recent.map((r) => createReviewCardHTML(r)).join('');
  bindCardClickEvents(DOM.recentReviews);
}

/** 전체 후기 목록 렌더링 */
function renderReviewList() {
  const filtered = getFilteredReviews();

  DOM.reviewsCountText.textContent = state.searchQuery.trim()
    ? `"${state.searchQuery}" 검색 결과 ${filtered.length}건`
    : `총 ${filtered.length}개의 후기가 있습니다.`;

  if (filtered.length === 0) {
    DOM.reviewList.innerHTML = '';
    DOM.emptyState.classList.remove('hidden');

    const emptyTitle = DOM.emptyState.querySelector('.empty-title');
    const emptyText = DOM.emptyState.querySelector('.empty-text');

    if (state.searchQuery.trim()) {
      emptyTitle.textContent = '검색 결과가 없어요';
      emptyText.textContent = '다른 카페명으로 검색하거나, 새 후기를 작성해 보세요.';
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
  bindCardClickEvents(DOM.reviewList);
}

/** 지역 필터 칩 렌더링 */
function renderRegionFilters() {
  const regions = getUniqueRegions(state.reviews);
  const chips = regions
    .map(
      (region) =>
        `<button type="button" class="chip${state.regionFilter === region ? ' chip-active' : ''}" data-region="${escapeHtml(region)}">${escapeHtml(region)}</button>`
    )
    .join('');

  DOM.filterChips.innerHTML = `
    <button type="button" class="chip${state.regionFilter === 'all' ? ' chip-active' : ''}" data-region="all">전체</button>
    ${chips}
  `;
}

/** 통계 업데이트 */
function updateStats() {
  const count = state.reviews.length;
  const regions = getUniqueRegions(state.reviews).length;

  DOM.statCount.textContent = count;
  DOM.statRegions.textContent = regions;

  if (count === 0) {
    DOM.statRating.textContent = '—';
    return;
  }

  const avg = state.reviews.reduce((sum, r) => sum + r.rating, 0) / count;
  DOM.statRating.textContent = avg.toFixed(1);
}

/** 후기 상세 모달 렌더링 */
function renderDetailModal(review) {
  DOM.detailTitle.textContent = review.cafeName;
  DOM.detailRegion.textContent = review.region;

  DOM.detailBody.innerHTML = `
    <div class="detail-rating">
      <span class="detail-stars">${renderStars(review.rating)}</span>
      <span class="detail-rating-text">${review.rating}.0 / 5</span>
    </div>
    <div class="detail-grid">
      <div class="detail-item">
        <p class="detail-label">근무기간</p>
        <p class="detail-value">${escapeHtml(review.workPeriod)}</p>
      </div>
      <div class="detail-item">
        <p class="detail-label">직무</p>
        <p class="detail-value">${escapeHtml(review.position)}</p>
      </div>
      <div class="detail-item">
        <p class="detail-label">시급</p>
        <p class="detail-value">${escapeHtml(review.hourlyWage || '미입력')}</p>
      </div>
      <div class="detail-item">
        <p class="detail-label">근무 분위기</p>
        <p class="detail-value">${escapeHtml(review.atmosphere || '미입력')}</p>
      </div>
    </div>
    ${review.pros ? `
      <div class="detail-section">
        <h4 class="detail-section-title">장점</h4>
        <p class="detail-section-text">${escapeHtml(review.pros)}</p>
      </div>` : ''}
    ${review.cons ? `
      <div class="detail-section">
        <h4 class="detail-section-title">단점</h4>
        <p class="detail-section-text cons">${escapeHtml(review.cons)}</p>
      </div>` : ''}
    <p style="font-size: 0.75rem; color: var(--gray-400); margin-top: 16px;">
      작성일: ${formatDate(review.createdAt)}
    </p>
  `;
}

/** 전체 UI 갱신 */
function renderAll() {
  updateStats();
  renderRegionFilters();
  renderRecentReviews();
  renderReviewList();
}

/* =============================================
   Modal Management
   ============================================= */

function openWriteModal() {
  resetForm();
  DOM.writeModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  DOM.reviewForm.querySelector('#cafe-name').focus();
}

function closeWriteModal() {
  DOM.writeModal.classList.add('hidden');
  document.body.style.overflow = '';
}

function openDetailModal(reviewId) {
  const review = state.reviews.find((r) => r.id === reviewId);
  if (!review) return;

  renderDetailModal(review);
  DOM.detailModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeDetailModal() {
  DOM.detailModal.classList.add('hidden');
  document.body.style.overflow = '';
}

function closeAllModals() {
  closeWriteModal();
  closeDetailModal();
}

/* =============================================
   Form Handling
   ============================================= */

function resetForm() {
  DOM.reviewForm.reset();
  state.selectedRating = 0;
  DOM.ratingInput.value = '0';
  updateStarButtons();
  DOM.ratingHint.textContent = '별점을 선택해주세요';
  DOM.ratingHint.classList.remove('error');
  clearFormErrors();
}

function updateStarButtons() {
  const buttons = DOM.starRating.querySelectorAll('.star-btn');
  buttons.forEach((btn) => {
    const value = Number(btn.dataset.value);
    btn.classList.toggle('active', value <= state.selectedRating);
  });
}

function clearFormErrors() {
  DOM.reviewForm.querySelectorAll('.error').forEach((el) => el.classList.remove('error'));
  DOM.ratingHint.classList.remove('error');
}

function validateForm(formData) {
  clearFormErrors();
  let isValid = true;

  const requiredFields = [
    { name: 'cafeName', id: 'cafe-name', label: '카페명' },
    { name: 'region', id: 'region', label: '지역' },
    { name: 'workPeriod', id: 'work-period', label: '근무기간' },
    { name: 'position', id: 'position', label: '직무' },
  ];

  requiredFields.forEach(({ name, id, label }) => {
    const value = formData.get(name)?.trim();
    if (!value) {
      document.getElementById(id).classList.add('error');
      isValid = false;
    }
  });

  const rating = Number(formData.get('rating'));
  if (!rating || rating < 1 || rating > 5) {
    DOM.ratingHint.textContent = '별점을 선택해주세요';
    DOM.ratingHint.classList.add('error');
    isValid = false;
  }

  if (!isValid) {
    showToast('필수 항목을 모두 입력해주세요.');
  }

  return isValid;
}

function handleFormSubmit(e) {
  e.preventDefault();

  const formData = new FormData(DOM.reviewForm);
  if (!validateForm(formData)) return;

  const newReview = {
    id: generateId(),
    cafeName: formData.get('cafeName').trim(),
    region: formData.get('region').trim(),
    workPeriod: formData.get('workPeriod').trim(),
    position: formData.get('position'),
    hourlyWage: formData.get('hourlyWage')?.trim() || '',
    atmosphere: formData.get('atmosphere')?.trim() || '',
    pros: formData.get('pros')?.trim() || '',
    cons: formData.get('cons')?.trim() || '',
    rating: Number(formData.get('rating')),
    createdAt: new Date().toISOString(),
  };

  state.reviews.unshift(newReview);
  Storage.save(state.reviews);

  closeWriteModal();
  renderAll();
  showToast('후기가 등록되었습니다. 감사합니다!');

  document.getElementById('reviews').scrollIntoView({ behavior: 'smooth' });
}

/* =============================================
   Toast Notification
   ============================================= */

let toastTimer = null;

function showToast(message) {
  DOM.toast.textContent = message;
  DOM.toast.classList.remove('hidden');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    DOM.toast.classList.add('hidden');
  }, 3000);
}

/* =============================================
   Event Binding
   ============================================= */

function bindCardClickEvents(container) {
  container.querySelectorAll('.review-card').forEach((card) => {
    card.addEventListener('click', () => openDetailModal(card.dataset.id));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDetailModal(card.dataset.id);
      }
    });
  });
}

function bindEvents() {
  // 헤더 스크롤 효과
  window.addEventListener('scroll', () => {
    DOM.header.classList.toggle('scrolled', window.scrollY > 10);
  });

  // 모바일 네비게이션
  DOM.navToggle.addEventListener('click', () => {
    const isOpen = DOM.navLinks.classList.toggle('open');
    DOM.navToggle.classList.toggle('active', isOpen);
    DOM.navToggle.setAttribute('aria-expanded', isOpen);
    DOM.navToggle.setAttribute('aria-label', isOpen ? '메뉴 닫기' : '메뉴 열기');
  });

  DOM.navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      DOM.navLinks.classList.remove('open');
      DOM.navToggle.classList.remove('active');
      DOM.navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // 후기 작성 버튼들
  ['hero-cta-btn', 'nav-write-btn', 'list-write-btn', 'empty-write-btn'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', openWriteModal);
  });

  // 모달 닫기
  document.getElementById('modal-close').addEventListener('click', closeWriteModal);
  document.getElementById('form-cancel').addEventListener('click', closeWriteModal);
  document.getElementById('detail-close').addEventListener('click', closeDetailModal);

  DOM.writeModal.addEventListener('click', (e) => {
    if (e.target === DOM.writeModal) closeWriteModal();
  });

  DOM.detailModal.addEventListener('click', (e) => {
    if (e.target === DOM.detailModal) closeDetailModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });

  // 폼 제출
  DOM.reviewForm.addEventListener('submit', handleFormSubmit);

  // 별점 선택
  DOM.starRating.querySelectorAll('.star-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedRating = Number(btn.dataset.value);
      DOM.ratingInput.value = state.selectedRating;
      updateStarButtons();
      DOM.ratingHint.textContent = `${state.selectedRating}점을 선택했습니다`;
      DOM.ratingHint.classList.remove('error');
    });
  });

  // 검색 (디바운스) — 데스크톱·모바일 입력 동기화
  let searchTimer = null;

  function handleSearchInput(value, sourceInput) {
    state.searchQuery = value;

    // 두 검색창 값 동기화
    if (sourceInput !== DOM.searchInput) DOM.searchInput.value = value;
    if (sourceInput !== DOM.mobileSearchInput) DOM.mobileSearchInput.value = value;

    renderReviewList();

    if (state.searchQuery.trim() && sourceInput === DOM.searchInput) {
      document.getElementById('reviews').scrollIntoView({ behavior: 'smooth' });
    }
  }

  [DOM.searchInput, DOM.mobileSearchInput].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => handleSearchInput(e.target.value, e.target), 250);
    });
  });

  // 지역 필터
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
  const stored = Storage.load();
  state.reviews = stored ?? [...SEED_REVIEWS];

  if (!stored) {
    Storage.save(state.reviews);
  }
}

function init() {
  initData();
  bindEvents();
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
