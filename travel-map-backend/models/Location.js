const mongoose = require('mongoose'); // Імпортуємо бібліотеку mongoose для роботи з MongoDB

// Створюємо схему для моделі "Location" (локація/маркер)
const LocationSchema = new mongoose.Schema({
  name: { 
    type: String,          // Назва локації
    required: true         // Обов’язкове поле
  },
  description: { 
    type: String           // Опис локації 
  },
  category: { 
    type: String           // Категорія локації 
  },
  coordinates: {           // Вкладений об’єкт для координат
    lat: { 
      type: Number,        // Широта
      required: true       // Обов’язкове поле
    },
    lng: { 
      type: Number,        // Довгота
      required: true       // Обов’язкове поле
    }
  }
});

// Експортуємо модель Location на основі схеми LocationSchema
module.exports = mongoose.model('Location', LocationSchema);
