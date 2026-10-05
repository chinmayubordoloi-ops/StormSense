/**
 * Drop-in cascading location selector: State -> District -> Local Area -> Get Live Weather.
 *
 * HOW TO USE:
 * 1. Add this markup wherever you want the selector in StormSense.html:
 *
 *    <div id="locationSelector">
 *      <select id="stateSelect"><option value="">Select State</option></select>
 *      <select id="districtSelect" disabled><option value="">Select District</option></select>
 *      <select id="areaSelect" disabled><option value="">Select Local Area</option></select>
 *      <button id="getWeatherBtn" disabled>Get Live Weather</button>
 *    </div>
 *
 * 2. Include this script (e.g. <script src="location-selector.js"></script>) before
 *    your closing </body> tag, or paste its contents into your existing inline <script>.
 *
 * 3. It calls window.onLocationWeatherLoaded(data) with the response from
 *    GET /api/weather/:locationId whenever the user completes a selection —
 *    define that function elsewhere in your app to render the result
 *    (e.g. feed it into your existing render() function in StormSense.html).
 */
(function () {
  var BACKEND_URL = 'http://localhost:5000/api';

  var stateSelect = document.getElementById('stateSelect');
  var districtSelect = document.getElementById('districtSelect');
  var areaSelect = document.getElementById('areaSelect');
  var getWeatherBtn = document.getElementById('getWeatherBtn');

  if (!stateSelect || !districtSelect || !areaSelect || !getWeatherBtn) {
    console.warn('location-selector.js: expected elements not found in the page. See usage comment at top of this file.');
    return;
  }

  function resetSelect(select, placeholder) {
    select.innerHTML = '<option value="">' + placeholder + '</option>';
    select.disabled = true;
  }

  async function loadStates() {
    try {
      var res = await fetch(BACKEND_URL + '/locations/states');
      var data = await res.json();
      data.states.forEach(function (state) {
        var opt = document.createElement('option');
        opt.value = state;
        opt.textContent = state;
        stateSelect.appendChild(opt);
      });
      stateSelect.disabled = false;
    } catch (e) {
      console.error('Failed to load states:', e);
    }
  }

  stateSelect.addEventListener('change', async function () {
    resetSelect(districtSelect, 'Select District');
    resetSelect(areaSelect, 'Select Local Area');
    getWeatherBtn.disabled = true;

    var state = stateSelect.value;
    if (!state) return;

    try {
      var res = await fetch(BACKEND_URL + '/locations/districts/' + encodeURIComponent(state));
      var data = await res.json();
      data.districts.forEach(function (district) {
        var opt = document.createElement('option');
        opt.value = district;
        opt.textContent = district;
        districtSelect.appendChild(opt);
      });
      districtSelect.disabled = false;
    } catch (e) {
      console.error('Failed to load districts:', e);
    }
  });

  districtSelect.addEventListener('change', async function () {
    resetSelect(areaSelect, 'Select Local Area');
    getWeatherBtn.disabled = true;

    var district = districtSelect.value;
    if (!district) return;

    try {
      var res = await fetch(BACKEND_URL + '/locations/areas/' + encodeURIComponent(district));
      var data = await res.json();
      data.areas.forEach(function (area) {
        var opt = document.createElement('option');
        opt.value = area.locationId;
        opt.textContent = area.cityOrArea + (area.level === 'district' ? ' (district HQ)' : '');
        areaSelect.appendChild(opt);
      });
      areaSelect.disabled = false;
    } catch (e) {
      console.error('Failed to load local areas:', e);
    }
  });

  areaSelect.addEventListener('change', function () {
    getWeatherBtn.disabled = !areaSelect.value;
  });

  getWeatherBtn.addEventListener('click', async function () {
    var locationId = areaSelect.value;
    if (!locationId) return;

    getWeatherBtn.disabled = true;
    getWeatherBtn.textContent = 'Loading...';

    try {
      var res = await fetch(BACKEND_URL + '/weather/' + encodeURIComponent(locationId));
      var data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch weather');

      if (typeof window.onLocationWeatherLoaded === 'function') {
        window.onLocationWeatherLoaded(data);
      } else {
        console.log('Weather data (define window.onLocationWeatherLoaded to render this):', data);
      }
    } catch (e) {
      console.error('Failed to fetch weather:', e);
      alert('Could not load weather for this location: ' + e.message);
    } finally {
      getWeatherBtn.disabled = false;
      getWeatherBtn.textContent = 'Get Live Weather';
    }
  });

  loadStates();
})();
