const map = L.map('map').setView([48.3794, 31.1656], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  shadowSize: [41, 41]
});

const greenIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  shadowSize: [41, 41]
});

let lat, lng;
let draftMarker = null;
let markers = [];
let allLocations = [];

async function loadMarkers(filterCategory = 'all') {
  try {
    const res = await fetch('http://localhost:5000/api/locations');
    const locations = await res.json();
    allLocations = locations;

    markers.forEach(({ marker }) => map.removeLayer(marker));
    markers = [];

    const markerList = document.getElementById('markerList');
    markerList.innerHTML = '';

    locations
      .filter(loc => filterCategory === 'all' || loc.category === filterCategory)
      .forEach(loc => {
        const icon = loc.category === 'Plan to visit' ? greenIcon : defaultIcon;

        const marker = L.marker([loc.coordinates.lat, loc.coordinates.lng], { icon }).addTo(map);

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

  // Иконка для draft маркера зависит от выбранной категории в форме
  const categorySelect = document.getElementById('category');
  const selectedCategory = categorySelect.value;
  const icon = selectedCategory === 'Plan to visit' ? greenIcon : defaultIcon;

  draftMarker = L.marker([lat, lng], { opacity: 0.6, icon }).addTo(map).bindPopup(`
    <div class="marker-popup">
      <b>New marker</b><br />
      Fill out the form and click "Save".
    </div>
  `).openPopup();

  draftMarker.on('popupclose', () => removeDraft());
});

document.getElementById('category').addEventListener('change', () => {
  if (draftMarker) {
    const icon = document.getElementById('category').value === 'Plan to visit' ? greenIcon : defaultIcon;
    draftMarker.setIcon(icon);
  }
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

  const icon = category === 'Plan to visit' ? greenIcon : defaultIcon;

  draftMarker = L.marker([lat, lng], { opacity: 0.6, icon }).addTo(map).bindPopup(`
    <div class="marker-popup">
      <b>Editing a marker</b>
    </div>
  `).openPopup();

  draftMarker.on('popupclose', () => removeDraft());
}

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

  // Проверка на дубликаты по имени
  const duplicate = allLocations.find(loc =>
    loc.name === name && (!id || loc._id !== id)
  );

  if (duplicate) {
    alert('A marker with this name already exists!');
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
      alert(id ? 'Marker updated' : 'Marker added');
      form.reset();
      delete form.dataset.id;
      removeDraft();
      const currentFilter = document.getElementById('categoryFilter').value;
      await loadMarkers(currentFilter);
    } else {
      alert('Error saving marker');
    }

  } catch (err) {
    console.error('Server error:', err);
    alert('Server error');
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
