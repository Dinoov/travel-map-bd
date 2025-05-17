require('dotenv').config(); // Завантаження змінних з .env
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Location = require('./models/Location'); // Модель мітки

const app = express();

// CORS-конфігурація
app.use(cors({
  origin: 'http://127.0.0.1:5500',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json()); // Для обробки JSON

// Підключення до MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Підключено до MongoDB'))
.catch(err => console.error('❌ Помилка підключення до MongoDB:', err));

// 🔹 GET: отримати всі мітки
app.get('/api/locations', async (req, res) => {
  try {
    const locations = await Location.find();
    res.status(200).json(locations);
  } catch (err) {
    res.status(500).json({ message: 'Помилка при завантаженні міток' });
  }
});

// 🔹 POST: створити нову мітку
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
    console.error('❌ Помилка при створенні мітки:', error);
    res.status(500).json({ message: 'Помилка при створенні мітки' });
  }
});

// 🔹 PUT: оновити мітку
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
      return res.status(404).json({ message: 'Мітку не знайдено' });
    }

    res.status(200).json(updated);
  } catch (error) {
    console.error('❌ Помилка при оновленні мітки:', error);
    res.status(500).json({ message: 'Помилка при оновленні мітки' });
  }
});

// 🔹 DELETE: видалити мітку
app.delete('/api/locations/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await Location.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Мітку не знайдено' });
    }

    res.status(200).json({ message: 'Мітку успішно видалено' });
  } catch (error) {
    console.error('❌ Помилка при видаленні мітки:', error);
    res.status(500).json({ message: 'Помилка при видаленні мітки' });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Сервер працює на порту ${PORT}`);
});
