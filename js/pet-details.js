document.addEventListener('DOMContentLoaded', async () => {
    // Show loading state
    const container = document.getElementById('petDetailsContainer');
    const originalContent = container.innerHTML;
    container.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading pet details...</p>
        </div>
    `;

    // Get pet ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const petId = urlParams.get('id');
    
    if (!petId) {
        showError('No pet ID specified');
        return;
    }
    
    try {
        // Fetch pet details
        const response = await fetch(`/api/pets/${petId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch pet details');
        }
        
        const pet = await response.json();
        if (!pet) {
            throw new Error('Pet not found');
        }

        // Reset container with original content
        container.innerHTML = originalContent;
        
        // Update page title
        document.title = `${pet.name} - PetPals`;
        
        // Update pet details
        document.getElementById('petName').textContent = pet.name;
        document.getElementById('petType').textContent = pet.type;
        document.getElementById('petBreed').textContent = pet.breed || 'Mixed Breed';
        
        // Format and display age
        let ageDisplay = '';
        if (pet.age <= 1) {
            ageDisplay = pet.age < 1 ? `${Math.round(pet.age * 12)} months` : '1 year';
        } else {
            ageDisplay = `${Math.floor(pet.age)} years`;
        }
        document.getElementById('petAge').textContent = ageDisplay;
        
        document.getElementById('petGender').textContent = pet.gender || 'Unknown';
        document.getElementById('petSize').textContent = pet.size || 'Unknown';
        document.getElementById('petDescription').textContent = pet.description || 'No description available';
        
        // Set main image
        const mainImage = document.getElementById('mainPetImage');
        mainImage.src = pet.image || '/api/placeholder/600/400';
        mainImage.alt = pet.name;
        
        // Update shelter information if available
        if (pet.shelter) {
            document.getElementById('shelterName').textContent = pet.shelter.name || 'Unknown Shelter';
            document.getElementById('shelterAddress').textContent = pet.shelter.address || 'Address not available';
            if (pet.shelter.phone) {
                document.getElementById('shelterContact').textContent = `Contact: ${pet.shelter.phone}`;
            }
        }
        
        // Update adoption modal
        document.getElementById('modalPetName').textContent = pet.name;
        document.getElementById('petId').value = pet._id;
        
        // Setup favorite button
        const favoriteBtn = document.getElementById('favoriteBtn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', async () => {
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
                    
                    const { isFavorite } = await response.json();
                    const icon = favoriteBtn.querySelector('i');
                    icon.className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
                    favoriteBtn.innerHTML = `<i class="${icon.className}"></i> ${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}`;
                } catch (error) {
                    console.error('Error toggling favorite:', error);
                    alert('Please login to add favorites');
                    window.location.href = 'index.html';
                }
            });
        }
        
    } catch (error) {
        console.error('Error loading pet details:', error);
        showError('Error loading pet details. Please try again later.');
    }
    
    // Handle adoption form submission
    const adoptionForm = document.getElementById('adoptionForm');
    if (adoptionForm) {
        adoptionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                // Get form data
                const formData = new FormData(adoptionForm);
                const data = {
                    petId: document.getElementById('petId').value,
                    name: document.getElementById('applicantName').value,
                    email: document.getElementById('applicantEmail').value,
                    phone: document.getElementById('applicantPhone').value,
                    address: document.getElementById('applicantAddress').value,
                    reason: document.getElementById('adoptionReason').value
                };
                
                // Submit application
                const response = await fetch('/api/applications', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data),
                    credentials: 'include'
                });
                
                if (!response.ok) {
                    if (response.status === 401) {
                        alert('Please login to submit an adoption application');
                        window.location.href = 'index.html';
                        return;
                    }
                    throw new Error('Failed to submit application');
                }
                
                alert('Application submitted successfully!');
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('adoptionModal'));
                modal.hide();
            } catch (error) {
                console.error('Error submitting application:', error);
                alert('Error submitting application. Please try again.');
            }
        });
    }
});

function showError(message) {
    const container = document.getElementById('petDetailsContainer');
    container.innerHTML = `
        <div class="text-center py-5">
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-circle fa-3x mb-3"></i>
                <h4>${message}</h4>
                <a href="home.html" class="btn btn-primary mt-3">
                    <i class="fas fa-home"></i> Return to Home
                </a>
            </div>
        </div>
    `;
}