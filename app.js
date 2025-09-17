// ===== CONFIG =====
const PROVIDER = "weatherapi"; // 'openweather' | 'weatherapi'
const API_KEY = "c72552d6953b41398d0105345251609"; // ← yahan apni real API key daalo (WeatherAPI recommend)

// ===== STATE =====
const state = {
  system: "metric",
  temp: "c",
  wind: "kmh",
  precip: "mm",
  last: null,
};

// ===== HELPERS =====
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
function openMenu(btn, menu) {
  const t = () => menu.classList.toggle("open");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    t();
  });
  document.addEventListener("click", () => menu.classList.remove("open"));
  menu.addEventListener("click", (e) => e.stopPropagation());
}
openMenu($("#unitBtn"), $("#unitMenu"));
openMenu($("#dayBtn"), $("#dayMenu"));
$("#dayMenu").addEventListener("click", (e) => {
  const r = e.target.closest("[data-day]");
  if (!r) return;
  $("#dayBtn").textContent = r.dataset.day + " ▾";
});

// conversions
const KtoC = (k) => k - 273.15,
  KtoF = (k) => (k * 9) / 5 - 459.67,
  msToKmh = (ms) => ms * 3.6,
  msToMph = (ms) => ms * 2.23694,
  mmToIn = (mm) => mm / 25.4;
const fmtTemp = (k) =>
  state.temp === "c" ? Math.round(KtoC(k)) + "°" : Math.round(KtoF(k)) + "°";
const fmtWind = (ms) =>
  state.wind === "kmh"
    ? Math.round(msToKmh(ms)) + " km/h"
    : Math.round(msToMph(ms)) + " mph";
const fmtPrecip = (mm) =>
  state.precip === "mm"
    ? Math.round(mm * 10) / 10 + " mm"
    : (Math.round(mmToIn(mm)) * 10) / 10 + " in";

// icon map (exact filenames)
function iconFromCondition({ provider, code, text }) {
  const t = (text || "").toLowerCase();
  if (/thunder|storm/.test(t)) return "icon-storm.webp";
  if (/drizzle|light rain/.test(t)) return "icon-drizzle.webp";
  if (/rain|shower/.test(t)) return "icon-rain.webp";
  if (/snow|sleet|hail/.test(t)) return "icon-snow.webp";
  if (/fog|mist|haze|smoke/.test(t)) return "icon-fog.webp";
  if (/overcast/.test(t)) return "icon-overcast.webp";
  if (/partly|cloudy/.test(t) && !/overcast/.test(t))
    return "icon-partly-cloudy.webp";
  if (/clear|sun/.test(t)) return "icon-sunny.webp";
  if (provider === "openweather") {
    if (code >= 200 && code < 300) return "icon-storm.webp";
    if (code >= 300 && code < 400) return "icon-drizzle.webp";
    if (code >= 500 && code < 600) return "icon-rain.webp";
    if (code >= 600 && code < 700) return "icon-snow.webp";
    if (code >= 700 && code < 800) return "icon-fog.webp";
    if (code === 800) return "icon-sunny.webp";
    if (code > 800) return "icon-overcast.webp";
  }
  return "icon-overcast.webp";
}

// units menu
const unitMenu = $("#unitMenu"),
  sysLabel = $("[data-system-label]");
function refreshChecks() {
  $$("#unitMenu [data-group]").forEach((b) =>
    b.classList.toggle("active", state[b.dataset.group] === b.dataset.value)
  );
  sysLabel.textContent = state.system === "metric" ? "Imperial" : "Metric";
}
refreshChecks();
unitMenu.addEventListener("click", (e) => {
  const b = e.target.closest("[data-group]");
  if (!b) return;
  state[b.dataset.group] = b.dataset.value;
  const m = state.temp === "c" && state.wind === "kmh" && state.precip === "mm";
  const i = state.temp === "f" && state.wind === "mph" && state.precip === "in";
  state.system = m ? "metric" : i ? "imperial" : "custom";
  refreshChecks();
  applyUnits();
});
$('[data-action="switch-system"]').addEventListener("click", () => {
  if (state.system === "metric") {
    state.system = "imperial";
    state.temp = "f";
    state.wind = "mph";
    state.precip = "in";
  } else {
    state.system = "metric";
    state.temp = "c";
    state.wind = "kmh";
    state.precip = "mm";
  }
  refreshChecks();
  applyUnits();
});

// states
const grid = $("#grid"),
  panel = $("#state");
function showLoading() {
  grid.hidden = true;
  panel.innerHTML = `<img src="icon-loading.svg" alt="Loading"><div class=muted>Loading…</div>`;
}
function showEmpty(msg = "No search result found!") {
  grid.hidden = true;
  panel.innerHTML = `<img src="no-results-state.jpg" alt="No results"><div class=muted>${msg}</div>`;
}
function showError(msg = "We couldn't connect to the server.") {
  grid.hidden = true;
  panel.innerHTML = `<img src="api-error-state.jpg" alt="Error"><div class=error>Something went wrong</div><div class=muted>${msg}</div><button class=button id=retry>Retry</button>`;
  $("#retry")?.addEventListener("click", () => run($("#q").value || "Berlin"));
}
function showApp() {
  panel.innerHTML = "";
  grid.hidden = false;
}

// render
function render(d) {
  state.last = d;
  showApp();
  $("[data-city]").textContent = d.city;
  $("[data-date]").textContent = d.date;
  $("#heroIcon").src = iconFromCondition(d.icon);
  $("[data-humidity]").textContent = d.humidity + "%";
  $("[data-temp]").textContent = fmtTemp(d.tempK);
  $("[data-feels]").textContent = fmtTemp(d.feelsK);
  $("[data-wind]").textContent = fmtWind(d.windMs);
  $("[data-precip]").textContent = fmtPrecip(d.precipMm || 0);
  // daily
  const daily = $("#daily");
  daily.innerHTML = "";
  d.daily.forEach((x) => {
    const el = document.createElement("div");
    el.className = "day";
    el.innerHTML = `<div class=label>${
      x.label
    }</div><img src="${iconFromCondition(
      x.icon
    )}" alt="" width=40 height=40 style="margin:6px auto;display:block"><div class=hi data-k="${
      x.hiK
    }"></div><div class=lo data-k="${x.loK}"></div>`;
    daily.appendChild(el);
  });
  // hourly
  const hbox = $("#hourly");
  hbox.innerHTML = "";
  d.hourly.forEach((h) => {
    const row = document.createElement("div");
    row.className = "hour";
    row.innerHTML = `<div style="display:flex;align-items:center"><img src="${iconFromCondition(
      h.icon
    )}" alt=""><div>${h.label}</div></div><div class=t data-k="${h.k}"></div>`;
    hbox.appendChild(row);
  });
  applyUnits();
}
function applyUnits() {
  if (!state.last) return;
  $$("#daily [data-k]").forEach(
    (n) => (n.textContent = fmtTemp(Number(n.dataset.k)))
  );
  $$("#hourly .t").forEach(
    (n) => (n.textContent = fmtTemp(Number(n.dataset.k)))
  );
  $("[data-temp]").textContent = fmtTemp(state.last.tempK);
  $("[data-feels]").textContent = fmtTemp(state.last.feelsK);
  $("[data-wind]").textContent = fmtWind(state.last.windMs);
  $("[data-precip]").textContent = fmtPrecip(state.last.precipMm || 0);
}

// fetch
async function fetchWeatherAPI(city) {
  const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${encodeURIComponent(
    city
  )}&days=7&aqi=no&alerts=no`;
  const data = await (await fetch(url)).json();
  if (data.error) return null;
  return {
    city: `${data.location.name}, ${data.location.country}`,
    date: new Date(
      data.location.localtime.replace(/-/g, "/")
    ).toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    tempK: data.current.temp_c + 273.15,
    feelsK: data.current.feelslike_c + 273.15,
    humidity: data.current.humidity,
    windMs: data.current.wind_kph / 3.6,
    precipMm: data.current.precip_mm,
    icon: {
      provider: "weatherapi",
      code: data.current.condition.code,
      text: data.current.condition.text,
    },
    daily: data.forecast.forecastday.map((fd) => ({
      label: new Date(fd.date).toLocaleDateString(undefined, {
        weekday: "short",
      }),
      hiK: fd.day.maxtemp_c + 273.15,
      loK: fd.day.mintemp_c + 273.15,
      icon: {
        provider: "weatherapi",
        code: fd.day.condition.code,
        text: fd.day.condition.text,
      },
    })),
    hourly: data.forecast.forecastday[0].hour
      .slice(8, 16)
      .map((h) => ({
        label: new Date(h.time).toLocaleTimeString(undefined, {
          hour: "numeric",
        }),
        k: h.temp_c + 273.15,
        icon: {
          provider: "weatherapi",
          code: h.condition.code,
          text: h.condition.text,
        },
      })),
  };
}

async function fetchOpenWeather(city) {
  const geo = await (
    await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
        city
      )}&limit=1&appid=${API_KEY}`
    )
  ).json();
  if (!geo.length) return null;
  const { lat, lon, name, country } = geo[0];
  const cur = await (
    await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`
    )
  ).json();
  const one = await (
    await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${API_KEY}`
    )
  ).json();
  return {
    city: `${name}, ${country || ""}`,
    date: new Date(cur.dt * 1000).toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    tempK: cur.main.temp,
    feelsK: cur.main.feels_like,
    humidity: cur.main.humidity,
    windMs: cur.wind.speed,
    precipMm: one.hourly?.[0]?.rain?.["1h"] || 0,
    icon: {
      provider: "openweather",
      code: cur.weather?.[0]?.id || 0,
      text: cur.weather?.[0]?.description || "",
    },
    daily: (one.daily || [])
      .slice(0, 7)
      .map((d) => ({
        label: new Date(d.dt * 1000).toLocaleDateString(undefined, {
          weekday: "short",
        }),
        hiK: d.temp.max + 273.15 - 273.15,
        loK: d.temp.min + 273.15 - 273.15,
        icon: {
          provider: "openweather",
          code: d.weather?.[0]?.id || 0,
          text: d.weather?.[0]?.description || "",
        },
      })),
    hourly: (one.hourly || [])
      .slice(0, 8)
      .map((h) => ({
        label: new Date(h.dt * 1000).toLocaleTimeString(undefined, {
          hour: "numeric",
        }),
        k: h.temp + 273.15 - 273.15,
        icon: {
          provider: "openweather",
          code: h.weather?.[0]?.id || 0,
          text: h.weather?.[0]?.description || "",
        },
      })),
  };
}

async function run(city) {
  try {
    showLoading();
    const data = API_KEY
      ? PROVIDER === "openweather"
        ? await fetchOpenWeather(city)
        : await fetchWeatherAPI(city)
      : await mock(city);
    if (!data) {
      showEmpty();
      return;
    }
    render(data);
  } catch (e) {
    console.error(e);
    showError();
  }
}

async function mock(city) {
  await new Promise((r) => setTimeout(r, 700));
  return {
    city: (city || "Berlin") + ", Germany",
    date: new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    tempK: 293.15,
    feelsK: 291.15,
    humidity: 46,
    windMs: 4.0,
    precipMm: 0,
    icon: { provider: "weatherapi", code: 1000, text: "Clear" },
    daily: [
      {
        label: "Tue",
        hiK: 293.15,
        loK: 287.15,
        icon: { provider: "weatherapi", code: 1180, text: "Light rain" },
      },
      {
        label: "Wed",
        hiK: 294.15,
        loK: 289.15,
        icon: { provider: "weatherapi", code: 1213, text: "Snow" },
      },
      {
        label: "Thu",
        hiK: 298.15,
        loK: 289.65,
        icon: { provider: "weatherapi", code: 1000, text: "Sunny" },
      },
      {
        label: "Fri",
        hiK: 298.15,
        loK: 286.15,
        icon: { provider: "weatherapi", code: 1006, text: "Cloudy" },
      },
      {
        label: "Sat",
        hiK: 296.15,
        loK: 288.15,
        icon: { provider: "weatherapi", code: 1276, text: "Thunderstorm" },
      },
      {
        label: "Sun",
        hiK: 295.15,
        loK: 289.15,
        icon: { provider: "weatherapi", code: 1135, text: "Fog" },
      },
      {
        label: "Mon",
        hiK: 297.15,
        loK: 288.15,
        icon: { provider: "weatherapi", code: 1183, text: "Rain" },
      },
    ],
    hourly: [
      {
        label: "3 PM",
        k: 293.15,
        icon: { provider: "weatherapi", code: 1006, text: "Cloudy" },
      },
      {
        label: "4 PM",
        k: 293.15,
        icon: { provider: "weatherapi", code: 1180, text: "Light rain" },
      },
      {
        label: "5 PM",
        k: 293.15,
        icon: { provider: "weatherapi", code: 1000, text: "Sunny" },
      },
      {
        label: "6 PM",
        k: 292.15,
        icon: { provider: "weatherapi", code: 1006, text: "Cloudy" },
      },
      {
        label: "7 PM",
        k: 291.15,
        icon: { provider: "weatherapi", code: 1006, text: "Cloudy" },
      },
      {
        label: "8 PM",
        k: 291.15,
        icon: { provider: "weatherapi", code: 1135, text: "Fog" },
      },
      {
        label: "9 PM",
        k: 290.15,
        icon: { provider: "weatherapi", code: 1183, text: "Rain" },
      },
      {
        label: "10 PM",
        k: 290.15,
        icon: { provider: "weatherapi", code: 1183, text: "Rain" },
      },
    ],
  };
}

// search & boot
$("#form").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = $("#q").value.trim();
  if (!q) {
    showEmpty("Type a city name…");
    return;
  }
  run(q);
});
run("Berlin");
