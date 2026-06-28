/**
 * 공통 유틸리티
 */

export function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

export function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function highlightText(text, query) {
  if (!query?.trim()) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const regex = new RegExp(`(${escapeRegex(query.trim())})`, 'gi');
  return escaped.replace(regex, '<span class="search-highlight">$1</span>');
}

export function renderStars(rating) {
  const full = Math.round(Number(rating)) || 0;
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

export function formatDate(isoString) {
  if (!isoString) return '';
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

export function getReviewSummary(review) {
  const source = review.pros || review.atmosphere || review.cons || '';
  const trimmed = source.trim();
  return trimmed.length <= 60 ? trimmed : `${trimmed.slice(0, 60)}…`;
}

export function matchesFields(item, fields, query) {
  if (!query?.trim()) return true;
  const q = query.trim().toLowerCase();
  return fields.some((field) => (item[field] || '').toLowerCase().includes(q));
}

/** DB snake_case → 앱 camelCase (후기) */
export function mapReviewFromDb(row) {
  return {
    id: row.id,
    userId: row.user_id,
    cafeName: row.cafe_name,
    region: row.region,
    position: row.position,
    hourlyWage: row.wage || '',
    workPeriod: row.period,
    atmosphere: row.atmosphere || '',
    pros: row.pros || '',
    cons: row.cons || '',
    rating: row.rating,
    createdAt: row.created_at,
  };
}

/** DB snake_case → 앱 camelCase (구인) */
export function mapJobFromDb(row) {
  return {
    id: row.id,
    userId: row.user_id || null,
    cafeName: row.cafe_name,
    region: row.region,
    position: row.position,
    hourlyWage: row.wage,
    workHours: row.work_time,
    contact: row.contact,
    description: row.description || '',
    status: row.status || 'open',
    createdAt: row.created_at,
  };
}

/** 구인글 모집 상태 라벨 */
export function getJobStatusLabel(status) {
  return status === 'closed' ? '모집완료' : '모집중';
}

/** 구인글 모집 상태 CSS 클래스 */
export function getJobStatusBadgeClass(status) {
  return status === 'closed' ? 'job-badge-closed' : 'job-badge-open';
}

/** 삭제 확인 대화상자 */
export function confirmDelete(message = '정말 삭제하시겠습니까?') {
  return window.confirm(message);
}
