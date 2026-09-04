// ========== نظام المصادقة والتخزين ==========
const AUTH_KEY = 'sabbora-auth';
const STORAGE_KEY = 'sabbora-dashboard-data';

// بيانات تجريبية لحساب الأدمن فقط (المعلمون يسجلون دخول ببريدهم وكلمة مرورهم الحقيقية من صفحة "المعلمين")
const DEMO_USERS = {
  'admin': { password: 'password123', role: 'admin', name: 'مسؤول النظام' }
};

let currentUser = null;
let data = loadData();

// ========== دالة التخزين والتحميل ==========
function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.exams) parsed.exams = [];
      return parsed;
    } catch (e) { }
  }
  return {
    students: [],
    teachers: [],
    classes: [],
    holidays: [],
    expenses: [],
    attendance: {},
    payments: {},
    registrations: [],
    notifications: [],
    exams: []
  };
}

// لو الأدمن غيّر كلمة المرور قبل كده، استخدم النسخة المحفوظة بدل الافتراضية
if (data.adminPassword) {
  DEMO_USERS['admin'].password = data.adminPassword;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ========== نظام تسجيل الدخول ==========
const loginForm = document.getElementById('login-form');
const loginPage = document.getElementById('login-page');
const dashboardWrapper = document.getElementById('dashboard-wrapper');

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const role = document.getElementById('login-role').value;

  if (role === 'admin') {
    // حساب الأدمن التجريبي الثابت
    if (DEMO_USERS[email] && DEMO_USERS[email].password === password && DEMO_USERS[email].role === 'admin') {
      currentUser = {
        email,
        ...DEMO_USERS[email],
        loginTime: new Date().toLocaleString('ar-EG')
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
      loginPage.hidden = true;
      dashboardWrapper.hidden = false;
      initializeDashboard();
      showToast('مرحباً يا ' + currentUser.name);
      return;
    }
  } else if (role === 'teacher') {
    // التحقق من بيانات المعلم الحقيقية المسجّلة في صفحة "المعلمين"
    const teacher = data.teachers.find(t => t.email === email && t.password === password);
    if (teacher) {
      currentUser = {
        email,
        role: 'teacher',
        name: teacher.name,
        teacherId: teacher.id,
        loginTime: new Date().toLocaleString('ar-EG')
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
      loginPage.hidden = true;
      dashboardWrapper.hidden = false;
      initializeDashboard();
      showToast('مرحباً يا ' + currentUser.name);
      return;
    }
  }

  showToast('❌ بيانات الدخول غير صحيحة');
});

// ========== إظهار/إخفاء كلمة المرور ==========
const passwordToggleBtn = document.getElementById('password-toggle-btn');
const passwordInput = document.getElementById('login-password');

passwordToggleBtn.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  passwordToggleBtn.classList.toggle('is-active', isHidden);
  passwordToggleBtn.setAttribute('aria-label', isHidden ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
});

// ========== تسجيل الخروج ==========
document.getElementById('logout-btn').addEventListener('click', () => {
  showConfirmModal('هل أنت متأكد من رغبتك في تسجيل الخروج؟', () => {
    currentUser = null;
    localStorage.removeItem(AUTH_KEY);
    loginPage.hidden = false;
    dashboardWrapper.hidden = true;
    document.getElementById('login-form').reset();
    showToast('تم تسجيل الخروج بنجاح');
  }, { title: 'تسجيل الخروج', confirmLabel: 'تسجيل الخروج' });
});

// ========== تحديث واجهة المستخدم بناءً على الدور ==========
function initializeDashboard() {
  updateUserInfo();
  updateNavigationByRole();
  renderAll();
}

function updateUserInfo() {
  document.getElementById('user-name').textContent = currentUser.name;
  document.getElementById('user-role').textContent = currentUser.role === 'admin' ? 'مسؤول' : 'معلم';
}

function updateNavigationByRole() {
  const adminOnlyItems = document.querySelectorAll('.admin-only');
  adminOnlyItems.forEach(item => {
    item.style.display = currentUser.role === 'admin' ? '' : 'none';
  });
}

// ========== التنقل بين الصفحات ==========
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const pageTitle = document.getElementById('page-title');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const sidebarToggle = document.getElementById('sidebar-toggle');

const pageTitles = {
  dashboard: 'الرئيسية',
  students: 'الطلاب',
  teachers: 'المعلمين',
  classes: 'الحصص',
  attendance: 'الحضور والغياب',
  exams: 'الاختبارات والتقييمات',
  'exam-scores': 'رصد الدرجات',
  holidays: 'الإجازات',
  fees: 'الشهريات',
  expenses: 'مصروفات السنتر',
  registrations: 'استمارات طلاب جدد',
  'student-profile': 'ملف الطالب',
  backup: 'النسخ الاحتياطية',
  settings: 'الإعدادات'
};

function goToPage(name) {
  navItems.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.page === name));
  pages.forEach((section) => section.classList.toggle('is-active', section.dataset.page === name));
  pageTitle.textContent = pageTitles[name] || '';
  closeSidebar();
  renderAll();
}

navItems.forEach((btn) => {
  btn.addEventListener('click', () => {
    if (!btn.hidden && btn.style.display !== 'none') {
      goToPage(btn.dataset.page);
    }
  });
});

document.querySelectorAll('[data-goto]').forEach((el) => {
  el.addEventListener('click', () => goToPage(el.dataset.goto));
});

function closeSidebar() {
  sidebar.classList.remove('is-open');
  sidebarOverlay.classList.remove('is-open');
}

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('is-open');
  sidebarOverlay.classList.toggle('is-open');
});

sidebarOverlay.addEventListener('click', closeSidebar);

// ========== البحث العام ==========
const globalSearchInput = document.getElementById('global-search-input');
const globalSearchResults = document.getElementById('global-search-results');

function highlightTeacherRow(teacherId) {
  goToPage('teachers');
  setTimeout(() => {
    const row = document.querySelector(`[data-teacher-row="${teacherId}"]`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.classList.add('table-row-highlight');
      setTimeout(() => row.classList.remove('table-row-highlight'), 2000);
    }
  }, 50);
}

function renderGlobalSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    globalSearchResults.hidden = true;
    globalSearchResults.innerHTML = '';
    return;
  }

  const isAdmin = currentUser.role === 'admin';
  let matchedStudents = data.students.filter(s => s.name.toLowerCase().includes(q));
  let matchedTeachers = isAdmin ? data.teachers.filter(t => t.name.toLowerCase().includes(q)) : [];

  if (!isAdmin) {
    const teacherClasses = data.classes.filter(c => c.teacherId === currentUser.teacherId);
    matchedStudents = matchedStudents.filter(s => teacherClasses.some(c => c.id === s.classId));
  }

  matchedStudents = matchedStudents.slice(0, 6);
  matchedTeachers = matchedTeachers.slice(0, 6);

  if (matchedStudents.length === 0 && matchedTeachers.length === 0) {
    globalSearchResults.innerHTML = `<div class="search-result-empty">مفيش نتائج مطابقة</div>`;
    globalSearchResults.hidden = false;
    return;
  }

  let html = '';

  if (matchedStudents.length > 0) {
    html += `<div class="search-result-group-label">الطلاب</div>`;
    html += matchedStudents.map(s => {
      const cls = classById(s.classId);
      return `
        <div class="search-result-item" onclick="selectSearchResult('student', '${s.id}')">
          <span class="search-result-name">${s.name}</span>
          <span class="search-result-meta">${cls?.name || 'بدون مجموعة'}</span>
        </div>
      `;
    }).join('');
  }

  if (matchedTeachers.length > 0) {
    html += `<div class="search-result-group-label">المعلمين</div>`;
    html += matchedTeachers.map(t => `
      <div class="search-result-item" onclick="selectSearchResult('teacher', '${t.id}')">
        <span class="search-result-name">${t.name}</span>
        <span class="search-result-meta">${t.subject || ''}</span>
      </div>
    `).join('');
  }

  globalSearchResults.innerHTML = html;
  globalSearchResults.hidden = false;
}

function selectSearchResult(type, id) {
  globalSearchInput.value = '';
  globalSearchResults.hidden = true;
  globalSearchResults.innerHTML = '';

  if (type === 'student') {
    viewStudentProfile(id);
  } else if (type === 'teacher') {
    highlightTeacherRow(id);
  }
}

globalSearchInput.addEventListener('input', (e) => renderGlobalSearch(e.target.value));

globalSearchInput.addEventListener('focus', (e) => {
  if (e.target.value.trim()) renderGlobalSearch(e.target.value);
});

document.addEventListener('click', (e) => {
  if (!document.getElementById('global-search-wrap').contains(e.target)) {
    globalSearchResults.hidden = true;
  }
});

// ========== تبديل الوضع الداكن/الفاتح ==========
const THEME_KEY = 'sabbora-theme';
const themeBtnDark = document.getElementById('theme-btn-dark');
const themeBtnLight = document.getElementById('theme-btn-light');

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    themeBtnLight.classList.add('is-active');
    themeBtnDark.classList.remove('is-active');
  } else {
    document.documentElement.removeAttribute('data-theme');
    themeBtnDark.classList.add('is-active');
    themeBtnLight.classList.remove('is-active');
  }
}

const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
applyTheme(savedTheme);

themeBtnDark.addEventListener('click', () => {
  applyTheme('dark');
  localStorage.setItem(THEME_KEY, 'dark');
});

themeBtnLight.addEventListener('click', () => {
  applyTheme('light');
  localStorage.setItem(THEME_KEY, 'light');
});

// ========== التاريخ والوقت ==========
const topbarDate = document.getElementById('topbar-date');
const todayISO = new Date().toISOString().slice(0, 10);
const gregorianDate = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const hijriDate = new Date().toLocaleDateString('ar-EG-u-ca-islamic-umalqura', { year: 'numeric', month: 'long', day: 'numeric' });
topbarDate.innerHTML = `${gregorianDate}<span class="topbar-date-sep">|</span>${hijriDate} هـ`;

// ========== أدوات مساعدة ==========
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.hidden = true; }, 2200);
}

// ---------- مودال التأكيد العام (بديل confirm الافتراضي) ----------
const confirmModalOverlay = document.getElementById('confirm-modal-overlay');
const confirmModalMessage = document.getElementById('confirm-modal-message');
const confirmModalTitle = document.getElementById('confirm-modal-title');
const confirmModalConfirmBtn = document.getElementById('confirm-modal-confirm');
const confirmModalCancelBtn = document.getElementById('confirm-modal-cancel');
let confirmModalCallback = null;

function showConfirmModal(message, onConfirm, options = {}) {
  confirmModalTitle.textContent = options.title || 'تأكيد العملية';
  confirmModalMessage.textContent = message;
  confirmModalConfirmBtn.textContent = options.confirmLabel || 'تأكيد';
  confirmModalCallback = onConfirm;
  confirmModalOverlay.hidden = false;
}

function closeConfirmModal() {
  confirmModalOverlay.hidden = true;
  confirmModalCallback = null;
}

confirmModalConfirmBtn.addEventListener('click', () => {
  const callback = confirmModalCallback;
  closeConfirmModal();
  if (callback) callback();
});

confirmModalCancelBtn.addEventListener('click', closeConfirmModal);

confirmModalOverlay.addEventListener('click', (e) => {
  if (e.target === confirmModalOverlay) closeConfirmModal();
});

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function classById(id) { return data.classes.find((c) => c.id === id); }
function teacherById(id) { return data.teachers.find((t) => t.id === id); }
function studentById(id) { return data.students.find((s) => s.id === id); }

function fillSelect(select, items, placeholder) {
  const current = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>` +
    items.map((item) => `<option value="${item.id}">${item.label}</option>`).join('');
  if (items.some((i) => i.id === current)) select.value = current;
}

// ========== إبلاغ ولي الأمر (اتصال مباشر) ==========
function callGuardian(phone, studentName) {
  if (!phone) {
    showToast('❌ لا يوجد رقم ولي أمر مسجّل');
    return;
  }
  window.location.href = `tel:${phone}`;
}

// ========== إبلاغ ولي الأمر (واتساب) ==========
function whatsAppGuardian(phone, studentName) {
  if (!phone) {
    showToast('❌ لا يوجد رقم ولي أمر مسجّل');
    return;
  }

  let digits = phone.replace(/[^\d]/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) digits = '20' + digits.slice(1);

  const message = `السلام عليكم، بخصوص الطالب/ة ${studentName} في السنتر.`;
  window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, '_blank');
}

// ========== الرئيسية (الداشبورد) ==========
function renderDashboard() {
  if (currentUser.role === 'admin') {
    renderAdminDashboard();
  } else if (currentUser.role === 'teacher') {
    renderTeacherDashboard();
  }
}

function renderAdminDashboard() {
  document.getElementById('admin-dashboard').hidden = false;
  document.getElementById('teacher-dashboard').hidden = true;

  document.getElementById('stat-students').textContent = data.students.length;
  document.getElementById('stat-teachers').textContent = data.teachers.length;
  document.getElementById('stat-classes').textContent = data.classes.length;

  const today = todayISO;
  const todayAttendance = Object.entries(data.attendance)
    .filter(([key]) => key.startsWith(today))
    .flatMap(([, records]) => Object.values(records).filter(v => v === 'present')).length;
  document.getElementById('stat-attendance-today').textContent = todayAttendance > 0 ? todayAttendance : '—';

  const todayClasses = data.classes.filter(c => c.days.includes(getDayName(today)));
  const todayList = document.getElementById('today-classes-list');
  todayList.innerHTML = todayClasses.length ? todayClasses.map(c => {
    const teacher = teacherById(c.teacherId);
    return `<li><strong>${c.name}</strong> — ${teacher?.name} ${c.time}</li>`;
  }).join('') : '<li class="empty-row">مفيش حصص مسجّلة النهارده</li>';

  const nextHoliday = data.holidays.sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  const holidayDiv = document.getElementById('next-holiday');
  if (nextHoliday) {
    holidayDiv.innerHTML = `<p><strong>${nextHoliday.title}</strong><br>${new Date(nextHoliday.date).toLocaleDateString('ar-EG')}</p>`;
  } else {
    holidayDiv.innerHTML = '<p class="empty-row">مفيش إجازات مسجّلة</p>';
  }

  updateRegBadge();

  const pendingList = document.getElementById('pending-regs-list');
  const pending = data.registrations.filter(r => !r.approved).slice(0, 5);
  pendingList.innerHTML = pending.length ? pending.map(r =>
    `<li><strong>${r.studentName}</strong> (ولي الأمر: ${r.guardianName})</li>`
  ).join('') : '<li class="empty-row">مفيش استمارات جديدة</li>';
}

function updateRegBadge() {
  const regBadge = document.getElementById('reg-badge');
  const pendingCount = data.registrations.filter(r => !r.approved).length;
  const wasHidden = regBadge.hidden;

  regBadge.textContent = pendingCount;
  regBadge.hidden = pendingCount === 0;

  if (!regBadge.hidden && wasHidden) {
    regBadge.classList.remove('nav-badge-pop');
    void regBadge.offsetWidth; // إعادة تشغيل الأنيميشن
    regBadge.classList.add('nav-badge-pop');
  }
}

function renderTeacherDashboard() {
  document.getElementById('admin-dashboard').hidden = true;
  document.getElementById('teacher-dashboard').hidden = false;

  const teacherId = currentUser.teacherId;
  const teacherClasses = data.classes.filter(c => c.teacherId === teacherId);
  const allStudents = data.students.filter(s => teacherClasses.some(c => c.id === s.classId));

  document.getElementById('teacher-welcome-name').textContent = currentUser.name;
  document.getElementById('teacher-classes-count').textContent = teacherClasses.length;
  document.getElementById('teacher-students-count').textContent = allStudents.length;

  const classList = document.getElementById('teacher-classes-list');
  classList.innerHTML = teacherClasses.length ? teacherClasses.map(c => {
    const studentCount = data.students.filter(s => s.classId === c.id).length;
    return `<li><strong>${c.name}</strong> — ${c.time} — ${studentCount} طالب</li>`;
  }).join('') : '<li class="empty-row">لا توجد حصص مسجلة</li>';
}

function getDayName(dateStr) {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return days[new Date(dateStr).getDay()];
}

// ========== الطلاب ==========
let selectedStudentIds = new Set();

const studentForm = document.getElementById('student-form');
studentForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (currentUser.role !== 'admin') return showToast('لا توجد صلاحيات');

  const form = new FormData(studentForm);
  const student = {
    id: uid(),
    name: form.get('name'),
    classId: form.get('classId'),
    guardianPhone: form.get('guardianPhone'),
    monthlyFee: parseFloat(form.get('monthlyFee')),
    enrollDate: new Date().toISOString()
  };

  data.students.push(student);
  saveData();
  studentForm.reset();
  renderStudents();
  showToast('✅ تم إضافة الطالب');
});

function renderStudents() {
  const tbody = document.getElementById('students-table-body');
  const empty = document.getElementById('students-empty');
  const query = document.getElementById('students-search').value.toLowerCase();

  const filtered = data.students.filter(s => s.name.toLowerCase().includes(query));

  // نحافظ فقط على تحديد الطلاب الموجودين فعليًا (بعد أي حذف)
  const existingIds = new Set(data.students.map(s => s.id));
  selectedStudentIds.forEach(id => { if (!existingIds.has(id)) selectedStudentIds.delete(id); });

  tbody.innerHTML = filtered.map(s => {
    const cls = classById(s.classId);
    return `
      <tr>
        <td><input type="checkbox" class="student-row-check" value="${s.id}" ${selectedStudentIds.has(s.id) ? 'checked' : ''}></td>
        <td><strong>${s.name}</strong></td>
        <td>${cls?.name || 'غير محدد'}</td>
        <td>${s.guardianPhone}</td>
        <td>
          <div class="fee-edit">
            <input type="number" min="0" step="0.5" value="${s.monthlyFee}" class="fee-input"
              onchange="updateStudentFee('${s.id}', this.value)">
            <span>ج</span>
          </div>
        </td>
        <td>
          <button class="icon-btn" onclick="viewStudentProfile('${s.id}')" title="عرض الملف">👁️</button>
          <button class="icon-btn icon-btn-edit" onclick="openEditStudentModal('${s.id}')" title="تعديل">✏️</button>
          <button class="icon-btn" onclick="deleteStudent('${s.id}')" title="حذف">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  empty.hidden = filtered.length > 0;

  tbody.querySelectorAll('.student-row-check').forEach(cb => {
    cb.addEventListener('change', (e) => {
      if (e.target.checked) selectedStudentIds.add(e.target.value);
      else selectedStudentIds.delete(e.target.value);
      updateStudentsBulkBar();
    });
  });

  const selectAllCb = document.getElementById('students-select-all');
  selectAllCb.checked = filtered.length > 0 && filtered.every(s => selectedStudentIds.has(s.id));
  updateStudentsBulkBar();

  fillSelect(
    document.getElementById('student-class-select'),
    data.classes.map(c => ({ id: c.id, label: c.name })),
    'اختر المجموعة'
  );
}

function updateStudentFee(id, value) {
  const student = studentById(id);
  if (!student) return;

  const fee = parseFloat(value);
  student.monthlyFee = isNaN(fee) || fee < 0 ? 0 : fee;
  saveData();
  renderFees();
  showToast('✅ تم تحديث الشهرية');
}

function deleteStudent(id) {
  showConfirmModal('هل أنت متأكد من حذف هذا الطالب؟', () => {
    data.students = data.students.filter(s => s.id !== id);
    selectedStudentIds.delete(id);
    saveData();
    renderStudents();
    showToast('✅ تم حذف الطالب');
  }, { title: 'حذف طالب' });
}

// ---------- التحديد الجماعي للطلاب ----------
const studentsBulkBar = document.getElementById('students-bulk-bar');
const studentsBulkCount = document.getElementById('students-bulk-count');
const studentsSelectAllCb = document.getElementById('students-select-all');

function updateStudentsBulkBar() {
  const count = selectedStudentIds.size;
  studentsBulkBar.hidden = count === 0;
  studentsBulkCount.textContent = `تم تحديد ${count} طالب`;

  if (count > 0) {
    fillSelect(
      document.getElementById('students-bulk-move-select'),
      data.classes.map(c => ({ id: c.id, label: c.name })),
      'نقل المحدد إلى مجموعة...'
    );
  }
}

studentsSelectAllCb.addEventListener('change', (e) => {
  const query = document.getElementById('students-search').value.toLowerCase();
  const filtered = data.students.filter(s => s.name.toLowerCase().includes(query));

  if (e.target.checked) {
    filtered.forEach(s => selectedStudentIds.add(s.id));
  } else {
    filtered.forEach(s => selectedStudentIds.delete(s.id));
  }
  renderStudents();
  updateStudentsBulkBar();
});

document.getElementById('students-bulk-clear-btn').addEventListener('click', () => {
  selectedStudentIds.clear();
  renderStudents();
  updateStudentsBulkBar();
});

document.getElementById('students-bulk-delete-btn').addEventListener('click', () => {
  if (selectedStudentIds.size === 0) return;
  const count = selectedStudentIds.size;

  showConfirmModal(`هل أنت متأكد من حذف ${count} طالب؟ لا يمكن التراجع عن هذه العملية.`, () => {
    data.students = data.students.filter(s => !selectedStudentIds.has(s.id));
    selectedStudentIds.clear();
    saveData();
    renderStudents();
    renderFees();
    showToast('✅ تم حذف الطلاب المحددين');
  }, { title: 'حذف جماعي', confirmLabel: 'حذف' });
});

document.getElementById('students-bulk-move-btn').addEventListener('click', () => {
  if (selectedStudentIds.size === 0) return;

  const targetClassId = document.getElementById('students-bulk-move-select').value;
  if (!targetClassId) return showToast('اختر المجموعة المطلوب النقل إليها أولاً');

  const count = selectedStudentIds.size;
  const targetClass = classById(targetClassId);

  showConfirmModal(`هل تريد نقل ${count} طالب إلى مجموعة "${targetClass?.name}"؟`, () => {
    data.students.forEach(s => {
      if (selectedStudentIds.has(s.id)) s.classId = targetClassId;
    });
    selectedStudentIds.clear();
    saveData();
    renderStudents();
    showToast('✅ تم نقل الطلاب المحددين');
  }, { title: 'نقل جماعي', confirmLabel: 'نقل' });
});

// ---------- تصدير الجداول إلى Excel ----------
function exportToExcel(rows, headers, sheetName, filename) {
  if (typeof XLSX === 'undefined') {
    showToast('❌ تعذّر تحميل مكتبة التصدير، تأكد من اتصالك بالإنترنت');
    return;
  }
  const sheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

document.getElementById('export-students-btn').addEventListener('click', () => {
  const rows = data.students.map(s => {
    const cls = classById(s.classId);
    return [s.name, cls?.name || 'غير محدد', s.guardianPhone, s.monthlyFee];
  });
  exportToExcel(
    rows,
    ['الاسم', 'المجموعة', 'رقم ولي الأمر', 'الشهرية'],
    'الطلاب',
    `طلاب_سبورة_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
  showToast('✅ تم تصدير جدول الطلاب');
});

document.getElementById('export-teachers-btn').addEventListener('click', () => {
  const rows = data.teachers.map(t => {
    const classCount = data.classes.filter(c => c.teacherId === t.id).length;
    return [t.name, t.subject, t.email, t.phone, classCount];
  });
  exportToExcel(
    rows,
    ['الاسم', 'المادة', 'البريد الإلكتروني', 'رقم الموبايل', 'عدد المجموعات'],
    'المعلمين',
    `معلمين_سبورة_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
  showToast('✅ تم تصدير جدول المعلمين');
});

document.getElementById('export-fees-btn').addEventListener('click', () => {
  const month = document.getElementById('fees-month-picker').value || new Date().toISOString().slice(0, 7);

  const rows = data.students.map(s => {
    const cls = classById(s.classId);
    const paymentKey = `${month}_${s.id}`;
    const payment = data.payments[paymentKey];
    const isPaid = typeof payment === 'object' ? !!payment.paid : !!payment;
    const method = typeof payment === 'object' ? (payment.method || 'cash') : 'cash';
    return [
      s.name,
      cls?.name || 'غير محدد',
      s.monthlyFee,
      isPaid ? 'مدفوع' : 'قيد الانتظار',
      isPaid ? (method === 'cash' ? 'كاش' : 'فودافون كاش') : '—'
    ];
  });

  exportToExcel(
    rows,
    ['الطالب', 'المجموعة', 'الشهرية', 'الحالة', 'طريقة الدفع'],
    'الشهريات',
    `شهريات_سبورة_${month}.xlsx`
  );
  showToast('✅ تم تصدير جدول الشهريات');
});

// ---------- تعديل بيانات طالب ----------
const editStudentModalOverlay = document.getElementById('edit-student-modal-overlay');
const editStudentForm = document.getElementById('edit-student-form');

function openEditStudentModal(id) {
  if (currentUser.role !== 'admin') return showToast('لا توجد صلاحيات');

  const student = studentById(id);
  if (!student) return;

  fillSelect(
    document.getElementById('edit-student-class-select'),
    data.classes.map(c => ({ id: c.id, label: c.name })),
    'اختر المجموعة'
  );

  editStudentForm.elements['id'].value = student.id;
  editStudentForm.elements['name'].value = student.name;
  editStudentForm.elements['classId'].value = student.classId;
  editStudentForm.elements['guardianPhone'].value = student.guardianPhone;
  editStudentForm.elements['monthlyFee'].value = student.monthlyFee;

  editStudentModalOverlay.hidden = false;
}

function closeEditStudentModal() {
  editStudentModalOverlay.hidden = true;
  editStudentForm.reset();
}

editStudentForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (currentUser.role !== 'admin') return showToast('لا توجد صلاحيات');

  const form = new FormData(editStudentForm);
  const student = studentById(form.get('id'));
  if (!student) return;

  student.name = form.get('name');
  student.classId = form.get('classId');
  student.guardianPhone = form.get('guardianPhone');
  const fee = parseFloat(form.get('monthlyFee'));
  student.monthlyFee = isNaN(fee) || fee < 0 ? 0 : fee;

  saveData();
  closeEditStudentModal();
  renderStudents();
  renderFees();
  showToast('✅ تم تحديث بيانات الطالب');
});

editStudentModalOverlay.addEventListener('click', (e) => {
  if (e.target === editStudentModalOverlay) closeEditStudentModal();
});

// ========== ملف الطالب الفردي ==========
function viewStudentProfile(studentId) {
  const student = studentById(studentId);
  if (!student) return;

  goToPage('student-profile');

  // معلومات الطالب
  const header = document.getElementById('student-profile-header');
  const cls = classById(student.classId);
  header.innerHTML = `
    <h2>${student.name}</h2>
    <p class="profile-subtitle">المجموعة: ${cls?.name || 'غير محدد'}</p>
  `;

  // معلومات شخصية
  const infoBlock = document.getElementById('student-info-block');
  infoBlock.innerHTML = `
    <div class="info-row">
      <span class="info-label">رقم ولي الأمر:</span>
      <span class="info-value">${student.guardianPhone}</span>
    </div>
    <div class="info-row">
      <span class="info-label">الشهرية:</span>
      <span class="info-value">${student.monthlyFee} جنيه</span>
    </div>
    <div class="info-row">
      <span class="info-label">تاريخ التسجيل:</span>
      <span class="info-value">${new Date(student.enrollDate).toLocaleDateString('ar-EG')}</span>
    </div>
    <button type="button" class="btn btn-outline btn-block" onclick="callGuardian('${student.guardianPhone}', '${student.name}')">📞 إبلاغ ولي الأمر</button>
  `;

  // إحصائيات الحضور
  const attendanceRecords = Object.entries(data.attendance)
    .filter(([key]) => key.includes(`_${student.classId}`))
    .flatMap(([, records]) => Object.entries(records).filter(([sid]) => sid === studentId).map(([, status]) => status));

  const totalAttendance = attendanceRecords.length;
  const presentCount = attendanceRecords.filter(s => s === 'present').length;
  const absentCount = attendanceRecords.filter(s => s === 'absent').length;
  const percentage = totalAttendance > 0 ? ((presentCount / totalAttendance) * 100).toFixed(1) : 0;

  const summaryDiv = document.getElementById('student-attendance-summary');
  summaryDiv.innerHTML = `
    <div class="summary-stat">
      <span class="summary-label">إجمالي الحصص:</span>
      <span class="summary-value">${totalAttendance}</span>
    </div>
    <div class="summary-stat">
      <span class="summary-label">الحاضر:</span>
      <span class="summary-value present">${presentCount}</span>
    </div>
    <div class="summary-stat">
      <span class="summary-label">الغياب:</span>
      <span class="summary-value absent">${absentCount}</span>
    </div>
    <div class="summary-stat">
      <span class="summary-label">نسبة الحضور:</span>
      <span class="summary-value">${percentage}%</span>
    </div>
  `;

  // سجل الحضور
  const attendanceTable = document.getElementById('student-attendance-table');
  const allRecords = [];
  Object.entries(data.attendance).forEach(([dateClassKey, records]) => {
    const [date, classId] = dateClassKey.split('_');
    if (classId === student.classId && records[studentId]) {
      allRecords.push({ date, className: classById(classId)?.name, status: records[studentId] });
    }
  });

  attendanceTable.innerHTML = allRecords.sort((a, b) => new Date(b.date) - new Date(a.date)).map(r => `
    <tr>
      <td>${new Date(r.date).toLocaleDateString('ar-EG')}</td>
      <td>${r.className}</td>
      <td><span class="attendance-badge ${r.status}">${r.status === 'present' ? '✓ حاضر' : '✗ غائب'}</span></td>
    </tr>
  `).join('');

  // الاختبارات والتقييمات
  const examsTable = document.getElementById('student-exams-table');
  const examsEmpty = document.getElementById('student-exams-empty');
  const studentExams = data.exams
    .filter(ex => ex.scores && ex.scores[studentId] !== undefined)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  examsTable.innerHTML = studentExams.map(ex => {
    const score = ex.scores[studentId];
    const pct = ((score / ex.maxScore) * 100).toFixed(0);
    return `
      <tr>
        <td>${ex.title}</td>
        <td>${new Date(ex.date).toLocaleDateString('ar-EG')}</td>
        <td>${score} / ${ex.maxScore}</td>
        <td>${pct}%</td>
      </tr>
    `;
  }).join('');

  examsEmpty.hidden = studentExams.length > 0;

  // زر العودة
  document.getElementById('back-to-students').onclick = () => goToPage('students');
}

// ========== المعلمين ==========
const teacherForm = document.getElementById('teacher-form');
teacherForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (currentUser.role !== 'admin') return showToast('لا توجد صلاحيات');

  const form = new FormData(teacherForm);
  const teacher = {
    id: uid(),
    name: form.get('name'),
    subject: form.get('subject'),
    phone: form.get('phone'),
    email: form.get('email'),
    password: form.get('password')
  };

  data.teachers.push(teacher);
  saveData();
  teacherForm.reset();
  renderTeachers();
  showToast('✅ تم إضافة المعلم');
});

function renderTeachers() {
  const tbody = document.getElementById('teachers-table-body');
  const empty = document.getElementById('teachers-empty');
  const query = document.getElementById('teachers-search').value.toLowerCase();

  const filtered = data.teachers.filter(t =>
    t.name.toLowerCase().includes(query) || t.subject.toLowerCase().includes(query)
  );

  tbody.innerHTML = filtered.map(t => {
    const classCount = data.classes.filter(c => c.teacherId === t.id).length;
    return `
      <tr data-teacher-row="${t.id}">
        <td><strong>${t.name}</strong></td>
        <td>${t.subject}</td>
        <td>${t.email}</td>
        <td>${t.phone}</td>
        <td>${classCount}</td>
        <td>
          <button class="icon-btn icon-btn-edit" onclick="openEditTeacherModal('${t.id}')" title="تعديل">✏️</button>
          <button class="icon-btn" onclick="deleteTeacher('${t.id}')" title="حذف">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  empty.hidden = filtered.length > 0;

  fillSelect(
    document.getElementById('class-teacher-select'),
    data.teachers.map(t => ({ id: t.id, label: t.name })),
    'اختر المعلم'
  );
}

function deleteTeacher(id) {
  showConfirmModal('حذف المعلم سيؤثر على حصصه. هل أنت متأكد؟', () => {
    data.teachers = data.teachers.filter(t => t.id !== id);
    data.classes = data.classes.filter(c => c.teacherId !== id);
    saveData();
    renderTeachers();
    renderClasses();
    showToast('✅ تم الحذف');
  }, { title: 'حذف معلم' });
}

// ---------- تعديل بيانات معلم ----------
const editTeacherModalOverlay = document.getElementById('edit-teacher-modal-overlay');
const editTeacherForm = document.getElementById('edit-teacher-form');

function openEditTeacherModal(id) {
  if (currentUser.role !== 'admin') return showToast('لا توجد صلاحيات');

  const teacher = teacherById(id);
  if (!teacher) return;

  editTeacherForm.elements['id'].value = teacher.id;
  editTeacherForm.elements['name'].value = teacher.name;
  editTeacherForm.elements['subject'].value = teacher.subject;
  editTeacherForm.elements['phone'].value = teacher.phone;
  editTeacherForm.elements['email'].value = teacher.email;
  editTeacherForm.elements['password'].value = '';

  editTeacherModalOverlay.hidden = false;
}

function closeEditTeacherModal() {
  editTeacherModalOverlay.hidden = true;
  editTeacherForm.reset();
}

editTeacherForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (currentUser.role !== 'admin') return showToast('لا توجد صلاحيات');

  const form = new FormData(editTeacherForm);
  const teacher = teacherById(form.get('id'));
  if (!teacher) return;

  teacher.name = form.get('name');
  teacher.subject = form.get('subject');
  teacher.phone = form.get('phone');
  teacher.email = form.get('email');
  const newPassword = form.get('password');
  if (newPassword) teacher.password = newPassword;

  saveData();
  closeEditTeacherModal();
  renderTeachers();
  showToast('✅ تم تحديث بيانات المعلم');
});

editTeacherModalOverlay.addEventListener('click', (e) => {
  if (e.target === editTeacherModalOverlay) closeEditTeacherModal();
});

// ========== الحصص ==========
const classForm = document.getElementById('class-form');
classForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (currentUser.role !== 'admin') return showToast('لا توجد صلاحيات');

  const days = Array.from(classForm.querySelectorAll('[name="days"]:checked')).map(cb => cb.value);
  const cls = {
    id: uid(),
    name: classForm.name.value,
    teacherId: classForm.teacherId.value,
    time: classForm.time.value,
    days
  };

  data.classes.push(cls);
  saveData();
  classForm.reset();
  renderClasses();
  showToast('✅ تم إضافة المجموعة');
});

function renderClasses() {
  const tbody = document.getElementById('classes-table-body');
  const empty = document.getElementById('classes-empty');

  tbody.innerHTML = data.classes.map(c => {
    const teacher = teacherById(c.teacherId);
    const studentCount = data.students.filter(s => s.classId === c.id).length;
    return `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td>${teacher?.name || 'غير محدد'}</td>
        <td>${c.days.join(', ')}</td>
        <td>${c.time}</td>
        <td>${studentCount}</td>
        <td>
          <button class="icon-btn icon-btn-edit" onclick="openEditClassModal('${c.id}')" title="تعديل">✏️</button>
          <button class="icon-btn" onclick="deleteClass('${c.id}')" title="حذف">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  empty.hidden = data.classes.length > 0;

  fillSelect(
    document.getElementById('attendance-class-select'),
    data.classes.map(c => ({ id: c.id, label: c.name })),
    'اختر المجموعة'
  );
}

function deleteClass(id) {
  showConfirmModal('حذف المجموعة سيؤثر على سجلات الحضور. هل أنت متأكد؟', () => {
    data.classes = data.classes.filter(c => c.id !== id);
    saveData();
    renderClasses();
    renderStudents();
    showToast('✅ تم الحذف');
  }, { title: 'حذف مجموعة' });
}

// ---------- تعديل بيانات مجموعة/حصة ----------
const editClassModalOverlay = document.getElementById('edit-class-modal-overlay');
const editClassForm = document.getElementById('edit-class-form');

function openEditClassModal(id) {
  if (currentUser.role !== 'admin') return showToast('لا توجد صلاحيات');

  const cls = classById(id);
  if (!cls) return;

  fillSelect(
    document.getElementById('edit-class-teacher-select'),
    data.teachers.map(t => ({ id: t.id, label: t.name })),
    'اختر المعلم'
  );

  editClassForm.elements['id'].value = cls.id;
  editClassForm.elements['name'].value = cls.name;
  editClassForm.elements['teacherId'].value = cls.teacherId;
  editClassForm.elements['time'].value = cls.time;

  editClassForm.querySelectorAll('[name="days"]').forEach(cb => {
    cb.checked = cls.days.includes(cb.value);
  });

  editClassModalOverlay.hidden = false;
}

function closeEditClassModal() {
  editClassModalOverlay.hidden = true;
  editClassForm.reset();
}

editClassForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (currentUser.role !== 'admin') return showToast('لا توجد صلاحيات');

  const cls = classById(editClassForm.elements['id'].value);
  if (!cls) return;

  cls.name = editClassForm.elements['name'].value;
  cls.teacherId = editClassForm.elements['teacherId'].value;
  cls.time = editClassForm.elements['time'].value;
  cls.days = Array.from(editClassForm.querySelectorAll('[name="days"]:checked')).map(cb => cb.value);

  saveData();
  closeEditClassModal();
  renderClasses();
  showToast('✅ تم تحديث بيانات المجموعة');
});

editClassModalOverlay.addEventListener('click', (e) => {
  if (e.target === editClassModalOverlay) closeEditClassModal();
});

// ========== الحضور والغياب مع WhatsApp ==========
let currentAttendanceClass = null;
let currentAttendanceDate = null;
let changedRecords = {};

document.getElementById('attendance-class-select').addEventListener('change', (e) => {
  currentAttendanceClass = e.target.value;
  renderAttendance();
});

document.getElementById('attendance-date').addEventListener('change', (e) => {
  currentAttendanceDate = e.target.value;
  renderAttendance();
});

function renderAttendance() {
  const tbody = document.getElementById('attendance-table-body');
  const empty = document.getElementById('attendance-empty');
  const saveBtn = document.getElementById('save-attendance-btn');

  if (!currentAttendanceClass || !currentAttendanceDate) {
    tbody.innerHTML = '';
    empty.hidden = false;
    saveBtn.hidden = true;
    return;
  }

  const key = `${currentAttendanceDate}_${currentAttendanceClass}`;
  const records = data.attendance[key] || {};
  const students = data.students.filter(s => s.classId === currentAttendanceClass);

  tbody.innerHTML = students.map(s => {
    const status = records[s.id] || 'present';
    return `
      <tr>
        <td>${s.name}</td>
        <td>
          <select onchange="updateAttendance('${s.id}', this.value, '${s.guardianPhone}')">
            <option value="present" ${status === 'present' ? 'selected' : ''}>✓ حاضر</option>
            <option value="absent" ${status === 'absent' ? 'selected' : ''}>✗ غائب</option>
          </select>
        </td>
        <td>
          <button type="button" class="btn btn-outline btn-sm" onclick="whatsAppGuardian('${s.guardianPhone}', '${s.name}')">💬 واتساب ولي الأمر</button>
        </td>
      </tr>
    `;
  }).join('');

  empty.hidden = students.length > 0;
  saveBtn.hidden = students.length === 0;
  changedRecords = {};
}

function updateAttendance(studentId, status, guardianPhone) {
  const key = `${currentAttendanceDate}_${currentAttendanceClass}`;
  if (!data.attendance[key]) data.attendance[key] = {};
  data.attendance[key][studentId] = status;
  changedRecords[studentId] = { status, guardianPhone };
}

document.getElementById('save-attendance-btn').addEventListener('click', () => {
  saveData();
  showToast('✅ تم حفظ الحضور');
  renderAttendanceStats();
  changedRecords = {};
});

function renderAttendanceStats() {
  const stats = document.getElementById('attendance-stats');
  const allRecords = Object.entries(data.attendance).flatMap(([, records]) =>
    Object.values(records)
  );

  const totalClasses = allRecords.length;
  const presentCount = allRecords.filter(s => s === 'present').length;
  const absentCount = allRecords.filter(s => s === 'absent').length;
  const percentage = totalClasses > 0 ? ((presentCount / totalClasses) * 100).toFixed(1) : 0;

  stats.innerHTML = `
    <div class="stat-row">
      <span>إجمالي السجلات: ${totalClasses}</span>
      <span class="stat-present">الحاضرون: ${presentCount}</span>
      <span class="stat-absent">الغيباب: ${absentCount}</span>
      <span class="stat-percentage">نسبة الحضور: ${percentage}%</span>
    </div>
  `;
}

// ========== الاختبارات والتقييمات ==========
const examForm = document.getElementById('exam-form');
examForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const exam = {
    id: uid(),
    title: examForm.title.value,
    classId: examForm.classId.value,
    date: examForm.date.value,
    maxScore: Number(examForm.maxScore.value),
    scores: {}
  };

  data.exams.push(exam);
  saveData();
  examForm.reset();
  examForm.maxScore.value = 10;
  renderExams();
  showToast('✅ تم إضافة الاختبار');
});

function renderExams() {
  const tbody = document.getElementById('exams-table-body');
  const empty = document.getElementById('exams-empty');

  const sorted = [...data.exams].sort((a, b) => new Date(b.date) - new Date(a.date));

  tbody.innerHTML = sorted.map(ex => {
    const cls = classById(ex.classId);
    const scoreValues = Object.values(ex.scores || {});
    const avg = scoreValues.length > 0
      ? (scoreValues.reduce((sum, v) => sum + Number(v), 0) / scoreValues.length).toFixed(1)
      : '—';
    return `
      <tr>
        <td><strong>${ex.title}</strong></td>
        <td>${cls?.name || 'غير محدد'}</td>
        <td>${new Date(ex.date).toLocaleDateString('ar-EG')}</td>
        <td>${ex.maxScore}</td>
        <td>${avg}</td>
        <td>
          <button class="icon-btn" onclick="openExamScores('${ex.id}')" title="رصد الدرجات">📝</button>
          <button class="icon-btn icon-btn-edit" onclick="openEditExamModal('${ex.id}')" title="تعديل">✏️</button>
          <button class="icon-btn" onclick="deleteExam('${ex.id}')" title="حذف">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  empty.hidden = sorted.length > 0;

  fillSelect(
    document.getElementById('exam-class-select'),
    data.classes.map(c => ({ id: c.id, label: c.name })),
    'اختر المجموعة'
  );
}

function deleteExam(id) {
  showConfirmModal('هل أنت متأكد من حذف هذا الاختبار؟', () => {
    data.exams = data.exams.filter(ex => ex.id !== id);
    saveData();
    renderExams();
    showToast('✅ تم حذف الاختبار');
  }, { title: 'حذف اختبار' });
}

// ---------- تعديل بيانات اختبار ----------
const editExamModalOverlay = document.getElementById('edit-exam-modal-overlay');
const editExamForm = document.getElementById('edit-exam-form');

function openEditExamModal(id) {
  const exam = data.exams.find(ex => ex.id === id);
  if (!exam) return;

  fillSelect(
    document.getElementById('edit-exam-class-select'),
    data.classes.map(c => ({ id: c.id, label: c.name })),
    'اختر المجموعة'
  );

  editExamForm.elements['id'].value = exam.id;
  editExamForm.elements['title'].value = exam.title;
  editExamForm.elements['classId'].value = exam.classId;
  editExamForm.elements['date'].value = exam.date;
  editExamForm.elements['maxScore'].value = exam.maxScore;

  editExamModalOverlay.hidden = false;
}

function closeEditExamModal() {
  editExamModalOverlay.hidden = true;
  editExamForm.reset();
}

editExamForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const exam = data.exams.find(ex => ex.id === editExamForm.elements['id'].value);
  if (!exam) return;

  exam.title = editExamForm.elements['title'].value;
  exam.classId = editExamForm.elements['classId'].value;
  exam.date = editExamForm.elements['date'].value;
  exam.maxScore = Number(editExamForm.elements['maxScore'].value);

  saveData();
  closeEditExamModal();
  renderExams();
  showToast('✅ تم تحديث بيانات الاختبار');
});

editExamModalOverlay.addEventListener('click', (e) => {
  if (e.target === editExamModalOverlay) closeEditExamModal();
});

let currentExamId = null;
let changedExamScores = {};

function openExamScores(examId) {
  const exam = data.exams.find(ex => ex.id === examId);
  if (!exam) return;

  currentExamId = examId;
  changedExamScores = {};
  goToPage('exam-scores');
  renderExamScores();
}

function renderExamScores() {
  const exam = data.exams.find(ex => ex.id === currentExamId);
  if (!exam) return;

  const cls = classById(exam.classId);
  const header = document.getElementById('exam-scores-header');
  header.innerHTML = `
    <h2>${exam.title}</h2>
    <p class="profile-subtitle">المجموعة: ${cls?.name || 'غير محدد'} — الدرجة الكاملة: ${exam.maxScore}</p>
  `;

  const tbody = document.getElementById('exam-scores-table-body');
  const empty = document.getElementById('exam-scores-empty');
  const students = data.students.filter(s => s.classId === exam.classId);

  tbody.innerHTML = students.map(s => {
    const score = exam.scores?.[s.id] ?? '';
    return `
      <tr>
        <td>${s.name}</td>
        <td>
          <input type="number" min="0" max="${exam.maxScore}" step="0.5" value="${score}"
            onchange="updateExamScore('${s.id}', this.value)" placeholder="الدرجة">
        </td>
      </tr>
    `;
  }).join('');

  empty.hidden = students.length > 0;
  document.getElementById('back-to-exams').onclick = () => goToPage('exams');
}

function updateExamScore(studentId, value) {
  changedExamScores[studentId] = value;
}

document.getElementById('save-exam-scores-btn').addEventListener('click', () => {
  const exam = data.exams.find(ex => ex.id === currentExamId);
  if (!exam) return;

  if (!exam.scores) exam.scores = {};
  Object.entries(changedExamScores).forEach(([studentId, value]) => {
    if (value === '') {
      delete exam.scores[studentId];
    } else {
      exam.scores[studentId] = Number(value);
    }
  });

  saveData();
  changedExamScores = {};
  renderExams();
  showToast('✅ تم حفظ الدرجات');
});

// ========== الإجازات ==========
const holidayForm = document.getElementById('holiday-form');
holidayForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (currentUser.role !== 'admin') return showToast('لا توجد صلاحيات');

  const holiday = {
    id: uid(),
    title: holidayForm.title.value,
    date: holidayForm.date.value
  };

  data.holidays.push(holiday);
  saveData();
  holidayForm.reset();
  renderHolidays();
  showToast('✅ تم إضافة الإجازة');
});

function renderHolidays() {
  const tbody = document.getElementById('holidays-table-body');
  const empty = document.getElementById('holidays-empty');

  tbody.innerHTML = data.holidays
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(h => `
      <tr>
        <td>${h.title}</td>
        <td>${new Date(h.date).toLocaleDateString('ar-EG')}</td>
        <td>
          <button class="icon-btn" onclick="deleteHoliday('${h.id}')" title="حذف">🗑️</button>
        </td>
      </tr>
    `).join('');

  empty.hidden = data.holidays.length > 0;
}

function deleteHoliday(id) {
  showConfirmModal('هل أنت متأكد من حذف هذه الإجازة؟', () => {
    data.holidays = data.holidays.filter(h => h.id !== id);
    saveData();
    renderHolidays();
    showToast('✅ تم الحذف');
  }, { title: 'حذف إجازة' });
}

// ========== الشهريات ==========
document.getElementById('fees-month-picker').addEventListener('change', renderFees);

function renderFees() {
  const monthPicker = document.getElementById('fees-month-picker');
  const month = monthPicker.value || new Date().toISOString().slice(0, 7);
  const tbody = document.getElementById('fees-table-body');
  const empty = document.getElementById('fees-empty');

  document.getElementById('fees-month-label').textContent =
    new Date(month + '-01').toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

  tbody.innerHTML = data.students.map(s => {
    const cls = classById(s.classId);
    const paymentKey = `${month}_${s.id}`;
    const payment = data.payments[paymentKey];
    const isPaid = typeof payment === 'object' ? !!payment.paid : !!payment;
    const method = typeof payment === 'object' ? (payment.method || 'cash') : 'cash';

    return `
      <tr>
        <td>${s.name}</td>
        <td>${cls?.name}</td>
        <td>${s.monthlyFee} ج</td>
        <td>
          <label class="checkbox-inline">
            <input type="checkbox" ${isPaid ? 'checked' : ''} 
             onchange="togglePayment('${paymentKey}', this.checked)">
            ${isPaid ? '✓ مدفوع' : '⏳ قيد الانتظار'}
          </label>
        </td>
        <td>
          <select class="payment-method-select" ${isPaid ? '' : 'disabled'}
            onchange="setPaymentMethod('${paymentKey}', this.value)">
            <option value="cash" ${method === 'cash' ? 'selected' : ''}>كاش</option>
            <option value="vodafone_cash" ${method === 'vodafone_cash' ? 'selected' : ''}>فودافون كاش</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');

  empty.hidden = data.students.length > 0;

  function isPaidEntry(key) {
    const p = data.payments[key];
    return typeof p === 'object' ? !!p.paid : !!p;
  }

  function paymentMethodOf(key) {
    const p = data.payments[key];
    return typeof p === 'object' ? (p.method || 'cash') : 'cash';
  }

  const paid = data.students.filter(s => isPaidEntry(`${month}_${s.id}`)).length;
  const total = data.students.length;
  const totalAmount = data.students.reduce((sum, s) => sum + s.monthlyFee, 0);
  const paidStudents = data.students.filter(s => isPaidEntry(`${month}_${s.id}`));
  const paidAmount = paidStudents.reduce((sum, s) => sum + s.monthlyFee, 0);

  const cashAmount = paidStudents
    .filter(s => paymentMethodOf(`${month}_${s.id}`) === 'cash')
    .reduce((sum, s) => sum + s.monthlyFee, 0);
  const vodafoneCashAmount = paidStudents
    .filter(s => paymentMethodOf(`${month}_${s.id}`) === 'vodafone_cash')
    .reduce((sum, s) => sum + s.monthlyFee, 0);

  const monthExpenses = data.expenses
    .filter(e => e.date && e.date.slice(0, 7) === month)
    .reduce((sum, e) => sum + e.amount, 0);
  const netProfit = paidAmount - monthExpenses;

  document.getElementById('fees-summary').innerHTML = `
    <div class="summary-grid">
      <div class="summary-item">
        <strong>الإجمالي المستحق:</strong> ${totalAmount} ج
      </div>
      <div class="summary-item">
        <strong>المتحصل:</strong> ${paidAmount} ج
      </div>
      <div class="summary-item">
        <strong>المتبقي:</strong> ${totalAmount - paidAmount} ج
      </div>
      <div class="summary-item">
        <strong>نسبة التحصيل:</strong> ${total > 0 ? ((paid / total) * 100).toFixed(1) : 0}%
      </div>
      <div class="summary-item">
        <strong>كاش:</strong> ${cashAmount} ج
      </div>
      <div class="summary-item">
        <strong>فودافون كاش:</strong> ${vodafoneCashAmount} ج
      </div>
      <div class="summary-item">
        <strong>مصروفات الشهر:</strong> ${monthExpenses} ج
      </div>
      <div class="summary-item ${netProfit >= 0 ? 'profit-positive' : 'profit-negative'}">
        <strong>صافي الربح:</strong> ${netProfit} ج
      </div>
    </div>
  `;
}

function togglePayment(paymentKey, isPaid) {
  const existing = data.payments[paymentKey];
  const method = typeof existing === 'object' ? existing.method : 'cash';
  data.payments[paymentKey] = { paid: isPaid, method: method || 'cash' };
  saveData();
  renderFees();
  showToast('✅ تم تحديث حالة الدفع');
}

function setPaymentMethod(paymentKey, method) {
  const existing = data.payments[paymentKey];
  const isPaid = typeof existing === 'object' ? existing.paid : !!existing;
  data.payments[paymentKey] = { paid: isPaid, method };
  saveData();
  showToast('✅ تم تحديث طريقة الدفع');
}

// ========== المصروفات ==========
const expenseForm = document.getElementById('expense-form');
expenseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (currentUser.role !== 'admin') return showToast('لا توجد صلاحيات');

  const expense = {
    id: uid(),
    title: expenseForm.title.value,
    amount: parseFloat(expenseForm.amount.value),
    date: expenseForm.date.value
  };

  data.expenses.push(expense);
  saveData();
  expenseForm.reset();
  renderExpenses();
  showToast('✅ تم إضافة المصروف');
});

function renderExpenses() {
  const tbody = document.getElementById('expenses-table-body');
  const empty = document.getElementById('expenses-empty');

  tbody.innerHTML = data.expenses
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(e => `
      <tr>
        <td>${e.title}</td>
        <td>${e.amount} ج</td>
        <td>${new Date(e.date).toLocaleDateString('ar-EG')}</td>
        <td>
          <button class="icon-btn" onclick="deleteExpense('${e.id}')" title="حذف">🗑️</button>
        </td>
      </tr>
    `).join('');

  empty.hidden = data.expenses.length > 0;

  const total = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  document.getElementById('expenses-summary').innerHTML = `
    <div class="summary-grid">
      <div class="summary-item"><strong>إجمالي المصروفات:</strong> ${total} ج</div>
    </div>
  `;
}

function deleteExpense(id) {
  showConfirmModal('هل أنت متأكد من حذف هذا المصروف؟', () => {
    data.expenses = data.expenses.filter(e => e.id !== id);
    saveData();
    renderExpenses();
    showToast('✅ تم الحذف');
  }, { title: 'حذف مصروف' });
}

// ========== الاستمارات ==========
const registrationForm = document.getElementById('registration-form');
registrationForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const reg = {
    id: uid(),
    studentName: registrationForm.studentName.value,
    classId: registrationForm.classId.value,
    guardianName: registrationForm.guardianName.value,
    guardianPhone: registrationForm.guardianPhone.value,
    approved: false,
    submittedAt: new Date().toISOString()
  };

  data.registrations.push(reg);
  saveData();
  registrationForm.reset();
  renderRegistrations();
  showToast('✅ تم إرسال الاستمارة');
});

function renderRegistrations() {
  const tbody = document.getElementById('registrations-table-body');
  const empty = document.getElementById('registrations-empty');

  const pending = data.registrations.filter(r => !r.approved);

  tbody.innerHTML = pending
    .map(r => {
      const cls = classById(r.classId);
      return `
      <tr>
        <td>${r.studentName}</td>
        <td>${cls?.name || 'غير محدد'}</td>
        <td>${r.guardianName}</td>
        <td>${r.guardianPhone}</td>
        <td>
          <button class="icon-btn icon-btn-approve" onclick="approveRegistration('${r.id}')" title="قبول">✓</button>
          <button class="icon-btn icon-btn-reject" onclick="deleteRegistration('${r.id}')" title="رفض">✗</button>
        </td>
      </tr>
    `;
    }).join('');

  empty.hidden = pending.length > 0;

  fillSelect(
    document.getElementById('registration-class-select'),
    data.classes.map(c => ({ id: c.id, label: c.name })),
    'اختر المجموعة'
  );

  updateRegBadge();
}

function approveRegistration(regId) {
  const reg = data.registrations.find(r => r.id === regId);
  if (!reg) return;

  data.students.push({
    id: uid(),
    name: reg.studentName,
    classId: reg.classId || '',
    guardianPhone: reg.guardianPhone,
    monthlyFee: 0, // سيتم تحديده لاحقاً
    enrollDate: new Date().toISOString()
  });

  reg.approved = true;
  saveData();
  renderRegistrations();
  renderStudents();
  showToast('✅ تم قبول الاستمارة');
}

function deleteRegistration(regId) {
  showConfirmModal('هل أنت متأكد من رفض وحذف هذه الاستمارة؟', () => {
    data.registrations = data.registrations.filter(r => r.id !== regId);
    saveData();
    renderRegistrations();
    showToast('✅ تم الحذف');
  }, { title: 'رفض استمارة' });
}

// ========== البحث في الطلاب ==========
document.getElementById('students-search').addEventListener('input', renderStudents);

// ========== البحث في المعلمين ==========
document.getElementById('teachers-search').addEventListener('input', renderTeachers);

// ========== العرض الشامل ==========
function renderAll() {
  renderDashboard();
  renderStudents();
  renderTeachers();
  renderClasses();
  renderAttendance();
  renderAttendanceStats();
  renderExams();
  renderHolidays();
  renderFees();
  renderExpenses();
  renderRegistrations();
}

// ========== التحقق من الجلسة عند التحميل ==========
window.addEventListener('load', () => {
  const saved = localStorage.getItem(AUTH_KEY);
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      loginPage.hidden = true;
      dashboardWrapper.hidden = false;
      initializeDashboard();
    } catch (e) {
      localStorage.removeItem(AUTH_KEY);
    }
  }
});

// ضبط التاريخ الحالي
document.getElementById('attendance-date').valueAsDate = new Date();
document.getElementById('fees-month-picker').value = new Date().toISOString().slice(0, 7);
document.getElementById('expense-form').date.valueAsDate = new Date();
document.getElementById('holiday-form').date.valueAsDate = new Date();
document.getElementById('exam-form').date.valueAsDate = new Date();

// إصلاح: ضبط التاريخ الحالي في الحقل لا يطلق حدث "change" تلقائياً،
// فكانت صفحة الحضور تظل تعتقد أنه لا يوجد تاريخ مُختار ولا تعرض أي طالب
// حتى يغيّر المستخدم التاريخ يدوياً. نُزامن المتغيّر مباشرةً هنا.
currentAttendanceDate = document.getElementById('attendance-date').value;

// ========== نظام النسخ الاحتياطية (Backup) ==========
const BACKUPS_KEY = 'sabbora-backups';
const MAX_BACKUPS = 10;

// دالة تحميل البيانات المحفوظة من localStorage
function loadBackups() {
  const raw = localStorage.getItem(BACKUPS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }
  return [];
}

// دالة حفظ النسخ الاحتياطية
function saveBackups(backups) {
  localStorage.setItem(BACKUPS_KEY, JSON.stringify(backups));
}

// دالة تصدير البيانات إلى ملف JSON
function exportData() {
  const timestamp = new Date().toLocaleString('ar-EG').replace(/:/g, '-');
  const backupData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    exportTime: new Date().toLocaleString('ar-EG'),
    data: data
  };
  
  const json = JSON.stringify(backupData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sabbora-backup-${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  // إضافة النسخة الاحتياطية إلى السجل
  const backups = loadBackups();
  backups.unshift({
    id: Date.now(),
    name: `sabbora-backup-${timestamp}.json`,
    date: new Date().toLocaleString('ar-EG'),
    size: (blob.size / 1024).toFixed(2) + ' KB',
    type: 'تصدير يدوي'
  });
  
  // الحفاظ على آخر 10 نسخ فقط
  if (backups.length > MAX_BACKUPS) {
    backups.pop();
  }
  saveBackups(backups);
  
  renderBackupHistory();
  showToast('✅ تم تصدير البيانات بنجاح');
}

// دالة استيراد البيانات من ملف
function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target.result;
      const backupData = JSON.parse(content);
      
      // التحقق من صحة الملف
      if (!backupData.data || typeof backupData.data !== 'object') {
        showToast('❌ صيغة الملف غير صحيحة');
        return;
      }
      
      // تأكيد من المستخدم
      showConfirmModal('⚠️ تحذير: سيتم استبدال جميع البيانات الحالية بالبيانات من الملف. هل أنت متأكد؟', () => {
        // استعادة البيانات
        data = backupData.data;
        saveData();

        // تحديث البيانات المعروضة
        renderAll();

        showToast('✅ تم استيراد البيانات بنجاح');

        // إضافة للسجل
        const backups = loadBackups();
        backups.unshift({
          id: Date.now(),
          name: file.name,
          date: new Date().toLocaleString('ar-EG'),
          size: (file.size / 1024).toFixed(2) + ' KB',
          type: 'استيراد يدوي'
        });

        if (backups.length > MAX_BACKUPS) {
          backups.pop();
        }
        saveBackups(backups);
        renderBackupHistory();
      }, { title: 'استيراد بيانات', confirmLabel: 'استيراد واستبدال' });
    } catch (err) {
      showToast('❌ خطأ في قراءة الملف: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// دالة حذف نسخة احتياطية من السجل
function deleteBackupFromHistory(id) {
  const backups = loadBackups();
  const index = backups.findIndex(b => b.id === id);
  if (index > -1) {
    backups.splice(index, 1);
    saveBackups(backups);
    renderBackupHistory();
    showToast('✅ تم حذف النسخة من السجل');
  }
}

// دالة عرض سجل النسخ الاحتياطية
function renderBackupHistory() {
  const historyContainer = document.getElementById('backup-history');
  const backups = loadBackups();
  
  if (backups.length === 0) {
    historyContainer.innerHTML = '<p class="empty-row">لا توجد نسخ احتياطية محفوظة محليًا</p>';
    return;
  }
  
  historyContainer.innerHTML = backups.map(backup => `
    <div class="backup-item">
      <div class="backup-item-info">
        <div class="backup-item-name">📦 ${backup.name}</div>
        <div class="backup-item-date">📅 ${backup.date} | 📊 ${backup.size} | 🏷️ ${backup.type}</div>
      </div>
      <div class="backup-item-actions">
        <button class="backup-item-btn btn-danger" onclick="deleteBackupFromHistory(${backup.id})">حذف</button>
      </div>
    </div>
  `).join('');
}

// معالجات الأحداث للنسخ الاحتياطية
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file-input');

exportBtn.addEventListener('click', () => {
  showConfirmModal('هل تريد تصدير جميع البيانات الآن؟', () => {
    exportData();
  }, { title: 'تصدير البيانات', confirmLabel: 'تصدير' });
});

importBtn.addEventListener('click', () => {
  importFileInput.click();
});

importFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    importData(file);
    importFileInput.value = ''; // إعادة تعيين الحقل
  }
});

// عرض سجل النسخ الاحتياطية عند تحميل الصفحة
window.addEventListener('load', () => {
  renderBackupHistory();
});

// ========== تغيير كلمة مرور الأدمن ==========
const changePasswordForm = document.getElementById('change-password-form');

changePasswordForm.addEventListener('submit', (e) => {
  e.preventDefault();

  if (currentUser.role !== 'admin') return showToast('لا توجد صلاحيات');

  const form = new FormData(changePasswordForm);
  const currentPassword = form.get('currentPassword');
  const newPassword = form.get('newPassword');
  const confirmPassword = form.get('confirmPassword');

  const adminUsername = Object.keys(DEMO_USERS).find(u => DEMO_USERS[u].role === 'admin');

  if (DEMO_USERS[adminUsername].password !== currentPassword) {
    return showToast('❌ كلمة المرور الحالية غير صحيحة');
  }

  if (newPassword.length < 6) {
    return showToast('❌ كلمة المرور الجديدة لازم تكون 6 حروف على الأقل');
  }

  if (newPassword !== confirmPassword) {
    return showToast('❌ كلمة المرور الجديدة وتأكيدها غير متطابقين');
  }

  DEMO_USERS[adminUsername].password = newPassword;
  data.adminPassword = newPassword;
  saveData();

  changePasswordForm.reset();
  showToast('✅ تم تغيير كلمة المرور بنجاح');
});
