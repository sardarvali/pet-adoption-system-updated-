// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize search functionality
    initSearchPage();
});

// Initialize search page functionality
function initSearchPage() {
    // Get DOM elements
    const searchForm = document.getElementById('searchForm');
    const searchResultsContainer = document.getElementById('searchResults');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const noResultsMessage = document.getElementById('noResultsMessage');
    const totalResultsSpan = document.getElementById('totalResults');
    const paginationContainer = document.getElementById('pagination');
    const sortOptions = document.getElementById('sortOptions');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const filterCheckboxes = document.querySelectorAll('.filter-check');
    
    // Parse URL query parameters
    const queryParams = new URLSearchParams(window.location.search);
    const petType = queryParams.get('type') || '';
    const petAge = queryParams.get('age') || '';
    const location = queryParams.get('location') || '';
    
    // Set initial form values from query parameters
    if (petType) document.getElementById('petType').value = petType;
    if (petAge) document.getElementById('petAge').value = petAge;
    if (location) document.getElementById('location').value = location;
    
    // Set up event listeners
    searchForm.addEventListener('submit', handleSearch);
    sortOptions.addEventListener('change', handleSort);
    clearFiltersBtn.addEventListener('click', clearFilters);
    filterCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });
    
    // Variables for pagination
    let currentPage = 1;
    const petsPerPage = 12;
    let allPets = [];
    let filteredPets = [];
    
    // Initial search
    executeSearch();
    
    // Handle form submission
    function handleSearch(e) {
        e.preventDefault();
        currentPage = 1;
        executeSearch();
    }
    
    // Execute search based on current parameters
    function executeSearch() {
        // Show loading indicator
        loadingIndicator.classList.remove('d-none');
        noResultsMessage.classList.add('d-none');
        searchResultsContainer.innerHTML = '';
        
        // Get search parameters
        const petType = document.getElementById('petType').value;
        const petAge = document.getElementById('petAge').value;
        const location = document.getElementById('location').value;
        
        // Build Firestore query
        let query = db.collection('pets');
        
        if (petType) {
            query = query.where('type', '==', petType);
        }
        
        if (petAge) {
            query = query.where('age_category', '==', petAge);
        }
        
        if (location) {
            // Use location proximity search if available
            // This is a simplified example - a real implementation might use geolocation
            query = query.where('location_city', '==', location);
        }
        
        // Execute query
        query.get()
            .then((querySnapshot) => {
                // Hide loading indicator
                loadingIndicator.classList.add('d-none');
                
                // Process results
                allPets = [];
                querySnapshot.forEach((doc) => {
                    const pet = doc.data();
                    pet.id = doc.id;
                    allPets.push(pet);
                });
                
                // Apply filters and display results
                applyFilters();
            })
            .catch((error) => {
                console.error("Error searching for pets:", error);
                loadingIndicator.classList.add('d-none');
                noResultsMessage.classList.remove('d-none');
            });
    }
    
    // Apply filters to search results
    function applyFilters() {
        // Get filter values
        const goodWithKids = document.getElementById('goodWithKids').checked;
        const goodWithDogs = document.getElementById('goodWithDogs').checked;
        const goodWithCats = document.getElementById('goodWithCats').checked;
        const housetrained = document.getElementById('housetrained').checked;
        const specialNeeds = document.getElementById('specialNeeds').checked;
        const vaccinated = document.getElementById('vaccinated').checked;
        
        // Filter pets based on checkboxes
        filteredPets = allPets.filter(pet => {
            if (goodWithKids && !pet.good_with_kids) return false;
            if (goodWithDogs && !pet.good_with_dogs) return false;
            if (goodWithCats && !pet.good_with_cats) return false;
            if (housetrained && !pet.housetrained) return false;
            if (specialNeeds && !pet.special_needs) return false;
            if (vaccinated && !pet.vaccinated) return false;
            return true;
        });
        
        // Apply sorting
        handleSort();
    }
    
    // Handle sorting of results
    function handleSort() {
        const sortBy = sortOptions.value;
        
        switch(sortBy) {
            case 'recent':
                filteredPets.sort((a, b) => (b.created_at?.toDate() || 0) - (a.created_at?.toDate() || 0));
                break;
            case 'name':
                filteredPets.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
            case 'age_asc':
                filteredPets.sort((a, b) => getAgeValue(a.age_category) - getAgeValue(b.age_category));
                break;
            case 'age_desc':
                filteredPets.sort((a, b) => getAgeValue(b.age_category) - getAgeValue(a.age_category));
                break;
        }
        
        // Update display
        displayResults();
    }
    
    // Helper function to convert age category to numeric value for sorting
    function getAgeValue(ageCategory) {
        const ageValues = {
            'Baby': 1,
            'Young': 2,
            'Adult': 3,
            'Senior': 4
        };
        return ageValues[ageCategory] || 0;
    }
    
    // Clear all filters
    function clearFilters() {
        filterCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        applyFilters();
    }
    
    // Display results with pagination
    function displayResults() {
        // Update total results count
        totalResultsSpan.textContent = filteredPets.length;
        
        // Clear results container
        searchResultsContainer.innerHTML = '';
        
        // Show no results message if needed
        if (filteredPets.length === 0) {
            noResultsMessage.classList.remove('d-none');
            paginationContainer.innerHTML = '';
            return;
        }
        
        noResultsMessage.classList.add('d-none');
        
        // Calculate pagination
        const totalPages = Math.ceil(filteredPets.length / petsPerPage);
        if (currentPage > totalPages) currentPage = 1;
        
        const startIndex = (currentPage - 1) * petsPerPage;
        const endIndex = Math.min(startIndex + petsPerPage, filteredPets.length);
        
        // Display current page pets
        for (let i = startIndex; i < endIndex; i++) {
            const pet = filteredPets[i];
            const petCard = createPetCard(pet);
            searchResultsContainer.appendChild(petCard);
        }
        
        // Update pagination controls
        updatePagination(totalPages);
    }
    
    // Create a pet card element
    function createPetCard(pet) {
        const colDiv = document.createElement('div');
        colDiv.className = 'col-md-6 col-lg-4 mb-4';
        
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card h-100 border-0 shadow-sm hover-shadow transition-all';
        
        // Create card image
        const imgContainer = document.createElement('div');
        imgContainer.className = 'card-img-container position-relative';
        
        const img = document.createElement('img');
        img.className = 'card-img-top';
        img.style.height = '220px';
        img.style.objectFit = 'cover';
        img.src = pet.photos && pet.photos.length > 0 ? pet.photos[0] : '/api/placeholder/400/300';
        img.alt = pet.name;
        
        // Add favorite button
        const favBtn = document.createElement('button');
        favBtn.className = 'btn btn-light btn-sm position-absolute rounded-circle p-2';
        favBtn.style.top = '10px';
        favBtn.style.right = '10px';
        favBtn.innerHTML = '<i class="far fa-heart"></i>';
        favBtn.setAttribute('data-pet-id', pet.id);
        favBtn.addEventListener('click', toggleFavorite);
        
        imgContainer.appendChild(img);
        imgContainer.appendChild(favBtn);
        
        // Create card body
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        
        // Create pet name and type header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'd-flex justify-content-between align-items-center mb-2';
        
        const title = document.createElement('h5');
        title.className = 'card-title mb-0';
        title.textContent = pet.name;
        
        const badge = document.createElement('span');
        badge.className = `badge ${getBadgeColorClass(pet.type)}`;
        badge.textContent = pet.type;
        
        headerDiv.appendChild(title);
        headerDiv.appendChild(badge);
        
        // Create pet details
        const details = document.createElement('p');
        details.className = 'card-text text-muted small mb-2';
        details.innerHTML = `${pet.age || 'Unknown age'} &bull; ${pet.breed || 'Mixed breed'} &bull; <i class="fas fa-map-marker-alt me-1"></i>${pet.location_city || 'Unknown location'}`;
        
        // Create pet description
        const description = document.createElement('p');
        description.className = 'card-text mb-0';
        description.textContent = pet.description?.substring(0, 100) + (pet.description?.length > 100 ? '...' : '') || 'No description available.';
        
        // Create pet tags
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'mt-2';
        
        const tags = [];
        if (pet.good_with_kids) tags.push('Good with kids');
        if (pet.good_with_dogs) tags.push('Good with dogs');
        if (pet.good_with_cats) tags.push('Good with cats');
        if (pet.housetrained) tags.push('Housetrained');
        if (pet.special_needs) tags.push('Special needs');
        
        tags.slice(0, 2).forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'badge bg-light text-dark me-1 mb-1';
            tagSpan.textContent = tag;
            tagsDiv.appendChild(tagSpan);
        });
        
        // Create card footer with link
        const cardFooter = document.createElement('div');
        cardFooter.className = 'card-footer bg-white border-0 pt-0';
        
        const link = document.createElement('a');
        link.className = 'btn btn-outline-primary w-100';
        link.href = `pet-details.html?id=${pet.id}`;
        link.textContent = 'View Details';
        
        // Assemble the card
        cardFooter.appendChild(link);
        
        cardBody.appendChild(headerDiv);
        cardBody.appendChild(details);
        cardBody.appendChild(description);
        cardBody.appendChild(tagsDiv);
        
        cardDiv.appendChild(imgContainer);
        cardDiv.appendChild(cardBody);
        cardDiv.appendChild(cardFooter);
        
        colDiv.appendChild(cardDiv);
        
        return colDiv;
    }
    
    // Toggle pet as favorite
    function toggleFavorite(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const button = e.currentTarget;
        const petId = button.getAttribute('data-pet-id');
        const icon = button.querySelector('i');
        
        // Check if user is logged in
        const user = firebase.auth().currentUser;
        if (!user) {
            alert('Please log in to save favorites');
            window.location.href = 'index.html';
            return;
        }
        
        // Toggle favorite status
        const isFavorite = icon.classList.contains('fas');
        
        if (isFavorite) {
            // Remove from favorites
            db.collection('users').doc(user.uid).collection('favorites').doc(petId).delete()
                .then(() => {
                    icon.classList.remove('fas', 'text-danger');
                    icon.classList.add('far');
                })
                .catch(error => {
                    console.error("Error removing from favorites:", error);
                });
        } else {
            // Add to favorites
            db.collection('users').doc(user.uid).collection('favorites').doc(petId).set({
                added_at: firebase.firestore.FieldValue.serverTimestamp()
            })
                .then(() => {
                    icon.classList.remove('far');
                    icon.classList.add('fas', 'text-danger');
                })
                .catch(error => {
                    console.error("Error adding to favorites:", error);
                });
        }
    }
    
    // Update pagination controls
    function updatePagination(totalPages) {
        paginationContainer.innerHTML = '';
        
        if (totalPages <= 1) {
            return;
        }
        
        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        
        const prevLink = document.createElement('a');
        prevLink.className = 'page-link';
        prevLink.href = '#';
        prevLink.innerHTML = '&laquo;';
        prevLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage > 1) {
                currentPage--;
                displayResults();
                window.scrollTo(0, 0);
            }
        });
        
        prevLi.appendChild(prevLink);
        paginationContainer.appendChild(prevLi);
        
        // Page buttons
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageLi = document.createElement('li');
            pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
            
            const pageLink = document.createElement('a');
            pageLink.className = 'page-link';
            pageLink.href = '#';
            pageLink.textContent = i;
            pageLink.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage = i;
                displayResults();
                window.scrollTo(0, 0);
            });
            
            pageLi.appendChild(pageLink);
            paginationContainer.appendChild(pageLi);
        }
        
        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        
        const nextLink = document.createElement('a');
        nextLink.className = 'page-link';
        nextLink.href = '#';
        nextLink.innerHTML = '&raquo;';
        nextLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage < totalPages) {
                currentPage++;
                displayResults();
                window.scrollTo(0, 0);
            }
        });
        
        nextLi.appendChild(nextLink);
        paginationContainer.appendChild(nextLi);
    }
    
    // Get appropriate badge color class based on pet type
    function getBadgeColorClass(petType) {
        const typeColors = {
            'Dog': 'bg-primary',
            'Cat': 'bg-info',
            'Rabbit': 'bg-success',
            'Bird': 'bg-warning',
            'Small Animal': 'bg-secondary'
        };
        
        return typeColors[petType] || 'bg-primary';
    }
}