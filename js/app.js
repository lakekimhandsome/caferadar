/**
 * CafeRadar — 앱 진입점
 * Supabase Auth + Database 연동
 */
import { initAuth, signUp, signIn, signOut, deleteAccount, checkNicknameAvailable, requireAuth, isLoggedIn, authState } from './auth.js';
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
import {
  fetchJobSeekers,
  fetchJobSeekersByUser,
  createJobSeeker,
  updateJobSeeker,
  deleteJobSeeker,
} from './jobSeekers.js';
import { confirmDelete } from './utils.js';
import {
  state,
  DOM,
  showToast,
  withLoading,
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
  openSeekingModalCreate,
  openSeekingModalForEdit,
  openAuthModal,
  switchAuthTab,
  switchJobTab,
  resetReviewForm,
  updateStarButtons,
  syncReviewSearchInputs,
  syncJobSearchInputs,
  syncSeekerSearchInputs,
  closeMobileNav,
  setActionHandlers,
  openJobDetail,
  openGuestPasswordModal,
  closeGuestPasswordModal,
  getGuestJobPassword,
  setGuestJobPassword,
  openWithdrawModal,
  resetNicknameCheck,
  setNicknameCheckHint,
} from './ui.js';

/** 회원가입 닉네임 중복 확인 상태 */
const nicknameCheckState = { value: '', verified: false };

/** 진행 중인 데이터 요청 (중복 방지) */
let refreshPromise = null;
let reviewSearchAbort = null;
let jobSearchAbort = null;
let seekerSearchAbort = null;

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

function getSeekerFormData(fd) {
  return {
    region: fd.get('region'),
    position: fd.get('position'),
    experience: fd.get('experience'),
    availability: fd.get('availability'),
    contact: fd.get('contact'),
    introduction: fd.get('introduction'),
  };
}

async function loadReviews() {
  if (reviewSearchAbort) reviewSearchAbort.abort();
  reviewSearchAbort = new AbortController();

  state.reviews = await fetchReviews({
    search: state.reviewSearch,
    region: state.regionFilter,
  });
}

async function loadJobs() {
  if (jobSearchAbort) jobSearchAbort.abort();
  jobSearchAbort = new AbortController();

  state.jobs = await fetchJobs({ search: state.jobSearch });
}

async function loadJobSeekers() {
  if (seekerSearchAbort) seekerSearchAbort.abort();
  seekerSearchAbort = new AbortController();

  state.jobSeekers = await fetchJobSeekers({ search: state.seekerSearch });
}

async function refreshAll() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = withLoading(async () => {
    await Promise.all([loadReviews(), loadJobs(), loadJobSeekers()]);
    renderAll();
  }).catch((err) => {
    showToast(err.message || '데이터를 불러오지 못했습니다.', 'error');
  }).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
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
    showToast('로그인이 필요합니다.', 'warning');
    openAuthModal('login');
  })) return;

  const fd = new FormData(DOM.reviewForm);
  const valid = validateRequired(DOM.reviewForm, ['cafeName', 'region', 'workPeriod', 'position']);
  const formData = getReviewFormData(fd);

  if (!formData.rating || formData.rating < 1) {
    DOM.ratingHint.textContent = '별점을 선택해주세요';
    DOM.ratingHint.classList.add('error');
    showToast('별점을 선택해주세요.', 'warning');
    return;
  }
  if (!valid) { showToast('필수 항목을 모두 입력해주세요.', 'warning'); return; }

  try {
    await withLoading(async () => {
      if (state.editingReviewId) {
        await updateReview(state.editingReviewId, formData);
        showToast('후기가 수정되었습니다.', 'success');
      } else {
        await createReview(authState.user.id, formData);
        showToast('후기가 등록되었습니다.', 'success');
      }
    });

    closeModal(DOM.writeModal);
    state.editingReviewId = null;
    await refreshAll();
    document.getElementById('reviews').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleNicknameCheck() {
  const input = document.getElementById('signup-nickname');
  const nickname = input?.value?.trim() || '';

  try {
    const result = await checkNicknameAvailable(nickname);
    setNicknameCheckHint(result.message, result.available ? 'success' : 'error');

    if (result.available) {
      nicknameCheckState.value = nickname;
      nicknameCheckState.verified = true;
    } else {
      nicknameCheckState.value = '';
      nicknameCheckState.verified = false;
    }
  } catch (err) {
    nicknameCheckState.verified = false;
    showToast(err.message, 'error');
  }
}

async function handleSignupSubmit(e) {
  e.preventDefault();
  const fd = new FormData(DOM.signupForm);
  const nickname = fd.get('nickname')?.trim();
  const email = fd.get('email')?.trim();
  const password = fd.get('password');

  if (!nickname || !email || !password) {
    showToast('모든 항목을 입력해주세요.', 'warning');
    return;
  }

  if (!nicknameCheckState.verified || nicknameCheckState.value !== nickname) {
    showToast('닉네임 중복 확인을 먼저 해주세요.', 'warning');
    await handleNicknameCheck();
    return;
  }

  try {
    const result = await withLoading(() => signUp(email, password, nickname));
    showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) {
      resetNicknameCheck();
      nicknameCheckState.value = '';
      nicknameCheckState.verified = false;
      closeModal(DOM.authModal);
      renderAuthNav();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const fd = new FormData(DOM.loginForm);
  const email = fd.get('email')?.trim();
  const password = fd.get('password');

  if (!email || !password) {
    showToast('이메일과 비밀번호를 입력해주세요.', 'warning');
    return;
  }

  try {
    const result = await withLoading(() => signIn(email, password));
    showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) {
      closeModal(DOM.authModal);
      renderAuthNav();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleHiringSubmit(e) {
  e.preventDefault();
  const fd = new FormData(DOM.hiringForm);
  const required = ['cafeName', 'region', 'position', 'hourlyWage', 'workHours', 'contact'];
  const valid = validateRequired(DOM.hiringForm, required);
  if (!valid) { showToast('필수 항목을 모두 입력해주세요.', 'warning'); return; }

  const formData = getJobFormData(fd);
  const loggedIn = isLoggedIn();
  const guestPassword = fd.get('guestPassword')?.trim();

  if (!loggedIn && !state.editingJobId) {
    if (!guestPassword || guestPassword.length < 4) {
      showToast('비밀번호는 4자 이상 입력해주세요.', 'warning');
      return;
    }
  }

  try {
    await withLoading(async () => {
      if (state.editingJobId) {
        const job = state.jobs.find((j) => j.id === state.editingJobId);
        if (!job) throw new Error('구인글을 찾을 수 없습니다.');

        if (job.userId) {
          await updateJob(state.editingJobId, formData, state.editingJobStatus);
        } else {
          const password = getGuestJobPassword(state.editingJobId);
          if (!password) {
            showToast('비밀번호 확인이 필요합니다.', 'warning');
            openGuestPasswordModal(state.editingJobId);
            return;
          }
          await updateGuestJob(state.editingJobId, password, formData, state.editingJobStatus);
        }
        showToast('구인글이 수정되었습니다.', 'success');
      } else {
        await createJob(formData, loggedIn ? authState.user.id : null, guestPassword);
        showToast('구인글이 등록되었습니다.', 'success');
      }
    });

    closeModal(DOM.hiringModal);
    state.editingJobId = null;
    await refreshAll();
    document.getElementById('jobs').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleSeekingSubmit(e) {
  e.preventDefault();

  if (!requireAuth(() => {
    showToast('로그인이 필요합니다.', 'warning');
    openAuthModal('login');
  })) return;

  const fd = new FormData(DOM.seekingForm);
  const valid = validateRequired(DOM.seekingForm, ['region', 'position', 'availability', 'contact']);
  if (!valid) { showToast('필수 항목을 모두 입력해주세요.', 'warning'); return; }

  const formData = getSeekerFormData(fd);

  try {
    await withLoading(async () => {
      if (state.editingSeekerId) {
        await updateJobSeeker(state.editingSeekerId, formData);
        showToast('구직글이 수정되었습니다.', 'success');
      } else {
        await createJobSeeker(authState.user.id, formData);
        showToast('구직글이 등록되었습니다.', 'success');
      }
    });

    closeModal(DOM.seekingModal);
    state.editingSeekerId = null;
    switchJobTab('seeking');
    await refreshAll();
    document.getElementById('jobs').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleGuestPasswordSubmit(e) {
  e.preventDefault();
  const jobId = state.pendingGuestJobId;
  if (!jobId) return;

  const password = new FormData(DOM.jobPasswordForm).get('password')?.trim();
  if (!password) {
    showToast('비밀번호를 입력해주세요.', 'warning');
    return;
  }

  try {
    const valid = await verifyGuestJobPassword(jobId, password);
    if (!valid) {
      showToast('비밀번호가 올바르지 않습니다.', 'error');
      return;
    }

    setGuestJobPassword(jobId, password);
    closeGuestPasswordModal();
    showToast('인증되었습니다.', 'success');
    openJobDetail(jobId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleWithdrawSubmit(e) {
  e.preventDefault();

  const password = new FormData(DOM.withdrawForm).get('password');
  if (!password) {
    showToast('비밀번호를 입력해주세요.', 'warning');
    return;
  }

  const confirmed = window.confirm(
    '정말 탈퇴하시겠습니까?\n\n프로필, 작성한 후기, 로그인 상태에서 작성한 구인·구직글이 모두 삭제되며 복구할 수 없습니다.'
  );
  if (!confirmed) return;

  try {
    const result = await withLoading(() => deleteAccount(password));
    showToast(result.message, result.success ? 'success' : 'error');

    if (result.success) {
      closeAllModals();
      renderAuthNav();
      await refreshAll();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function openMyPage() {
  if (!isLoggedIn()) {
    showToast('로그인이 필요합니다.', 'warning');
    return;
  }

  try {
    const [myReviews, myJobs, mySeekers] = await withLoading(() => Promise.all([
      fetchReviewsByUser(authState.user.id),
      fetchJobsByUser(authState.user.id),
      fetchJobSeekersByUser(authState.user.id),
    ]));
    await renderMyPage(myReviews, myJobs, mySeekers);
    openModal(DOM.mypageModal);
  } catch (err) {
    showToast(err.message, 'error');
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

function handleEditSeeker(id) {
  const seeker = state.jobSeekers.find((s) => s.id === id);
  if (!seeker || seeker.userId !== authState.user?.id) return;
  closeModal(DOM.seekerDetailModal);
  closeModal(DOM.mypageModal);
  openSeekingModalForEdit(seeker);
}

function handleGuestJobManage(id) {
  openGuestPasswordModal(id);
}

async function handleDeleteReview(id) {
  if (!confirmDelete('정말 삭제하시겠습니까?')) return;

  try {
    await withLoading(() => deleteReview(id));
    closeModal(DOM.detailModal);
    closeModal(DOM.mypageModal);
    showToast('삭제되었습니다.', 'success');
    await refreshAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleDeleteJob(id) {
  const job = state.jobs.find((j) => j.id === id);
  if (!job) return;

  if (!confirmDelete('정말 삭제하시겠습니까?')) return;

  try {
    await withLoading(async () => {
      if (job.userId) {
        await deleteJob(id);
      } else {
        const password = getGuestJobPassword(id);
        if (!password) {
          openGuestPasswordModal(id);
          throw new Error('삭제하려면 비밀번호 확인이 필요합니다.');
        }
        await deleteGuestJob(id, password);
        delete state.guestJobPasswords[id];
      }
    });

    closeModal(DOM.jobDetailModal);
    closeModal(DOM.mypageModal);
    showToast('삭제되었습니다.', 'success');
    await refreshAll();
  } catch (err) {
    showToast(err.message, err.message.includes('비밀번호') ? 'warning' : 'error');
  }
}

async function handleDeleteSeeker(id) {
  const seeker = state.jobSeekers.find((s) => s.id === id);
  if (!seeker || seeker.userId !== authState.user?.id) return;

  if (!confirmDelete('정말 삭제하시겠습니까?')) return;

  try {
    await withLoading(() => deleteJobSeeker(id));
    closeModal(DOM.seekerDetailModal);
    closeModal(DOM.mypageModal);
    showToast('삭제되었습니다.', 'success');
    await refreshAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleUpdateJobStatus(id, status) {
  const job = state.jobs.find((j) => j.id === id);
  if (!job || job.status === status) return;

  try {
    await withLoading(async () => {
      if (job.userId) {
        await updateJobStatus(id, status);
      } else {
        const password = getGuestJobPassword(id);
        if (!password) {
          openGuestPasswordModal(id);
          throw new Error('상태 변경하려면 비밀번호 확인이 필요합니다.');
        }
        await updateGuestJobStatus(id, password, status);
      }
    });

    state.editingJobStatus = status;
    showToast(status === 'closed' ? '모집완료로 변경되었습니다.' : '모집중으로 변경되었습니다.', 'success');
    await refreshAll();
    openJobDetail(id);
  } catch (err) {
    showToast(err.message, err.message.includes('비밀번호') ? 'warning' : 'error');
  }
}

function tryOpenWriteModal() {
  if (!requireAuth(() => {
    showToast('로그인이 필요합니다.', 'warning');
    openAuthModal('login');
  })) return;
  openWriteModal();
}

function tryOpenSeekingModal() {
  if (!requireAuth(() => {
    showToast('로그인이 필요합니다.', 'warning');
    openAuthModal('login');
  })) return;
  openSeekingModalCreate();
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
    showToast(result.message, result.success ? 'success' : 'error');
    renderAuthNav();
    closeMobileNav();
  });

  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      switchAuthTab(tab.dataset.authTab);
      nicknameCheckState.verified = false;
      nicknameCheckState.value = '';
    });
  });

  document.querySelectorAll('.tab-btn[data-job-tab]').forEach((tab) => {
    tab.addEventListener('click', () => switchJobTab(tab.dataset.jobTab));
  });

  document.getElementById('jobs-write-btn')?.addEventListener('click', openHiringModalCreate);
  document.getElementById('job-empty-btn')?.addEventListener('click', openHiringModalCreate);
  document.getElementById('seekers-write-btn')?.addEventListener('click', tryOpenSeekingModal);
  document.getElementById('seeker-empty-btn')?.addEventListener('click', tryOpenSeekingModal);

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
  document.getElementById('withdraw-close')?.addEventListener('click', () => closeModal(DOM.withdrawModal));
  document.getElementById('withdraw-cancel')?.addEventListener('click', () => closeModal(DOM.withdrawModal));
  document.getElementById('hiring-close')?.addEventListener('click', () => {
    state.editingJobId = null;
    closeModal(DOM.hiringModal);
  });
  document.getElementById('hiring-cancel')?.addEventListener('click', () => {
    state.editingJobId = null;
    closeModal(DOM.hiringModal);
  });
  document.getElementById('seeking-close')?.addEventListener('click', () => {
    state.editingSeekerId = null;
    closeModal(DOM.seekingModal);
  });
  document.getElementById('seeking-cancel')?.addEventListener('click', () => {
    state.editingSeekerId = null;
    closeModal(DOM.seekingModal);
  });
  document.getElementById('job-detail-close')?.addEventListener('click', () => closeModal(DOM.jobDetailModal));
  document.getElementById('seeker-detail-close')?.addEventListener('click', () => closeModal(DOM.seekerDetailModal));
  document.getElementById('job-password-close')?.addEventListener('click', closeGuestPasswordModal);
  document.getElementById('job-password-cancel')?.addEventListener('click', closeGuestPasswordModal);

  [DOM.writeModal, DOM.detailModal, DOM.authModal, DOM.mypageModal, DOM.hiringModal, DOM.jobDetailModal, DOM.jobPasswordModal, DOM.withdrawModal, DOM.seekingModal, DOM.seekerDetailModal]
    .forEach((modal) => {
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
          if (modal === DOM.hiringModal) state.editingJobId = null;
          if (modal === DOM.writeModal) state.editingReviewId = null;
          if (modal === DOM.seekingModal) state.editingSeekerId = null;
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

  document.getElementById('nickname-check-btn')?.addEventListener('click', handleNicknameCheck);
  document.getElementById('signup-nickname')?.addEventListener('input', () => {
    nicknameCheckState.verified = false;
    nicknameCheckState.value = '';
    resetNicknameCheck();
  });
  DOM.loginForm.addEventListener('submit', handleLoginSubmit);
  DOM.hiringForm.addEventListener('submit', handleHiringSubmit);
  DOM.seekingForm.addEventListener('submit', handleSeekingSubmit);
  DOM.jobPasswordForm.addEventListener('submit', handleGuestPasswordSubmit);
  DOM.withdrawForm.addEventListener('submit', handleWithdrawSubmit);

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
        showToast(err.message, 'error');
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
        showToast(err.message, 'error');
      }
    }, 300);
  });

  let seekerSearchTimer = null;
  DOM.seekersSearchInput?.addEventListener('input', (e) => {
    state.seekerSearch = e.target.value;
    syncSeekerSearchInputs(e.target.value, e.target);
    clearTimeout(seekerSearchTimer);
    seekerSearchTimer = setTimeout(async () => {
      try {
        await loadJobSeekers();
        renderAll();
        if (e.target.value.trim()) {
          switchJobTab('seeking');
          document.getElementById('jobs').scrollIntoView({ behavior: 'smooth' });
        }
      } catch (err) {
        showToast(err.message, 'error');
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
      showToast(err.message, 'error');
    }
  });
}

async function init() {
  setActionHandlers({
    onDeleteReview: handleDeleteReview,
    onDeleteJob: handleDeleteJob,
    onDeleteSeeker: handleDeleteSeeker,
    onUpdateJobStatus: handleUpdateJobStatus,
    onEditReview: handleEditReview,
    onEditJob: handleEditJob,
    onEditSeeker: handleEditSeeker,
    onGuestJobManage: handleGuestJobManage,
    onOpenWithdraw: openWithdrawModal,
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
