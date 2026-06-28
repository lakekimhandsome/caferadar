/**
 * CafeRadar — 앱 진입점
 * Supabase Auth + Database 연동
 */
import { initAuth, signUp, signIn, signOut, requireAuth, isLoggedIn, authState } from './auth.js';
import { fetchReviews, fetchReviewsByUser, createReview } from './reviews.js';
import { fetchJobs, createJob } from './jobs.js';
import {
  state,
  DOM,
  showToast,
  renderAll,
  renderAuthNav,
  renderMyPage,
  openModal,
  closeModal,
  closeAllModals,
  openWriteModal,
  openAuthModal,
  switchAuthTab,
  resetReviewForm,
  updateStarButtons,
  syncReviewSearchInputs,
  syncJobSearchInputs,
  closeMobileNav,
  renderJobList,
} from './ui.js';

/* ── 데이터 로드 ── */

async function loadReviews() {
  state.reviews = await fetchReviews({
    search: state.reviewSearch,
    region: state.regionFilter,
  });
}

async function loadJobs() {
  state.jobs = await fetchJobs({ search: state.jobSearch });
}

async function refreshAll() {
  try {
    state.loading = true;
    await Promise.all([loadReviews(), loadJobs()]);
    renderAll();
  } catch (err) {
    showToast(err.message || '데이터를 불러오지 못했습니다.');
  } finally {
    state.loading = false;
  }
}

/* ── 폼 핸들러 ── */

function validateRequired(form, names) {
  let valid = true;
  names.forEach((name) => {
    const el = form.querySelector(`[name="${name}"]`);
    const value = el?.value?.trim();
    if (!value) { el?.classList.add('error'); valid = false; }
    else el?.classList.remove('error');
  });
  return valid;
}

async function handleReviewSubmit(e) {
  e.preventDefault();

  if (!requireAuth(() => {
    showToast('후기 작성은 로그인 후 이용할 수 있습니다.');
    openAuthModal('login');
  })) return;

  const fd = new FormData(DOM.reviewForm);
  const valid = validateRequired(DOM.reviewForm, ['cafeName', 'region', 'workPeriod', 'position']);
  const rating = Number(fd.get('rating'));

  if (!rating || rating < 1) {
    DOM.ratingHint.textContent = '별점을 선택해주세요';
    DOM.ratingHint.classList.add('error');
    showToast('별점을 선택해주세요.');
    return;
  }
  if (!valid) { showToast('필수 항목을 모두 입력해주세요.'); return; }

  try {
    await createReview(authState.user.id, {
      cafeName: fd.get('cafeName'),
      region: fd.get('region'),
      workPeriod: fd.get('workPeriod'),
      position: fd.get('position'),
      hourlyWage: fd.get('hourlyWage'),
      atmosphere: fd.get('atmosphere'),
      pros: fd.get('pros'),
      cons: fd.get('cons'),
      rating,
    });

    closeModal(DOM.writeModal);
    showToast('후기가 등록되었습니다!');
    await refreshAll();
    document.getElementById('reviews').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showToast(err.message);
  }
}

async function handleSignupSubmit(e) {
  e.preventDefault();
  const fd = new FormData(DOM.signupForm);
  const nickname = fd.get('nickname')?.trim();
  const email = fd.get('email')?.trim();
  const password = fd.get('password');

  if (!nickname || !email || !password) {
    showToast('모든 항목을 입력해주세요.');
    return;
  }

  const result = await signUp(email, password, nickname);
  showToast(result.message);
  if (result.success) {
    closeModal(DOM.authModal);
    renderAuthNav();
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const fd = new FormData(DOM.loginForm);
  const email = fd.get('email')?.trim();
  const password = fd.get('password');

  if (!email || !password) {
    showToast('이메일과 비밀번호를 입력해주세요.');
    return;
  }

  const result = await signIn(email, password);
  showToast(result.message);
  if (result.success) {
    closeModal(DOM.authModal);
    renderAuthNav();
  }
}

async function handleHiringSubmit(e) {
  e.preventDefault();
  const fd = new FormData(DOM.hiringForm);
  const valid = validateRequired(DOM.hiringForm, [
    'cafeName', 'region', 'position', 'hourlyWage', 'workHours', 'contact',
  ]);
  if (!valid) { showToast('필수 항목을 모두 입력해주세요.'); return; }

  try {
    await createJob({
      cafeName: fd.get('cafeName'),
      region: fd.get('region'),
      position: fd.get('position'),
      hourlyWage: fd.get('hourlyWage'),
      workHours: fd.get('workHours'),
      contact: fd.get('contact'),
      description: fd.get('description'),
    });

    closeModal(DOM.hiringModal);
    showToast('구인글이 등록되었습니다!');
    await refreshAll();
    document.getElementById('jobs').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showToast(err.message);
  }
}

async function openMyPage() {
  if (!isLoggedIn()) return;

  try {
    const myReviews = await fetchReviewsByUser(authState.user.id);
    await renderMyPage(myReviews);
    openModal(DOM.mypageModal);
  } catch (err) {
    showToast(err.message);
  }
}

function openHiringModal() {
  DOM.hiringForm.reset();
  openModal(DOM.hiringModal);
  DOM.hiringForm.querySelector('#hiring-cafe')?.focus();
}

function tryOpenWriteModal() {
  if (!requireAuth(() => {
    showToast('후기 작성은 로그인 후 이용할 수 있습니다.');
    openAuthModal('login');
  })) return;
  openWriteModal();
}

/* ── 이벤트 바인딩 ── */

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

  ['hero-cta-btn', 'nav-write-btn', 'list-write-btn', 'empty-write-btn'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', () => {
      closeMobileNav();
      tryOpenWriteModal();
    });
  });

  document.getElementById('nav-login-btn')?.addEventListener('click', () => {
    closeMobileNav();
    openAuthModal('login');
  });
  document.getElementById('nav-signup-btn')?.addEventListener('click', () => {
    closeMobileNav();
    openAuthModal('signup');
  });
  document.getElementById('nav-mypage-btn')?.addEventListener('click', () => {
    closeMobileNav();
    openMyPage();
  });
  document.getElementById('nav-logout-btn')?.addEventListener('click', async () => {
    const result = await signOut();
    showToast(result.message);
    renderAuthNav();
    closeMobileNav();
  });

  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.authTab));
  });

  document.getElementById('jobs-write-btn')?.addEventListener('click', openHiringModal);
  document.getElementById('job-empty-btn')?.addEventListener('click', openHiringModal);

  document.getElementById('modal-close')?.addEventListener('click', () => closeModal(DOM.writeModal));
  document.getElementById('form-cancel')?.addEventListener('click', () => closeModal(DOM.writeModal));
  document.getElementById('detail-close')?.addEventListener('click', () => closeModal(DOM.detailModal));
  document.getElementById('auth-close')?.addEventListener('click', () => closeModal(DOM.authModal));
  document.getElementById('login-cancel')?.addEventListener('click', () => closeModal(DOM.authModal));
  document.getElementById('signup-cancel')?.addEventListener('click', () => closeModal(DOM.authModal));
  document.getElementById('mypage-close')?.addEventListener('click', () => closeModal(DOM.mypageModal));
  document.getElementById('hiring-close')?.addEventListener('click', () => closeModal(DOM.hiringModal));
  document.getElementById('hiring-cancel')?.addEventListener('click', () => closeModal(DOM.hiringModal));
  document.getElementById('job-detail-close')?.addEventListener('click', () => closeModal(DOM.jobDetailModal));

  [DOM.writeModal, DOM.detailModal, DOM.authModal, DOM.mypageModal, DOM.hiringModal, DOM.jobDetailModal]
    .forEach((modal) => {
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
      });
    });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });

  DOM.reviewForm.addEventListener('submit', handleReviewSubmit);
  DOM.signupForm.addEventListener('submit', handleSignupSubmit);
  DOM.loginForm.addEventListener('submit', handleLoginSubmit);
  DOM.hiringForm.addEventListener('submit', handleHiringSubmit);

  DOM.starRating.querySelectorAll('.star-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedRating = Number(btn.dataset.value);
      DOM.ratingInput.value = state.selectedRating;
      updateStarButtons();
      DOM.ratingHint.textContent = `${state.selectedRating}점을 선택했습니다`;
      DOM.ratingHint.classList.remove('error');
    });
  });

  let reviewSearchTimer = null;
  const onReviewSearch = (value, source) => {
    state.reviewSearch = value;
    syncReviewSearchInputs(value, source);
    clearTimeout(reviewSearchTimer);
    reviewSearchTimer = setTimeout(async () => {
      try {
        await loadReviews();
        renderAll();
        if (value.trim() && source === DOM.searchInput) {
          document.getElementById('reviews').scrollIntoView({ behavior: 'smooth' });
        }
      } catch (err) {
        showToast(err.message);
      }
    }, 300);
  };

  [DOM.searchInput, DOM.reviewsSearchInput].forEach((input) => {
    input?.addEventListener('input', (e) => onReviewSearch(e.target.value, e.target));
  });

  let jobSearchTimer = null;
  DOM.jobsSearchInput?.addEventListener('input', (e) => {
    state.jobSearch = e.target.value;
    syncJobSearchInputs(e.target.value, e.target);
    clearTimeout(jobSearchTimer);
    jobSearchTimer = setTimeout(async () => {
      try {
        await loadJobs();
        renderJobList();
        updateStats();
        renderRecentReviews();
        renderRegionFilters();
        renderReviewList();
        if (e.target.value.trim()) {
          document.getElementById('jobs').scrollIntoView({ behavior: 'smooth' });
        }
      } catch (err) {
        showToast(err.message);
      }
    }, 300);
  });

  DOM.filterChips.addEventListener('click', async (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    state.regionFilter = chip.dataset.region;
    try {
      await loadReviews();
      renderAll();
    } catch (err) {
      showToast(err.message);
    }
  });
}

/* ── 초기화 ── */

async function init() {
  bindEvents();

  await initAuth(async (event) => {
    renderAuthNav();
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
      await refreshAll();
    }
  });

  await refreshAll();
}

document.addEventListener('DOMContentLoaded', init);
