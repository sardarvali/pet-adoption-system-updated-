document.addEventListener('DOMContentLoaded', () => {
    // Check admin status and load data
    checkAdminStatus().then(() => {
        loadAdminData();
    });

    // Setup event listeners
    setupEventListeners();
});

async function checkAdminStatus() {
    try {
        const response = await fetch('/user/profile', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            window.location.href = '/login';
            return;
        }

        const userData = await response.json();
        if (userData.accountType !== 'admin') {
            window.location.href = '/home.html';
        }

        // Update UI with admin info
        document.getElementById('userName').textContent = userData.fullName || 'Admin';
        if (userData.profileImage) {
            document.getElementById('userAvatar').src = userData.profileImage;
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
        window.location.href = '/login';
    }
}

function setupEventListeners() {
    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

    // Add pet form
    document.getElementById('addPetForm')?.addEventListener('submit', handleAddPet);

    // Navigation - smooth scroll to sections
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}

async function loadAdminData() {
    try {
        // Load dashboard stats
        const dashboardResponse = await fetch('/admin/dashboard', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (dashboardResponse.ok) {
            const dashboardData = await dashboardResponse.json();
            document.getElementById('totalPets').textContent = dashboardData.totalPets;
            document.getElementById('adoptedPets').textContent = dashboardData.adoptedPets;
            document.getElementById('pendingApplications').textContent = dashboardData.pendingApplications;
        }

        // Load pets table
        await loadPetsTable();

        // Load users table
        await loadUsersTable();

        // Load applications table
        await loadApplicationsTable();

    } catch (error) {
        console.error('Error loading admin data:', error);
        showAlert('Error loading dashboard data', 'danger');
    }
}

// PETS MANAGEMENT
async function loadPetsTable() {
    try {
        const response = await fetch('/admin/pets', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.ok) {
            const pets = await response.json();
            const tableBody = document.querySelector('#petsTable tbody');
            tableBody.innerHTML = '';

            pets.forEach(pet => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><img src="${pet.image || '/api/placeholder/50/50'}" alt="${pet.name}" width="50" height="50" class="rounded"></td>
                    <td>${pet.name}</td>
                    <td>${pet.type}</td>
                    <td>${pet.breed}</td>
                    <td>${pet.age}</td>
                    <td><span class="badge ${pet.adoptionStatus === 'available' ? 'bg-success' : 'bg-secondary'}">${pet.adoptionStatus}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary edit-pet" data-id="${pet._id}">Edit</button>
                        <button class="btn btn-sm btn-outline-danger delete-pet" data-id="${pet._id}">Delete</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            // Add event listeners for edit/delete buttons
            document.querySelectorAll('.edit-pet').forEach(btn => {
                btn.addEventListener('click', handleEditPet);
            });
            
            document.querySelectorAll('.delete-pet').forEach(btn => {
                btn.addEventListener('click', handleDeletePet);
            });
        }
    } catch (error) {
        console.error('Error loading pets:', error);
        showAlert('Error loading pets data', 'danger');
    }
}

async function handleAddPet(e) {
    e.preventDefault();
    
    // Create FormData from the form
    const form = e.target;
    const formData = new FormData(form);
    
    // Log the data (for debugging)
    console.log('Form data being sent:');
    for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
    }
    
    try {
        const response = await fetch('/admin/pets', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (response.ok) {
            showAlert('Pet added successfully!', 'success');
            form.reset();
            await loadPetsTable();
            await loadAdminData(); // Refresh dashboard stats
        } else {
            // Try to get more detailed error
            const error = await response.json().catch(() => ({ message: 'Unknown error' }));
            showAlert(error.message || 'Error adding pet', 'danger');
            console.error('Server response:', error);
        }
    } catch (error) {
        console.error('Error adding pet:', error);
        showAlert('Error adding pet', 'danger');
    }
}

async function handleEditPet(e) {
    const petId = e.target.dataset.id;
    // In a real implementation, you would show a modal with the pet's details
    // and allow editing. For now, we'll just show an alert.
    showAlert(`Edit pet with ID: ${petId}`, 'info');
}

async function handleDeletePet(e) {
    const petId = e.target.dataset.id;
    if (!confirm('Are you sure you want to delete this pet?')) return;

    try {
        const response = await fetch(`/admin/pets/${petId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.ok) {
            showAlert('Pet deleted successfully!', 'success');
            await loadPetsTable();
            await loadAdminData(); // Refresh dashboard stats
        } else {
            const error = await response.json();
            showAlert(error.message || 'Error deleting pet', 'danger');
        }
    } catch (error) {
        console.error('Error deleting pet:', error);
        showAlert('Error deleting pet', 'danger');
    }
}

// USERS MANAGEMENT
async function loadUsersTable() {
    try {
        const response = await fetch('/admin/users', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.ok) {
            const users = await response.json();
            const tableBody = document.querySelector('#usersTable tbody');
            tableBody.innerHTML = '';

            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.fullName}</td>
                    <td>${user.email}</td>
                    <td><span class="badge ${user.accountType === 'admin' ? 'bg-danger' : 'bg-primary'}">${user.accountType}</span></td>
                    <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-info view-user" data-id="${user._id}">View</button>
                        ${user.accountType !== 'admin' ? `<button class="btn btn-sm btn-outline-danger delete-user" data-id="${user._id}">Delete</button>` : ''}
                    </td>
                `;
                tableBody.appendChild(row);
            });

            // Add event listeners for view/delete buttons
            document.querySelectorAll('.view-user').forEach(btn => {
                btn.addEventListener('click', handleViewUser);
            });
            
            document.querySelectorAll('.delete-user').forEach(btn => {
                btn.addEventListener('click', handleDeleteUser);
            });
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('Error loading users data', 'danger');
    }
}

async function handleViewUser(e) {
    const userId = e.target.dataset.id;
    // In a real implementation, you would show a modal with the user's details
    showAlert(`View user with ID: ${userId}`, 'info');
}

async function handleDeleteUser(e) {
    const userId = e.target.dataset.id;
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        const response = await fetch(`/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.ok) {
            showAlert('User deleted successfully!', 'success');
            await loadUsersTable();
        } else {
            const error = await response.json();
            showAlert(error.message || 'Error deleting user', 'danger');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showAlert('Error deleting user', 'danger');
    }
}

// APPLICATIONS MANAGEMENT
async function loadApplicationsTable() {
    try {
        const response = await fetch('/admin/applications', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.ok) {
            const applications = await response.json();
            const tableBody = document.querySelector('#applicationsTable tbody');
            tableBody.innerHTML = '';

            applications.forEach(app => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${app.petName}</td>
                    <td>${app.userName}</td>
                    <td>${new Date(app.date).toLocaleDateString()}</td>
                    <td><span class="badge ${app.status === 'approved' ? 'bg-success' : app.status === 'rejected' ? 'bg-danger' : 'bg-warning text-dark'}">${app.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary view-application" data-id="${app._id}">View</button>
                        <button class="btn btn-sm btn-outline-success approve-application" data-id="${app._id}">Approve</button>
                        <button class="btn btn-sm btn-outline-danger reject-application" data-id="${app._id}">Reject</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            // Add event listeners for application buttons
            document.querySelectorAll('.view-application').forEach(btn => {
                btn.addEventListener('click', handleViewApplication);
            });
            
            document.querySelectorAll('.approve-application').forEach(btn => {
                btn.addEventListener('click', handleApproveApplication);
            });
            
            document.querySelectorAll('.reject-application').forEach(btn => {
                btn.addEventListener('click', handleRejectApplication);
            });
        }
    } catch (error) {
        console.error('Error loading applications:', error);
        showAlert('Error loading applications data', 'danger');
    }
}

async function handleViewApplication(e) {
    const applicationId = e.target.dataset.id;
    // In a real implementation, you would show a modal with application details
    showAlert(`View application with ID: ${applicationId}`, 'info');
}

async function handleApproveApplication(e) {
    const applicationId = e.target.dataset.id;
    if (!confirm('Are you sure you want to approve this application?')) return;

    try {
        const response = await fetch(`/admin/applications/${applicationId}/approve`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.ok) {
            showAlert('Application approved successfully!', 'success');
            await loadApplicationsTable();
            await loadAdminData(); // Refresh dashboard stats
        } else {
            const error = await response.json();
            showAlert(error.message || 'Error approving application', 'danger');
        }
    } catch (error) {
        console.error('Error approving application:', error);
        showAlert('Error approving application', 'danger');
    }
}

async function handleRejectApplication(e) {
    const applicationId = e.target.dataset.id;
    if (!confirm('Are you sure you want to reject this application?')) return;

    try {
        const response = await fetch(`/admin/applications/${applicationId}/reject`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.ok) {
            showAlert('Application rejected successfully!', 'success');
            await loadApplicationsTable();
            await loadAdminData(); // Refresh dashboard stats
        } else {
            const error = await response.json();
            showAlert(error.message || 'Error rejecting application', 'danger');
        }
    } catch (error) {
        console.error('Error rejecting application:', error);
        showAlert('Error rejecting application', 'danger');
    }
}

// UTILITY FUNCTIONS
async function handleLogout() {
    try {
        const response = await fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.ok) {
            window.location.href = '/login';
        } else {
            showAlert('Logout failed', 'danger');
        }
    } catch (error) {
        console.error('Error during logout:', error);
        showAlert('Error during logout', 'danger');
    }
}

function showAlert(message, type) {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '9999';
    alert.style.minWidth = '300px';
    alert.role = 'alert';
    
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to body
    document.body.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}