// profile.js - Profile page functionality

document.addEventListener('DOMContentLoaded', () => {
    // Load user profile data
    loadUserProfile();

    // Set up event listeners
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }

    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', handlePasswordUpdate);
    }

    const imageUpload = document.getElementById('imageUpload');
    if (imageUpload) {
        imageUpload.addEventListener('change', handleImageUpload);
    }

    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', handleAccountDelete);
    }

    // Tab navigation
    const tabLinks = document.querySelectorAll('.list-group-item');
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all tabs
            tabLinks.forEach(item => item.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show corresponding tab content
            const tabId = this.getAttribute('href').substring(1);
            const tabPanes = document.querySelectorAll('.tab-pane');
            tabPanes.forEach(pane => {
                pane.classList.remove('show', 'active');
                if (pane.id === tabId) {
                    pane.classList.add('show', 'active');
                }
            });
        });
    });
});

// Load user profile data from server
async function loadUserProfile() {
    try {
        const response = await fetch('/user/profile', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.ok) {
            const userData = await response.json();
            populateProfileData(userData);
        } else {
            console.error('Failed to load profile data');
            // Redirect to login if unauthorized
            if (response.status === 401) {
                window.location.href = '/login';
            }
        }
    } catch (error) {
        console.error('Error loading profile data:', error);
    }
}

// Populate profile data in the form
function populateProfileData(userData) {
    // Update profile sidebar
    document.getElementById('profileName').textContent = userData.fullName || '';
    document.getElementById('profileEmail').textContent = userData.email || '';
    
    // If user has a profile image
    if (userData.profileImage) {
        document.getElementById('profileImage').src = userData.profileImage;
    }
    
    // Show admin dashboard button if user is admin
    const adminElements = document.querySelectorAll('.admin-only');
    if (userData.accountType === 'admin') {
        adminElements.forEach(el => {
            el.classList.remove('d-none');
            // Add admin badge if not exists
            if (!document.querySelector('.admin-badge')) {
                const badge = document.createElement('span');
                badge.className = 'badge bg-danger ms-2 admin-badge';
                badge.textContent = 'Admin';
                document.getElementById('profileName').appendChild(badge);
            }
        });
    } else {
        adminElements.forEach(el => el.classList.add('d-none'));
    }
    
    // Populate form fields
    if (userData.fullName) {
        const nameParts = userData.fullName.split(' ');
        document.getElementById('firstName').value = nameParts[0] || '';
        document.getElementById('lastName').value = nameParts.slice(1).join(' ') || '';
    }
    
    document.getElementById('email').value = userData.email || '';
    
    // Populate additional fields if they exist
    if (userData.phone) document.getElementById('phone').value = userData.phone;
    if (userData.address) document.getElementById('address').value = userData.address;
    
    // Populate notification preferences if they exist
    if (userData.preferences) {
        if (document.getElementById('emailNotifications')) {
            document.getElementById('emailNotifications').checked = userData.preferences.emailNotifications || false;
        }
        if (document.getElementById('smsNotifications')) {
            document.getElementById('smsNotifications').checked = userData.preferences.smsNotifications || false;
        }
    }
    
    // Populate applications list if available
    if (userData.applications && userData.applications.length > 0) {
        const applicationsContainer = document.getElementById('applicationsList');
        if (applicationsContainer) {
            applicationsContainer.innerHTML = '';
            userData.applications.forEach(app => {
                applicationsContainer.innerHTML += `
                    <div class="card mb-3">
                        <div class="card-body">
                            <h5 class="card-title">${app.petName}</h5>
                            <p class="card-text">Status: <span class="badge ${getStatusBadgeClass(app.status)}">${app.status}</span></p>
                            <p class="card-text">Applied on: ${new Date(app.date).toLocaleDateString()}</p>
                            <a href="/pet-details.html?id=${app.petId}" class="btn btn-sm btn-outline-primary">View Pet</a>
                        </div>
                    </div>
                `;
            });
        }
    } else {
        // Show empty state
        const applicationsContainer = document.getElementById('applicationsList');
        if (applicationsContainer) {
            applicationsContainer.innerHTML = '<p class="text-muted">You have no active applications.</p>';
        }
    }
    
    // Populate favorites list if available
    if (userData.favorites && userData.favorites.length > 0) {
        const favoritesContainer = document.getElementById('favoritesList');
        if (favoritesContainer) {
            favoritesContainer.innerHTML = '';
            userData.favorites.forEach(pet => {
                favoritesContainer.innerHTML += `
                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card h-100">
                            <img src="${pet.image || '/api/placeholder/300/200'}" class="card-img-top" alt="${pet.name}">
                            <div class="card-body">
                                <h5 class="card-title">${pet.name}</h5>
                                <p class="card-text">${pet.breed} • ${pet.age}</p>
                                <a href="/pet-details.html?id=${pet.id}" class="btn btn-sm btn-primary">View Details</a>
                                <button class="btn btn-sm btn-outline-danger remove-favorite" data-pet-id="${pet.id}">
                                    <i class="fas fa-heart-broken"></i> Remove
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            // Add event listeners to remove favorite buttons
            document.querySelectorAll('.remove-favorite').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const petId = e.target.closest('button').dataset.petId;
                    await removeFavorite(petId);
                });
            });
        }
    } else {
        // Show empty state
        const favoritesContainer = document.getElementById('favoritesList');
        if (favoritesContainer) {
            favoritesContainer.innerHTML = '<div class="col-12"><p class="text-muted">You have no favorite pets.</p></div>';
        }
    }
}

// Get appropriate badge class based on application status
function getStatusBadgeClass(status) {
    switch(status.toLowerCase()) {
        case 'approved':
            return 'bg-success';
        case 'pending':
            return 'bg-warning';
        case 'rejected':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

// Handle profile update
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;
    
    try {
        const response = await fetch('/user/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fullName: `${firstName} ${lastName}`.trim(),
                phone,
                address
            }),
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            // Update displayed name
            document.getElementById('profileName').textContent = result.fullName;
            alert('Profile updated successfully!');
        } else {
            alert('Failed to update profile. Please try again.');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('An error occurred while updating your profile.');
    }
}

// Handle password update
async function handlePasswordUpdate(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        alert('New passwords do not match!');
        return;
    }
    
    try {
        const response = await fetch('/user/password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            }),
            credentials: 'include'
        });
        
        if (response.ok) {
            alert('Password updated successfully!');
            document.getElementById('settingsForm').reset();
        } else {
            const data = await response.json();
            alert(data.message || 'Failed to update password. Please try again.');
        }
    } catch (error) {
        console.error('Error updating password:', error);
        alert('An error occurred while updating your password.');
    }
}

// Handle profile image upload
async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('profileImage', file);
    
    try {
        const response = await fetch('/user/profile-image', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            // Update profile image in profile page
            document.getElementById('profileImage').src = data.imageUrl;
            
            // Also update the avatar in the navigation bar
            const userAvatar = document.getElementById('userAvatar');
            if (userAvatar) {
                userAvatar.src = data.imageUrl;
            }
            
            alert('Profile image updated successfully!');
        } else {
            alert('Failed to upload image. Please try again.');
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        alert('An error occurred while uploading your image.');
    }
}

// Handle account deletion
async function handleAccountDelete(e) {
    e.preventDefault();
    
    const confirmation = confirm("Are you sure you want to delete your account? This action cannot be undone.");
    if (!confirmation) return;
    
    try {
        const response = await fetch('/user/account', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            alert('Your account has been deleted successfully.');
            window.location.href = '/login';
        } else {
            alert('Failed to delete account. Please try again.');
        }
    } catch (error) {
        console.error('Error deleting account:', error);
        alert('An error occurred while deleting your account.');
    }
}

// Function to remove a pet from favorites
async function removeFavorite(petId) {
    try {
        const response = await fetch(`/user/favorites/${petId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            // Reload user profile to update favorites
            loadUserProfile();
        } else {
            alert('Failed to remove pet from favorites. Please try again.');
        }
    } catch (error) {
        console.error('Error removing favorite:', error);
        alert('An error occurred while removing the pet from favorites.');
    }
}