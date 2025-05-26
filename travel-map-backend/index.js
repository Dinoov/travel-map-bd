require('dotenv').config(); // Load environment variables
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Location = require('./models/Location'); // Marker model

const app = express();

// CORS configuration
app.use(cors({
  origin: 'http://127.0.0.1:5500',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json()); 

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// 🔹 GET: fetch all locations
app.get('/api/locations', async (req, res) => {
  try {
    const locations = await Location.find();
    res.status(200).json(locations);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching locations' });
  }
});

// 🔹 POST: create a new location
app.post('/api/locations', async (req, res) => {
  const { name, description, category, lat, lng } = req.body;

  try {
    const newLocation = new Location({
      name,
      description,
      category,
      coordinates: { lat, lng }
    });

    await newLocation.save();
    res.status(201).json(newLocation);
  } catch (error) {
    console.error('❌ Error creating location:', error);
    res.status(500).json({ message: 'Error creating location' });
  }
});

// 🔹 PUT: update a location
app.put('/api/locations/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, category, lat, lng } = req.body;

  try {
    const updated = await Location.findByIdAndUpdate(
      id,
      {
        name,
        description,
        category,
        coordinates: { lat, lng }
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Location not found' });
    }

    res.status(200).json(updated);
  } catch (error) {
    console.error('❌ Error updating location:', error);
    res.status(500).json({ message: 'Error updating location' });
  }
});

// 🔹 DELETE: delete a specific location
app.delete('/api/locations/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await Location.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Location not found' });
    }

    res.status(200).json({ message: 'Location successfully deleted' });
  } catch (error) {
    console.error('❌ Error deleting location:', error);
    res.status(500).json({ message: 'Error deleting location' });
  }
});

// 🔹 DELETE: delete all locations
app.delete('/api/locations', async (req, res) => {
  try {
    await Location.deleteMany({});
    res.status(200).json({ message: 'All locations deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting locations' });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
