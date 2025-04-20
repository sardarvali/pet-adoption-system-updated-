// home.js - Main page functionality

document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in
  checkAuthStatus();
  loadFeaturedPets();
    

  // Event listeners
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
  }

  // Search form functionality
  const petSearchForm = document.getElementById('petSearchForm');
  if (petSearchForm) {
      petSearchForm.addEventListener('submit', (e) => {
          e.preventDefault();
          // Implement search functionality
          console.log('Search submitted');
      });
  }
});
async function loadFeaturedPets() {
    try {
        const response = await fetch('/api/pets?limit=3');
        const pets = await response.json();
        const featuredContainer = document.getElementById('featuredPets');
        
        featuredContainer.innerHTML = '';
        
        pets.forEach(pet => {
            const petCard = `
                <div class="col-md-4 mb-4">
                    <div class="card h-100 border-0 shadow-sm">
                        <img src="${pet.image || '/api/placeholder/400/300'}" class="card-img-top" alt="${pet.name}">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h5 class="card-title mb-0">${pet.name}</h5>
                                <span class="badge bg-primary">${pet.type}</span>
                            </div>
                            <p class="card-text text-muted small mb-2">${pet.age} • ${pet.breed} • ${pet.gender}</p>
                            <p class="card-text">${pet.description || 'No description available'}</p>
                        </div>
                        <div class="card-footer bg-white border-0 pt-0">
                            <a href="pet-details.html?id=${pet._id}" class="btn btn-outline-primary w-100">View Details</a>
                        </div>
                    </div>
                </div>
            `;
            featuredContainer.insertAdjacentHTML('beforeend', petCard);
        });
    } catch (error) {
        console.error('Error loading featured pets:', error);
    }
}

// Check if user is logged in and update UI accordingly
async function checkAuthStatus() {
  try {
      const response = await fetch('/user/profile', {
          method: 'GET',
          headers: {
              'Content-Type': 'application/json'
          },
          credentials: 'include' // Include cookies for session
      });

      if (response.ok) {
          const userData = await response.json();
          updateUIForLoggedInUser(userData);
      } else {
          updateUIForLoggedOutUser();
      }
  } catch (error) {
      console.error('Error checking authentication status:', error);
      updateUIForLoggedOutUser();
  }
}

// Update UI elements for logged in user
function updateUIForLoggedInUser(userData) {
    // Hide login/signup buttons
    const authButtons = document.querySelector('.auth-buttons');
    if (authButtons) {
        authButtons.classList.add('d-none');
    }

    // Show user dropdown
    const userDropdown = document.querySelector('.user-dropdown');
    if (userDropdown) {
        userDropdown.classList.remove('d-none');
        
        // Update user information
        const userName = document.getElementById('userName');
        if (userName) {
            userName.textContent = userData.fullName || 'User';
        }
        
        // Update user avatar if available
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar && userData.profileImage) {
            userAvatar.src = userData.profileImage;
        }
        
        // Show/hide admin options if user is admin
        const adminElements = document.querySelectorAll('.admin-only');
        if (userData.accountType === 'admin') {
            adminElements.forEach(el => {
                el.classList.remove('d-none');
                el.style.display = ''; // Remove any inline display:none
            });
            
            // Add admin badge next to username if not already present
            if (!document.querySelector('.admin-badge')) {
                const badge = document.createElement('span');
                badge.className = 'badge bg-danger ms-1 admin-badge';
                badge.textContent = 'Admin';
                userName.parentNode.appendChild(badge);
            }
        } else {
            adminElements.forEach(el => {
                el.classList.add('d-none');
                el.style.display = 'none'; // Ensure it's hidden
            });
        }
    }
}

// Update UI elements for logged out user
function updateUIForLoggedOutUser() {
  // Show login/signup buttons
  const authButtons = document.querySelector('.auth-buttons');
  if (authButtons) {
      authButtons.classList.remove('d-none');
  }

  // Hide user dropdown
  const userDropdown = document.querySelector('.user-dropdown');
  if (userDropdown) {
      userDropdown.classList.add('d-none');
  }
}


// Handle user logout
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
          console.error('Logout failed');
      }
  } catch (error) {
      console.error('Error during logout:', error);
  }
}