// Ініціалізація карти з центром на Україні та масштабом 6
const map = L.map('map').setView([48.3794, 31.1656], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

// Ініціалізація групи для кластеризації маркерів
const markerClusterGroup = L.markerClusterGroup();
map.addLayer(markerClusterGroup);

// Стандартна іконка маркера
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
});

// Зелена іконка для категорії "Plan to visit"
const greenIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
});

// Змінні для координат та маркерів
let lat, lng;
let draftMarker = null;  // Чернетковий маркер
let markers = [];        // Масив маркерів на мапі
let allLocations = [];   // Усі локації з бази

// Завантаження маркерів з сервера, з фільтром за категорією
async function loadMarkers(filterCategory = 'all') {
  try {
    const res = await fetch('http://localhost:5000/api/locations');
    const locations = await res.json();
    allLocations = locations;

    // Очистити попередні маркери
    markerClusterGroup.clearLayers();
    markers = [];

    const markerList = document.getElementById('markerList');
    markerList.innerHTML = '';

    locations
      .filter(loc => filterCategory === 'all' || loc.category === filterCategory)
      .forEach(loc => {
        const icon = loc.category === 'Plan to visit' ? greenIcon : defaultIcon;

        // Створення маркера
        const marker = L.marker([loc.coordinates.lat, loc.coordinates.lng], { icon });

        // Прив’язка попапу з інформацією та кнопками редагування/видалення
        marker.bindPopup(`
          <div class="marker-popup">
            <b>${loc.name}</b>
            <p>${loc.description}</p>
            <span class="category">${loc.category}</span>
            <button onclick="editMarker('${loc._id}', '${loc.name}', '${loc.description}', '${loc.category}', ${loc.coordinates.lat}, ${loc.coordinates.lng})">Edit</button>
            <button onclick="deleteMarker('${loc._id}')">Delete</button>
          </div>
        `);

        markerClusterGroup.addLayer(marker);
        markers.push({ id: loc._id, marker });

        // Додавання елемента у список маркерів збоку
        const li = document.createElement('li');
        li.textContent = loc.name;
        li.style.cursor = 'pointer';
        li.addEventListener('click', () => {
          map.setView([loc.coordinates.lat, loc.coordinates.lng], 12);
          marker.openPopup();
        });

        markerList.appendChild(li);
      });
  } catch (err) {
    console.error('Error loading markers:', err);
  }
}

// Завантажити маркери при старті сторінки
loadMarkers(document.getElementById('categoryFilter').value);

// Слухач події для зміни категорії фільтра
document.getElementById('categoryFilter').addEventListener('change', e =>
  loadMarkers(e.target.value)
);

// Обробка кліку по мапі — додавання нового маркера
map.on('click', e => {
  lat = e.latlng.lat;
  lng = e.latlng.lng;

  // Видалення попереднього чернеткового маркера
  if (draftMarker) map.removeLayer(draftMarker);

  const selectedCategory = document.getElementById('category').value;
  const icon = selectedCategory === 'Plan to visit' ? greenIcon : defaultIcon;

  // Додавання нового тимчасового маркера
  draftMarker = L.marker([lat, lng], { opacity: 0.6, icon })
    .addTo(map)
    .bindPopup(`
      <div class="marker-popup">
        <b>New marker</b><br />
        Fill out the form and click "Save".
      </div>
    `).openPopup();

  // Видалення чернетки після закриття попапу
  draftMarker.on('popupclose', () => removeDraft());
});

// Зміна іконки чернеткового маркера при зміні категорії
document.getElementById('category').addEventListener('change', () => {
  if (draftMarker) {
    const icon = document.getElementById('category').value === 'Plan to visit' ? greenIcon : defaultIcon;
    draftMarker.setIcon(icon);
  }
});

// Видалення тимчасового маркера з карти
function removeDraft() {
  if (draftMarker) {
    map.removeLayer(draftMarker);
    draftMarker = null;
    lat = lng = null;
  }
}

// Видалення окремого маркера
async function deleteMarker(id) {
  try {
    const res = await fetch(`http://localhost:5000/api/locations/${id}`, { method: 'DELETE' });

    if (res.ok) {
      alert('Marker removed');
      loadMarkers(document.getElementById('categoryFilter').value);
    } else {
      alert('Error deleting marker');
    }
  } catch (err) {
    console.error('Server error:', err);
    alert('Server error');
  }
}

// Редагування маркера — заповнення форми поточними даними
function editMarker(id, name, description, category, latSel, lngSel) {
  document.getElementById('title').value = name;
  document.getElementById('description').value = description;
  document.getElementById('category').value = category;

  document.getElementById('markerForm').dataset.id = id;
  lat = latSel;
  lng = lngSel;

  if (draftMarker) map.removeLayer(draftMarker);

  const icon = category === 'Plan to visit' ? greenIcon : defaultIcon;

  draftMarker = L.marker([lat, lng], { opacity: 0.6, icon })
    .addTo(map)
    .bindPopup(`<div class="marker-popup"><b>Editing a marker</b></div>`)
    .openPopup();

  draftMarker.on('popupclose', () => removeDraft());
}

// Обробка надсилання форми (додавання або редагування маркера)
document.getElementById('markerForm').addEventListener('submit', async e => {
  e.preventDefault();

  if (lat == null || lng == null) {
    alert('Please select a point on the map');
    return;
  }

  const name = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const category = document.getElementById('category').value.trim();

  const form = document.getElementById('markerForm');
  const id = form.dataset.id;

  // Перевірка на дублікати
  const duplicate = allLocations.find(loc =>
    loc.name === name && (!id || loc._id !== id)
  );

  if (duplicate) {
    alert('A marker with this name already exists!');
    return;
  }

  const payload = { name, description, category, lat, lng };
  const url = id
    ? `http://localhost:5000/api/locations/${id}`
    : 'http://localhost:5000/api/locations';
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
      loadMarkers(document.getElementById('categoryFilter').value);
    } else {
      alert('Error saving marker');
    }
  } catch (err) {
    console.error('Server error:', err);
    alert('Server error');
  }
});

// Видалення усіх маркерів з карти та бази
document.getElementById('clear').addEventListener('click', async e => {
  e.preventDefault();

  if (markers.length === 0) {
    alert('There are no markers to delete.');
    return;
  }

  if (!confirm('Delete all markers?')) return;

  try {
    const res = await fetch('http://localhost:5000/api/locations', { method: 'DELETE' });

    if (res.ok) {
      alert('All markers removed');
      markers.forEach(({ marker }) => map.removeLayer(marker));
      markers = [];
      allLocations = [];
      document.getElementById('markerList').innerHTML = '';
    } else {
      alert('Error deleting markers');
    }
  } catch (err) {
    console.error('Server error:', err);
    alert('Server error');
  }
});
