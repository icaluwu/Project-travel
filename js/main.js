// js/main.js
const citySelect = document.getElementById('citySelect');
const container = document.getElementById('forecastContainer');

// peta cuaca -> nama file ikon di /images
const ICON_MAP = {
    clear: 'clear.png',
    pcloudy: 'pcloudy.png',
    mcloudy: 'mcloudy.png',
    cloudy: 'cloudy.png',
    humid: 'humid.png',
    lightrain: 'lightrain.png',
    oshower: 'oshower.png',   // occasional shower
    ishower: 'ishower.png',   // intermittent shower
    rain: 'rain.png',
    snow: 'snow.png',
    lightsnow: 'lightsnow.png',
    rainsnow: 'rainsnow.png',
    ts: 'tstorm.png',
    tsrain: 'tsrain.png',
    windy: 'windy.png',
    fog: 'fog.png'
};

// util: parse CSV sederhana "City,Country,lat,lon"
function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const header = lines.shift().split(',').map(s => s.trim().toLowerCase());
    const idx = {
        lat: header.indexOf('lat') !== -1 ? header.indexOf('lat') : header.indexOf('latitude'),
        lon: header.indexOf('lon') !== -1 ? header.indexOf('lon') : header.indexOf('longitude'),
        city: header.indexOf('city'),
        country: header.indexOf('country'),
    };
    const result = [];
    for (const line of lines) {
        if (!line.trim()) continue;
        const cols = line.split(',').map(s => s.trim());
        if ([idx.lat, idx.lon, idx.city, idx.country].some(i => i < 0 || cols[i] == null)) continue;
        const lat = parseFloat(cols[idx.lat]);
        const lon = parseFloat(cols[idx.lon]);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        result.push({ label: `${cols[idx.city]}, ${cols[idx.country]}`, lat, lon });
    }
    return result;
}

// isi dropdown dari city_coordinates.csv (di root repo)
async function loadCities() {
    try {
        const res = await fetch('./city_coordinates.csv', { cache: 'no-store' });
        const txt = await res.text();
        const cities = parseCSV(txt);
        for (const c of cities) {
            const opt = document.createElement('option');
            opt.value = JSON.stringify({ lat: c.lat, lon: c.lon });
            opt.textContent = c.label;
            citySelect.appendChild(opt);
        }
    } catch (e) {
        container.innerHTML = `<p class="placeholder">Failed to load cities. Check city_coordinates.csv</p>`;
        console.error(e);
    }
}

// panggil 7Timer civillight
async function loadForecast({ lat, lon }) {
    container.innerHTML = `<p class="placeholder">Loading forecast…</p>`;
    const url = `https://www.7timer.info/bin/civillight.php?lat=${lat}&lon=${lon}&ac=0&unit=metric&output=json`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`7Timer error: ${res.status}`);
    return res.json();
}

function yyyymmddToReadable(n) {
    // n: 20250307 (number)
    const s = String(n);
    const y = +s.slice(0, 4);
    const m = +s.slice(4, 6) - 1;
    const d = +s.slice(6, 8);
    return new Date(Date.UTC(y, m, d, 12, 0, 0)).toDateString().split(' ').slice(0, 3).join(' ');
}

function renderForecast(json) {
    const series = (json && json.dataseries) ? json.dataseries.slice(0, 7) : [];
    if (!series.length) {
        container.innerHTML = `<p class="placeholder">No data.</p>`;
        return;
    }

    container.innerHTML = '';
    for (const day of series) {
        const iconFile = ICON_MAP[day.weather] || 'pcloudy.png';
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
      <div class="date">${yyyymmddToReadable(day.date)}</div>
      <div class="icon-wrap">
        <img src="./images/${iconFile}" alt="${day.weather}">
      </div>
      <div class="desc">${day.weather.replace(/_/g, ' ')}</div>
      <div class="temps">H: ${day.temp2m.max}°C &nbsp; L: ${day.temp2m.min}°C</div>
    `;
        container.appendChild(card);
    }
}

// event
citySelect.addEventListener('change', async () => {
    const v = citySelect.value;
    if (!v) {
        container.innerHTML = `<p class="placeholder">Choose a city to view 7-day forecast.</p>`;
        return;
    }
    try {
        const coords = JSON.parse(v);
        const json = await loadForecast(coords);
        renderForecast(json);
    } catch (err) {
        console.error(err);
        container.innerHTML = `<p class="placeholder">Failed to fetch forecast (CORS/network?).</p>`;
    }
});

// kick-off
loadCities();
