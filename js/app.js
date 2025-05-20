// Инициализация карты
const map = L.map('map').setView([48.3794, 31.1656], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Координаты и временный маркер
let lat, lng;
let draftMarker = null;

// Список постоянных маркеров
let markers = [];

/* ---------- ЗАГРУЗКА МАРКЕРОВ ---------- */
async function loadMarkers() {
  try {
    const res = await fetch('http://localhost:5000/api/locations');
    const locations = await res.json();

    // Удаляем старые
    markers.forEach(({ marker }) => map.removeLayer(marker));
    markers = [];

    // Добавляем новые
    locations.forEach((loc) => {
      const marker = L.marker([loc.coordinates.lat, loc.coordinates.lng]).addTo(map);
      marker.bindPopup(
        `
        <div class="marker-popup">
          <b>${loc.name}</b>
          <p>${loc.description}</p>
          <span class="category">${loc.category}</span>
          <button class="edit-btn" onclick="editMarker('${loc._id}', '${loc.name}', '${loc.description}', '${loc.category}', ${loc.coordinates.lat}, ${loc.coordinates.lng})">Edit</button>
          <button class="delete-btn" onclick="deleteMarker('${loc._id}')">Delete</button>
        </div>
        `,
        { className: 'leaflet-custom-popup' },
      );

      markers.push({ id: loc._id, marker });
    });
  } catch (error) {
    console.error('Помилка завантаження міток:', error);
  }
}

loadMarkers();

/* ---------- КЛИК ПО КАРТЕ ---------- */
map.on('click', (e) => {
  lat = e.latlng.lat;
  lng = e.latlng.lng;

  // Координаты в скрытые поля
  document.getElementById('latitude').value = lat;
  document.getElementById('longitude').value = lng;

  // Удаляем предыдущий draft‑маркер, если был
  if (draftMarker) map.removeLayer(draftMarker);

  // Создаём новый черновик‑маркер
  draftMarker = L.marker([lat, lng], { opacity: 0.6 }).addTo(map);
  draftMarker.bindPopup(
    `
    <div class="marker-popup">
      <b>Marker here</b><br />
      Click "Save" to add<br />
    </div>
    `,
    { className: 'leaflet-custom-popup' },
  ).openPopup();

  // При закрытии попапа удаляем draft-маркер
  draftMarker.on('popupclose', () => {
    removeDraft();
  });
});

/* ---------- УДАЛЕНИЕ draft ---------- */
function removeDraft() {
  if (draftMarker) {
    map.removeLayer(draftMarker);
    draftMarker = null;
    lat = lng = null;
    document.getElementById('latitude').value = '';
    document.getElementById('longitude').value = '';
  }
}

/* ---------- УДАЛЕНИЕ ПОСТОЯННОГО МАРКЕРА ---------- */
async function deleteMarker(id) {
  try {
    const res = await fetch(`http://localhost:5000/api/locations/${id}`, { method: 'DELETE' });

    if (res.ok) {
      const obj = markers.find((m) => m.id === id);
      if (obj) {
        map.removeLayer(obj.marker);
        markers = markers.filter((m) => m.id !== id);
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

/* ---------- РЕДАКТИРОВАНИЕ ---------- */
function editMarker(id, name, description, category, latSel, lngSel) {
  document.getElementById('title').value = name;
  document.getElementById('description').value = description;
  document.getElementById('category').value = category;

  document.getElementById('markerForm').dataset.id = id;
  lat = latSel;
  lng = lngSel;

  // Показать черновик‑маркер в новой позиции
  if (draftMarker) map.removeLayer(draftMarker);
  draftMarker = L.marker([lat, lng], { opacity: 0.6 }).addTo(map);

  draftMarker.bindPopup(
    `
    <div class="marker-popup">
      <b>Редагування маркера</b><br />
      Натисніть «Зберегти» для оновлення<br />
    </div>
    `,
    { className: 'leaflet-custom-popup' },
  ).openPopup();

  draftMarker.on('popupclose', () => {
    removeDraft();
  });
}

/* ---------- СОХРАНЕНИЕ ---------- */
document.getElementById('markerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (lat == null || lng == null) {
    alert('Спочатку оберіть точку на карті');
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
      alert(id ? 'Мітку успішно оновлено!' : 'Мітку успішно додано!');
      form.reset();
      delete form.dataset.id;
      lat = lng = null;

      // Убираем draft‑маркер
      removeDraft();

      // Перезагружаем постоянные метки
      loadMarkers();
    } else {
      alert('Помилка при додаванні або редагуванні мітки');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Помилка серверу');
  }
});

// Видалення всіх маркерів
document.getElementById('clear').addEventListener('click', async (e) => {
  e.preventDefault();

  if (!confirm('Ви впевнені, що хочете видалити всі мітки?')) return;

  try {
    const res = await fetch('http://localhost:5000/api/locations', {
      method: 'DELETE'
    });

    if (res.ok) {
      alert('Усі мітки успішно видалено!');
      // Очищаємо мапу
      markers.forEach(({ marker }) => map.removeLayer(marker));
      markers = [];
    } else {
      alert('Помилка при видаленні міток');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Помилка серверу');
  }
});
