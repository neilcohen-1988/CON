const TIME_ZONE = 'Asia/Jerusalem';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=31.7683&longitude=35.2137&current=temperature_2m&temperature_unit=celsius&timezone=Asia%2FJerusalem&timeformat=unixtime&forecast_days=1';
const CACHE_KEY = 'con-jerusalem-weather-v1';
const REFRESH_MS = 15 * 60 * 1000;
const MAX_AGE_MS = 60 * 60 * 1000;
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});

export function jerusalemTime(date = new Date()) {
  const parts = Object.fromEntries(timeFormatter.formatToParts(date).map(part => [part.type, part.value]));
  const hours = Number(parts.hour), minutes = Number(parts.minute), seconds = Number(parts.second);
  return {
    label: `${parts.hour}:${parts.minute}`,
    hourAngle: (hours % 12) * 30 + minutes / 2 + seconds / 120,
    minuteAngle: minutes * 6 + seconds / 10,
    secondAngle: seconds * 6
  };
}

export function freshWeather(weather, now = Date.now()) {
  return Number.isFinite(weather?.temperature) && Number.isFinite(weather?.observedAt)
    && now - weather.observedAt >= -REFRESH_MS && now - weather.observedAt < MAX_AGE_MS;
}

export function installJerusalemStatus({ root, t }) {
  const clock = root.querySelector('.jerusalem-clock');
  const clockTitle = root.querySelector('#clock-title');
  const hourHand = root.querySelector('#clock-hour');
  const minuteHand = root.querySelector('#clock-minute');
  const secondHand = root.querySelector('#clock-second');
  const temperature = root.querySelector('#jerusalem-temperature');
  const weatherLink = root.querySelector('.jerusalem-weather');
  const dial = root.querySelector('#clock-dial');
  for (let minute = 0; minute < 60; minute++) {
    const isHour = minute % 5 === 0;
    const mark = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    mark.setAttribute('class', `clock-mark${isHour ? ' is-hour' : ''}`);
    mark.setAttribute('d', `M16 3.6V${isHour ? '5.7' : '4.3'}`);
    mark.setAttribute('transform', `rotate(${minute * 6} 16 16)`);
    dial.append(mark);
  }
  let weather = null, fetchedAt = 0, pending = false;
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
    if (freshWeather(cached)) {
      weather = cached;
      fetchedAt = cached.fetchedAt || 0;
    }
  } catch { /* The live clock and weather also work without storage. */ }

  function updateClock() {
    const time = jerusalemTime();
    hourHand.setAttribute('transform', `rotate(${time.hourAngle} 16 16)`);
    minuteHand.setAttribute('transform', `rotate(${time.minuteAngle} 16 16)`);
    secondHand.setAttribute('transform', `rotate(${time.secondAngle} 16 16)`);
    const label = t('jerusalemTime', { time: time.label });
    clock.setAttribute('aria-label', label);
    clockTitle.textContent = label;
  }

  function updateWeather() {
    if (!freshWeather(weather)) {
      temperature.textContent = '—°';
      weatherLink.setAttribute('aria-label', t('weatherUnavailable'));
      weatherLink.title = t('weatherUnavailable');
      return;
    }
    const degrees = Math.round(weather.temperature);
    const label = t('jerusalemTemperature', { temperature: degrees });
    const source = t('weatherSource', { time: jerusalemTime(new Date(weather.observedAt)).label });
    temperature.textContent = `${degrees}°C`;
    weatherLink.setAttribute('aria-label', `${label}. ${source}`);
    weatherLink.title = source;
  }

  async function fetchWeather() {
    updateWeather();
    if (pending || document.hidden || Date.now() - fetchedAt < REFRESH_MS) return;
    pending = true;
    // A timeout keeps an unavailable weather service from blocking later retries.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(WEATHER_URL, { signal: controller.signal });
      if (!response.ok) throw new Error('Weather unavailable');
      const data = await response.json();
      const reading = {
        temperature: data.current?.temperature_2m,
        observedAt: Number(data.current?.time) * 1000,
        fetchedAt: Date.now()
      };
      if (data.current_units?.temperature_2m !== '°C' || !freshWeather(reading)) throw new Error('Invalid weather reading');
      weather = reading;
      fetchedAt = reading.fetchedAt;
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(reading)); } catch { /* Optional cache. */ }
    } catch { /* Retain a recent reading; never substitute a made-up temperature. */ }
    finally { clearTimeout(timeout); pending = false; updateWeather(); }
  }

  function refresh() { updateClock(); updateWeather(); }
  refresh();
  fetchWeather();
  // The clock catches up immediately after a background tab becomes visible.
  setInterval(() => { if (!document.hidden) updateClock(); }, 1000);
  setInterval(fetchWeather, REFRESH_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { refresh(); fetchWeather(); }
  });
  return { refresh };
}
