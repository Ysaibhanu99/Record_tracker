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
                `;
                markTableBody.appendChild(tr);
            });
        } catch (err) {
            console.error(err);
        }
    });

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
                tr.innerHTML = `
                    <td>${student.name}</td>
                    <td>${student.admission_number || '-'}</td>
                    <td>${student.class_name}</td>
                    <td>
                        <span style="color: ${student.record_bought ? 'var(--success)' : 'var(--text-muted)'}">
                            ${student.record_bought ? '✓ Bought' : 'Pending'}
                        </span>
                    </td>
                    <td>
                        <span style="color: ${student.record_submitted ? 'var(--success)' : 'var(--text-muted)'}">
                            ${student.record_submitted ? '✓ Submitted' : 'Pending'}
                        </span>
                    </td>
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

    // Helper Function
    function showStatus(element, message, type) {
        element.textContent = message;
        element.className = `status-${type}`;
        setTimeout(() => element.textContent = '', 5000);
    }
});
