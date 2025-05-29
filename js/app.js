// Ініціалізація карти Leaflet з центром на Україну, масштаб 6
const map = L.map('map').setView([48.3794, 31.1656], 6);

// Додавання OpenStreetMap тайлів на карту з атрибуцією
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

let lat, lng;              // Змінні для координат маркера
let draftMarker = null;    // Тимчасовий маркер (чернетка)
let markers = [];          // Масив для збереження всіх маркерів

// Функція завантаження маркерів з бекенда
async function loadMarkers() {
  try {
    const res = await fetch('http://localhost:5000/api/locations');  // Отримання маркерів
    const locations = await res.json();

    // Видалення старих маркерів
    markers.forEach(({ marker }) => map.removeLayer(marker));
    markers = [];

    // Додавання нових маркерів
    locations.forEach((loc) => {
      const marker = L.marker([loc.coordinates.lat, loc.coordinates.lng]).addTo(map);

      // Спливаюче вікно з інформацією та кнопками
      marker.bindPopup(`
        <div class="marker-popup">
          <b>${loc.name}</b>
          <p>${loc.description}</p>
          <span class="category">${loc.category}</span>
          <button onclick="editMarker('${loc._id}', '${loc.name}', '${loc.description}', '${loc.category}', ${loc.coordinates.lat}, ${loc.coordinates.lng})">Edit</button>
          <button onclick="deleteMarker('${loc._id}')">Delete</button>
        </div>
      `);

      markers.push({ id: loc._id, marker });
    });
  } catch (error) {
    console.error('Error loading markers:', error);
  }
}
loadMarkers();

// Обробка кліку на мапу — створення чернетки маркера
map.on('click', (e) => {
  lat = e.latlng.lat;
  lng = e.latlng.lng;

  if (draftMarker) map.removeLayer(draftMarker);

  draftMarker = L.marker([lat, lng], { opacity: 0.6 }).addTo(map).bindPopup(`
    <div class="marker-popup">
      <b>New marker</b><br />
      Fill out the form and click "Save".
    </div>
  `).openPopup();

  draftMarker.on('popupclose', () => removeDraft());
});

// Видалення чернетки з карти
function removeDraft() {
  if (draftMarker) {
    map.removeLayer(draftMarker);
    draftMarker = null;
    lat = lng = null;
  }
}

// Видалення маркера за ID
async function deleteMarker(id) {
  try {
    const res = await fetch(`http://localhost:5000/api/locations/${id}`, { method: 'DELETE' });

    if (res.ok) {
      const obj = markers.find((m) => m.id === id);
      if (obj) {
        map.removeLayer(obj.marker);
        markers = markers.filter((m) => m.id !== id);
      }
      alert('Marker removed');
    } else {
      alert('Error deleting marker');
    }
  } catch (error) {
    console.error('Server error:', error);
    alert('Server error');
  }
}

// Редагування маркера — заповнює форму і створює чернетку на мапі
function editMarker(id, name, description, category, latSel, lngSel) {
  document.getElementById('title').value = name;
  document.getElementById('description').value = description;
  document.getElementById('category').value = category;

  document.getElementById('markerForm').dataset.id = id;
  lat = latSel;
  lng = lngSel;

  if (draftMarker) map.removeLayer(draftMarker);
  draftMarker = L.marker([lat, lng], { opacity: 0.6 }).addTo(map).bindPopup(`
    <div class="marker-popup">
      <b>Editing a marker</b>
    </div>
  `).openPopup();

  draftMarker.on('popupclose', () => removeDraft());
}

// Збереження маркера (створення нового або оновлення існуючого)
document.getElementById('markerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (lat == null || lng == null) {
    alert('Select a point on the map');
    return;
  }

  const payload = {
    name: document.getElementById('title').value,
    description: document.getElementById('description').value,
    category: document.getElementById('category').value,
    lat,
    lng,
  };

  const form = document.getElementById('markerForm');
  const id = form.dataset.id;
  const url = id ? `http://localhost:5000/api/locations/${id}` : 'http://localhost:5000/api/locations';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      alert(id ? 'Marker updated' : 'Marker added');
      form.reset();
      delete form.dataset.id;
      removeDraft();
      loadMarkers();
    } else {
      alert('Error saving marker');
    }
  } catch (error) {
    console.error('Server error:', error);
    alert('Server error');
  }
});

// Видалення всіх маркерів з карти
document.getElementById('clear').addEventListener('click', async (e) => {
  e.preventDefault();

  if (!confirm('Delete all markers?')) return;

  try {
    const res = await fetch('http://localhost:5000/api/locations', { method: 'DELETE' });

    if (res.ok) {
      alert('All markers removed');
      markers.forEach(({ marker }) => map.removeLayer(marker));
      markers = [];
    } else {
      alert('Error deleting markers');
    }
  } catch (error) {
    console.error('Server error:', error);
    alert('Server error');
  }
});
