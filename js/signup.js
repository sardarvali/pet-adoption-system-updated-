const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcrypt');
const cors = require('cors');
const app = express();
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'petpals-admin-secret-123';

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/petpals", {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    fullName: String,
    email: { type: String, unique: true },
    password: String,
    accountType: String,
    profileImage: String,
    phone: String,
    address: String,
    preferences: {
        emailNotifications: { type: Boolean, default: true },
        smsNotifications: { type: Boolean, default: false }
    },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pet' }],
    applications: [{ 
        petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet' },
        petName: String,
        status: { type: String, default: 'pending' },
        date: { type: Date, default: Date.now }
    }]
});

// Pet Schema
const petSchema = new mongoose.Schema({
    name: String,
    type: String,
    breed: String,
    age: String,
    gender: String,
    size: String,
    description: String,
    image: String,
    shelter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adoptionStatus: { type: String, default: 'available' }
});

const User = mongoose.model("User", userSchema);
const Pet = mongoose.model("Pet", petSchema);

// File upload configuration
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const dir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function(req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

// Middleware
app.use(cors({
    origin: 'http://localhost:3000', // Update with your frontend URL
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..'))); // Serve files from parent directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/js', express.static(path.join(__dirname)));

// Session middleware
app.use(session({
    secret: 'petpals-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Authentication middleware
const authenticateUser = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
};

// Routes
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'signup.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/dashboard', authenticateUser, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'home.html'));
});

app.get('/profile', authenticateUser, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'profile.html'));
});
app.get('/admin', authenticateUser, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin-dashboard.html'));
});

// Registration endpoint
app.post('/register', async (req, res) => {
    try {
        const { fullName, email, password, accountType, adminSecret } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if admin secret is correct
        let finalAccountType = accountType;
        if (adminSecret) {
            if (adminSecret === ADMIN_SECRET) {
                finalAccountType = 'admin';
            } else {
                return res.status(400).json({ message: 'Invalid admin secret key' });
            }
        }
        
        // Create new user
        const newUser = new User({
            fullName,
            email,
            password: hashedPassword,
            accountType: finalAccountType
        });

        await newUser.save();
        res.status(201).json({ 
            message: 'User registered successfully', 
            redirect: '/login',
            isAdmin: finalAccountType === 'admin'
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user' });
    }
});

// Login endpoint
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
      
        if (user && await bcrypt.compare(password, user.password)) {
            // Set user session
            req.session.userId = user._id;
            req.session.userType = user.accountType;
            
            // Redirect based on account type
            if (user.accountType === 'admin') {
                return res.json({ 
                    success: true, 
                    redirect: '/admin-dashboard.html',
                    accountType: user.accountType
                });
            } else {
                return res.json({ 
                    success: true, 
                    redirect: '/dashboard',
                    accountType: user.accountType
                });
            }
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error during login' });
    }
});

// Logout endpoint
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Error logging out' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out successfully' });
    });
});

// Get user profile endpoint
app.get('/user/profile', authenticateUser, async (req, res) => {
    try {
        // Exclude password from response
        const user = await User.findById(req.session.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Error fetching user profile' });
    }
});

// Update user profile endpoint
app.put('/user/profile', authenticateUser, async (req, res) => {
    try {
        const { fullName, phone, address } = req.body;
        
        const updatedUser = await User.findByIdAndUpdate(
            req.session.userId,
            { 
                fullName, 
                phone, 
                address 
            },
            { new: true }
        ).select('-password');
        
        res.json(updatedUser);
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Error updating user profile' });
    }
});

// Update user password endpoint
app.put('/user/password', authenticateUser, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        // Verify current password
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        
        // Update password
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ message: 'Error updating password' });
    }
});

// Upload profile image endpoint
app.post('/user/profile-image', authenticateUser, upload.single('profileImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }
        
        const imageUrl = `/uploads/${req.file.filename}`;
        
        const updatedUser = await User.findByIdAndUpdate(
            req.session.userId,
            { profileImage: imageUrl },
            { new: true }
        ).select('-password');
        
        res.json({ imageUrl, user: updatedUser });
    } catch (error) {
        console.error('Error uploading profile image:', error);
        res.status(500).json({ message: 'Error uploading profile image' });
    }
});

// Update user preferences endpoint
app.put('/user/preferences', authenticateUser, async (req, res) => {
    try {
        const { emailNotifications, smsNotifications } = req.body;
        
        const updatedUser = await User.findByIdAndUpdate(
            req.session.userId,
            { 
                preferences: {
                    emailNotifications,
                    smsNotifications
                }
            },
            { new: true }
        ).select('-password');
        
        res.json(updatedUser);
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ message: 'Error updating preferences' });
    }
});

// Delete user account endpoint
app.delete('/user/account', authenticateUser, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.session.userId);
        
        // Destroy session
        req.session.destroy();
        res.clearCookie('connect.sid');
        
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ message: 'Error deleting account' });
    }
});

// Manage favorites
app.post('/user/favorites/:petId', authenticateUser, async (req, res) => {
    try {
        const petId = req.params.petId;
        
        // Check if pet exists
        const pet = await Pet.findById(petId);
        if (!pet) {
            return res.status(404).json({ message: 'Pet not found' });
        }
        
        // Add to favorites if not already there
        const user = await User.findById(req.session.userId);
        if (!user.favorites.includes(petId)) {
            user.favorites.push(petId);
            await user.save();
        }
        
        res.json({ message: 'Pet added to favorites' });
    } catch (error) {
        console.error('Error adding to favorites:', error);
        res.status(500).json({ message: 'Error adding to favorites' });
    }
});

app.delete('/user/favorites/:petId', authenticateUser, async (req, res) => {
    try {
        const petId = req.params.petId;
        
        // Remove from favorites
        await User.findByIdAndUpdate(
            req.session.userId,
            { $pull: { favorites: petId } }
        );
        
        res.json({ message: 'Pet removed from favorites' });
    } catch (error) {
        console.error('Error removing from favorites:', error);
        res.status(500).json({ message: 'Error removing from favorites' });
    }
});

// Admin routes
app.get('/admin/dashboard', authenticateUser, async (req, res) => {
    try {
        // Only allow admin access
        const user = await User.findById(req.session.userId);
        if (user.accountType !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        
        // Get dashboard stats
        const totalPets = await Pet.countDocuments();
        const adoptedPets = await Pet.countDocuments({ adoptionStatus: 'adopted' });
        const pendingApplications = await User.countDocuments({ 
            'applications.status': 'pending' 
        });
        
        res.json({ totalPets, adoptedPets, pendingApplications });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ message: 'Error fetching dashboard data' });
    }
});

// Get all pets for admin
app.get('/admin/pets', authenticateUser, async (req, res) => {
    try {
        // Only allow admin access
        const user = await User.findById(req.session.userId);
        if (user.accountType !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        
        const pets = await Pet.find();
        res.json(pets);
    } catch (error) {
        console.error('Error fetching pets:', error);
        res.status(500).json({ message: 'Error fetching pets' });
    }
});

// Add new pet
app.post('/admin/pets', authenticateUser, upload.single('image'), async (req, res) => {
    try {
        // Only allow admin access
        const user = await User.findById(req.session.userId);
        if (user.accountType !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        
        const { name, type, breed, age, gender, size, description } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : null;
        
        // Convert age categories to numeric values for consistent filtering
        let numericAge;
        switch(age) {
            case 'baby':
                numericAge = '1';
                break;
            case 'young':
                numericAge = '2';
                break;
            case 'adult':
                numericAge = '5';
                break;
            case 'senior':
                numericAge = '8';
                break;
            default:
                numericAge = age;
        }
        
        // Ensure type is lowercase for consistent filtering
        const normalizedType = type.toLowerCase();
        
        const newPet = new Pet({
            name,
            type: normalizedType,
            breed,
            age: numericAge,
            gender: gender.toLowerCase(),
            size: size.toLowerCase(),
            description,
            image,
            shelter: req.session.userId
        });
        
        await newPet.save();
        res.json(newPet);
    } catch (error) {
        console.error('Error adding pet:', error);
        res.status(500).json({ message: 'Error adding pet' });
    }
});

// Get all users for admin
app.get('/admin/users', authenticateUser, async (req, res) => {
    try {
        // Only allow admin access
        const user = await User.findById(req.session.userId);
        if (user.accountType !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// Get all applications for admin
app.get('/admin/applications', authenticateUser, async (req, res) => {
    try {
        // Only allow admin access
        const user = await User.findById(req.session.userId);
        if (user.accountType !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        
        // Get all users with applications
        const users = await User.find({ 
            applications: { $exists: true, $not: { $size: 0 } }
        }).populate('applications.petId');
        
        // Format applications data
        const applications = [];
        users.forEach(user => {
            user.applications.forEach(app => {
                applications.push({
                    _id: app._id,
                    petId: app.petId._id,
                    petName: app.petId.name,
                    userId: user._id,
                    userName: user.fullName,
                    date: app.date,
                    status: app.status
                });
            });
        });
        
        res.json(applications);
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ message: 'Error fetching applications' });
    }
});

// API endpoint for getting pets with filters
app.get('/api/pets', async (req, res) => {
    try {
        const { type, breed, age, size, gender, page = 1, limit = 9 } = req.query;
        
        // Build filter object
        const filter = {};
        if (type) filter.type = new RegExp(type, 'i');
        if (breed) filter.breed = new RegExp(breed, 'i');
        if (size) filter.size = new RegExp(size, 'i');
        if (gender) filter.gender = new RegExp(gender, 'i');
        
        // Age filter needs special handling if it's a category
        if (age) {
            switch(age.toLowerCase()) {
                case 'baby':
                    filter.age = { $lte: 1 };
                    break;
                case 'young':
                    filter.age = { $gt: 1, $lte: 3 };
                    break;
                case 'adult':
                    filter.age = { $gt: 3, $lte: 7 };
                    break;
                case 'senior':
                    filter.age = { $gt: 7 };
                    break;
                default:
                    // If age is a number, use it directly
                    if (!isNaN(age)) {
                        filter.age = parseInt(age);
                    }
            }
        }

        // Calculate skip value for pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Get total count for pagination
        const total = await Pet.countDocuments(filter);
        
        // Get pets with pagination
        const pets = await Pet.find(filter)
            .sort({ createdAt: -1 }) // Sort by newest first
            .skip(skip)
            .limit(parseInt(limit))
            .lean();
        
        // Get counts by type
        const [dogCount, catCount, otherCount] = await Promise.all([
            Pet.countDocuments({ ...filter, type: /^dog$/i }),
            Pet.countDocuments({ ...filter, type: /^cat$/i }),
            Pet.countDocuments({
                ...filter,
                type: { $not: /^(dog|cat)$/i }
            })
        ]);
        
        res.json({
            pets,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            counts: {
                dogs: dogCount,
                cats: catCount,
                others: otherCount,
                total
            }
        });
    } catch (error) {
        console.error('Error fetching pets:', error);
        res.status(500).json({ message: 'Error fetching pets' });
    }
});

// Get pet details by ID
app.get('/api/pets/:id', async (req, res) => {
    try {
        const petId = req.params.id;
        const pet = await Pet.findById(petId).lean();
        
        if (!pet) {
            return res.status(404).json({ message: 'Pet not found' });
        }
        
        // Get shelter info if available
        let shelterInfo = null;
        if (pet.shelter) {
            const shelter = await User.findById(pet.shelter).select('fullName address phone').lean();
            if (shelter) {
                shelterInfo = {
                    name: shelter.fullName,
                    address: shelter.address,
                    phone: shelter.phone
                };
            }
        }
        
        // Combine pet and shelter info
        const petDetails = {
            ...pet,
            shelter: shelterInfo
        };
        
        res.json(petDetails);
    } catch (error) {
        console.error('Error fetching pet details:', error);
        res.status(500).json({ message: 'Error fetching pet details' });
    }
});

// Get user's favorites
app.get('/api/favorites', authenticateUser, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).populate('favorites');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user.favorites);
    } catch (error) {
        console.error('Error fetching favorites:', error);
        res.status(500).json({ message: 'Error fetching favorites' });
    }
});

// Toggle favorite
app.post('/api/favorites/toggle', authenticateUser, async (req, res) => {
    try {
        const { petId } = req.body;
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const pet = await Pet.findById(petId);
        if (!pet) {
            return res.status(404).json({ message: 'Pet not found' });
        }
        
        const favoriteIndex = user.favorites.indexOf(petId);
        if (favoriteIndex === -1) {
            // Add to favorites
            user.favorites.push(petId);
        } else {
            // Remove from favorites
            user.favorites.splice(favoriteIndex, 1);
        }
        
        await user.save();
        res.json({ message: 'Favorites updated successfully' });
    } catch (error) {
        console.error('Error updating favorites:', error);
        res.status(500).json({ message: 'Error updating favorites' });
    }
});

// Check if a pet is favorited
app.get('/api/favorites/check/:petId', authenticateUser, async (req, res) => {
    try {
        const { petId } = req.params;
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const isFavorited = user.favorites.includes(petId);
        res.json({ isFavorited });
    } catch (error) {
        console.error('Error checking favorite status:', error);
        res.status(500).json({ message: 'Error checking favorite status' });
    }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});