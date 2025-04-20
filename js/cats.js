document.addEventListener('DOMContentLoaded', async () => {
    const catsContainer = document.getElementById('catsList');
    let currentPage = 1;
    const petsPerPage = 9;

    // Function to load cats
    async function loadCats(page = currentPage) {
        try {
            // Get filter values
            const breed = document.getElementById('breedFilter')?.value;
            const age = document.getElementById('ageFilter')?.value;
            const gender = document.getElementById('genderFilter')?.value;
            
            // Show loading state
            catsContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
            
            // Build query params
            const queryParams = new URLSearchParams({
                type: 'cat',
                page,
                limit: petsPerPage
            });
            
            if (breed) queryParams.append('breed', breed);
            if (age) queryParams.append('age', age);
            if (gender) queryParams.append('gender', gender);
            
            // Fetch cats from API
            const response = await fetch(`/api/pets?${queryParams}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch cats');
            }
            
            const data = await response.json();
            
            if (!data.pets || data.pets.length === 0) {
                catsContainer.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <h4>No cats found</h4>
                        <p>Try adjusting your filters</p>
                    </div>
                `;
                return;
            }

            const catsHTML = data.pets.map(cat => `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card h-100 border-0 shadow-sm">
                        <img src="${cat.image || '/images/placeholder-cat.jpg'}" class="card-img-top" alt="${cat.name}" style="height: 250px; object-fit: cover;">
                        <div class="card-body">
                            <h5 class="card-title">${cat.name}</h5>
                            <p class="card-text">
                                <small class="text-muted">
                                    ${cat.breed} • ${cat.age} years • ${cat.gender}
                                </small>
                            </p>
                            <p class="card-text">${cat.description || 'Loving cat looking for a forever home.'}</p>
                        </div>
                        <div class="card-footer bg-white border-0">
                            <a href="/pet-details.html?id=${cat._id}" class="btn btn-primary">View Details</a>
                            <button class="btn btn-outline-primary favorite-btn" data-pet-id="${cat._id}">
                                <i class="far fa-heart"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            catsContainer.innerHTML = catsHTML;
            updatePagination(data.totalPages);
            
            // Add favorite button handlers
            document.querySelectorAll('.favorite-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    try {
                        const petId = btn.dataset.petId;
                        const response = await fetch('/api/favorites/toggle', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ petId }),
                            credentials: 'include'
                        });
                        
                        if (response.ok) {
                            const icon = btn.querySelector('i');
                            icon.classList.toggle('far');
                            icon.classList.toggle('fas');
                            icon.classList.toggle('text-danger');
                        }
                    } catch (error) {
                        console.error('Error toggling favorite:', error);
                    }
                });
            });
        } catch (error) {
            console.error('Error loading cats:', error);
            catsContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                    <h4>Error loading cats</h4>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }

    // Function to update pagination
    function updatePagination(totalPages) {
        const paginationContainer = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHTML = `
            <nav aria-label="Cat list navigation">
                <ul class="pagination justify-content-center">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <button class="page-link" data-page="${currentPage - 1}">Previous</button>
                    </li>
        `;
        
        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `
                <li class="page-item ${currentPage === i ? 'active' : ''}">
                    <button class="page-link" data-page="${i}">${i}</button>
                </li>
            `;
        }
        
        paginationHTML += `
                    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                        <button class="page-link" data-page="${currentPage + 1}">Next</button>
                    </li>
                </ul>
            </nav>
        `;
        
        paginationContainer.innerHTML = paginationHTML;
        
        // Add pagination click handlers
        paginationContainer.querySelectorAll('.page-link').forEach(button => {
            button.addEventListener('click', () => {
                const newPage = parseInt(button.dataset.page);
                if (newPage >= 1 && newPage <= totalPages) {
                    currentPage = newPage;
                    loadCats(currentPage);
                }
            });
        });
    }

    // Load breeds for filter
    async function loadBreeds() {
        try {
            const response = await fetch('/api/breeds?type=cat');
            if (response.ok) {
                const breeds = await response.json();
                const breedFilter = document.getElementById('breedFilter');
                breeds.forEach(breed => {
                    const option = document.createElement('option');
                    option.value = breed;
                    option.textContent = breed;
                    breedFilter.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading breeds:', error);
        }
    }

    // Initial load
    loadBreeds();
    loadCats();

    // Handle filter form submission
    document.getElementById('catFilterForm').addEventListener('submit', function(e) {
        e.preventDefault();
        currentPage = 1;
        loadCats();
    });
});
