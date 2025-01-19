import express from 'express';
import Task from '../models/Task.js';
import { auth } from '../middleware/auth.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';

const router = express.Router();

// Create a task
router.post('/', auth, async (req, res) => {
  try {
    console.log('Creating new task with data:', req.body);
    
    const taskData = {
      ...req.body,
      client: req.user._id,
      status: 'OPEN',
      provider: null,
      location: {
        type: 'Point',
        coordinates: [
          req.body.location.longitude,
          req.body.location.latitude
        ]
      }
    };

    // If targetProvider is specified, validate it exists
    if (req.body.targetProvider) {
      const provider = await User.findById(req.body.targetProvider);
      if (!provider || provider.role !== 'PROVIDER') {
        return res.status(400).json({ error: 'Invalid target provider' });
      }
      taskData.targetProvider = req.body.targetProvider;
    }

    console.log('Processed task data:', taskData);
    
    const task = new Task(taskData);
    await task.save();
    
    console.log('Task created successfully:', task);
    
    // Populate the task with client info
    await task.populate('client', 'name email');
    
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(400).json({ 
      error: error.message,
      details: error.errors ? Object.values(error.errors).map(e => e.message) : undefined
    });
  }
});

// Get tasks for provider
router.get('/provider', auth, async (req, res) => {
  try {
    const { status, lat, lng } = req.query;
    console.log('Provider tasks request:', {
      status,
      lat,
      lng,
      userId: req.user._id
    });
    
    let query = {};
    
    // Handle different status types
    switch (status) {
      case 'QUICK_SERVICE_PENDING':
        // Show all quick service tasks that haven't been assigned
        query = {
          status: 'QUICK_SERVICE_PENDING',
          provider: { $exists: false }
        };
        break;
        
      case 'ASSIGNED':
        // Show tasks assigned to this provider that are not completed
        query = {
          provider: req.user._id,
          status: 'ASSIGNED'
        };
        break;
        
      case 'COMPLETED':
        // Show completed tasks for this provider
        query = {
          provider: req.user._id,
          status: 'COMPLETED'
        };
        break;
        
      case 'OPEN':
      default:
        // Show open tasks that are either unassigned or specifically created for this provider
        query = {
          status: 'OPEN',
          $or: [
            { targetProvider: req.user._id }, // Tasks specifically created for this provider
            { provider: null, targetProvider: { $exists: false } } // General open tasks
          ]
        };
        break;
    }

    // Add geospatial query if coordinates are provided
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

    console.log('MongoDB Query:', JSON.stringify(query, null, 2));

    // Get tasks with populated fields
    const tasks = await Task.find(query)
      .populate('client', 'name email')
      .populate('provider', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${tasks.length} tasks for status: ${status}`);
    
    // Transform tasks to ensure consistent format
    const formattedTasks = tasks.map(task => ({
      ...task,
      provider: task.provider || null,
      location: task.location || null,
      deadline: task.deadline || null
    }));

    res.json(formattedTasks);
  } catch (error) {
    console.error('Error getting provider tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get tasks for client
router.get('/client', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ client: req.user._id })
      .populate('provider', 'name email')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task status
router.patch('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      $or: [
        { client: req.user._id },
        { provider: req.user._id }
      ]
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updates = Object.keys(req.body);
    const allowedUpdates = ['status', 'provider'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ error: 'Invalid updates!' });
    }

    updates.forEach(update => task[update] = req.body[update]);
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      status: 'OPEN'
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found or cannot be rejected' });
    }

    await Task.deleteOne({ _id: req.params.id });
    res.json({ message: 'Task rejected successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user tasks - specific route should come before parameterized routes
router.get('/user-tasks', auth, async (req, res) => {
  try {
    console.log('Fetching tasks for user:', req.user._id);

    const tasks = await Task.find({
      client: req.user._id,
      $or: [
        { status: { $ne: 'CANCELLED' } },
        { status: 'CANCELLED', rejectedByProvider: true }
      ]
    })
    .populate({
      path: 'provider',
      select: '_id name',
      match: { _id: { $exists: true } }
    })
    .select('title description status category provider createdAt rejectedByProvider')
    .lean()
    .sort({ createdAt: -1 });
    
    const transformedTasks = tasks.map(task => ({
      ...task,
      provider: task.provider || null,
      category: task.category || 'General'
    }));

    console.log('Found tasks:', transformedTasks.map(t => ({
      id: t._id,
      provider: t.provider,
      category: t.category,
      status: t.status
    })));

    res.json(transformedTasks);
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject a task (for service providers)
router.post('/reject-task/:taskId', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.taskId, provider: req.user._id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found or you are not the assigned provider' });
    }
    
    task.status = 'CANCELLED';
    task.rejectedByProvider = true;
    await task.save();
    
    res.json({ message: 'Task rejected successfully', task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new task
router.post('/tasks', auth, async (req, res) => {
  try {
    const task = new Task({
      ...req.body,
      client: req.user._id
    });
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all tasks (you might want to add pagination here)
router.get('/tasks', auth, async (req, res) => {
  try {
    const tasks = await Task.find({});
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test route to get all tasks (for debugging)
router.get('/test-all', auth, async (req, res) => {
  try {
    console.log('Getting all tasks for testing...');
    const tasks = await Task.find({})
      .populate('client', 'name email')
      .populate('provider', 'name email')
      .lean();

    console.log('All tasks in database:', JSON.stringify(tasks, null, 2));
    res.json({
      count: tasks.length,
      tasks
    });
  } catch (error) {
    console.error('Error in test route:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single task by ID - this should come after specific routes
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('Fetching task with ID:', req.params.id);
    console.log('User ID:', req.user._id);

    // Validate task ID format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid task ID format' });
    }

    const task = await Task.findById(req.params.id)
      .populate('provider', '_id name')
      .select('title description status category provider client createdAt rejectedByProvider')
      .lean();

    console.log('Found task:', task);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Transform task to ensure all required fields are present
    const transformedTask = {
      ...task,
      provider: task.provider || null,
      category: task.category || 'General'
    };

    console.log('Sending transformed task:', transformedTask);
    res.json(transformedTask);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task details' });
  }
});

// Accept a task
router.patch('/:id/accept', auth, async (req, res) => {
  try {
    console.log('Accepting task:', req.params.id, 'by provider:', req.user._id);
    
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check if task is already assigned
    if (task.provider) {
      return res.status(400).json({ error: 'Task is already assigned' });
    }
    
    // Update task status and assign provider
    task.status = 'ASSIGNED';
    task.provider = req.user._id;
    await task.save();
    
    // Populate client and provider details
    await task.populate('client', 'name email');
    await task.populate('provider', 'name email');
    
    console.log('Task accepted successfully:', task);
    
    res.json(task);
  } catch (error) {
    console.error('Error accepting task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete a task
router.patch('/:id/complete', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check if the task is assigned to this provider
    if (task.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to complete this task' });
    }
    
    task.status = 'COMPLETED';
    await task.save();
    
    // Populate client and provider details
    await task.populate('client', 'name email');
    await task.populate('provider', 'name email');
    
    res.json(task);
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a task
router.patch('/tasks/:id', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['title', 'description', 'status', 'budget', 'location', 'category', 'priority'];
  const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).json({ error: 'Invalid updates!' });
  }

  try {
    const task = await Task.findOne({ _id: req.params.id, client: req.user._id });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    updates.forEach((update) => task[update] = req.body[update]);
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a task
router.delete('/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, client: req.user._id });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get completed tasks count for provider
router.get('/provider/:providerId/completed', auth, async (req, res) => {
  try {
    const count = await Task.countDocuments({
      provider: req.params.providerId,
      status: 'COMPLETED'
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get completed tasks count for a provider
router.get('/provider/:providerId/completed-count', async (req, res) => {
  try {
    const providerId = req.params.providerId;
    const { category } = req.query;

    const query = {
      provider: providerId,
      status: 'COMPLETED'
    };

    // Add category filter if provided
    if (category) {
      query.category = category;
    }

    const count = await Task.countDocuments(query);
    res.json({ count });
  } catch (error) {
    console.error('Error getting completed tasks count:', error);
    res.status(500).json({ error: 'Failed to get completed tasks count' });
  }
});

// Quick Service - Create task and notify all eligible providers
router.post('/quick-service', auth, async (req, res) => {
  try {
    const { title, description, budget, deadline, category, location } = req.body;
    
    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({ error: 'Location is required for quick service' });
    }

    // Create the task
    const task = new Task({
      title,
      description,
      budget,
      deadline: deadline ? new Date(deadline) : undefined,
      category,
      client: req.user._id,
      status: 'QUICK_SERVICE_PENDING',
      location: {
        type: 'Point',
        coordinates: [parseFloat(location.longitude), parseFloat(location.latitude)]
      }
    });

    await task.save();
    console.log('Task created:', task);

    // Find all eligible providers in the area
    const eligibleProviders = await User.find({
      role: 'PROVIDER',
      category: category,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(location.longitude), parseFloat(location.latitude)]
          },
          $maxDistance: 50000 // 50km radius
        }
      }
    });

    console.log('Found eligible providers:', eligibleProviders.length);

    // Create notifications for all eligible providers
    if (eligibleProviders.length > 0) {
      const notifications = eligibleProviders.map(provider => ({
        recipient: provider._id,
        type: 'QUICK_SERVICE_REQUEST',
        task: task._id,
        message: `New quick service request: ${title}`,
        status: 'UNREAD'
      }));

      await Notification.insertMany(notifications);
      console.log('Notifications created:', notifications.length);
    }

    res.status(201).json({
      message: 'Quick service task created and notifications sent',
      task,
      notifiedProviders: eligibleProviders.length
    });
  } catch (error) {
    console.error('Quick service error:', error);
    res.status(500).json({ error: error.message || 'Failed to create quick service task' });
  }
});

// Accept Quick Service Task
router.post('/quick-service/:taskId/accept', auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.taskId,
      status: 'QUICK_SERVICE_PENDING'
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found or already accepted' });
    }

    // Update task status and assign provider
    task.status = 'ASSIGNED';
    task.provider = req.user._id;
    await task.save();

    // Remove notifications for other providers
    await Notification.deleteMany({
      task: task._id,
      type: 'QUICK_SERVICE_REQUEST',
      recipient: { $ne: req.user._id }
    });

    // Update notification for accepting provider
    await Notification.findOneAndUpdate(
      {
        task: task._id,
        recipient: req.user._id
      },
      {
        status: 'READ',
        message: `You accepted the quick service task: ${task.title}`
      }
    );

    res.json({
      message: 'Quick service task accepted successfully',
      task
    });
  } catch (error) {
    console.error('Error accepting quick service task:', error);
    res.status(500).json({ error: error.message || 'Failed to accept quick service task' });
  }
});

// Reject a task
router.patch('/:id/reject', auth, async (req, res) => {
  try {
    console.log('Attempting to reject task:', req.params.id);
    
    const task = await Task.findOne({
      _id: req.params.id,
      status: { $in: ['OPEN', 'QUICK_SERVICE_PENDING'] }
    });

    console.log('Found task:', task);

    if (!task) {
      console.log('Task not found or cannot be rejected');
      return res.status(404).json({ error: 'Task not found or cannot be rejected' });
    }

    // Update task status
    try {
      task.status = 'REJECTED';
      console.log('Saving task with new status:', task.status);
      await task.save();
      console.log('Task status updated successfully');
    } catch (taskError) {
      console.error('Error saving task:', taskError);
      return res.status(500).json({ error: 'Failed to update task status', details: taskError.message });
    }

    // Create notification (don't let notification failure affect task rejection)
    try {
      console.log('Creating notification for client:', task.client);
      const notification = new Notification({
        recipient: task.client,
        type: 'TASK_REJECTED',
        task: task._id,
        message: `Your task "${task.title}" was rejected by a provider`,
        provider: req.user._id
      });
      await notification.save();
      console.log('Notification saved successfully');
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't return here, just log the error and continue
    }

    // Return success response
    return res.json({
      success: true,
      message: 'Task rejected successfully',
      task
    });

  } catch (error) {
    console.error('Error in reject task endpoint:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Failed to reject task',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;