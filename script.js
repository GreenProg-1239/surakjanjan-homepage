document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initHeroSlider();
  initRoomGallery();
  initReservationLayout();
  initFacilitiesGallery();
  initModalGallery();
  initCafeSlider();
  initAdminPage();
});

function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => nav.classList.toggle('open'));
}

function initHeroSlider() {
  const slides = Array.from(document.querySelectorAll('.hero-slide'));
  if (!slides.length) return;
  let current = 0;
  slides[current].classList.add('active');
  setInterval(() => {
    slides[current].classList.remove('active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('active');
  }, 4500);
}

function initRoomGallery() {
  const shell = document.querySelector('[data-room-slider]');
  const main = document.querySelector('[data-gallery-main]');
  const caption = document.querySelector('[data-gallery-caption]');
  const counter = document.querySelector('[data-gallery-counter]');
  const prevBtn = document.querySelector('[data-gallery-prev]');
  const nextBtn = document.querySelector('[data-gallery-next]');
  const thumbs = Array.from(document.querySelectorAll('.thumb[data-images]'));
  if (!shell || !main || !thumbs.length) return;

  let currentGroupIndex = 0;
  let currentImageIndex = 0;

  const getImages = (thumb) => {
    try {
      const parsed = JSON.parse(thumb.dataset.images || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };

  const render = () => {
    const currentThumb = thumbs[currentGroupIndex];
    const images = getImages(currentThumb);
    if (!images.length) return;

    const safeIndex = ((currentImageIndex % images.length) + images.length) % images.length;
    currentImageIndex = safeIndex;

    thumbs.forEach((thumb, index) => thumb.classList.toggle('active', index === currentGroupIndex));
    main.src = images[safeIndex];
    main.alt = currentThumb.dataset.title || '객실 이미지';

    if (caption) {
      const title = currentThumb.dataset.title || '';
      caption.textContent = `${title} · 사진 ${safeIndex + 1}`;
    }

    if (counter) {
      counter.textContent = `${safeIndex + 1} / ${images.length}`;
    }
  };

  thumbs.forEach((thumb, index) => {
    thumb.addEventListener('click', () => {
      currentGroupIndex = index;
      currentImageIndex = 0;
      render();
    });
  });

  if (prevBtn) {
    prevBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      currentImageIndex -= 1;
      render();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      currentImageIndex += 1;
      render();
    });
  }

  main.addEventListener('click', () => {
    const currentThumb = thumbs[currentGroupIndex];
    const title = currentThumb.dataset.title || '객실 이미지';
    const desc = caption ? caption.textContent : '';
    openModal(main.src, title, desc);
  });

  render();
}

function initFacilitiesGallery() {
  const main = document.querySelector('[data-facility-main]');
  const caption = document.querySelector('[data-facility-caption]');
  const counter = document.querySelector('[data-facility-counter]');
  const prevBtn = document.querySelector('[data-facility-prev]');
  const nextBtn = document.querySelector('[data-facility-next]');

  if (!main || !prevBtn || !nextBtn) return;

  const facilityImages = [
        {"src":"assets/pension/view4.jpg","title":"수락계곡"},
        {"src":"assets/pension/view3.jpg","title":"전기차충전설비"},
        {"src":"assets/pension/view5.jpg","title":"애견동반가능"},
        {"src":"assets/pension/view2.jpg","title":"골프숏게임체험"},
        {"src":"assets/pension/view7.jpg","title":"탁구장"},
        {"src":"assets/pension/view8.jpg","title":"카약체험"},
        {"src":"assets/pension/view9.jpg","title":"패들보트 체험"},
        {"src":"assets/pension/view6.jpg","title":"대형노래방"},
        {"src":"assets/pension/view10.jpg","title":"노래방 내부사진"}
  ];

  let currentIndex = 0;

  function renderFacility() {
    const item = facilityImages[currentIndex];
    main.src = item.src;
    main.alt = item.title;

    if (caption) {
      caption.textContent = item.title;
    }

    if (counter) {
      counter.textContent = `${currentIndex + 1} / ${facilityImages.length}`;
    }
  }

  prevBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    currentIndex = (currentIndex - 1 + facilityImages.length) % facilityImages.length;
    renderFacility();
  });

  nextBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    currentIndex = (currentIndex + 1) % facilityImages.length;
    renderFacility();
  });

  main.addEventListener('click', () => {
    openModal(main.src, main.alt, caption ? caption.textContent : '');
  });

  renderFacility();
}

function initModalGallery() {
  document.querySelectorAll('[data-modal-image]').forEach(card => {
    card.addEventListener('click', () => {
      openModal(card.dataset.image, card.dataset.title, card.dataset.desc || '');
    });
  });

  const modal = document.querySelector('#imageModal');
  if (!modal) return;

  modal.addEventListener('click', (e) => {
    if (e.target.matches('.modal') || e.target.matches('.modal-close')) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function openModal(src, title, desc) {
  const modal = document.querySelector('#imageModal');
  if (!modal) return;
  modal.querySelector('img').src = src;
  modal.querySelector('img').alt = title;
  modal.querySelector('[data-modal-title]').textContent = title;
  modal.querySelector('[data-modal-desc]').textContent = desc;
  modal.classList.add('open');
}

function closeModal() {
  const modal = document.querySelector('#imageModal');
  if (!modal) return;
  modal.classList.remove('open');
}

// 성수기 로직
function isPeakSeason(date) {
  const month = date.getMonth() + 1; // 1~12
  return month >= 6 && month <= 8;
}

// 주말 로직
function isWeekend(date) {
  const day = date.getDay(); // 0=일, 1=월, ..., 5=금, 6=토
  return day === 5 || day === 6;
}

// 방가격 로직
function getBaseRoomPrice(room, date) {
  const peak = isPeakSeason(date);
  const weekend = isWeekend(date);

  if (peak && weekend) return room.peakWeekend;
  if (peak && !weekend) return room.peakWeekday;
  if (!peak && weekend) return room.offWeekend;
  return room.offWeekday;
}

// 계산 로직
function calculateFinalPrice(room, date, guestCount) {
  const basePrice = getBaseRoomPrice(room, date);
  const extraCount = Math.max(0, guestCount - 2);
  const extraPrice = extraCount * 10000;
  return basePrice + extraPrice;
}

function initReservationLayout() {
  const grid = document.querySelector('[data-calendar-grid]');
  const title = document.querySelector('[data-calendar-title]');
  const prev = document.querySelector('[data-calendar-prev]');
  const next = document.querySelector('[data-calendar-next]');
  const roomList = document.querySelector('[data-room-list]');
  const dateText = document.querySelector('[data-selected-date-text]');
  const panel = document.querySelector('[data-reservation-panel]');
  const summaryContent = panel?.querySelector('.summary-content');
  const summaryPlaceholder = panel?.querySelector('.summary-placeholder');
  const guestSelect = document.querySelector('[data-guest-select]');
  const openDetailBtn = document.querySelector('[data-open-reservation-detail]');
  const detailModal = document.querySelector('[data-reservation-detail-modal]');
  const closeDetailButtons = Array.from(document.querySelectorAll('[data-close-reservation-detail]'));
  const reservationForm = document.querySelector('[data-reservation-form]');
  const reservationFormMessage = document.querySelector('[data-reservation-form-message]');
  const apiStatusBadge = document.querySelector('[data-api-status]');
  if (!grid || !title || !roomList || !panel) return;

  const API_BASE = window.RESERVATION_API_BASE || '';
  const depositAccount = '농협 123-4567-8901-23';
  const contactPhone = '010-7400-1321';
  const roomImages = {
    DASIL: 'assets/dasil/dasil3.jpg',
    YESIL1: 'assets/yesil1/yesil1.png',
    YESIL2: 'assets/yesil2/yesil3.jpg',
    BYEOLSIL: 'assets/broom/broom1.jpg',
    UMSIL1: 'assets/umroom1/umroom1.jpg',
    UMSIL2: 'assets/umroom2/umroom1.jpg',
    WHOLE: 'assets/homemain1.jpg',
  };

  let currentMonth = new Date();
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  let selectedDate = null;
  let selectedRoom = null;
  let monthAvailability = new Map();
  let dailyRooms = [];
  let isSubmitting = false;

  const formatDate = (date) => `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  const formatDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const formatMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const formatMoney = (value) => `${Number(value || 0).toLocaleString('ko-KR')}원`;
  const getSelectedGuestCount = () => Number(guestSelect?.value || selectedRoom?.baseGuests || 2);
  const getSelectedTotal = () => {
    if (!selectedRoom) return 0;
    const guestCount = getSelectedGuestCount();
    const extraCount = Math.max(0, guestCount - selectedRoom.baseGuests);
    return selectedRoom.basePrice + (extraCount * selectedRoom.extraGuestFee);
  };

  function setApiStatus(text, isError = false) {
    if (!apiStatusBadge) return;
    apiStatusBadge.textContent = text;
    apiStatusBadge.classList.toggle('error-badge', isError);
  }

  function seasonLabel(room) {
    const season = room.season === 'peak' ? '성수기' : '비성수기';
    const dayKind = room.dayKind === 'weekend' ? '주말' : '평일';
    return `${season} / ${dayKind}`;
  }

  async function fetchJson(path) {
    const response = await fetch(`${API_BASE}${path}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'API 요청에 실패했습니다.');
    return data;
  }

  async function loadMonth() {
    setApiStatus('DB 조회 중');
    const monthKey = formatMonthKey(currentMonth);
    const data = await fetchJson(`/api/calendar?month=${monthKey}`);
    monthAvailability = new Map(
      data.days.map((day) => [String(day.date).slice(0, 10), day])
    );
    setApiStatus('DB 연결됨');
  }

  async function loadRoomsForSelectedDate() {
    if (!selectedDate) {
      dailyRooms = [];
      return;
    }
    const dateKey = formatDateKey(selectedDate);
    const data = await fetchJson(`/api/availability?date=${dateKey}`);
    dailyRooms = data.rooms.map((room) => ({
      ...room,
      image: roomImages[room.roomCode] || 'assets/room-main.svg',
    }));
  }

  function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    title.textContent = `${year}년 ${month + 1}월`;
    grid.innerHTML = '';

    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < startWeekday; i += 1) {
      const empty = document.createElement('button');
      empty.type = 'button';
      empty.className = 'calendar-day empty';
      empty.disabled = true;
      grid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const dateKey = formatDateKey(date);
      const dayInfo = monthAvailability.get(dateKey);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'calendar-day';
      const availableCount = Number(dayInfo?.availableCount || 0);

      btn.innerHTML = `<span class="day-number">${day}</span><span class="day-state">${dayInfo ? `${availableCount}개 가능` : '조회 대기'}</span>`;

      if (!dayInfo || availableCount <= 0) {
        btn.disabled = true;
        btn.classList.add('sold-out');
        btn.querySelector('.day-state').textContent = '예약중';
      }

      if (selectedDate && formatDateKey(selectedDate) === dateKey) {
        btn.classList.add('active');
      }

      btn.addEventListener('click', async () => {
        try {
          selectedDate = date;
          selectedRoom = null;
          renderCalendar();
          renderRoomList();
          renderSummary();
          await loadRoomsForSelectedDate();
          renderRoomList();
        } catch (error) {
          setApiStatus('DB 오류', true);
          roomList.innerHTML = `<div class="empty-state">${error.message}</div>`;
        }
      });
      grid.appendChild(btn);
    }
  }

  function renderRoomList() {
    if (!selectedDate) {
      roomList.innerHTML = '<div class="empty-state">달력에서 날짜를 선택하면 객실 카드가 이 영역에 표시됩니다.</div>';
      dateText.textContent = '날짜를 먼저 선택해 주세요.';
      return;
    }

    const availableRooms = dailyRooms.filter((room) => room.status === 'available');
    dateText.textContent = `${formatDate(selectedDate)} 기준 예약가능 ${availableRooms.length}개 / 전체 ${dailyRooms.length || 0}개`;

    if (!dailyRooms.length) {
      roomList.innerHTML = '<div class="empty-state">객실 정보를 불러오는 중이거나 아직 조회되지 않았습니다.</div>';
      return;
    }

    roomList.innerHTML = dailyRooms.map((room) => `
      <button type="button" class="reservation-room-card ${selectedRoom && selectedRoom.roomId === room.roomId ? 'active' : ''}" data-room-id="${room.roomId}" ${room.status !== 'available' ? 'disabled' : ''}>
        <img src="${room.image}" alt="${room.roomName}" />
        <div class="card-body">
          <strong>${room.roomName}</strong>
          <span>기본 ${room.baseGuests}명 / 최대 ${room.maxGuests}명</span>
          <span>${formatMoney(room.basePrice)}부터</span>
          <span class="room-status ${room.status === 'available' ? 'available' : 'reserved'}">${room.status === 'available' ? '예약가능' : '예약중'}</span>
        </div>
      </button>
    `).join('');

    roomList.querySelectorAll('[data-room-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const roomId = Number(btn.dataset.roomId);
        selectedRoom = dailyRooms.find((room) => room.roomId === roomId) || null;
        if (selectedRoom) populateGuestSelect(selectedRoom);
        renderRoomList();
        renderSummary();
      });
    });
  }

  function populateGuestSelect(room) {
    if (!guestSelect) return;
    guestSelect.innerHTML = '';
    for (let count = room.baseGuests; count <= room.maxGuests; count += 1) {
      const option = document.createElement('option');
      option.value = String(count);
      option.textContent = `${count}명`;
      guestSelect.appendChild(option);
    }
    guestSelect.value = String(room.baseGuests);
  }

  function renderSummary() {
    if (!summaryContent || !summaryPlaceholder) return;
    if (!selectedDate || !selectedRoom) {
      summaryContent.hidden = true;
      summaryPlaceholder.hidden = false;
      return;
    }

    summaryPlaceholder.hidden = true;
    summaryContent.hidden = false;

    panel.querySelector('[data-summary-image]').src = selectedRoom.image;
    panel.querySelector('[data-summary-image]').alt = selectedRoom.roomName;
    panel.querySelector('[data-summary-date]').textContent = formatDate(selectedDate);
    panel.querySelector('[data-summary-title]').textContent = selectedRoom.roomName;
    panel.querySelector('[data-summary-capacity]').textContent = `기본 ${selectedRoom.baseGuests}명 / 최대 ${selectedRoom.maxGuests}명`;
    const seasonEl = panel.querySelector('[data-summary-season]');
    if (seasonEl) {
      seasonEl.textContent = seasonLabel(selectedRoom);
    }
    panel.querySelector('[data-summary-base-price]').textContent = formatMoney(selectedRoom.basePrice);
    panel.querySelector('[data-summary-total-price]').textContent = formatMoney(getSelectedTotal());
  }

  function openReservationDetail() {
    if (!selectedDate || !selectedRoom || !detailModal) return;
    detailModal.querySelector('[data-detail-date]').textContent = formatDate(selectedDate);
    detailModal.querySelector('[data-detail-room]').textContent = selectedRoom.roomName;
    detailModal.querySelector('[data-detail-guests]').textContent = `${getSelectedGuestCount()}명`;
    detailModal.querySelector('[data-detail-total]').textContent = formatMoney(getSelectedTotal());
    detailModal.querySelector('[data-detail-account]').textContent = depositAccount;
    detailModal.querySelector('[data-detail-phone]').textContent = contactPhone;
    detailModal.hidden = false;
    document.body.classList.add('modal-open');
    reservationFormMessage.textContent = '예약 전 입금자명을 확인해주세요. 3시간 안에 입금확인이 되지 않으면 자동예약취소됩니다.';
  }

  function closeReservationDetail() {
    if (!detailModal) return;
    detailModal.hidden = true;
    document.body.classList.remove('modal-open');
  }

  async function refreshReservationUI() {
  await loadMonth();
  await loadRoomsForSelectedDate();
  renderCalendar();
  renderRoomList();
  renderSummary();
  }

  async function submitReservation(event) {
    event.preventDefault();
    if (!selectedDate || !selectedRoom || isSubmitting) return;

    const formData = new FormData(reservationForm);
    const payload = {
      roomId: selectedRoom.roomId,
      stayDate: formatDateKey(selectedDate),
      guestName: String(formData.get('guestName') || '').trim(),
      phoneNumber: String(formData.get('phoneNumber') || '').trim(),
      depositorName: String(formData.get('depositorName') || '').trim(),
      guestCount: getSelectedGuestCount(),
    };

    if (!payload.guestName || !payload.phoneNumber || !payload.depositorName) {
      reservationFormMessage.textContent = '이름, 전화번호, 입금자명은 모두 입력해야 합니다.';
      return;
    }

    isSubmitting = true;
    reservationFormMessage.textContent = '저장 중입니다...';

    try {
      const response = await fetch(`${API_BASE}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || '예약 저장에 실패했습니다.');

      reservationFormMessage.textContent = '예약중 상태로 저장되었습니다.';
      reservationForm.reset();
      closeReservationDetail();
      await loadMonth();
      await loadRoomsForSelectedDate();
      selectedRoom = null;

      await refreshReservationUI();
      renderCalendar();
      renderRoomList();
      renderSummary();
    } catch (error) {
      reservationFormMessage.textContent = error.message;
    } finally {
      isSubmitting = false;
    }
  }

  guestSelect?.addEventListener('change', renderSummary);
  openDetailBtn?.addEventListener('click', openReservationDetail);
  reservationForm?.addEventListener('submit', submitReservation);
  closeDetailButtons.forEach((button) => button.addEventListener('click', closeReservationDetail));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeReservationDetail();
  });

  prev?.addEventListener('click', async () => {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    selectedDate = null;
    selectedRoom = null;
    dailyRooms = [];
    try {
      await loadMonth();
      renderCalendar();
      renderRoomList();
      renderSummary();
    } catch (error) {
      setApiStatus('DB 오류', true);
    }
  });

  next?.addEventListener('click', async () => {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    selectedDate = null;
    selectedRoom = null;
    dailyRooms = [];
    try {
      await loadMonth();
      renderCalendar();
      renderRoomList();
      renderSummary();
    } catch (error) {
      setApiStatus('DB 오류', true);
    }
  });

  (async () => {
    try {
      await loadMonth();
      renderCalendar();
      renderRoomList();
      renderSummary();
    } catch (error) {
      setApiStatus('DB 오류', true);
      roomList.innerHTML = `<div class="empty-state">${error.message}</div>`;
    }
  })();
}


function initAdminPage() {
  const page = document.querySelector('[data-admin-page]');
  if (!page) return;

  const API_BASE = window.RESERVATION_API_BASE || 'http://localhost:3000';
  const loginModal = document.querySelector('[data-admin-login-modal]');
  const loginForm = document.querySelector('[data-admin-login-form]');
  const loginMessage = document.querySelector('[data-admin-login-message]');
  const statusBadge = document.querySelector('[data-admin-status]');
  const panels = Array.from(document.querySelectorAll('[data-admin-panel]'));
  const logoutBtn = document.querySelector('[data-admin-logout]');
  const dateInput = document.querySelector('[data-admin-date]');
  const statusFilter = document.querySelector('[data-admin-status-filter]');
  const searchBtn = document.querySelector('[data-admin-search]');
  const summary = document.querySelector('[data-admin-summary]');
  const tableBody = document.querySelector('[data-admin-table-body]');

  const TOKEN_KEY = 'adminAuthToken';

  const formatMoney = (value) => `${Number(value || 0).toLocaleString('ko-KR')}원`;
  const formatDateTime = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };
  const statusLabel = (status) => ({ pending: '예약중', confirmed: '예약확정', cancelled: '예약취소', expired: '만료' }[status] || status);

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  }

  function setLoggedInUI(loggedIn) {
    if (loginModal) loginModal.hidden = loggedIn;
    document.body.classList.toggle('modal-open', !loggedIn);
    panels.forEach((panel) => { panel.hidden = !loggedIn; });
    if (logoutBtn) logoutBtn.hidden = !loggedIn;
    if (statusBadge) statusBadge.textContent = loggedIn ? '로그인됨' : '로그인 필요';
  }

  async function apiFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || '요청에 실패했습니다.');
    return data;
  }

  function renderRows(rows) {
    if (!tableBody) return;
    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="11" class="admin-empty-cell">조건에 맞는 예약이 없습니다.</td></tr>';
      return;
    }

    tableBody.innerHTML = rows.map((item) => `
      <tr>
        <td>${item.reservationId}</td>
        <td>${item.stayDate}</td>
        <td>${item.roomName}</td>
        <td>${item.guestName}</td>
        <td>${item.phoneNumber}</td>
        <td>${item.depositorName}</td>
        <td>${item.guestCount}명</td>
        <td>${formatMoney(item.finalPrice)}</td>
        <td><span class="status-badge ${item.status}">${statusLabel(item.status)}</span></td>
        <td>${formatDateTime(item.createdAt)}</td>
        <td>
          <div class="admin-row-actions">
            <button type="button" class="btn admin-action-btn" data-admin-action="confirmed" data-reservation-id="${item.reservationId}" ${item.status === 'confirmed' || item.status === 'cancelled' ? 'disabled' : ''}>예약확정</button>
            <button type="button" class="btn admin-action-btn cancel" data-admin-action="cancelled" data-reservation-id="${item.reservationId}" ${item.status === 'cancelled' ? 'disabled' : ''}>예약취소</button>
          </div>
        </td>
      </tr>
    `).join('');

    tableBody.querySelectorAll('[data-admin-action]').forEach((button) => {
      button.addEventListener('click', async () => {
        const reservationId = button.getAttribute('data-reservation-id');
        const nextStatus = button.getAttribute('data-admin-action');
        const confirmText = nextStatus === 'confirmed' ? '이 예약을 예약확정으로 변경하시겠습니까?' : '이 예약을 예약취소로 변경하시겠습니까?';
        if (!window.confirm(confirmText)) return;
        try {
          await apiFetch(`/api/admin/reservations/${reservationId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus }),
          });
          await loadReservations();
        } catch (error) {
          window.alert(error.message);
        }
      });
    });
  }

  async function loadReservations() {
    const params = new URLSearchParams();
    if (dateInput?.value) params.set('date', dateInput.value);
    if (statusFilter?.value) params.set('status', statusFilter.value);
    if (statusBadge) statusBadge.textContent = '조회 중';
    try {
      const data = await apiFetch(`/api/admin/reservations?${params.toString()}`);
      renderRows(data.reservations || []);
      if (summary) summary.textContent = `조회 결과 ${data.reservations.length}건`;
      if (statusBadge) statusBadge.textContent = '로그인됨';
    } catch (error) {
      if (summary) summary.textContent = error.message;
      if (statusBadge) statusBadge.textContent = '오류';
      renderRows([]);
    }
  }

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const adminId = String(formData.get('adminId') || '').trim();
    const password = String(formData.get('password') || '').trim();
    if (loginMessage) loginMessage.textContent = '로그인 확인 중입니다...';
    try {
      const data = await apiFetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, password }),
      });
      sessionStorage.setItem(TOKEN_KEY, data.token);
      setLoggedInUI(true)
      if (loginMessage) loginMessage.textContent = '';
      await loadReservations();
    } catch (error) {
      if (loginMessage) loginMessage.textContent = error.message;
      setLoggedInUI(false);
    }
  });

  logoutBtn?.addEventListener('click', () => {
    sessionStorage.removeItem(TOKEN_KEY);
    loginForm?.reset();
    if (loginMessage) loginMessage.textContent = '';
    setLoggedInUI(false);
  });

  searchBtn?.addEventListener('click', loadReservations);
  statusFilter?.addEventListener('change', loadReservations);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  if (dateInput && !dateInput.value) dateInput.value = `${yyyy}-${mm}-${dd}`;

  const hasToken = Boolean(getToken());
  setLoggedInUI(hasToken);
  if (hasToken) {
    loadReservations();
  }
}

function initCafeSlider() {
  const main = document.querySelector('[data-cafe-main]');
  const prevBtn = document.querySelector('[data-cafe-prev]');
  const nextBtn = document.querySelector('[data-cafe-next]');
  const counter = document.querySelector('[data-cafe-counter]');
  const eyebrow = document.querySelector('[data-cafe-eyebrow]');
  const title = document.querySelector('[data-cafe-title]');
  const desc = document.querySelector('[data-cafe-desc]');

  if (!main || !prevBtn || !nextBtn) return;

  const cafeSlides = [
    {
      src: 'assets/cafe/cafemain.jpg',
      eyebrow: 'surakzanjan cafe',
      title: '수락잔잔 카페',
      desc: '펜션 내 카페 공간에서 핸드드립 커피와 간단한 디저트를 즐길 수 있습니다. 풍경을 보며 쉬어갈 수 있는 조용한 휴식 공간을 지향합니다.'
    },
    {
      src: 'assets/cafe/cafe2.jpg',
      eyebrow: 'healing space',
      title: '자연 속 휴식 공간',
      desc: '카페 창밖으로 보이는 자연 풍경과 함께, 조용히 머무를 수 있는 따뜻한 공간으로 구성했습니다.'
    },
    {
      src: 'assets/cafe/cafe3.jpg',
      eyebrow: 'signature menu',
      title: '커피와 디저트',
      desc: '계절에 따라 메뉴를 조정하며, 시그니처 음료와 디저트를 통해 편안한 분위기를 전달합니다.'
    }
  ];

  let currentIndex = 0;

  function renderCafeSlide() {
    const item = cafeSlides[currentIndex];
    main.src = item.src;
    main.alt = item.title;

    if (counter) {
      counter.textContent = `${currentIndex + 1} / ${cafeSlides.length}`;
    }

    if (eyebrow) eyebrow.textContent = item.eyebrow;
    if (title) title.textContent = item.title;
    if (desc) desc.textContent = item.desc;
  }

  prevBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    currentIndex = (currentIndex - 1 + cafeSlides.length) % cafeSlides.length;
    renderCafeSlide();
  });

  nextBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    currentIndex = (currentIndex + 1) % cafeSlides.length;
    renderCafeSlide();
  });

  main.addEventListener('click', () => {
    openModal(main.src, title ? title.textContent : '카페 이미지', desc ? desc.textContent : '');
  });

  renderCafeSlide();
}
