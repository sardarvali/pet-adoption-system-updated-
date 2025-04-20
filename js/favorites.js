document.addEventListener('DOMContentLoaded', async function() {
    const container = document.getElementById('favorites-list');
    const noFavoritesMessage = document.getElementById('no-favorites');
    const authCheck = document.getElementById('auth-check');
    
    try {
        // Check if user is logged in
        const profileResponse = await fetch('/user/profile', {
            credentials: 'include'
        });
        
        if (!profileResponse.ok) {
            // Show auth check message
            authCheck.classList.remove('d-none');
            container.classList.add('d-none');
            return;
        }
        
        // Fetch favorites
        const response = await fetch('/api/favorites', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch favorites');
        }
        
        const favorites = await response.json();
        
        if (!favorites || favorites.length === 0) {
            noFavoritesMessage.classList.remove('d-none');
            container.innerHTML = '';
            return;
        }
        
        // Display favorites
        container.innerHTML = '';
        favorites.forEach(pet => {
            const card = document.createElement('div');
            card.className = 'col-md-6 col-lg-4 mb-4';
            
            // Format age display
            let ageDisplay = '';
            if (pet.age <= 1) {
                ageDisplay = pet.age < 1 ? `${Math.round(pet.age * 12)} months` : '1 year';
            } else {
                ageDisplay = `${Math.floor(pet.age)} years`;
            }
            
            card.innerHTML = `
                <div class="card h-100 shadow-sm border-0">
                    <div class="position-relative">
                        <img src="${pet.image || '/api/placeholder/400/300'}" class="card-img-top" alt="${pet.name}" style="height: 250px; object-fit: cover;">
                        <button class="btn btn-outline-danger favorite-btn position-absolute top-0 end-0 m-2" data-pet-id="${pet._id}">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title mb-1">${pet.name}</h5>
                        <p class="text-muted small mb-2">${pet.breed || 'Mixed Breed'}</p>
                        <div class="mb-3">
                            <span class="badge bg-primary me-2">${ageDisplay}</span>
                            <span class="badge bg-secondary me-2">${pet.gender}</span>
                            <span class="badge bg-info">${pet.size}</span>
                        </div>
                        <p class="card-text small mb-3">${pet.description ? pet.description.substring(0, 100) + '...' : 'Loving pet looking for a forever home'}</p>
                        <div class="d-grid">
                            <a href="pet-details.html?id=${pet._id}" class="btn btn-primary">View Details</a>
                        </div>
                    </div>
                </div>
            `;
            
            container.appendChild(card);
            
            // Add favorite button functionality
            const favoriteBtn = card.querySelector('.favorite-btn');
            favoriteBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    const response = await fetch('/api/favorites/toggle', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ petId: pet._id }),
                        credentials: 'include'
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to toggle favorite');
                    }
                    
                    // Remove the card with animation
                    card.style.transition = 'opacity 0.3s ease';
                    card.style.opacity = '0';
                    setTimeout(() => {
                        card.remove();
                        
                        // Check if there are any favorites left
                        if (container.children.length === 0) {
                            noFavoritesMessage.classList.remove('d-none');
                        }
                    }, 300);
                    
                } catch (error) {
                    console.error('Error toggling favorite:', error);
                    alert('Error removing from favorites. Please try again.');
                }
            });
        });
        
    } catch (error) {
        console.error('Error loading favorites:', error);
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                <h4>Error loading favorites</h4>
                <p>Please try again later</p>
            </div>
        `;
    }
});
