require('dotenv').config(); // Завантаження змінних середовища з файлу .env

const express = require('express');
const app = express();
const mongoose = require('mongoose'); // Підключення бібліотеки для роботи з MongoDB
const Location = require('./models/Location'); // Імпорт моделі локації (мітки)
const cors = require('cors'); // Підключення CORS для дозволу запитів з інших доменів

// Налаштування CORS для дозволу запитів з клієнтської частини
app.use(cors({
  origin: 'http://127.0.0.1:5500', // Дозволений клієнтський домен (порт Live Server у VS Code)
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Дозволені HTTP-методи
  allowedHeaders: ['Content-Type'] // Дозволені заголовки
}));

app.use(express.json()); // Дозвіл парсингу JSON-запитів

// Підключення до бази даних MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB')) 
  .catch(err => console.error('MongoDB connection error:', err)); 

// GET: Отримання всіх локацій
app.get('/api/locations', async (req, res) => {
  try {
    const locations = await Location.find(); // Пошук усіх документів у колекції
    res.status(200).json(locations); // Відправка знайдених локацій
  } catch (err) {
    res.status(500).json({ message: 'Error fetching locations' }); // Обробка помилки
  }
});

// POST: Створення нової локації
app.post('/api/locations', async (req, res) => {
  const { name, description, category, lat, lng } = req.body; // Отримання даних з тіла запиту

  try {
    const newLocation = new Location({
      name,
      description,
      category,
      coordinates: { lat, lng } // Збереження координат
    });

    await newLocation.save(); // Збереження в базу даних
    res.status(201).json(newLocation); // Відправка створеного документа
  } catch (error) {
    console.error('Error creating location:', error); // Вивід помилки в консоль
    res.status(500).json({ message: 'Error creating location' }); // Відповідь з помилкою
  }
});

// PUT: Оновлення існуючої локації
app.put('/api/locations/:id', async (req, res) => {
  const { id } = req.params; // ID локації з параметру URL
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
      { new: true } // Повернути оновлений документ
    );

    if (!updated) {
      return res.status(404).json({ message: 'Location not found' }); // Якщо локацію не знайдено
    }

    res.status(200).json(updated); // Відправка оновленого документа
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Error updating location' });
  }
});

// DELETE: Видалення конкретної локації за ID
app.delete('/api/locations/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await Location.findByIdAndDelete(id); // Видалення документа
    if (!deleted) {
      return res.status(404).json({ message: 'Location not found' }); // Якщо не знайдено
    }

    res.status(200).json({ message: 'Location successfully deleted' }); // Успішне видалення
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ message: 'Error deleting location' });
  }
});

// DELETE: Видалення всіх локацій
app.delete('/api/locations', async (req, res) => {
  try {
    await Location.deleteMany({}); // Видалення всіх документів з колекції
    res.status(200).json({ message: 'All locations deleted' }); // Повідомлення про успішне очищення
  } catch (err) {
    res.status(500).json({ message: 'Error deleting locations' }); // Помилка під час видалення
  }
});

// Запуск сервера на вказаному порту
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`); // Повідомлення про запуск
});
