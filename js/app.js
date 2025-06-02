const map = L.map('map').setView([48.3794, 31.1656], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

let lat, lng;
let draftMarker = null;
let markers = [];
let allLocations = []; // для хранения всех загруженных локаций

async function loadMarkers(filterCategory = 'all') {
  try {
    const res = await fetch('http://localhost:5000/api/locations');
    const locations = await res.json();
    allLocations = locations; // сохраняем все маркеры

    markers.forEach(({ marker }) => map.removeLayer(marker));
    markers = [];

    const markerList = document.getElementById('markerList');
    markerList.innerHTML = '';

    locations
      .filter(loc => filterCategory === 'all' || loc.category === filterCategory)
      .forEach(loc => {
        const marker = L.marker([loc.coordinates.lat, loc.coordinates.lng]).addTo(map);

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

loadMarkers(document.getElementById('categoryFilter').value);
document.getElementById('categoryFilter').addEventListener('change', e => loadMarkers(e.target.value));

map.on('click', e => {
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

function removeDraft() {
  if (draftMarker) {
    map.removeLayer(draftMarker);
    draftMarker = null;
    lat = lng = null;
  }
}

async function deleteMarker(id) {
  try {
    const res = await fetch(`http://localhost:5000/api/locations/${id}`, { method: 'DELETE' });

    if (res.ok) {
      alert('Marker removed');
      const currentFilter = document.getElementById('categoryFilter').value;
      loadMarkers(currentFilter);
    } else {
      alert('Error deleting marker');
    }
  } catch (err) {
    console.error('Server error:', err);
    alert('Server error');
  }
}

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

document.getElementById('markerForm').addEventListener('submit', async e => {
  e.preventDefault();

  if (lat == null || lng == null) {
    alert('Выберите точку на карте');
    return;
  }

  const name = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const category = document.getElementById('category').value.trim();

  const form = document.getElementById('markerForm');
  const id = form.dataset.id;

  // Проверка на дубликаты по названию
  const duplicate = allLocations.find(loc =>
    loc.name === name && (!id || loc._id !== id)
  );

  if (duplicate) {
    alert('Метка с таким названием уже существует!');
    return;
  }

  const payload = {
    name,
    description,
    category,
    lat,
    lng,
  };

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
      alert(id ? 'Метка обновлена' : 'Метка добавлена');
      form.reset();
      delete form.dataset.id;
      removeDraft();
      const currentFilter = document.getElementById('categoryFilter').value;
      await loadMarkers(currentFilter);
    } else {
      alert('Ошибка при сохранении метки');
    }

  } catch (err) {
    console.error('Ошибка сервера:', err);
    alert('Ошибка сервера');
  }
});


document.getElementById('clear').addEventListener('click', async e => {
  e.preventDefault();
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
