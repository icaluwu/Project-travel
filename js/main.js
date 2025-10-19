const citySelect = document.getElementById('citySelect');
const container = document.getElementById('forecastContainer');

// mapping sesuai file PNG di folder `images/`
const ICON_MAP = {
    clear: 'clear.png',
    cloudy: 'cloudy.png',
    fog: 'fog.png',
    humid: 'humid.png',
    ishower: 'ishower.png',
    lightrain: 'lightrain.png',
    lightsnow: 'lightsnow.png',
    mcloudy: 'mcloudy.png',
    oshower: 'oshower.png',
    pcloudy: 'pcloudy.png',
    rain: 'rain.png',
    rainsnow: 'rainsnow.png',
    snow: 'snow.png',
    tsrain: 'tsrain.png',
    tstorm: 'tstorm.png',
    windy: 'windy.png'
};

// --- CSV parser: header-aware (latitude,longitude,city,country)
function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const header = lines.shift().split(',').map(s => s.trim().toLowerCase());
    const idx = {
        lat: header.indexOf('latitude'),
        lon: header.indexOf('longitude'),
        city: header.indexOf('city'),
        country: header.indexOf('country')
    };
    const out = [];
    for (const line of lines) {
        if (!line.trim()) continue;
        const cols = line.split(',').map(s => s.trim());
        const lat = parseFloat(cols[idx.lat]);
        const lon = parseFloat(cols[idx.lon]);
        const city = cols[idx.city];
        const country = cols[idx.country] || '';
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || !city) continue;
        out.push({ label: `${city}, ${country}`.replace(/,\s*$/, ''), lat, lon });
    }
    return out;
}

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
        console.error(e);
        container.innerHTML = `<p class="placeholder">Failed to load cities.</p>`;
    }
}

async function loadForecast({ lat, lon }) {
    container.innerHTML = `<p class="placeholder">Loading forecast…</p>`;
    const url = `https://www.7timer.info/bin/civillight.php?lat=${lat}&lon=${lon}&ac=0&unit=metric&output=json`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`7Timer: ${res.status}`);
    return res.json();
}

function yyyymmddToLabel(n) {
    const s = String(n), y = +s.slice(0, 4), m = +s.slice(4, 6) - 1, d = +s.slice(6, 8);
    return new Date(Date.UTC(y, m, d)).toDateString().split(' ').slice(0, 3).join(' ');
}

function renderForecast(json) {
    const series = (json && json.dataseries) ? json.dataseries.slice(0, 7) : [];
    if (!series.length) { container.innerHTML = `<p class="placeholder">No data.</p>`; return; }

    container.innerHTML = '';
    for (const day of series) {
        const icon = ICON_MAP[day.weather] || 'pcloudy.png';
        const el = document.createElement('div');
        el.className = 'card';
        el.innerHTML = `
      <div class="date">${yyyymmddToLabel(day.date)}</div>
      <div class="icon-wrap"><img src="./images/${icon}" alt="${day.weather}"></div>
      <div class="desc">${day.weather.replace(/_/g, ' ')}</div>
      <div class="temps">H: ${day.temp2m.max}°C &nbsp; L: ${day.temp2m.min}°C</div>
    `;
        container.appendChild(el);
    }
}

citySelect.addEventListener('change', async e => {
    if (!e.target.value) {
        container.innerHTML = `<p class="placeholder">Choose a city to view 7-day forecast.</p>`;
        return;
    }
    try {
        const coords = JSON.parse(e.target.value);
        const data = await loadForecast(coords);
        renderForecast(data);
    } catch (err) {
        console.error(err);
        container.innerHTML = `<p class="placeholder">Failed to fetch forecast.</p>`;
    }
});

loadCities();
