document.addEventListener('DOMContentLoaded', function() {
    let currentPage = 1;
    const petsPerPage = 9;
    
    // Load pets from API
    loadPets();
    
    // Handle filter form submission
    document.getElementById('petFilterForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        currentPage = 1;
        loadPets();
    });
    
    // Function to load pets
    async function loadPets(page = currentPage) {
        try {
            // Get filter values
            const type = document.getElementById('typeFilter')?.value;
            const breed = document.getElementById('breedFilter')?.value;
            const age = document.getElementById('ageFilter')?.value;
            const size = document.getElementById('sizeFilter')?.value;
            const gender = document.getElementById('genderFilter')?.value;
            
            // Build query params
            const queryParams = new URLSearchParams({
                page: page,
                limit: petsPerPage
            });
            
            if (type) queryParams.append('type', type);
            if (breed) queryParams.append('breed', breed);
            if (age) queryParams.append('age', age);
            if (size) queryParams.append('size', size);
            if (gender) queryParams.append('gender', gender);
            
            // Show loading state
            document.getElementById('petsContainer').innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
            
            // Fetch pets from API
            const response = await fetch(`/api/pets?${queryParams}`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch pets');
            }
            
            const data = await response.json();
            
            // Update pet counts
            updatePetCounts(data.counts);
            
            // Display pets and pagination
            displayPets(data.pets);
            updatePagination(data.totalPages);
            
        } catch (error) {
            console.error('Error loading pets:', error);
            document.getElementById('petsContainer').innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                    <h4>Error loading pets</h4>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }
    
    // Function to update pet counts
    function updatePetCounts(counts) {
        // Update total pets count
        const totalPetsElement = document.getElementById('totalPets');
        if (totalPetsElement) {
            totalPetsElement.textContent = counts.total;
        }
        
        // Update dogs count
        const dogsCountElement = document.getElementById('dogsCount');
        if (dogsCountElement) {
            dogsCountElement.textContent = counts.dogs;
        }
        
        // Update cats count
        const catsCountElement = document.getElementById('catsCount');
        if (catsCountElement) {
            catsCountElement.textContent = counts.cats;
        }
        
        // Update other pets count
        const otherPetsCountElement = document.getElementById('otherPetsCount');
        if (otherPetsCountElement) {
            otherPetsCountElement.textContent = counts.others;
        }
    }
    
    // Function to display pets
    function displayPets(pets) {
        const petsContainer = document.getElementById('petsContainer');
        
        if (!pets || pets.length === 0) {
            petsContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h4>No pets found</h4>
                    <p>Try adjusting your filters</p>
                </div>
            `;
            return;
        }
        
        const petsHTML = pets.map(pet => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 pet-card">
                    <img src="${pet.image || '/images/placeholder-pet.jpg'}" class="card-img-top" alt="${pet.name}">
                    <div class="card-body">
                        <h5 class="card-title">${pet.name}</h5>
                        <p class="card-text">
                            <small class="text-muted">
                                ${pet.type} • ${pet.breed} • ${pet.age} years • ${pet.gender}
                            </small>
                        </p>
                        <p class="card-text">${pet.description || 'Loving pet looking for a forever home.'}</p>
                    </div>
                    <div class="card-footer bg-white border-0">
                        <a href="/pet-details.html?id=${pet._id}" class="btn btn-primary">View Details</a>
                        <button class="btn btn-outline-primary favorite-btn" data-pet-id="${pet._id}">
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        petsContainer.innerHTML = petsHTML;
        
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
    }
    
    // Function to update pagination
    function updatePagination(totalPages) {
        const paginationContainer = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHTML = `
            <nav aria-label="Pet list navigation">
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
                    loadPets(currentPage);
                }
            });
        });
    }
});
