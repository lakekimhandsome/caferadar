/**
 * UI — DOM 참조, 렌더링, 모달, 토스트
 */
import { RECENT_LIMIT } from './config.js';
import {
  escapeHtml,
  highlightText,
  renderStars,
  formatDate,
  getReviewSummary,
  getJobStatusLabel,
  getJobStatusBadgeClass,
} from './utils.js';
import { isLoggedIn, isAdmin, getNickname, authState } from './auth.js';

/** 상세 모달 액션 핸들러 (app.js에서 등록) */
let actionHandlers = {
  onDeleteReview: null,
  onDeleteJob: null,
  onDeleteSeeker: null,
  onUpdateJobStatus: null,
  onEditReview: null,
  onEditJob: null,
  onEditSeeker: null,
  onGuestJobManage: null,
  onOpenWithdraw: null,
};

export function setActionHandlers(handlers) {
  actionHandlers = { ...actionHandlers, ...handlers };
}

function isReviewOwner(review) {
  return isLoggedIn() && review.userId === authState.user?.id;
}

function isJobOwner(job) {
  return isLoggedIn() && job.userId === authState.user?.id;
}

function isSeekerOwner(seeker) {
  return isLoggedIn() && seeker.userId === authState.user?.id;
}

function isGuestJob(job) {
  return !job.userId;
}

function canManageGuestJob(job) {
  return isGuestJob(job) && !!state.guestJobPasswords[job.id];
}

function renderEditButton(type, id) {
  return `<button type="button" class="btn btn-outline btn-sm" data-action="edit-${type}" data-id="${id}">수정</button>`;
}

function renderOwnerActions(type, id) {
  return `<div class="detail-actions">${renderEditButton(type, id)}${renderDeleteButton(type, id)}</div>`;
}

function renderAdminDeleteActions(type, id) {
  return `<div class="detail-footer detail-footer-admin">
    <p class="detail-admin-hint">관리자 권한으로 이 글을 삭제할 수 있습니다.</p>
    <div class="detail-actions">${renderDeleteButton(type, id, '관리자 삭제')}</div>
  </div>`;
}

export const state = {
  reviews: [],
  jobs: [],
  jobSeekers: [],
  reviewSearch: '',
  jobSearch: '',
  seekerSearch: '',
  jobTab: 'hiring',
  regionFilter: 'all',
  selectedRating: 0,
  loading: false,
  editingReviewId: null,
  editingJobId: null,
  editingSeekerId: null,
  editingJobStatus: 'open',
  /** 비회원 구인글 인증된 비밀번호 (세션 메모리) */
  guestJobPasswords: {},
  pendingGuestJobId: null,
};

export const DOM = {
  header: document.getElementById('header'),
  navToggle: document.getElementById('nav-toggle'),
  navLinks: document.getElementById('nav-links'),
  navAuthGuest: document.getElementById('nav-auth-guest'),
  navAuthUser: document.getElementById('nav-auth-user'),
  navNickname: document.getElementById('nav-nickname'),
  searchInput: document.getElementById('search-input'),
  reviewsSearchInput: document.getElementById('reviews-search-input'),
  jobsSearchInput: document.getElementById('jobs-search-input'),
  seekersSearchInput: document.getElementById('seekers-search-input'),
  hiringPanel: document.getElementById('hiring-panel'),
  seekingPanel: document.getElementById('seeking-panel'),
  recentReviews: document.getElementById('recent-reviews'),
  reviewList: document.getElementById('review-list'),
  reviewsCountText: document.getElementById('reviews-count-text'),
  filterChips: document.getElementById('filter-chips'),
  emptyState: document.getElementById('empty-state'),
  statCount: document.getElementById('stat-count'),
  statRegions: document.getElementById('stat-regions'),
  statRating: document.getElementById('stat-rating'),
  jobsCountText: document.getElementById('jobs-count-text'),
  jobList: document.getElementById('job-list'),
  jobEmpty: document.getElementById('job-empty'),
  seekerList: document.getElementById('seeker-list'),
  seekerEmpty: document.getElementById('seeker-empty'),
  seekingModal: document.getElementById('seeking-modal'),
  seekingForm: document.getElementById('seeking-form'),
  seekerDetailModal: document.getElementById('seeker-detail-modal'),
  seekerDetailTitle: document.getElementById('seeker-detail-title'),
  seekerDetailSubtitle: document.getElementById('seeker-detail-subtitle'),
  seekerDetailBody: document.getElementById('seeker-detail-body'),
  seekingModalTitle: document.getElementById('seeking-modal-title'),
  seekingSubmitBtn: document.getElementById('seeking-submit-btn'),
  loadingOverlay: document.getElementById('loading-overlay'),
  writeModal: document.getElementById('write-modal'),
  detailModal: document.getElementById('detail-modal'),
  authModal: document.getElementById('auth-modal'),
  mypageModal: document.getElementById('mypage-modal'),
  hiringModal: document.getElementById('hiring-modal'),
  jobDetailModal: document.getElementById('job-detail-modal'),
  reviewForm: document.getElementById('review-form'),
  loginForm: document.getElementById('login-form'),
  signupForm: document.getElementById('signup-form'),
  hiringForm: document.getElementById('hiring-form'),
  starRating: document.getElementById('star-rating'),
  ratingInput: document.getElementById('rating'),
  ratingHint: document.getElementById('rating-hint'),
  detailTitle: document.getElementById('detail-title'),
  detailRegion: document.getElementById('detail-region'),
  detailBody: document.getElementById('detail-body'),
  mypageBody: document.getElementById('mypage-body'),
  withdrawModal: document.getElementById('withdraw-modal'),
  withdrawForm: document.getElementById('withdraw-form'),
  jobDetailTitle: document.getElementById('job-detail-title'),
  jobDetailSubtitle: document.getElementById('job-detail-subtitle'),
  jobDetailBody: document.getElementById('job-detail-body'),
  jobPasswordModal: document.getElementById('job-password-modal'),
  jobPasswordForm: document.getElementById('job-password-form'),
  hiringPasswordGroup: document.getElementById('hiring-password-group'),
  hiringModalTitle: document.getElementById('hiring-modal-title'),
  hiringSubmitBtn: document.getElementById('hiring-submit-btn'),
  reviewModalTitle: document.getElementById('modal-title'),
  reviewSubmitBtn: document.getElementById('review-submit-btn'),
  toast: document.getElementById('toast'),
};

let toastTimer = null;
let loadingCount = 0;

export function setLoading(active) {
  state.loading = active;
  if (DOM.loadingOverlay) {
    DOM.loadingOverlay.classList.toggle('hidden', !active);
    DOM.loadingOverlay.setAttribute('aria-hidden', active ? 'false' : 'true');
  }
}

export async function withLoading(fn) {
  loadingCount += 1;
  setLoading(true);
  try {
    return await fn();
  } finally {
    loadingCount = Math.max(0, loadingCount - 1);
    if (loadingCount === 0) setLoading(false);
  }
}

/** @param {'default'|'success'|'error'|'warning'} type */
export function showToast(message, type = 'default') {
  DOM.toast.textContent = message;
  DOM.toast.classList.remove('hidden', 'toast-success', 'toast-error', 'toast-warning');
  if (type !== 'default') DOM.toast.classList.add(`toast-${type}`);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => DOM.toast.classList.add('hidden'), 3200);
}

export function renderAuthNav() {
  const loggedIn = isLoggedIn();
  DOM.navAuthGuest.classList.toggle('hidden', loggedIn);
  DOM.navAuthUser.classList.toggle('hidden', !loggedIn);
  if (loggedIn) DOM.navNickname.textContent = getNickname();
}

function createReviewCardHTML(review, highlight = false) {
  const q = highlight ? state.reviewSearch : '';
  return `
    <article class="review-card" data-id="${review.id}" tabindex="0" role="button">
      <div class="review-card-header">
        <h3 class="review-cafe-name">${highlightText(review.cafeName, q)}</h3>
        <span class="review-stars">${renderStars(review.rating)}</span>
      </div>
      <div class="review-meta">
        <span class="review-tag">${highlightText(review.region, q)}</span>
        <span class="review-tag">${escapeHtml(review.workPeriod)}</span>
      </div>
      <p class="review-summary">${escapeHtml(getReviewSummary(review))}</p>
      <div class="review-footer">
        <span class="review-position">${escapeHtml(review.position)}</span>
        <time class="review-date">${formatDate(review.createdAt)}</time>
      </div>
    </article>`;
}

function createSeekerCardHTML(seeker) {
  const q = state.seekerSearch;
  const summary = seeker.introduction || `${seeker.experience || ''} · ${seeker.availability}`.trim();
  const short = summary.length > 80 ? `${summary.slice(0, 80)}…` : summary;

  return `
    <article class="job-card seeker-card" data-id="${seeker.id}" data-type="seeker" tabindex="0" role="button">
      <div class="job-card-header">
        <h3 class="job-card-title">${highlightText(seeker.position, q)}</h3>
        <span class="job-badge job-badge-seeker">구직</span>
      </div>
      <div class="review-meta">
        <span class="review-tag">${highlightText(seeker.region, q)}</span>
        <span class="review-tag">${escapeHtml(seeker.availability)}</span>
      </div>
      <p class="job-summary">${escapeHtml(short)}</p>
      <div class="job-card-footer">
        <span class="job-card-position">${seeker.experience ? escapeHtml(seeker.experience) : '경력 미입력'}</span>
        <time class="job-card-date">${formatDate(seeker.createdAt)}</time>
      </div>
    </article>`;
}

function createJobCardHTML(job) {
  const q = state.jobSearch;
  const summary = job.description || `${job.workHours} · 시급 ${job.hourlyWage}`;
  const short = summary.length > 80 ? `${summary.slice(0, 80)}…` : summary;
  const statusClass = getJobStatusBadgeClass(job.status);
  const statusLabel = getJobStatusLabel(job.status);
  const closedClass = job.status === 'closed' ? ' job-card-closed' : '';

  return `
    <article class="job-card${closedClass}" data-id="${job.id}" tabindex="0" role="button">
      <div class="job-card-header">
        <h3 class="job-card-title">${highlightText(job.cafeName, q)}</h3>
        <span class="job-badge ${statusClass}">${statusLabel}</span>
      </div>
      <div class="review-meta">
        <span class="review-tag">${highlightText(job.region, q)}</span>
        <span class="review-tag">${escapeHtml(job.workHours)}</span>
      </div>
      <p class="job-summary">${escapeHtml(short)}</p>
      <div class="job-card-footer">
        <span class="job-card-position">${highlightText(job.position, q)} · ${escapeHtml(job.hourlyWage)}</span>
        <time class="job-card-date">${formatDate(job.createdAt)}</time>
      </div>
    </article>`;
}

function renderDeleteButton(type, id, label = '삭제') {
  return `<button type="button" class="btn btn-danger btn-sm" data-action="delete-${type}" data-id="${id}">${label}</button>`;
}

function renderJobStatusControl(job) {
  const isOpen = job.status !== 'closed';
  return `
    <div class="detail-status-control">
      <span class="detail-status-label">모집 상태</span>
      <div class="status-toggle" role="group" aria-label="모집 상태 변경">
        <button type="button" class="status-btn${isOpen ? ' status-btn-active status-btn-open' : ''}" data-action="set-status" data-status="open">모집중</button>
        <button type="button" class="status-btn${!isOpen ? ' status-btn-active status-btn-closed' : ''}" data-action="set-status" data-status="closed">모집완료</button>
      </div>
    </div>`;
}

function bindDetailActions(container) {
  container.querySelectorAll('[data-action="delete-review"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      actionHandlers.onDeleteReview?.(btn.dataset.id);
    });
  });

  container.querySelectorAll('[data-action="delete-job"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      actionHandlers.onDeleteJob?.(btn.dataset.id);
    });
  });

  container.querySelectorAll('[data-action="delete-seeker"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      actionHandlers.onDeleteSeeker?.(btn.dataset.id);
    });
  });

  container.querySelectorAll('[data-action="edit-review"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      actionHandlers.onEditReview?.(btn.dataset.id);
    });
  });

  container.querySelectorAll('[data-action="edit-job"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      actionHandlers.onEditJob?.(btn.dataset.id);
    });
  });

  container.querySelectorAll('[data-action="edit-seeker"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      actionHandlers.onEditSeeker?.(btn.dataset.id);
    });
  });

  container.querySelectorAll('[data-action="guest-manage"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      actionHandlers.onGuestJobManage?.(btn.dataset.id);
    });
  });

  container.querySelectorAll('[data-action="open-withdraw"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      actionHandlers.onOpenWithdraw?.();
    });
  });

  container.querySelectorAll('[data-action="set-status"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const jobId = container.dataset.jobId;
      actionHandlers.onUpdateJobStatus?.(jobId, btn.dataset.status);
    });
  });
}

function bindCardClicks(container, type) {
  const selector = type === 'review' ? '.review-card' : '.job-card';
  container.querySelectorAll(selector).forEach((card) => {
    const open = () => {
      if (type === 'review') openReviewDetail(card.dataset.id);
      else if (card.dataset.type === 'seeker') openSeekerDetail(card.dataset.id);
      else openJobDetail(card.dataset.id);
    };
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });

  container.querySelectorAll('[data-action="delete-review"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      actionHandlers.onDeleteReview?.(btn.dataset.id);
    });
  });

  container.querySelectorAll('[data-action="delete-job"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      actionHandlers.onDeleteJob?.(btn.dataset.id);
    });
  });

  container.querySelectorAll('[data-action="edit-review"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      actionHandlers.onEditReview?.(btn.dataset.id);
    });
  });

  container.querySelectorAll('[data-action="edit-job"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      actionHandlers.onEditJob?.(btn.dataset.id);
    });
  });
}

export function renderRecentReviews() {
  const recent = [...state.reviews].slice(0, RECENT_LIMIT);

  if (recent.length === 0) {
    DOM.recentReviews.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--color-text-muted);padding:32px 0;">등록된 후기가 없습니다.</p>`;
    return;
  }

  DOM.recentReviews.innerHTML = recent.map((r) => createReviewCardHTML(r)).join('');
  bindCardClicks(DOM.recentReviews, 'review');
}

export function renderReviewList() {
  const filtered = state.reviews;
  const q = state.reviewSearch.trim();

  DOM.reviewsCountText.textContent = q
    ? `"${q}" 검색 결과 ${filtered.length}건`
    : `총 ${filtered.length}개의 후기가 있습니다.`;

  if (filtered.length === 0) {
    DOM.reviewList.innerHTML = '';
    DOM.emptyState.classList.remove('hidden');
    const title = DOM.emptyState.querySelector('.empty-title');
    const text = DOM.emptyState.querySelector('.empty-text');
    if (q) {
      title.textContent = '검색 결과가 없어요';
      text.textContent = '다른 키워드로 검색하거나, 새 후기를 작성해 보세요.';
    } else if (state.regionFilter !== 'all') {
      title.textContent = '해당 지역의 후기가 없어요';
      text.textContent = '다른 지역을 선택하거나 후기를 작성해 보세요.';
    } else {
      title.textContent = '아직 등록된 후기가 없어요';
      text.textContent = '첫 번째 후기를 남겨보세요.';
    }
    return;
  }

  DOM.emptyState.classList.add('hidden');
  DOM.reviewList.innerHTML = filtered.map((r) => createReviewCardHTML(r, true)).join('');
  bindCardClicks(DOM.reviewList, 'review');
}

export function renderRegionFilters() {
  const regions = [...new Set(state.reviews.map((r) => r.region))].sort((a, b) => a.localeCompare(b, 'ko'));
  const chips = regions.map(
    (region) => `<button type="button" class="chip${state.regionFilter === region ? ' chip-active' : ''}" data-region="${escapeHtml(region)}">${escapeHtml(region)}</button>`
  ).join('');

  DOM.filterChips.innerHTML = `
    <button type="button" class="chip${state.regionFilter === 'all' ? ' chip-active' : ''}" data-region="all">전체</button>
    ${chips}`;
}

export function updateStats() {
  const count = state.reviews.length;
  const regions = new Set(state.reviews.map((r) => r.region)).size;
  DOM.statCount.textContent = count;
  DOM.statRegions.textContent = regions;
  DOM.statRating.textContent = count === 0 ? '—' : (state.reviews.reduce((s, r) => s + r.rating, 0) / count).toFixed(1);
}

export function renderJobList() {
  const filtered = state.jobs;
  const q = state.jobSearch.trim();

  updateJobsCountText();

  if (filtered.length === 0) {
    DOM.jobList.innerHTML = '';
    DOM.jobEmpty.classList.remove('hidden');
    const title = DOM.jobEmpty.querySelector('.empty-title');
    const text = DOM.jobEmpty.querySelector('.empty-text');
    if (q) {
      title.textContent = '검색 결과가 없어요';
      text.textContent = '다른 키워드로 검색하거나, 새 구인글을 작성해 보세요.';
    } else {
      title.textContent = '등록된 구인글이 없어요';
      text.textContent = '첫 번째 채용 정보를 등록해보세요.';
    }
    return;
  }

  DOM.jobEmpty.classList.add('hidden');
  DOM.jobList.innerHTML = filtered.map(createJobCardHTML).join('');
  bindCardClicks(DOM.jobList, 'job');
}

export function renderSeekerList() {
  const filtered = state.jobSeekers;
  const q = state.seekerSearch.trim();

  updateJobsCountText();

  if (filtered.length === 0) {
    DOM.seekerList.innerHTML = '';
    DOM.seekerEmpty.classList.remove('hidden');
    const title = DOM.seekerEmpty.querySelector('.empty-title');
    const text = DOM.seekerEmpty.querySelector('.empty-text');
    if (q) {
      title.textContent = '검색 결과가 없어요';
      text.textContent = '다른 키워드로 검색하거나, 새 구직글을 작성해 보세요.';
    } else {
      title.textContent = '등록된 구직글이 없어요';
      text.textContent = '첫 번째 자기소개를 등록해보세요.';
    }
    return;
  }

  DOM.seekerEmpty.classList.add('hidden');
  DOM.seekerList.innerHTML = filtered.map(createSeekerCardHTML).join('');
  bindCardClicks(DOM.seekerList, 'job');
}

function updateJobsCountText() {
  const isHiring = state.jobTab === 'hiring';
  const q = isHiring ? state.jobSearch.trim() : state.seekerSearch.trim();
  const count = isHiring ? state.jobs.length : state.jobSeekers.length;
  const label = isHiring ? '구인글' : '구직글';

  DOM.jobsCountText.textContent = q
    ? `"${q}" 검색 결과 ${count}건`
    : `총 ${count}개의 ${label}이 있습니다.`;
}

export function switchJobTab(tab) {
  state.jobTab = tab;
  const isHiring = tab === 'hiring';

  document.querySelectorAll('.tab-btn[data-job-tab]').forEach((btn) => {
    const active = btn.dataset.jobTab === tab;
    btn.classList.toggle('tab-active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  DOM.hiringPanel?.classList.toggle('hidden', !isHiring);
  DOM.seekingPanel?.classList.toggle('hidden', isHiring);

  updateJobsCountText();
  if (isHiring) renderJobList();
  else renderSeekerList();
}

export function renderAll() {
  updateStats();
  renderRegionFilters();
  renderRecentReviews();
  renderReviewList();
  renderJobList();
  renderSeekerList();
  renderAuthNav();
}

function openReviewDetail(id) {
  const review = state.reviews.find((r) => r.id === id);
  if (!review) return;

  const ownerActions = isReviewOwner(review)
    ? `<div class="detail-footer">${renderOwnerActions('review', review.id)}</div>`
    : isAdmin()
      ? renderAdminDeleteActions('review', review.id)
      : '';

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
    <p class="detail-date">작성일: ${formatDate(review.createdAt)}</p>
    ${ownerActions}`;

  bindDetailActions(DOM.detailBody);
  openModal(DOM.detailModal);
}

export function openJobDetail(id) {
  const job = state.jobs.find((j) => j.id === id);
  if (!job) return;

  const isOwner = isJobOwner(job);
  const isGuestVerified = canManageGuestJob(job);
  const statusBadge = `<span class="job-badge ${getJobStatusBadgeClass(job.status)}">${getJobStatusLabel(job.status)}</span>`;

  let ownerSection = `<div class="detail-status-display">${statusBadge}</div>`;

  if (isOwner || isGuestVerified) {
    ownerSection = `
      <div class="detail-footer detail-footer-owner">
        ${renderJobStatusControl(job)}
        <div class="detail-actions">
          ${renderEditButton('job', job.id)}
          ${renderDeleteButton('job', job.id)}
        </div>
      </div>`;
  } else if (isAdmin()) {
    ownerSection = renderAdminDeleteActions('job', job.id);
  } else if (isGuestJob(job)) {
    ownerSection = `
      <div class="detail-footer">
        <p class="detail-guest-hint">비회원으로 작성한 글입니다. 수정·삭제하려면 작성 시 설정한 비밀번호가 필요합니다.</p>
        <button type="button" class="btn btn-outline btn-sm" data-action="guest-manage" data-id="${job.id}">글 관리</button>
      </div>`;
  }

  DOM.jobDetailTitle.textContent = job.cafeName;
  DOM.jobDetailSubtitle.textContent = job.region;
  DOM.jobDetailBody.dataset.jobId = job.id;
  DOM.jobDetailBody.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><p class="detail-label">모집 직무</p><p class="detail-value">${escapeHtml(job.position)}</p></div>
      <div class="detail-item"><p class="detail-label">시급</p><p class="detail-value">${escapeHtml(job.hourlyWage)}</p></div>
      <div class="detail-item"><p class="detail-label">근무 시간</p><p class="detail-value">${escapeHtml(job.workHours)}</p></div>
      <div class="detail-item"><p class="detail-label">연락 방법</p><p class="detail-value">${escapeHtml(job.contact)}</p></div>
    </div>
    ${job.description ? `<div class="detail-section"><h4 class="detail-section-title">상세 설명</h4><p class="detail-section-text">${escapeHtml(job.description)}</p></div>` : ''}
    <p class="detail-date">등록일: ${formatDate(job.createdAt)}</p>
    ${ownerSection}`;

  bindDetailActions(DOM.jobDetailBody);
  openModal(DOM.jobDetailModal);
}

export function openSeekerDetail(id) {
  const seeker = state.jobSeekers.find((s) => s.id === id);
  if (!seeker) return;

  const ownerActions = isSeekerOwner(seeker)
    ? `<div class="detail-footer">${renderOwnerActions('seeker', seeker.id)}</div>`
    : isAdmin()
      ? renderAdminDeleteActions('seeker', seeker.id)
      : '';

  DOM.seekerDetailTitle.textContent = seeker.position;
  DOM.seekerDetailSubtitle.textContent = seeker.region;
  DOM.seekerDetailBody.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><p class="detail-label">희망 지역</p><p class="detail-value">${escapeHtml(seeker.region)}</p></div>
      <div class="detail-item"><p class="detail-label">희망 직무</p><p class="detail-value">${escapeHtml(seeker.position)}</p></div>
      <div class="detail-item"><p class="detail-label">경력 · 경험</p><p class="detail-value">${escapeHtml(seeker.experience || '미입력')}</p></div>
      <div class="detail-item"><p class="detail-label">가능 시간</p><p class="detail-value">${escapeHtml(seeker.availability)}</p></div>
      <div class="detail-item"><p class="detail-label">연락 방법</p><p class="detail-value">${escapeHtml(seeker.contact)}</p></div>
    </div>
    ${seeker.introduction ? `<div class="detail-section"><h4 class="detail-section-title">자기소개</h4><p class="detail-section-text">${escapeHtml(seeker.introduction)}</p></div>` : ''}
    <p class="detail-date">등록일: ${formatDate(seeker.createdAt)}</p>
    ${ownerActions}`;

  bindDetailActions(DOM.seekerDetailBody);
  openModal(DOM.seekerDetailModal);
}

export async function renderMyPage(myReviews, myJobs = [], mySeekers = []) {
  const nickname = getNickname();
  const initial = nickname.charAt(0).toUpperCase();

  DOM.mypageBody.innerHTML = `
    <div class="mypage-profile">
      <div class="mypage-avatar">${escapeHtml(initial)}</div>
      <div>
        <p class="mypage-name">${escapeHtml(nickname)}</p>
        <p class="mypage-email">${escapeHtml(authState.user?.email || '')}</p>
      </div>
    </div>
    <h3 class="mypage-section-title">내가 작성한 후기 (${myReviews.length})</h3>
    <div class="mypage-list">
      ${myReviews.length === 0
        ? '<p class="mypage-empty">작성한 후기가 없습니다.</p>'
        : myReviews.map((r) => `
          <div class="mypage-item">
            <div class="mypage-item-info">
              <span class="mypage-item-title">${escapeHtml(r.cafeName)} · ${escapeHtml(r.region)}</span>
              <time class="mypage-item-date">${formatDate(r.createdAt)}</time>
            </div>
            <div class="mypage-item-actions">
              ${renderEditButton('review', r.id)}
              ${renderDeleteButton('review', r.id)}
            </div>
          </div>`).join('')}
    </div>
    <h3 class="mypage-section-title">내가 작성한 구인글 (${myJobs.length})</h3>
    <div class="mypage-list">
      ${myJobs.length === 0
        ? '<p class="mypage-empty">작성한 구인글이 없습니다.</p>'
        : myJobs.map((j) => `
          <div class="mypage-item">
            <div class="mypage-item-info">
              <span class="mypage-item-title">${escapeHtml(j.cafeName)} · ${escapeHtml(j.region)}</span>
              <span class="job-badge ${getJobStatusBadgeClass(j.status)}">${getJobStatusLabel(j.status)}</span>
            </div>
            <div class="mypage-item-actions">
              ${renderEditButton('job', j.id)}
              ${renderDeleteButton('job', j.id)}
            </div>
          </div>`).join('')}
    </div>
    <h3 class="mypage-section-title">내가 작성한 구직글 (${mySeekers.length})</h3>
    <div class="mypage-list">
      ${mySeekers.length === 0
        ? '<p class="mypage-empty">작성한 구직글이 없습니다.</p>'
        : mySeekers.map((s) => `
          <div class="mypage-item">
            <div class="mypage-item-info">
              <span class="mypage-item-title">${escapeHtml(s.position)} · ${escapeHtml(s.region)}</span>
              <time class="mypage-item-date">${formatDate(s.createdAt)}</time>
            </div>
            <div class="mypage-item-actions">
              ${renderEditButton('seeker', s.id)}
              ${renderDeleteButton('seeker', s.id)}
            </div>
          </div>`).join('')}
    </div>
    <div class="mypage-danger">
      <h3 class="mypage-danger-title">회원 탈퇴</h3>
      <p class="mypage-danger-text">탈퇴 시 프로필과 작성한 후기가 삭제되며, 로그인으로 작성한 구인글도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</p>
      <button type="button" class="btn btn-danger btn-sm" data-action="open-withdraw">회원 탈퇴</button>
    </div>`;

  bindDetailActions(DOM.mypageBody);
}

export function openWithdrawModal() {
  DOM.withdrawForm.reset();
  openModal(DOM.withdrawModal);
  DOM.withdrawForm.querySelector('#withdraw-password')?.focus();
}

export function openModal(modal) {
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

export function closeModal(modal) {
  modal.classList.add('hidden');
  if (!document.querySelector('.modal-overlay:not(.hidden)')) {
    document.body.style.overflow = '';
  }
}

export function closeAllModals() {
  [DOM.writeModal, DOM.detailModal, DOM.authModal, DOM.mypageModal, DOM.hiringModal, DOM.jobDetailModal, DOM.jobPasswordModal, DOM.withdrawModal, DOM.seekingModal, DOM.seekerDetailModal]
    .forEach(closeModal);
  document.body.style.overflow = '';
}

export function openWriteModal() {
  state.editingReviewId = null;
  resetReviewForm();
  DOM.reviewModalTitle.textContent = '근무 후기 작성';
  DOM.reviewSubmitBtn.textContent = '후기 등록';
  openModal(DOM.writeModal);
  DOM.reviewForm.querySelector('#cafe-name')?.focus();
}

export function openWriteModalForEdit(review) {
  state.editingReviewId = review.id;
  DOM.reviewForm.querySelector('#cafe-name').value = review.cafeName;
  DOM.reviewForm.querySelector('#region').value = review.region;
  DOM.reviewForm.querySelector('#work-period').value = review.workPeriod;
  DOM.reviewForm.querySelector('#position').value = review.position;
  DOM.reviewForm.querySelector('#hourly-wage').value = review.hourlyWage || '';
  DOM.reviewForm.querySelector('#atmosphere').value = review.atmosphere || '';
  DOM.reviewForm.querySelector('#pros').value = review.pros || '';
  DOM.reviewForm.querySelector('#cons').value = review.cons || '';
  state.selectedRating = review.rating;
  DOM.ratingInput.value = review.rating;
  updateStarButtons();
  DOM.ratingHint.textContent = `${review.rating}점을 선택했습니다`;
  DOM.reviewModalTitle.textContent = '근무 후기 수정';
  DOM.reviewSubmitBtn.textContent = '후기 수정';
  openModal(DOM.writeModal);
}

export function openHiringModalCreate() {
  state.editingJobId = null;
  state.editingJobStatus = 'open';
  DOM.hiringForm.reset();
  updateHiringFormMode();
  openModal(DOM.hiringModal);
  DOM.hiringForm.querySelector('#hiring-cafe')?.focus();
}

export function openHiringModalForEdit(job) {
  state.editingJobId = job.id;
  state.editingJobStatus = job.status || 'open';
  DOM.hiringForm.querySelector('#hiring-cafe').value = job.cafeName;
  DOM.hiringForm.querySelector('#hiring-region').value = job.region;
  DOM.hiringForm.querySelector('#hiring-position').value = job.position;
  DOM.hiringForm.querySelector('#hiring-wage').value = job.hourlyWage;
  DOM.hiringForm.querySelector('#hiring-hours').value = job.workHours;
  DOM.hiringForm.querySelector('#hiring-contact').value = job.contact;
  DOM.hiringForm.querySelector('#hiring-desc').value = job.description || '';
  updateHiringFormMode(true);
  openModal(DOM.hiringModal);
}

export function updateHiringFormMode(isEdit = false) {
  const loggedIn = isLoggedIn();
  DOM.hiringPasswordGroup.classList.toggle('hidden', loggedIn || isEdit);
  DOM.hiringModalTitle.textContent = isEdit ? '구인글 수정' : '구인글 작성';
  DOM.hiringSubmitBtn.textContent = isEdit ? '구인글 수정' : '구인글 등록';

  const hint = DOM.hiringForm.querySelector('.hiring-form-hint');
  const passwordInput = DOM.hiringForm.querySelector('#hiring-password');
  if (hint) {
    hint.textContent = loggedIn
      ? '로그인 상태로 작성하면 수정·삭제가 계정과 연결됩니다.'
      : '비회원 작성 시 비밀번호가 필요합니다. 수정·삭제·모집 상태 변경에 사용됩니다.';
  }
  if (passwordInput) {
    passwordInput.required = !loggedIn && !isEdit;
  }
}

export function openGuestPasswordModal(jobId) {
  state.pendingGuestJobId = jobId;
  DOM.jobPasswordForm.reset();
  openModal(DOM.jobPasswordModal);
  DOM.jobPasswordForm.querySelector('#job-manage-password')?.focus();
}

export function closeGuestPasswordModal() {
  state.pendingGuestJobId = null;
  closeModal(DOM.jobPasswordModal);
}

export function getGuestJobPassword(jobId) {
  return state.guestJobPasswords[jobId] || null;
}

export function setGuestJobPassword(jobId, password) {
  state.guestJobPasswords[jobId] = password;
}

export function openAuthModal(tab = 'login') {
  switchAuthTab(tab);
  if (tab === 'signup') resetNicknameCheck();
  openModal(DOM.authModal);
}

export function resetNicknameCheck() {
  setNicknameCheckHint('');
}

export function setNicknameCheckHint(message, type = '') {
  const hint = document.getElementById('nickname-check-hint');
  if (!hint) return;
  hint.textContent = message;
  hint.classList.remove('success', 'error');
  if (type) hint.classList.add(type);
}

export function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.querySelectorAll('.auth-tab').forEach((t) => {
    t.classList.toggle('auth-tab-active', t.dataset.authTab === tab);
  });
  DOM.loginForm.classList.toggle('hidden', !isLogin);
  DOM.signupForm.classList.toggle('hidden', isLogin);
  document.getElementById('auth-modal-title').textContent = isLogin ? '로그인' : '회원가입';
  if (!isLogin) resetNicknameCheck();
}

export function resetReviewForm() {
  DOM.reviewForm.reset();
  state.selectedRating = 0;
  DOM.ratingInput.value = '0';
  updateStarButtons();
  DOM.ratingHint.textContent = '별점을 선택해주세요';
  DOM.ratingHint.classList.remove('error');
  DOM.reviewForm.querySelectorAll('.error').forEach((el) => el.classList.remove('error'));
}

export function updateStarButtons() {
  DOM.starRating.querySelectorAll('.star-btn').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.value) <= state.selectedRating);
  });
}

export function syncReviewSearchInputs(value, source) {
  if (source !== DOM.searchInput) DOM.searchInput.value = value;
  if (source !== DOM.reviewsSearchInput) DOM.reviewsSearchInput.value = value;
}

export function syncJobSearchInputs(value, source) {
  if (source !== DOM.jobsSearchInput) DOM.jobsSearchInput.value = value;
}

export function syncSeekerSearchInputs(value, source) {
  if (source !== DOM.seekersSearchInput) DOM.seekersSearchInput.value = value;
}

export function openSeekingModalCreate() {
  state.editingSeekerId = null;
  DOM.seekingForm.reset();
  DOM.seekingModalTitle.textContent = '구직글 작성';
  DOM.seekingSubmitBtn.textContent = '구직글 등록';
  openModal(DOM.seekingModal);
  DOM.seekingForm.querySelector('#seeking-region')?.focus();
}

export function openSeekingModalForEdit(seeker) {
  state.editingSeekerId = seeker.id;
  DOM.seekingForm.querySelector('#seeking-region').value = seeker.region;
  DOM.seekingForm.querySelector('#seeking-position').value = seeker.position;
  DOM.seekingForm.querySelector('#seeking-experience').value = seeker.experience || '';
  DOM.seekingForm.querySelector('#seeking-availability').value = seeker.availability;
  DOM.seekingForm.querySelector('#seeking-contact').value = seeker.contact;
  DOM.seekingForm.querySelector('#seeking-intro').value = seeker.introduction || '';
  DOM.seekingModalTitle.textContent = '구직글 수정';
  DOM.seekingSubmitBtn.textContent = '구직글 수정';
  openModal(DOM.seekingModal);
}

export function closeMobileNav() {
  DOM.navLinks.classList.remove('open');
  DOM.navToggle.classList.remove('active');
  DOM.navToggle.setAttribute('aria-expanded', 'false');
}
