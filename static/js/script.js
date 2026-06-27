document.addEventListener('DOMContentLoaded', () => {
    // ---- Navigation Logic ----
    const navLinks = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('section');
    const sidebar = document.querySelector('.sidebar');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Remove active class from all
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active-section'));

            // Add active class to clicked link and corresponding section
            link.classList.add('active');
            const targetId = link.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active-section');
            
            // Close sidebar on mobile after clicking a link
            if (sidebar) sidebar.classList.remove('show');
            
            // If switching to view section, auto-load students
            if (targetId === 'view-section') {
                loadViewStudents();
            } else if (targetId === 'dashboard-section') {
                loadDashboard();
            }
        });
    });

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('show');
        });
    }

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 992 && sidebar && sidebar.classList.contains('show')) {
            if (!sidebar.contains(e.target) && e.target !== mobileMenuBtn && !mobileMenuBtn.contains(e.target)) {
                sidebar.classList.remove('show');
            }
        }
    });

    // ---- File Upload Logic ----
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadForm = document.getElementById('uploadForm');
    const uploadStatus = document.getElementById('uploadStatus');

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--accent)';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'var(--border)';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border)';
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            dropZone.querySelector('p').innerText = e.dataTransfer.files[0].name;
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            dropZone.querySelector('p').innerText = fileInput.files[0].name;
        }
    });

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const className = document.getElementById('uploadClass').value;
        const file = fileInput.files[0];

        if (!file) {
            showStatus(uploadStatus, 'Please select a file.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('class_name', className);
        formData.append('file', file);

        uploadStatus.innerHTML = 'Uploading...';
        uploadStatus.className = '';

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (res.ok) {
                showStatus(uploadStatus, data.message, 'success');
                uploadForm.reset();
                dropZone.querySelector('p').innerHTML = 'Drag & Drop your file here or <span class="browse">browse</span>';
                loadDashboard();
                loadClasses();
            } else {
                showStatus(uploadStatus, data.error || 'Upload failed.', 'error');
            }
        } catch (err) {
            showStatus(uploadStatus, 'Error connecting to server.', 'error');
        }
    });

    // ---- Manual Add Logic ----
    const manualAddForm = document.getElementById('manualAddForm');
    const manualStatus = document.getElementById('manualStatus');

    manualAddForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            roll_no: document.getElementById('manRoll').value,
            admission_number: document.getElementById('manAdm').value,
            name: document.getElementById('manName').value,
            class_name: document.getElementById('manClass').value
        };

        try {
            const res = await fetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (res.ok) {
                showStatus(manualStatus, 'Student added successfully!', 'success');
                manualAddForm.reset();
                loadDashboard();
                loadClasses();
            } else {
                showStatus(manualStatus, data.error || 'Failed to add student.', 'error');
            }
        } catch (err) {
            showStatus(manualStatus, 'Error connecting to server.', 'error');
        }
    });

    // ---- Mark Records Logic ----
    const markFilterBtn = document.getElementById('markFilterBtn');
    const markClassFilter = document.getElementById('markClassFilter');
    const markTableBody = document.querySelector('#markTable tbody');

    let currentMarkPage = 1;

    const loadMarkStudents = async (page = 1) => {
        const className = markClassFilter.value.trim();
        let url = `/api/students?page=${page}&per_page=50`;
        if (className) {
            url += `&class_name=${encodeURIComponent(className)}`;
        }

        try {
            markTableBody.innerHTML = '';
            for(let i=0; i<3; i++) {
                markTableBody.innerHTML += `
                    <tr>
                        <td colspan="8"><div class="skeleton" style="height: 20px; width: 100%;"></div></td>
                    </tr>
                `;
            }

            const res = await fetch(url);
            const data = await res.json();
            const students = data.students || data;
            
            markTableBody.innerHTML = '';
            
            if (students.length === 0) {
                markTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No students found</td></tr>';
                document.getElementById('markPagination').style.display = 'none';
                return;
            }

            document.getElementById('markPagination').style.display = 'flex';
            document.getElementById('markPageInfo').innerText = `Page ${data.page} of ${data.total_pages}`;
            document.getElementById('markPrevPage').disabled = data.page <= 1;
            document.getElementById('markNextPage').disabled = data.page >= data.total_pages;
            currentMarkPage = data.page;

            students.forEach(student => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><input type="checkbox" class="bulk-select" value="${student.id}"></td>
                    <td>${student.roll_no || '-'}</td>
                    <td>${student.admission_number || '-'}</td>
                    <td>${student.name}</td>
                    <td>${student.class_name}</td>
                    <td>
                        <input type="checkbox" class="status-toggle" 
                            ${student.record_bought ? 'checked' : ''} 
                            onchange="updateStatus(${student.id}, 'record_bought', this.checked)">
                    </td>
                    <td>
                        <input type="checkbox" class="status-toggle" 
                            ${student.record_submitted ? 'checked' : ''} 
                            onchange="updateStatus(${student.id}, 'record_submitted', this.checked)">
                    </td>
                    <td>
                        <input type="text" class="remarks-input" value="${student.remarks || ''}"
                            placeholder="Add note..."
                            onblur="updateStatus(${student.id}, 'remarks', this.value)">
                    </td>
                `;
                markTableBody.appendChild(tr);
            });
            setupBulkSelect();
        } catch (err) {
            console.error(err);
        }
    };

    markFilterBtn.addEventListener('click', () => loadMarkStudents(1));
    
    // Auto-load when a class is selected from the dropdown
    markClassFilter.addEventListener('change', () => {
        if (markClassFilter.value) {
            loadMarkStudents(1);
        }
    });

    document.getElementById('markPrevPage').addEventListener('click', () => loadMarkStudents(currentMarkPage - 1));
    document.getElementById('markNextPage').addEventListener('click', () => loadMarkStudents(currentMarkPage + 1));

    const resetClassBtn = document.getElementById('resetClassBtn');
    resetClassBtn.addEventListener('click', async () => {
        const className = markClassFilter.value.trim();
        if (!className) {
            showToast('Please select a class to reset.', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to completely clear ALL tracking data (Bought, Submitted, Remarks) for every student in "${className}"? This cannot be undone.`)) {
            return;
        }

        try {
            const res = await fetch('/api/students/reset_class', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ class_name: className })
            });
            const data = await res.json();
            
            if (res.ok) {
                showToast(data.message, 'success');
                markFilterBtn.click(); // Automatically reload the table instantly
            } else {
                showToast(data.error || 'Failed to reset class data.', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Failed to connect to server.', 'error');
        }
    });

    // Setup bulk selection logic
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const bulkActionsContainer = document.getElementById('bulkActionsContainer');
    
    const setupBulkSelect = () => {
        const checkboxes = document.querySelectorAll('.bulk-select');
        selectAllCheckbox.checked = false;
        bulkActionsContainer.style.display = 'none';

        const checkState = () => {
            const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            bulkActionsContainer.style.display = anyChecked ? 'flex' : 'none';
            selectAllCheckbox.checked = allChecked && checkboxes.length > 0;
        };

        checkboxes.forEach(cb => cb.addEventListener('change', checkState));
        
        selectAllCheckbox.onchange = (e) => {
            checkboxes.forEach(cb => cb.checked = e.target.checked);
            checkState();
        };
    };

    const performBulkAction = async (field, value) => {
        const selectedCheckboxes = document.querySelectorAll('.bulk-select:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));
        if (!selectedIds.length) return;
        
        try {
            const res = await fetch('/api/students/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_ids: selectedIds, field, value })
            });
            
            if (res.ok) {
                // Optimistically update the UI instantly without reloading the table
                selectedCheckboxes.forEach(cb => {
                    const row = cb.closest('tr');
                    const toggles = row.querySelectorAll('.status-toggle');
                    
                    if (field === 'record_bought') toggles[0].checked = value;
                    if (field === 'record_submitted') toggles[1].checked = value;
                });
                
                showToast("Records updated successfully", "success");
                
                // Deselect checkboxes and hide bulk menu
                selectAllCheckbox.checked = false;
                selectedCheckboxes.forEach(cb => cb.checked = false);
                bulkActionsContainer.style.display = 'none';
            }
        } catch(err) { console.error('Bulk update failed', err); }
    };

    document.getElementById('bulkBoughtBtn').addEventListener('click', () => performBulkAction('record_bought', true));
    document.getElementById('bulkSubmittedBtn').addEventListener('click', () => performBulkAction('record_submitted', true));
    document.getElementById('bulkResetBtn').addEventListener('click', () => performBulkAction('reset', false));

    // Make updateStatus available globally
    window.updateStatus = async (id, field, value) => {
        const payload = {};
        payload[field] = value;
        
        try {
            await fetch(`/api/students/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.error('Failed to update status', err);
        }
    };

    // ---- Dashboard Logic ----
    let progressChartInstance = null;
    const loadDashboard = async () => {
        try {
            const res = await fetch('/api/analytics');
            const data = await res.json();
            
            document.getElementById('statTotal').innerText = data.total;
            document.getElementById('statBought').innerText = data.bought;
            document.getElementById('statSubmitted').innerText = data.submitted;
            
            const labels = Object.keys(data.classes);
            const boughtData = labels.map(c => data.classes[c].bought);
            const submittedData = labels.map(c => data.classes[c].submitted);
            
            Chart.defaults.color = document.body.getAttribute('data-theme') === 'dark' ? '#94a3b8' : '#64748b';
            
            const ctx = document.getElementById('progressChart').getContext('2d');
            if (progressChartInstance) {
                progressChartInstance.destroy();
            }
            progressChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Bought', data: boughtData, backgroundColor: '#4c6ef5' },
                        { label: 'Submitted', data: submittedData, backgroundColor: '#40c057' }
                    ]
                },
                options: {
                    responsive: true,
                    scales: { y: { beginAtZero: true } }
                }
            });
        } catch(err) { console.error('Failed to load analytics', err); }
    };

    // ---- View Records Logic ----
    const searchInput = document.getElementById('searchInput');
    const viewClassFilter = document.getElementById('viewClassFilter');
    const viewTableBody = document.querySelector('#viewTable tbody');

    let currentViewPage = 1;

    const loadViewStudents = async (page = 1) => {
        const query = searchInput.value.trim();
        const classFilter = viewClassFilter.value.trim();
        const params = new URLSearchParams({ page, per_page: 50 });
        if (query) params.append('search', query);
        if (classFilter) params.append('class_name', classFilter);
        
        const url = `/api/students?${params.toString()}`;

        try {
            viewTableBody.innerHTML = '';
            for(let i=0; i<3; i++) {
                viewTableBody.innerHTML += `
                    <tr>
                        <td colspan="6"><div class="skeleton" style="height: 20px; width: 100%;"></div></td>
                    </tr>
                `;
            }

            const res = await fetch(url);
            const data = await res.json();
            const students = data.students || data;
            
            viewTableBody.innerHTML = '';
            
            if (students.length === 0) {
                viewTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No students found</td></tr>';
                document.getElementById('viewPagination').style.display = 'none';
                return;
            }

            document.getElementById('viewPagination').style.display = 'flex';
            document.getElementById('viewPageInfo').innerText = `Page ${data.page} of ${data.total_pages}`;
            document.getElementById('viewPrevPage').disabled = data.page <= 1;
            document.getElementById('viewNextPage').disabled = data.page >= data.total_pages;
            currentViewPage = data.page;

            students.forEach(student => {
                const tr = document.createElement('tr');
                const boughtDate = student.bought_at ? `<br><small style="color:var(--text-muted)">${new Date(student.bought_at).toLocaleDateString()}</small>` : '';
                const submittedDate = student.submitted_at ? `<br><small style="color:var(--text-muted)">${new Date(student.submitted_at).toLocaleDateString()}</small>` : '';
                
                tr.innerHTML = `
                    <td>${student.name}</td>
                    <td>${student.admission_number || '-'}</td>
                    <td>${student.class_name}</td>
                    <td>
                        <span style="color: ${student.record_bought ? 'var(--success)' : 'var(--text-muted)'}">
                            ${student.record_bought ? '✓ Bought' + boughtDate : 'Pending'}
                        </span>
                    </td>
                    <td>
                        <span style="color: ${student.record_submitted ? 'var(--success)' : 'var(--text-muted)'}">
                            ${student.record_submitted ? '✓ Submitted' + submittedDate : 'Pending'}
                        </span>
                    </td>
                    <td>${student.remarks || '-'}</td>
                `;
                viewTableBody.appendChild(tr);
            });
        } catch (err) {
            console.error(err);
        }
    };

    // Debounce search
    let timeoutId;
    searchInput.addEventListener('input', () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => loadViewStudents(1), 300);
    });

    viewClassFilter.addEventListener('change', () => loadViewStudents(1));
    document.getElementById('viewPrevPage').addEventListener('click', () => loadViewStudents(currentViewPage - 1));
    document.getElementById('viewNextPage').addEventListener('click', () => loadViewStudents(currentViewPage + 1));

    document.getElementById('exportBtn').addEventListener('click', () => {
        const query = searchInput.value.trim();
        const classFilter = viewClassFilter.value.trim();
        const params = new URLSearchParams();
        if (query) params.append('search', query);
        if (classFilter) params.append('class_name', classFilter);
        
        let url = '/api/export';
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        window.location.href = url;
    });

    // Helper Function
    function showStatus(element, message, type) {
        showToast(message, type);
    }

    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return; // Fallback if container is missing
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerText = message;
        
        container.appendChild(toast);
        
        // Trigger reflow to apply transition
        toast.offsetHeight;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400); // Wait for transition
        }, 3000);
    }

    // Theme Toggle Logic
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle.querySelector('.theme-icon');
    const themeText = themeToggle.querySelector('.theme-text');
    
    const setTheme = (isDark) => {
        if (isDark) {
            document.body.setAttribute('data-theme', 'dark');
            themeText.innerText = 'Light Mode';
            themeIcon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
            themeText.innerText = 'Dark Mode';
            themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
            localStorage.setItem('theme', 'light');
        }
        
        // If viewing dashboard, reload chart to update colors
        if (progressChartInstance) {
            loadDashboard(); 
        }
    };

    themeToggle.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        setTheme(!isDark);
    });

    // Initialize Theme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        setTheme(true);
    }

    // Load Unique Classes for Dropdowns
    async function loadClasses() {
        try {
            const res = await fetch('/api/classes');
            const classes = await res.json();
            
            const markSelect = document.getElementById('markClassFilter');
            const viewSelect = document.getElementById('viewClassFilter');
            
            const currentMark = markSelect.value;
            const currentView = viewSelect.value;
            
            markSelect.innerHTML = '<option value="">Select a Class...</option>';
            viewSelect.innerHTML = '<option value="">All Classes</option>';
            
            classes.forEach(c => {
                markSelect.innerHTML += `<option value="${c}">${c}</option>`;
                viewSelect.innerHTML += `<option value="${c}">${c}</option>`;
            });
            
            markSelect.value = currentMark;
            viewSelect.value = currentView;
        } catch (e) {
            console.error("Failed to load classes", e);
        }
    }
    
    loadClasses();
});
