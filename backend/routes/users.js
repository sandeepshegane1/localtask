import express from 'express';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/profile-photos';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
  }
});

// Profile photo upload endpoint
router.post('/upload-profile-photo', auth, upload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get the relative path to the uploaded file
    const profilePhotoUrl = `/${req.file.path.replace(/\\/g, '/')}`;

    // Update user's profile photo URL
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete old profile photo if it exists
    if (user.profilePhoto) {
      const oldPhotoPath = path.join(process.cwd(), user.profilePhoto.substring(1));
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    user.profilePhoto = profilePhotoUrl;
    await user.save();

    res.json({ profilePhotoUrl });
  } catch (error) {
    console.error('Profile photo upload error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Serve uploaded files statically
router.use('/uploads', express.static('uploads'));

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.patch('/profile', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['name', 'email', 'location', 'skills', 'profilePhoto'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).json({ error: 'Invalid updates!' });
  }

  try {
    // Find the user again to ensure we have a proper Mongoose document
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update each field
    if (updates.includes('name')) {
      user.name = req.body.name;
    }
    
    if (updates.includes('skills')) {
      user.skills = Array.isArray(req.body.skills) ? req.body.skills : [];
    }
    
    if (updates.includes('location')) {
      if (!req.body.location || !req.body.location.coordinates || !Array.isArray(req.body.location.coordinates)) {
        return res.status(400).json({ error: 'Invalid location format' });
      }
      
      const coordinates = req.body.location.coordinates.map(coord => Number(coord));
      if (coordinates.some(coord => isNaN(coord))) {
        return res.status(400).json({ error: 'Coordinates must be valid numbers' });
      }
      
      user.location = {
        type: 'Point',
        coordinates: coordinates
      };
    }

    await user.save();
    res.json(user);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get service providers by category
router.get('/providers', auth, async (req, res) => {
  console.log('Request received for /providers with query:', req.query);
  try {
    const { category, lat, lng } = req.query;
    
    // Base query to get all providers
    let query = {
      role: 'PROVIDER'
    };

    // Add category filter if specified
    if (category) {
      query.skills = { $in: [category.toUpperCase()] };
    }

    // Add location filter if coordinates are provided
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: 50000 // 50km radius
        }
      };
    }

    console.log('Finding providers with query:', JSON.stringify(query, null, 2));

    const providers = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    console.log(`Found ${providers.length} providers:`, 
      providers.map(p => ({ 
        id: p._id, 
        name: p.name, 
        category: p.category, 
        skills: p.skills 
      }))
    );

    res.json(providers);
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/farmers', auth, async (req, res) => {
  try {
    console.log('Request received for /farmers with query:', req.query);

    const { category, lat, lng } = req.query;

    // Validate category
    if (!category) {
      console.log('Validation failed: Category is missing.');
      return res.status(400).json({ error: 'Category is required' });
    }

    console.log(`Filtering farmers by category: ${category.toUpperCase()}`);

    const query = {
      role: 'PROVIDER',
      skills: { 
        $in: [category.toUpperCase()] 
      }
    };

    // Optional location-based filtering
    if (lat && lng) {
      console.log(`Applying location filter with coordinates: [${lng}, ${lat}]`);
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: 100000 // 100km radius
        }
      };
    }

    console.log('Query to be executed on the database:', query);

    const farmers = await User.find(query)
      .select('-password')
      .limit(20);

    console.log(`Found ${farmers.length} farmers matching the criteria.`);
    res.json(farmers);
  } catch (error) {
    console.error('Error occurred in /farmers route:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get workers by category (similar to providers)
router.get('/workers', auth, async (req, res) => {
  console.log('Request received for /workers with query:', req.query);

  try {
    const { category, lat, lng } = req.query;

    const query = {
      role: 'PROVIDER',
      skills: { $in: [category.toUpperCase()] }
    };

    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: 50000 // 50km radius
        }
      };
    }

    //console.log('Workers Query:', query);

    const workers = await User.find(query).select('-password').limit(20);

    //console.log('Workers Found:', workers);

    res.json(workers);
  } catch (error) {
    console.error('Workers Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;