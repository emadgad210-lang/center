// ========== نظام المصادقة والتخزين ==========
const AUTH_KEY = 'sabbora-auth';
const STORAGE_KEY = 'sabbora-dashboard-data';

// بيانات تجريبية للمستخدمين
const DEMO_USERS = {
  'admin': { password: 'password123', role: 'admin', name: 'مسؤول النظام' },
  'teacher@school.com': { password: 'teacher123', role: 'teacher', name: 'أحمد محمود', teacherId: 'teacher-1' }
};

let currentUser = null;
let data = loadData();

// ========== دالة التخزين والتحميل ==========
function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { }
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
    notifications: []
  };
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

  // التحقق من بيانات المستخدم
  if (DEMO_USERS[email] && DEMO_USERS[email].password === password && DEMO_USERS[email].role === role) {
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
  } else {
    showToast('❌ بيانات الدخول غير صحيحة');
  }
});

// ========== تسجيل الخروج ==========
document.getElementById('logout-btn').addEventListener('click', () => {
  if (confirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟')) {
    currentUser = null;
    localStorage.removeItem(AUTH_KEY);
    loginPage.hidden = false;
    dashboardWrapper.hidden = true;
    document.getElementById('login-form').reset();
    showToast('تم تسجيل الخروج بنجاح');
  }
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
  holidays: 'الإجازات',
  fees: 'الشهريات',
  expenses: 'مصروفات السنتر',
  registrations: 'استمارات طلاب جدد',
  'student-profile': 'ملف الطالب'
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

// ========== التاريخ والوقت ==========
const topbarDate = document.getElementById('topbar-date');
const todayISO = new Date().toISOString().slice(0, 10);
topbarDate.textContent = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// ========== أدوات مساعدة ==========
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.hidden = true; }, 2200);
}

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

// ========== أدوات روابط واتساب (wa.me) ==========
// نظرًا لأن هذا تطبيق يعمل بالكامل من المتصفح بدون خادم، لا يمكن استخدام
// Twilio أو WhatsApp Business API مباشرة (تحتاج مفاتيح سرية يجب أن تبقى على خادم).
// البديل العملي الذي يعمل فورًا وبدون أي اشتراك: رابط wa.me الذي يفتح واتساب
// (ويب أو تطبيق) مع رسالة جاهزة، ويحتاج المستخدم فقط لضغط "إرسال".
function toWhatsAppNumber(phone) {
  let digits = (phone || '').replace(/[^\d]/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  // رقم محلي مصري بصيغة 01xxxxxxxxx (11 رقم) → نضيف كود الدولة 20
  if (digits.startsWith('0') && digits.length === 11) digits = '20' + digits.slice(1);
  return digits;
}

function buildWhatsAppLink(phone, message) {
  const number = toWhatsAppNumber(phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

// ========== نظام إرسال التنبيهات عبر WhatsApp ==========
class WhatsAppNotificationService {
  static async sendAbsenceNotification(studentId, className, guardianPhone) {
    const student = studentById(studentId);
    if (!student) return;

    const message = `
🔔 *تنبيه الغياب* 🔔

السلام عليكم ورحمة الله وبركاته،

تنبيه من مركز ${getSchoolName()}: 
الطالب/ة *${student.name}* تغيب عن حصة *${className}*

📅 التاريخ: ${new Date().toLocaleDateString('ar-EG')}
⏰ الوقت: ${new Date().toLocaleTimeString('ar-EG')}

يرجى متابعة الطالب والتواصل مع الإدارة للمزيد من التفاصيل.

شكراً لتفهمك 🙏
    `.trim();

    if (!guardianPhone) {
      return { success: false, error: 'no-phone', studentName: student.name };
    }

    const link = buildWhatsAppLink(guardianPhone, message);

    // تخزين تسجيل للإخطار
    data.notifications.push({
      id: uid(),
      type: 'absence',
      studentId,
      guardianPhone,
      message,
      whatsappLink: link,
      sentAt: new Date().toISOString(),
      status: 'link-ready'
    });

    saveData();
    return { success: true, link, studentName: student.name };
  }

  static async sendPaymentReminder(studentId, guardianPhone, amount) {
    const student = studentById(studentId);
    if (!student) return;

    const message = `
💰 *تذكير الشهرية* 💰

السلام عليكم ورحمة الله وبركاته،

تذكير بسداد الشهرية الخاصة بـ *${student.name}*

💵 المبلغ المستحق: ${amount} جنيه
📅 آخر موعد للسداد: ${getNextPaymentDeadline()}

يرجى التواصل مع الإدارة للمزيد من التفاصيل.

شكراً لتفهمك 🙏
    `.trim();

    console.log('📱 إرسال رسالة WhatsApp:', { to: guardianPhone, message });

    data.notifications.push({
      id: uid(),
      type: 'payment',
      studentId,
      guardianPhone,
      message,
      sentAt: new Date().toISOString(),
      status: 'sent'
    });

    saveData();
  }
}

function getSchoolName() {
  return 'مركز الدروس';
}

function getNextPaymentDeadline() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString('ar-EG');
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

  const regBadge = document.getElementById('reg-badge');
  const pendingCount = data.registrations.filter(r => !r.approved).length;
  regBadge.textContent = pendingCount;
  regBadge.hidden = pendingCount === 0;

  const pendingList = document.getElementById('pending-regs-list');
  const pending = data.registrations.filter(r => !r.approved).slice(0, 5);
  pendingList.innerHTML = pending.length ? pending.map(r =>
    `<li><strong>${r.studentName}</strong> (ولي الأمر: ${r.guardianName})</li>`
  ).join('') : '<li class="empty-row">مفيش استمارات جديدة</li>';
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

  tbody.innerHTML = filtered.map(s => {
    const cls = classById(s.classId);
    return `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td>${cls?.name || 'غير محدد'}</td>
        <td>${s.guardianPhone}</td>
        <td>${s.monthlyFee} ج</td>
        <td>
          <button class="icon-btn" onclick="viewStudentProfile('${s.id}')" title="عرض الملف">👁️</button>
          <button class="icon-btn" onclick="deleteStudent('${s.id}')" title="حذف">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  empty.hidden = filtered.length > 0;

  fillSelect(
    document.getElementById('student-class-select'),
    data.classes.map(c => ({ id: c.id, label: c.name })),
    'اختر المجموعة'
  );
}

function deleteStudent(id) {
  if (confirm('هل أنت متأكد؟')) {
    data.students = data.students.filter(s => s.id !== id);
    saveData();
    renderStudents();
    showToast('✅ تم حذف الطالب');
  }
}

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

  tbody.innerHTML = data.teachers.map(t => {
    const classCount = data.classes.filter(c => c.teacherId === t.id).length;
    return `
      <tr>
        <td><strong>${t.name}</strong></td>
        <td>${t.subject}</td>
        <td>${t.email}</td>
        <td>${t.phone}</td>
        <td>${classCount}</td>
        <td>
          <button class="icon-btn" onclick="deleteTeacher('${t.id}')" title="حذف">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  empty.hidden = data.teachers.length > 0;

  fillSelect(
    document.getElementById('class-teacher-select'),
    data.teachers.map(t => ({ id: t.id, label: t.name })),
    'اختر المعلم'
  );
}

function deleteTeacher(id) {
  if (confirm('حذف المعلم سيؤثر على حصصه. متأكد؟')) {
    data.teachers = data.teachers.filter(t => t.id !== id);
    data.classes = data.classes.filter(c => c.teacherId !== id);
    saveData();
    renderTeachers();
    renderClasses();
    showToast('✅ تم الحذف');
  }
}

// ========== الحصص ==========
const classForm = document.getElementById('class-form');
classForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (currentUser.role !== 'admin') return showToast('لا توجد صلاحيات');

  const days = Array.from(document.querySelectorAll('[name="days"]:checked')).map(cb => cb.value);
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
  if (confirm('حذف المجموعة سيؤثر على سجلات الحضور. متأكد؟')) {
    data.classes = data.classes.filter(c => c.id !== id);
    saveData();
    renderClasses();
    renderStudents();
    showToast('✅ تم الحذف');
  }
}

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
          <select data-student-id="${s.id}" onchange="updateAttendance('${s.id}', this.value, '${s.guardianPhone}')">
            <option value="present" ${status === 'present' ? 'selected' : ''}>✓ حاضر</option>
            <option value="absent" ${status === 'absent' ? 'selected' : ''}>✗ غائب</option>
          </select>
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
  const key = `${currentAttendanceDate}_${currentAttendanceClass}`;
  if (!data.attendance[key]) data.attendance[key] = {};
  document.querySelectorAll('#attendance-table-body select[data-student-id]').forEach(sel => {
    data.attendance[key][sel.dataset.studentId] = sel.value;
  });
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
  if (confirm('هل أنت متأكد؟')) {
    data.holidays = data.holidays.filter(h => h.id !== id);
    saveData();
    renderHolidays();
    showToast('✅ تم الحذف');
  }
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
    const isPaid = data.payments[paymentKey] || false;

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
      </tr>
    `;
  }).join('');

  empty.hidden = data.students.length > 0;

  const paid = data.students.filter(s => data.payments[`${month}_${s.id}`]).length;
  const total = data.students.length;
  const totalAmount = data.students.reduce((sum, s) => sum + s.monthlyFee, 0);
  const paidAmount = data.students
    .filter(s => data.payments[`${month}_${s.id}`])
    .reduce((sum, s) => sum + s.monthlyFee, 0);

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
    </div>
  `;
}

function togglePayment(paymentKey, isPaid) {
  data.payments[paymentKey] = isPaid;
  saveData();
  renderFees();
  showToast('✅ تم تحديث حالة الدفع');
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
  if (confirm('هل أنت متأكد؟')) {
    data.expenses = data.expenses.filter(e => e.id !== id);
    saveData();
    renderExpenses();
    showToast('✅ تم الحذف');
  }
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

  tbody.innerHTML = data.registrations
    .filter(r => !r.approved)
    .map(r => `
      <tr>
        <td>${r.studentName}</td>
        <td>${classById(r.classId)?.name || 'غير محدد'}</td>
        <td>${r.guardianName}</td>
        <td>${r.guardianPhone}</td>
        <td>
          <button class="btn-action btn-approve" onclick="approveRegistration('${r.id}')" title="قبول الاستمارة">✓ قبول</button>
          <button class="btn-action btn-reject" onclick="deleteRegistration('${r.id}')" title="رفض الاستمارة">✗ رفض</button>
        </td>
      </tr>
    `).join('');

  empty.hidden = data.registrations.some(r => !r.approved);

  fillSelect(
    document.getElementById('registration-class-select'),
    data.classes.map(c => ({ id: c.id, label: c.name })),
    'اختر المجموعة'
  );
}

function approveRegistration(regId) {
  const reg = data.registrations.find(r => r.id === regId);
  if (!reg) return;

  data.students.push({
    id: uid(),
    name: reg.studentName,
    classId: reg.classId,
    guardianPhone: reg.guardianPhone,
    monthlyFee: 0, // سيتم تحديده لاحقاً
    enrollDate: new Date().toISOString()
  });

  reg.approved = true;
  saveData();
  renderRegistrations();
  renderStudents();
  showToast('✅ تم قبول الاستمارة وإضافة الطالب للمجموعة');
}

function deleteRegistration(regId) {
  if (confirm('هل أنت متأكد؟')) {
    data.registrations = data.registrations.filter(r => r.id !== regId);
    saveData();
    renderRegistrations();
    showToast('✅ تم الحذف');
  }
}

// ========== البحث في الطلاب ==========
document.getElementById('students-search').addEventListener('input', renderStudents);

// ========== العرض الشامل ==========
function renderAll() {
  renderDashboard();
  renderStudents();
  renderTeachers();
  renderClasses();
  renderAttendance();
  renderAttendanceStats();
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

// إصلاح: ضبط التاريخ الحالي في الحقل لا يطلق حدث "change" تلقائياً،
// فكانت صفحة الحضور تظل تعتقد أنه لا يوجد تاريخ مُختار ولا تعرض أي طالب
// حتى يغيّر المستخدم التاريخ يدوياً. نُزامن المتغيّر مباشرةً هنا.
currentAttendanceDate = document.getElementById('attendance-date').value;
