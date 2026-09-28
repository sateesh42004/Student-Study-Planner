const STORAGE_KEY = 'studentStudyPlannerTasks';
const SUBJECT_OPTIONS = [
  'Data Structures',
  'Operating Systems',
  'Computer Networks',
  'Database Management',
  'Machine Learning',
  'Python',
  'Other',
  'DBMS',
];

const state = {
  currentView: 'dashboard',
  filters: {
    search: '',
    status: 'all',
    subject: 'all',
    priority: 'all',
    sort: 'date',
  },
  selectedSubject: null,
  taskToDelete: null,
};

function getSafeLocalStorageData() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === null) {
      return null;
    }

    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch (error) {
    console.warn('Invalid LocalStorage data detected. Resetting task storage.', error);
    return [];
  }
}

function generateId() {
  return `task-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function getRelativeDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getSampleTasks() {
  return [
    {
      id: generateId(),
      title: 'Practice Arrays',
      subject: 'Data Structures',
      date: getRelativeDate(0),
      priority: 'High',
      studyTime: 2,
      completed: false,
      createdAt: Date.now(),
    },
    {
      id: generateId(),
      title: 'Study Process Scheduling',
      subject: 'Operating Systems',
      date: getRelativeDate(1),
      priority: 'High',
      studyTime: 2,
      completed: false,
      createdAt: Date.now() - 1000,
    },
    {
      id: generateId(),
      title: 'Revise TCP/IP',
      subject: 'Computer Networks',
      date: getRelativeDate(2),
      priority: 'Medium',
      studyTime: 1.5,
      completed: false,
      createdAt: Date.now() - 2000,
    },
    {
      id: generateId(),
      title: 'Revise Regression',
      subject: 'Machine Learning',
      date: getRelativeDate(5),
      priority: 'Low',
      studyTime: 1,
      completed: true,
      createdAt: Date.now() - 3000,
    },
  ];
}

function initializeStorage() {
  if (localStorage.getItem(STORAGE_KEY) === null) {
    const sampleTasks = getSampleTasks();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleTasks));
  }
}

function loadTasks() {
  const rawTasks = getSafeLocalStorageData();

  if (rawTasks === null) {
    initializeStorage();
    return loadTasks();
  }

  if (rawTasks.length === 0) {
    return [];
  }

  return rawTasks.map((task) => normalizeTask(task));
}

function normalizeTask(task) {
  const safeTitle = typeof task?.title === 'string' ? task.title.trim() : '';
  const validSubject = SUBJECT_OPTIONS.includes(task?.subject) ? task.subject : 'Other';
  const validPriority = ['High', 'Medium', 'Low'].includes(task?.priority) ? task.priority : 'Medium';
  const parsedStudyTime = Number(task?.studyTime);

  return {
    id: task?.id || generateId(),
    title: safeTitle,
    subject: validSubject,
    date: typeof task?.date === 'string' && task.date ? task.date : getTodayISO(),
    priority: validPriority,
    studyTime: Number.isFinite(parsedStudyTime) && parsedStudyTime > 0 ? parsedStudyTime : 1,
    completed: Boolean(task?.completed),
    createdAt: Number(task?.createdAt) || Date.now(),
  };
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDisplayDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function getPriorityOrder(priority) {
  return { High: 0, Medium: 1, Low: 2 }[priority] ?? 3;
}

function isOverdue(task) {
  if (task.completed) {
    return false;
  }

  const taskDate = new Date(task.date + 'T00:00:00');
  const today = new Date(getTodayISO() + 'T00:00:00');
  return taskDate < today;
}

function calculateProgress(tasks) {
  if (!tasks.length) {
    return 0;
  }

  const completedCount = tasks.filter((task) => task.completed).length;
  return Math.round((completedCount / tasks.length) * 100);
}

function getDashboardMetrics(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const pending = total - completed;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  return { total, completed, pending, percent };
}

function getTodaysTasks(tasks) {
  const today = getTodayISO();
  return tasks.filter((task) => task.date === today).sort((a, b) => {
    if (a.completed !== b.completed) {
      return Number(a.completed) - Number(b.completed);
    }
    return getPriorityOrder(a.priority) - getPriorityOrder(b.priority);
  });
}

function filterTasks(tasks) {
  const searchText = state.filters.search.trim().toLowerCase();

  return tasks
    .filter((task) => {
      const matchesSearch =
        !searchText ||
        task.title.toLowerCase().includes(searchText) ||
        task.subject.toLowerCase().includes(searchText);

      const matchesStatus =
        state.filters.status === 'all' ||
        (state.filters.status === 'completed' && task.completed) ||
        (state.filters.status === 'pending' && !task.completed);

      const matchesSubject =
        state.filters.subject === 'all' || task.subject === state.filters.subject;

      const matchesPriority =
        state.filters.priority === 'all' || task.priority === state.filters.priority;

      return matchesSearch && matchesStatus && matchesSubject && matchesPriority;
    })
    .sort((a, b) => {
      switch (state.filters.sort) {
        case 'priority':
          return getPriorityOrder(a.priority) - getPriorityOrder(b.priority) || new Date(a.date) - new Date(b.date);
        case 'recent':
          return Number(b.createdAt || 0) - Number(a.createdAt || 0);
        case 'date':
        default:
          return new Date(a.date) - new Date(b.date) || getPriorityOrder(a.priority) - getPriorityOrder(b.priority);
      }
    });
}

function renderDashboard() {
  const tasks = loadTasks();
  const metrics = getDashboardMetrics(tasks);
  const todayTasks = getTodaysTasks(tasks);
  const percent = Math.min(100, metrics.percent);

  document.getElementById('welcomeMessage').textContent = `${getGreeting()}! 👋`;
  document.getElementById('totalTasksStat').textContent = String(metrics.total);
  document.getElementById('completedTasksStat').textContent = String(metrics.completed);
  document.getElementById('pendingTasksStat').textContent = String(metrics.pending);
  document.getElementById('completionStat').textContent = `${metrics.percent}%`;

  const progressBar = document.getElementById('todayProgressBar');
  const todayProgressText = document.getElementById('todayProgressText');
  const progressValue = calculateProgress(todayTasks);

  progressBar.style.width = `${progressValue}%`;
  todayProgressText.textContent = `${progressValue}%`;

  const todayList = document.getElementById('todayTasksList');

  if (!todayTasks.length) {
    todayList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📚</span>
        <h4>No tasks for today</h4>
        <p>Start planning by adding your first task.</p>
        <button class="primary-btn" type="button" data-open-task="true">+ Add Study Task</button>
      </div>
    `;
    return;
  }

  todayList.innerHTML = todayTasks
    .map((task) => {
      const overdueTag = isOverdue(task)
        ? '<span class="task-status overdue">🔴 Overdue</span>'
        : task.completed
          ? '<span class="task-status complete">✓ Completed</span>'
          : '<span class="task-status pending">⏳ Pending</span>';

      return `
        <article class="task-card ${task.completed ? 'completed' : ''} ${isOverdue(task) ? 'overdue' : ''}">
          <div class="task-card-header">
            <div class="task-main">
              <h4 class="task-title">${escapeHtml(task.title)}</h4>
              <p class="task-subject">${escapeHtml(task.subject)}</p>
            </div>
            <button
              type="button"
              class="task-check ${task.completed ? 'checked' : ''}"
              data-action="toggle"
              data-id="${task.id}"
              aria-label="Toggle task completion"
            ></button>
          </div>

          <div class="task-meta">
            <div class="task-meta-group">
              <span>📅 ${formatDisplayDate(task.date)}</span>
              <span>⏱ ${task.studyTime} hours</span>
            </div>
            <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
          </div>

          <div class="task-actions">
            ${overdueTag}
            <button type="button" class="task-action-btn" data-action="edit" data-id="${task.id}">Edit</button>
            <button type="button" class="task-action-btn delete" data-action="delete" data-id="${task.id}">Delete</button>
          </div>
        </article>
      `;
    })
    .join('');

  document.getElementById('focusLabel').textContent = todayTasks[0]?.subject || 'Stay consistent';
}

function renderTasks() {
  const tasks = filterTasks(loadTasks());
  const taskList = document.getElementById('taskList');

  if (!tasks.length) {
    taskList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📚</span>
        <h4>No tasks found</h4>
        <p>Try another search or filter.</p>
        <button class="primary-btn" type="button" data-open-task="true">+ Add Study Task</button>
      </div>
    `;
    return;
  }

  taskList.innerHTML = tasks
    .map((task) => {
      const overdueTag = isOverdue(task)
        ? '<span class="task-status overdue">🔴 Overdue</span>'
        : task.completed
          ? '<span class="task-status complete">✓ Completed</span>'
          : '<span class="task-status pending">⏳ Pending</span>';

      return `
        <article class="task-card ${task.completed ? 'completed' : ''} ${isOverdue(task) ? 'overdue' : ''}">
          <div class="task-card-header">
            <div class="task-main">
              <h4 class="task-title">${escapeHtml(task.title)}</h4>
              <p class="task-subject">${escapeHtml(task.subject)}</p>
            </div>
            <button
              type="button"
              class="task-check ${task.completed ? 'checked' : ''}"
              data-action="toggle"
              data-id="${task.id}"
              aria-label="Toggle task completion"
            ></button>
          </div>

          <div class="task-meta">
            <div class="task-meta-group">
              <span>📅 ${formatDisplayDate(task.date)}</span>
              <span>⏱ ${task.studyTime} hours</span>
            </div>
            <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
          </div>

          <div class="task-actions">
            ${overdueTag}
            <button type="button" class="task-action-btn" data-action="edit" data-id="${task.id}">Edit</button>
            <button type="button" class="task-action-btn delete" data-action="delete" data-id="${task.id}">Delete</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function populateSubjectFilter() {
  const subjectFilter = document.getElementById('subjectFilter');
  const taskSubjectInput = document.getElementById('taskSubjectInput');

  const options = [
    '<option value="all">All Subjects</option>',
    ...SUBJECT_OPTIONS.map((subject) => `<option value="${subject}">${subject}</option>`),
  ];

  subjectFilter.innerHTML = options.join('');
  taskSubjectInput.innerHTML = ['<option value="">Select a subject</option>', ...SUBJECT_OPTIONS.map((subject) => `<option value="${subject}">${subject}</option>`)].join('');

  subjectFilter.value = state.filters.subject || 'all';
}

function renderSubjects() {
  const tasks = loadTasks();
  const grouped = {};

  SUBJECT_OPTIONS.forEach((subject) => {
    grouped[subject] = { total: 0, completed: 0 };
  });

  tasks.forEach((task) => {
    const subject = SUBJECT_OPTIONS.includes(task.subject) ? task.subject : 'Other';
    if (!grouped[subject]) {
      grouped[subject] = { total: 0, completed: 0 };
    }

    grouped[subject].total += 1;
    if (task.completed) {
      grouped[subject].completed += 1;
    }
  });

  const cards = SUBJECT_OPTIONS.map((subject) => {
    const stats = grouped[subject] || { total: 0, completed: 0 };
    const progress = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
    const isActive = state.selectedSubject === subject;

    return `
      <button type="button" class="subject-card ${isActive ? 'active' : ''}" data-subject="${subject}">
        <h4>${escapeHtml(subject)}</h4>
        <p>${stats.total} Tasks</p>
        <p>Completed: ${stats.completed}</p>
        <div class="subject-progress-mini"><span style="width: ${progress}%"></span></div>
      </button>
    `;
  }).join('');

  document.getElementById('subjectsGrid').innerHTML = cards;

  const selectedSubject = state.selectedSubject || SUBJECT_OPTIONS[0];
  const subjectTasks = tasks.filter((task) => task.subject === selectedSubject);

  document.getElementById('subjectTaskList').innerHTML = subjectTasks.length
    ? subjectTasks
        .map((task) => `
          <article class="task-card ${task.completed ? 'completed' : ''} ${isOverdue(task) ? 'overdue' : ''}">
            <div class="task-card-header">
              <div class="task-main">
                <h4 class="task-title">${escapeHtml(task.title)}</h4>
                <p class="task-subject">${escapeHtml(task.subject)}</p>
              </div>
              <button type="button" class="task-check ${task.completed ? 'checked' : ''}" data-action="toggle" data-id="${task.id}" aria-label="Toggle task completion"></button>
            </div>
            <div class="task-meta">
              <div class="task-meta-group">
                <span>📅 ${formatDisplayDate(task.date)}</span>
                <span>⏱ ${task.studyTime} hours</span>
              </div>
              <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
            </div>
            <div class="task-actions">
              ${isOverdue(task) ? '<span class="task-status overdue">🔴 Overdue</span>' : task.completed ? '<span class="task-status complete">✓ Completed</span>' : '<span class="task-status pending">⏳ Pending</span>'}
              <button type="button" class="task-action-btn" data-action="edit" data-id="${task.id}">Edit</button>
              <button type="button" class="task-action-btn delete" data-action="delete" data-id="${task.id}">Delete</button>
            </div>
          </article>
        `)
        .join('')
    : `
      <div class="empty-state">
        <span class="empty-icon">📚</span>
        <h4>No tasks for this subject</h4>
        <p>Try a different subject or add a new task.</p>
      </div>
    `;

  state.selectedSubject = selectedSubject;
}

function renderProgress() {
  const tasks = loadTasks();
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const pending = total - completed;
  const overall = total ? Math.round((completed / total) * 100) : 0;

  const overallBar = document.getElementById('overallProgressBar');
  const overallValue = document.getElementById('overallProgressValue');

  overallBar.style.width = `${overall}%`;
  overallValue.textContent = `${overall}%`;

  document.getElementById('progressTotalTasks').textContent = String(total);
  document.getElementById('progressCompletedTasks').textContent = String(completed);
  document.getElementById('progressPendingTasks').textContent = String(pending);

  const groups = {};
  tasks.forEach((task) => {
    if (!groups[task.subject]) {
      groups[task.subject] = { total: 0, completed: 0 };
    }
    groups[task.subject].total += 1;
    if (task.completed) {
      groups[task.subject].completed += 1;
    }
  });

  const list = document.getElementById('subjectProgressList');

  if (!Object.keys(groups).length) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📊</span>
        <h4>No progress data yet</h4>
        <p>Add tasks to track study performance.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = Object.keys(groups)
    .map((subject) => {
      const subjectStats = groups[subject];
      const percent = subjectStats.total ? Math.round((subjectStats.completed / subjectStats.total) * 100) : 0;
      const barWidth = Math.min(100, percent);

      return `
        <div class="subject-progress-item">
          <div class="subject-progress-top">
            <span>${escapeHtml(subject)}</span>
            <strong>${percent}%</strong>
          </div>
          <div class="progress-track">
            <span class="progress-fill" style="width: ${barWidth}%"></span>
          </div>
        </div>
      `;
    })
    .join('');
}

function updatePageTitle() {
  const titles = {
    dashboard: 'Dashboard',
    tasks: 'My Tasks',
    subjects: 'Subjects',
    progress: 'Progress',
  };

  document.getElementById('pageTitle').textContent = titles[state.currentView];

  const navButtons = document.querySelectorAll('.nav-item');
  navButtons.forEach((button) => {
    const isActive = button.dataset.view === state.currentView;
    button.classList.toggle('active', isActive);
  });

  const views = document.querySelectorAll('.page-view');
  views.forEach((view) => {
    view.classList.toggle('active', view.id === `${state.currentView}View`);
  });
}

function updateDateDisplay() {
  const date = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  document.getElementById('currentDate').textContent = date;
}

function openTaskModal(taskId = null) {
  const modal = document.getElementById('taskModal');
  const form = document.getElementById('taskForm');
  const titleInput = document.getElementById('taskTitleInput');
  const subjectInput = document.getElementById('taskSubjectInput');
  const dateInput = document.getElementById('taskDateInput');
  const priorityInput = document.getElementById('taskPriorityInput');
  const timeInput = document.getElementById('taskTimeInput');
  const errorBox = document.getElementById('taskFormError');

  errorBox.textContent = '';
  form.reset();

  if (taskId) {
    const task = loadTasks().find((item) => item.id === taskId);
    if (!task) {
      return;
    }

    titleInput.value = task.title;
    subjectInput.value = task.subject;
    dateInput.value = task.date;
    priorityInput.value = task.priority;
    timeInput.value = task.studyTime;
    document.getElementById('taskModalTitle').textContent = 'Edit Study Task';
    form.dataset.editingId = task.id;
  } else {
    document.getElementById('taskModalTitle').textContent = 'Add Study Task';
    form.dataset.editingId = '';
    dateInput.value = getTodayISO();
    priorityInput.value = 'Medium';
  }

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  titleInput.focus();
}

function closeTaskModal() {
  const modal = document.getElementById('taskModal');
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  document.getElementById('taskForm').reset();
  document.getElementById('taskFormError').textContent = '';
}

function openDeleteModal(taskId) {
  state.taskToDelete = taskId;
  const modal = document.getElementById('deleteModal');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeDeleteModal() {
  const modal = document.getElementById('deleteModal');
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  state.taskToDelete = null;
}

function validateTaskForm(formData) {
  if (!formData.title.trim()) {
    return 'Task title is required.';
  }

  if (!formData.subject) {
    return 'Subject is required.';
  }

  if (!formData.date) {
    return 'Date is required.';
  }

  if (!formData.priority) {
    return 'Priority is required.';
  }

  const studyTime = Number(formData.studyTime);
  if (!Number.isFinite(studyTime) || studyTime <= 0) {
    return 'Study time must be a valid positive number.';
  }

  return '';
}

function saveTaskFromForm(event) {
  event.preventDefault();

  const form = event.target;
  const formData = {
    title: document.getElementById('taskTitleInput').value,
    subject: document.getElementById('taskSubjectInput').value,
    date: document.getElementById('taskDateInput').value,
    priority: document.getElementById('taskPriorityInput').value,
    studyTime: document.getElementById('taskTimeInput').value,
  };

  const error = validateTaskForm(formData);
  const errorBox = document.getElementById('taskFormError');

  if (error) {
    errorBox.textContent = error;
    return;
  }

  const tasks = loadTasks();
  const editingId = form.dataset.editingId;

  if (editingId) {
    const existingTask = tasks.find((task) => task.id === editingId);
    const updatedTask = {
      ...existingTask,
      title: formData.title.trim(),
      subject: formData.subject,
      date: formData.date,
      priority: formData.priority,
      studyTime: Number(formData.studyTime),
      createdAt: existingTask?.createdAt || Date.now(),
    };

    const nextTasks = tasks.map((task) => (task.id === editingId ? normalizeTask(updatedTask) : task));
    saveTasks(nextTasks);
  } else {
    const newTask = normalizeTask({
      id: generateId(),
      title: formData.title.trim(),
      subject: formData.subject,
      date: formData.date,
      priority: formData.priority,
      studyTime: Number(formData.studyTime),
      completed: false,
      createdAt: Date.now(),
    });

    saveTasks([...tasks, newTask]);
  }

  closeTaskModal();
  renderApp();
}

function toggleTask(taskId) {
  const tasks = loadTasks();
  const nextTasks = tasks.map((task) => {
    if (task.id !== taskId) {
      return task;
    }

    return {
      ...task,
      completed: !task.completed,
    };
  });

  saveTasks(nextTasks);
  renderApp();
}

function deleteTask(taskId) {
  const tasks = loadTasks();
  const filteredTasks = tasks.filter((task) => task.id !== taskId);
  saveTasks(filteredTasks);
  closeDeleteModal();
  renderApp();
}

function renderApp() {
  updateDateDisplay();
  populateSubjectFilter();
  renderDashboard();
  renderTasks();
  renderSubjects();
  renderProgress();
  updatePageTitle();
}

function handleNavigationClick(event) {
  const trigger = event.target.closest('[data-view]');
  if (!trigger) {
    return;
  }

  state.currentView = trigger.dataset.view;
  updatePageTitle();
}

function handleTaskAction(event) {
  const target = event.target.closest('[data-action]');
  if (!target) {
    return;
  }

  const taskId = target.dataset.id;
  const action = target.dataset.action;

  if (action === 'toggle') {
    toggleTask(taskId);
    return;
  }

  if (action === 'edit') {
    openTaskModal(taskId);
    return;
  }

  if (action === 'delete') {
    openDeleteModal(taskId);
  }
}

function bindGlobalEvents() {
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', handleNavigationClick);
  });

  document.getElementById('taskSearchInput').addEventListener('input', (event) => {
    state.filters.search = event.target.value;
    renderTasks();
  });

  document.getElementById('statusFilter').addEventListener('change', (event) => {
    state.filters.status = event.target.value;
    renderTasks();
  });

  document.getElementById('subjectFilter').addEventListener('change', (event) => {
    state.filters.subject = event.target.value;
    renderTasks();
  });

  document.getElementById('priorityFilter').addEventListener('change', (event) => {
    state.filters.priority = event.target.value;
    renderTasks();
  });

  document.getElementById('sortSelect').addEventListener('change', (event) => {
    state.filters.sort = event.target.value;
    renderTasks();
  });

  document.querySelectorAll('[data-open-task="true"]').forEach((button) => {
    button.addEventListener('click', () => openTaskModal());
  });

  document.getElementById('addTaskBtn').addEventListener('click', () => openTaskModal());
  document.getElementById('dashboardAddTaskBtn').addEventListener('click', () => openTaskModal());
  document.getElementById('todayTasksAddBtn').addEventListener('click', () => openTaskModal());
  document.getElementById('viewTasksBtn').addEventListener('click', () => {
    state.currentView = 'tasks';
    updatePageTitle();
  });

  document.addEventListener('click', (event) => {
    const closeTrigger = event.target.closest('[data-close]');
    if (closeTrigger) {
      if (closeTrigger.dataset.close === 'task') {
        closeTaskModal();
      }
      if (closeTrigger.dataset.close === 'delete') {
        closeDeleteModal();
      }
    }

    const subjectCard = event.target.closest('[data-subject]');
    if (subjectCard) {
      state.selectedSubject = subjectCard.dataset.subject;
      state.currentView = 'subjects';
      updatePageTitle();
      renderSubjects();
    }

    if (event.target.closest('[data-action]')) {
      handleTaskAction(event);
    }

    if (event.target.closest('[data-open-task="true"]')) {
      openTaskModal();
    }
  });

  document.getElementById('taskForm').addEventListener('submit', saveTaskFromForm);
  document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
    if (state.taskToDelete) {
      deleteTask(state.taskToDelete);
    }
  });

  document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
  });

  document.addEventListener('click', (event) => {
    const sidebar = document.getElementById('sidebar');
    const menuButton = document.getElementById('mobileMenuBtn');

    if (
      window.innerWidth <= 980 &&
      sidebar.classList.contains('open') &&
      !sidebar.contains(event.target) &&
      !menuButton.contains(event.target)
    ) {
      sidebar.classList.remove('open');
    }
  });
}

function init() {
  initializeStorage();
  renderApp();
  bindGlobalEvents();
}

window.addEventListener('DOMContentLoaded', init);
