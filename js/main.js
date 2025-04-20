import { initFirebase } from '../firebase/firebase-config.js';
import { getCurrentUser, isUserAdmin } from '../firebase/auth-service.js';

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize Firebase
        initFirebase();
        
        // Check authentication state
        const user = await getCurrentUser();
        updateUIForAuthState(user);
        
        // Setup logout functionality
        setupLogout();
    } catch (error) {
        console.error("Initialization error:", error);
    }
    
    async function updateUIForAuthState(user) {
        const authButtons = document.querySelector('.auth-buttons');
        const userDropdown = document.querySelector('.user-dropdown');
        const adminOnlyElements = document.querySelectorAll('.admin-only');
        
        if (user) {
            // User is logged in
            if (authButtons) authButtons.classList.add('d-none');
            if (userDropdown) {
                userDropdown.classList.remove('d-none');
                
                // Update user info
                const userName = document.getElementById('userName');
                const userAvatar = document.getElementById('userAvatar');
                
                if (userName) userName.textContent = user.displayName || 'User';
                if (userAvatar && user.photoURL) userAvatar.src = user.photoURL;
                
                // Check if admin
                const admin = await isUserAdmin(user.uid);
                adminOnlyElements.forEach(el => {
                    el.style.display = admin ? '' : 'none';
                });
            }
        } else {
            // No user is logged in
            if (authButtons) authButtons.classList.remove('d-none');
            if (userDropdown) userDropdown.classList.add('d-none');
            
            // Hide admin elements
            adminOnlyElements.forEach(el => {
                el.style.display = 'none';
            });
            
            // Redirect to login if on a protected page
            const currentPage = window.location.pathname.split('/').pop();
            const protectedPages = [
                'profile.html', 'favorites.html', 'applications.html', 
                'admin-dashboard.html'
            ];
            
            if (protectedPages.includes(currentPage)) {
                window.location.href = 'index.html';
            }
        }
    }
    
    function setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await firebase.auth().signOut();
                    window.location.href = 'index.html';
                } catch (error) {
                    console.error("Logout error:", error);
                }
            });
        }
    }
});