document.addEventListener('DOMContentLoaded', () => {
    // ---- Navigation Logic ----
    const navLinks = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('section');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Remove active class from all
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active-section'));

            // Add active class to clicked link and corresponding section
            link.classList.add('active');
            const targetId = link.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active-section');
            
            // If switching to view section, auto-load students
            if (targetId === 'view-section') {
                loadViewStudents();
            } else if (targetId === 'dashboard-section') {
                loadDashboard();
            }
        });
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

    markFilterBtn.addEventListener('click', async () => {
        const className = markClassFilter.value.trim();
        let url = '/api/students';
        if (className) {
            url += `?class_name=${encodeURIComponent(className)}`;
        }

        try {
            const res = await fetch(url);
            const students = await res.json();
            
            markTableBody.innerHTML = '';
            
            if (students.length === 0) {
                markTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No students found</td></tr>';
                return;
            }

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
        const selectedIds = Array.from(document.querySelectorAll('.bulk-select:checked')).map(cb => parseInt(cb.value));
        if (!selectedIds.length) return;
        
        try {
            await fetch('/api/students/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_ids: selectedIds, field, value })
            });
            document.getElementById('markFilterBtn').click(); // Reload table
        } catch(err) { console.error('Bulk update failed', err); }
    };

    document.getElementById('bulkBoughtBtn').addEventListener('click', () => performBulkAction('record_bought', true));
    document.getElementById('bulkSubmittedBtn').addEventListener('click', () => performBulkAction('record_submitted', true));

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
    const viewTableBody = document.querySelector('#viewTable tbody');

    const loadViewStudents = async () => {
        const query = searchInput.value.trim();
        let url = '/api/students';
        if (query) {
            url += `?search=${encodeURIComponent(query)}`;
        }

        try {
            const res = await fetch(url);
            const students = await res.json();
            
            viewTableBody.innerHTML = '';
            
            if (students.length === 0) {
                viewTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No students found</td></tr>';
                return;
            }

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
        timeoutId = setTimeout(loadViewStudents, 300);
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
        const query = searchInput.value.trim();
        let url = '/api/export';
        if (query) {
            url += `?search=${encodeURIComponent(query)}`;
        }
        window.location.href = url;
    });

    // Helper Function
    function showStatus(element, message, type) {
        element.textContent = message;
        element.className = `status-${type}`;
        setTimeout(() => element.textContent = '', 5000);
    }
});
