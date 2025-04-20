// Dashboard JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Firebase from the auth.js file which should already be linked
    
    const logoutBtn = document.getElementById('logoutBtn');
    const sidebarLogout = document.getElementById('sidebarLogout');
    const welcomeUserName = document.getElementById('welcomeUserName');
    const dashboardUserName = document.getElementById('dashboardUserName');
    const dashboardUserAvatar = document.getElementById('dashboardUserAvatar');
    const userEmail = document.getElementById('userEmail');
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    const applicationsList = document.getElementById('applicationsList');
    const noApplications = document.getElementById('noApplications');
    const favoritesList = document.getElementById('favoritesList');
    const noFavorites = document.getElementById('noFavorites');
    const adminElements = document.querySelectorAll('.admin-only');
  
    // Check authentication state
    firebase.auth().onAuthStateChanged(async (user) => {
      if (user) {
        // User is signed in
        console.log('User is signed in:', user);
        
        // Update UI with user info
        updateUserInfo(user);
        
        // Check if user is admin
        checkAdminStatus(user.uid);
        
        // Load user's applications
        loadUserApplications(user.uid);
        
        // Load user's favorite pets
        loadUserFavorites(user.uid);
        
      } else {
        // User is signed out, redirect to login page
        console.log('No user is signed in, redirecting to login page');
        window.location.href = 'index.html';
      }
    });
    
    // Update user information in the UI
    const updateUserInfo = (user) => {
      const displayName = user.displayName || 'User';
      const photoURL = user.photoURL || '/api/placeholder/100/100';
      const email = user.email || '';
      
      // Update welcome message
      if (welcomeUserName) welcomeUserName.textContent = displayName;
      
      // Update sidebar user info
      if (dashboardUserName) dashboardUserName.textContent = displayName;
      if (dashboardUserAvatar) dashboardUserAvatar.src = photoURL;
      if (userEmail) userEmail.textContent = email;
      
      // Update header user info
      if (userName) userName.textContent = displayName;
      if (userAvatar) userAvatar.src = photoURL;
    };
    
    // Check if user has admin privileges
    const checkAdminStatus = async (userId) => {
      try {
        const userDoc = await firebase.firestore().collection('users').doc(userId).get();
        const userData = userDoc.data();
        
        if (userData && userData.isAdmin) {
          // Show admin elements
          adminElements.forEach(el => el.style.display = 'block');
        } else {
          // Hide admin elements
          adminElements.forEach(el => el.style.display = 'none');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        // Hide admin elements on error
        adminElements.forEach(el => el.style.display = 'none');
      }
    };
    
    // Load user's adoption applications
    const loadUserApplications = async (userId) => {
      try {
        const applicationsSnapshot = await firebase.firestore()
          .collection('applications')
          .where('userId', '==', userId)
          .orderBy('submittedAt', 'desc')
          .limit(5)
          .get();
        
        if (!applicationsSnapshot.empty) {
          // Hide the "no applications" message
          if (noApplications) noApplications.style.display = 'none';
          
          // Clear existing content
          if (applicationsList) {
            // Create a container for applications
            const applicationsContainer = document.createElement('div');
            applicationsContainer.className = 'list-group list-group-flush';
            
            // Add each application
            applicationsSnapshot.forEach(async (doc) => {
              const application = doc.data();
              
              // Get pet details
              let petName = 'Unknown Pet';
              let petType = 'unknown';
              
              try {
                const petDoc = await firebase.firestore().collection('pets').doc(application.petId).get();
                if (petDoc.exists) {
                  const petData = petDoc.data();
                  petName = petData.name;
                  petType = petData.type;
                }
              } catch (error) {
                console.error('Error fetching pet details:', error);
              }
              
              // Format date
              const submittedDate = application.submittedAt ? 
                new Date(application.submittedAt.toDate()).toLocaleDateString() : 
                'Unknown date';
              
              // Create application item
              const applicationItem = document.createElement('a');
              applicationItem.href = `application-details.html?id=${doc.id}`;
              applicationItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
              
              // Status badge styles
              let badgeClass = 'bg-secondary';
              switch(application.status) {
                case 'approved':
                  badgeClass = 'bg-success';
                  break;
                case 'pending':
                  badgeClass = 'bg-warning';
                  break;
                case 'rejected':
                  badgeClass = 'bg-danger';
                  break;
                case 'reviewing':
                  badgeClass = 'bg-info';
                  break;
              }
              
              // Create application content
              applicationItem.innerHTML = `
                <div class="d-flex flex-column">
                  <div class="d-flex align-items-center">
                    <h6 class="mb-0">${petName}</h6>
                    <span class="badge ${badgeClass} ms-2">${application.status || 'pending'}</span>
                  </div>
                  <small class="text-muted">
                    <i class="fas ${petType === 'dog' ? 'fa-dog' : petType === 'cat' ? 'fa-cat' : 'fa-paw'} me-1"></i> 
                    Application #${doc.id.substring(0, 8)} • Submitted on ${submittedDate}
                  </small>
                </div>
                <i class="fas fa-chevron-right text-muted"></i>
              `;
              
              applicationsContainer.appendChild(applicationItem);
            });
            
            // Add the applications container to the applications list
            applicationsList.innerHTML = '';
            applicationsList.appendChild(applicationsContainer);
          }
        } else {
          // Show the "no applications" message
          if (noApplications) noApplications.style.display = 'block';
        }
      } catch (error) {
        console.error('Error loading applications:', error);
        // Show error message
        if (applicationsList) {
          applicationsList.innerHTML = `
            <div class="alert alert-danger" role="alert">
              Error loading applications. Please try again later.
            </div>
          `;
        }
      }
    };
    
    // Load user's favorite pets
    const loadUserFavorites = async (userId) => {
      try {
        const favoritesSnapshot = await firebase.firestore()
          .collection('favorites')
          .where('userId', '==', userId)
          .limit(6)
          .get();
        
        if (!favoritesSnapshot.empty) {
          // Hide the "no favorites" message
          if (noFavorites) noFavorites.style.display = 'none';
          
          // Clear existing content
          if (favoritesList) {
            favoritesList.innerHTML = '';
            
            // Add each favorite pet
            const promises = favoritesSnapshot.docs.map(async doc => {
              const favorite = doc.data();
              
              try {
                const petDoc = await firebase.firestore().collection('pets').doc(favorite.petId).get();
                
                if (petDoc.exists) {
                  const petData = petDoc.data();
                  
                  // Create pet card
                  const petCol = document.createElement('div');
                  petCol.className = 'col-md-4 mb-3';
                  
                  // Get badge class based on pet type
                  let badgeClass = 'bg-primary';
                  if (petData.type === 'cat') badgeClass = 'bg-info';
                  else if (petData.type === 'rabbit' || petData.type === 'bird' || petData.type === 'small-animal') {
                    badgeClass = 'bg-success';
                  }
                  
                  petCol.innerHTML = `
                    <div class="card h-100 border-0 shadow-sm">
                      <img src="${petData.photoURL || '/api/placeholder/400/300'}" class="card-img-top" alt="${petData.name}">
                      <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                          <h6 class="card-title mb-0">${petData.name}</h6>
                          <span class="badge ${badgeClass}">${petData.type}</span>
                        </div>
                        <p class="card-text small text-muted mb-2">
                          ${petData.age || ''} ${petData.breed ? '• ' + petData.breed : ''} ${petData.gender ? '• ' + petData.gender : ''}
                        </p>
                      </div>
                      <div class="card-footer bg-white border-0 pt-0">
                        <a href="pet-details.html?id=${petDoc.id}" class="btn btn-sm btn-outline-primary w-100">View Details</a>
                      </div>
                    </div>
                  `;
                  
                  favoritesList.appendChild(petCol);
                }
              } catch (error) {
                console.error('Error fetching pet details:', error);
              }
            });
            
            await Promise.all(promises);
          }
        } else {
          // Show the "no favorites" message
          if (noFavorites) noFavorites.style.display = 'block';
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
        // Show error message
        if (favoritesList) {
          favoritesList.innerHTML = `
            <div class="col-12">
              <div class="alert alert-danger" role="alert">
                Error loading favorite pets. Please try again later.
              </div>
            </div>
          `;
        }
      }
    };
    
    // Handle logout
    const handleLogout = async () => {
      try {
        await firebase.auth().signOut();
        // Clear any stored preferences
        localStorage.removeItem('rememberMe');
        // Redirect to home or login page
        window.location.href = 'index.html';
      } catch (error) {
        console.error('Error signing out:', error);
        alert('Error signing out. Please try again.');
      }
    };
    
    // Attach logout event listeners
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
      });
    }
    
    if (sidebarLogout) {
      sidebarLogout.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
      });
    }
  });