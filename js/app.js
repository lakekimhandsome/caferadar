/**
 * CafeRadar — 앱 진입점
 * Supabase Auth + Database 연동
 */
import { initAuth, signUp, signIn, signOut, requireAuth, isLoggedIn, authState } from './auth.js';
import { fetchReviews, fetchReviewsByUser, createReview, deleteReview, updateReview } from './reviews.js';
import {
  fetchJobs,
  fetchJobsByUser,
  createJob,
  updateJob,
  deleteJob,
  deleteGuestJob,
  updateJobStatus,
  updateGuestJobStatus,
  verifyGuestJobPassword,
} from './jobs.js';
import { confirmDelete } from './utils.js';
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
  openWriteModalForEdit,
  openHiringModalCreate,
  openHiringModalForEdit,
  openAuthModal,
  switchAuthTab,
  resetReviewForm,
  updateStarButtons,
  syncReviewSearchInputs,
  syncJobSearchInputs,
  closeMobileNav,
  setActionHandlers,
  openJobDetail,
  openGuestPasswordModal,
  closeGuestPasswordModal,
  getGuestJobPassword,
  setGuestJobPassword,
} from './ui.js';

function getJobFormData(fd) {
  return {
    cafeName: fd.get('cafeName'),
    region: fd.get('region'),
    position: fd.get('position'),
    hourlyWage: fd.get('hourlyWage'),
    workHours: fd.get('workHours'),
    contact: fd.get('contact'),
    description: fd.get('description'),
  };
}

function getReviewFormData(fd) {
  return {
    cafeName: fd.get('cafeName'),
    region: fd.get('region'),
    workPeriod: fd.get('workPeriod'),
    position: fd.get('position'),
    hourlyWage: fd.get('hourlyWage'),
    atmosphere: fd.get('atmosphere'),
    pros: fd.get('pros'),
    cons: fd.get('cons'),
    rating: Number(fd.get('rating')),
  };
}

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
  const formData = getReviewFormData(fd);

  if (!formData.rating || formData.rating < 1) {
    DOM.ratingHint.textContent = '별점을 선택해주세요';
    DOM.ratingHint.classList.add('error');
    showToast('별점을 선택해주세요.');
    return;
  }
  if (!valid) { showToast('필수 항목을 모두 입력해주세요.'); return; }

  try {
    if (state.editingReviewId) {
      await updateReview(state.editingReviewId, formData);
      showToast('후기가 수정되었습니다!');
    } else {
      await createReview(authState.user.id, formData);
      showToast('후기가 등록되었습니다!');
    }

    closeModal(DOM.writeModal);
    state.editingReviewId = null;
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
  const required = ['cafeName', 'region', 'position', 'hourlyWage', 'workHours', 'contact'];
  const valid = validateRequired(DOM.hiringForm, required);
  if (!valid) { showToast('필수 항목을 모두 입력해주세요.'); return; }

  const formData = getJobFormData(fd);
  const loggedIn = isLoggedIn();
  const guestPassword = fd.get('guestPassword')?.trim();

  if (!loggedIn && !state.editingJobId) {
    if (!guestPassword || guestPassword.length < 4) {
      showToast('비밀번호는 4자 이상 입력해주세요.');
      return;
    }
  }

  try {
    if (state.editingJobId) {
      const job = state.jobs.find((j) => j.id === state.editingJobId);
      if (!job) throw new Error('구인글을 찾을 수 없습니다.');

      if (job.userId) {
        await updateJob(state.editingJobId, formData, state.editingJobStatus);
      } else {
        const password = getGuestJobPassword(state.editingJobId);
        if (!password) {
          showToast('비밀번호 확인이 필요합니다.');
          openGuestPasswordModal(state.editingJobId);
          return;
        }
        await updateGuestJob(state.editingJobId, password, formData, state.editingJobStatus);
      }
      showToast('구인글이 수정되었습니다!');
    } else {
      await createJob(
        formData,
        loggedIn ? authState.user.id : null,
        guestPassword,
      );
      showToast('구인글이 등록되었습니다!');
    }

    closeModal(DOM.hiringModal);
    state.editingJobId = null;
    await refreshAll();
    document.getElementById('jobs').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showToast(err.message);
  }
}

async function handleGuestPasswordSubmit(e) {
  e.preventDefault();
  const jobId = state.pendingGuestJobId;
  if (!jobId) return;

  const password = new FormData(DOM.jobPasswordForm).get('password')?.trim();
  if (!password) {
    showToast('비밀번호를 입력해주세요.');
    return;
  }

  try {
    const valid = await verifyGuestJobPassword(jobId, password);
    if (!valid) {
      showToast('비밀번호가 올바르지 않습니다.');
      return;
    }

    setGuestJobPassword(jobId, password);
    closeGuestPasswordModal();
    showToast('인증되었습니다. 글을 관리할 수 있습니다.');
    openJobDetail(jobId);
  } catch (err) {
    showToast(err.message);
  }
}

async function openMyPage() {
  if (!isLoggedIn()) return;

  try {
    const [myReviews, myJobs] = await Promise.all([
      fetchReviewsByUser(authState.user.id),
      fetchJobsByUser(authState.user.id),
    ]);
    await renderMyPage(myReviews, myJobs);
    openModal(DOM.mypageModal);
  } catch (err) {
    showToast(err.message);
  }
}

function handleEditReview(id) {
  const review = state.reviews.find((r) => r.id === id);
  if (!review || review.userId !== authState.user?.id) return;
  closeModal(DOM.detailModal);
  closeModal(DOM.mypageModal);
  openWriteModalForEdit(review);
}

function handleEditJob(id) {
  const job = state.jobs.find((j) => j.id === id);
  if (!job) return;

  if (job.userId && job.userId !== authState.user?.id) return;

  if (!job.userId && !getGuestJobPassword(id)) {
    openGuestPasswordModal(id);
    return;
  }

  closeModal(DOM.jobDetailModal);
  closeModal(DOM.mypageModal);
  openHiringModalForEdit(job);
}

function handleGuestJobManage(id) {
  openGuestPasswordModal(id);
}

async function handleDeleteReview(id) {
  if (!confirmDelete('정말 삭제하시겠습니까?')) return;

  try {
    await deleteReview(id);
    closeModal(DOM.detailModal);
    closeModal(DOM.mypageModal);
    showToast('후기가 삭제되었습니다.');
    await refreshAll();
  } catch (err) {
    showToast(err.message);
  }
}

async function handleDeleteJob(id) {
  const job = state.jobs.find((j) => j.id === id);
  if (!job) return;

  if (!confirmDelete('정말 삭제하시겠습니까?')) return;

  try {
    if (job.userId) {
      await deleteJob(id);
    } else {
      const password = getGuestJobPassword(id);
      if (!password) {
        openGuestPasswordModal(id);
        showToast('삭제하려면 비밀번호 확인이 필요합니다.');
        return;
      }
      await deleteGuestJob(id, password);
      delete state.guestJobPasswords[id];
    }

    closeModal(DOM.jobDetailModal);
    closeModal(DOM.mypageModal);
    showToast('구인글이 삭제되었습니다.');
    await refreshAll();
  } catch (err) {
    showToast(err.message);
  }
}

async function handleUpdateJobStatus(id, status) {
  const job = state.jobs.find((j) => j.id === id);
  if (!job || job.status === status) return;

  try {
    if (job.userId) {
      await updateJobStatus(id, status);
    } else {
      const password = getGuestJobPassword(id);
      if (!password) {
        openGuestPasswordModal(id);
        showToast('상태 변경하려면 비밀번호 확인이 필요합니다.');
        return;
      }
      await updateGuestJobStatus(id, password, status);
    }

    state.editingJobStatus = status;
    showToast(status === 'closed' ? '모집완료로 변경되었습니다.' : '모집중으로 변경되었습니다.');
    await refreshAll();
    openJobDetail(id);
  } catch (err) {
    showToast(err.message);
  }
}

function tryOpenWriteModal() {
  if (!requireAuth(() => {
    showToast('후기 작성은 로그인 후 이용할 수 있습니다.');
    openAuthModal('login');
  })) return;
  openWriteModal();
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

  document.getElementById('jobs-write-btn')?.addEventListener('click', openHiringModalCreate);
  document.getElementById('job-empty-btn')?.addEventListener('click', openHiringModalCreate);

  document.getElementById('modal-close')?.addEventListener('click', () => {
    state.editingReviewId = null;
    closeModal(DOM.writeModal);
  });
  document.getElementById('form-cancel')?.addEventListener('click', () => {
    state.editingReviewId = null;
    closeModal(DOM.writeModal);
  });
  document.getElementById('detail-close')?.addEventListener('click', () => closeModal(DOM.detailModal));
  document.getElementById('auth-close')?.addEventListener('click', () => closeModal(DOM.authModal));
  document.getElementById('login-cancel')?.addEventListener('click', () => closeModal(DOM.authModal));
  document.getElementById('signup-cancel')?.addEventListener('click', () => closeModal(DOM.authModal));
  document.getElementById('mypage-close')?.addEventListener('click', () => closeModal(DOM.mypageModal));
  document.getElementById('hiring-close')?.addEventListener('click', () => {
    state.editingJobId = null;
    closeModal(DOM.hiringModal);
  });
  document.getElementById('hiring-cancel')?.addEventListener('click', () => {
    state.editingJobId = null;
    closeModal(DOM.hiringModal);
  });
  document.getElementById('job-detail-close')?.addEventListener('click', () => closeModal(DOM.jobDetailModal));
  document.getElementById('job-password-close')?.addEventListener('click', closeGuestPasswordModal);
  document.getElementById('job-password-cancel')?.addEventListener('click', closeGuestPasswordModal);

  [DOM.writeModal, DOM.detailModal, DOM.authModal, DOM.mypageModal, DOM.hiringModal, DOM.jobDetailModal, DOM.jobPasswordModal]
    .forEach((modal) => {
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
          if (modal === DOM.hiringModal) state.editingJobId = null;
          if (modal === DOM.writeModal) state.editingReviewId = null;
          if (modal === DOM.jobPasswordModal) closeGuestPasswordModal();
          else closeModal(modal);
        }
      });
    });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });

  DOM.reviewForm.addEventListener('submit', handleReviewSubmit);
  DOM.signupForm.addEventListener('submit', handleSignupSubmit);
  DOM.loginForm.addEventListener('submit', handleLoginSubmit);
  DOM.hiringForm.addEventListener('submit', handleHiringSubmit);
  DOM.jobPasswordForm.addEventListener('submit', handleGuestPasswordSubmit);

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
        renderAll();
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

async function init() {
  setActionHandlers({
    onDeleteReview: handleDeleteReview,
    onDeleteJob: handleDeleteJob,
    onUpdateJobStatus: handleUpdateJobStatus,
    onEditReview: handleEditReview,
    onEditJob: handleEditJob,
    onGuestJobManage: handleGuestJobManage,
  });

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
