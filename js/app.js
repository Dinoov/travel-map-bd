// Ініціалізація мапи
const map = L.map('map').setView([51.505, -0.09], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Змінні координат
let lat, lng;

// Масив для зберігання маркерів на карті
let markers = [];

// Завантаження міток
async function loadMarkers() {
  try {
    const response = await fetch('http://localhost:5000/api/locations');
    const locations = await response.json();

    locations.forEach(loc => {
      const marker = L.marker([loc.coordinates.lat, loc.coordinates.lng]).addTo(map);
      marker.bindPopup(`
        <div class="marker-popup">
          <b>${loc.name}</b>
          <p>${loc.description}</p>
          <span class="category">${loc.category}</span>
          <button class="edit-btn" onclick="editMarker('${loc._id}', '${loc.name}', '${loc.description}', '${loc.category}', ${loc.coordinates.lat}, ${loc.coordinates.lng})">Редагувати</button>
          <button class="delete-btn" onclick="deleteMarker('${loc._id}', this)">Видалити</button>
        </div>
      `, { className: 'leaflet-custom-popup' });

      // Зберігаємо маркер в масив
      markers.push({ id: loc._id, marker: marker });
    });
  } catch (error) {
    console.error('Помилка завантаження міток:', error);
  }
}

loadMarkers();

// Клік по карті — попередній маркер
map.on('click', function(e) {
  lat = e.latlng.lat;
  lng = e.latlng.lng;

  L.marker([lat, lng]).addTo(map)
    .bindPopup(`
      <div class="marker-popup">
        <b>Нова мітка</b>
        <p>Мітка на цьому місці</p>
      </div>
    `, { className: 'leaflet-custom-popup' })
    .openPopup();
});

// Видалення мітки
async function deleteMarker(id, button) {
  try {
    const response = await fetch(`http://localhost:5000/api/locations/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      // Видаляємо маркер з карти
      const marker = markers.find(m => m.id === id);
      if (marker) {
        map.removeLayer(marker.marker);
        markers = markers.filter(m => m.id !== id); // Видаляємо з масиву
      }
      alert('Мітку успішно видалено!');
    } else {
      alert('Помилка при видаленні мітки');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Помилка серверу');
  }
}

// Оновлення мітки
async function editMarker(id, name, description, category, lat, lng) {
  // Вставляємо дані в форму
  document.getElementById('title').value = name;
  document.getElementById('description').value = description;
  document.getElementById('category').value = category;

  // Зберігаємо id мітки
  document.getElementById('markerForm').dataset.id = id;
  document.getElementById('markerForm').dataset.lat = lat;
  document.getElementById('markerForm').dataset.lng = lng;

  // Логування для перевірки
  console.log(`Editing marker: ${id}, ${name}`);
}
// Відправка нової мітки
document.getElementById('markerForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const title = document.getElementById('title').value;
  const description = document.getElementById('description').value;
  const category = document.getElementById('category').value;

  const newLocation = {
    name: title,
    description: description,
    category: category,
    lat: lat,
    lng: lng,
  };

  const form = document.getElementById('markerForm');
  const locationId = form.dataset.id; // Отримуємо id для редагування

  try {
    let response;
    if (locationId) {
      // Редагування мітки
      response = await fetch(`http://localhost:5000/api/locations/${locationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLocation),
      });

      if (response.ok) {
        // Оновлюємо мітку на карті
        const marker = markers.find(m => m.id === locationId);
        if (marker) {
          marker.marker.setLatLng([newLocation.lat, newLocation.lng]);
          marker.marker.getPopup().setContent(`
            <div class="marker-popup">
              <b>${newLocation.name}</b>
              <p>${newLocation.description}</p>
              <span class="category">${newLocation.category}</span>
              <button class="edit-btn" onclick="editMarker('${locationId}', '${newLocation.name}', '${newLocation.description}', '${newLocation.category}', ${newLocation.lat}, ${newLocation.lng})">Редагувати</button>
              <button class="delete-btn" onclick="deleteMarker('${locationId}', this)">Видалити</button>
            </div>
          `);
        }
      }
    } else {
      // Додавання нової мітки
      response = await fetch('http://localhost:5000/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLocation),
      });
    }

    if (response.ok) {
      alert(locationId ? 'Мітку успішно оновлено!' : 'Мітку успішно додано!');
      loadMarkers(); // Перезавантажуємо мітки після операції
      form.reset(); // Очищаємо форму
      delete form.dataset.id; // Видаляємо id після збереження
    } else {
      alert('Помилка при додаванні або редагуванні мітки');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Помилка серверу');
  }
});
