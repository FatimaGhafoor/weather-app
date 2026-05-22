const CONFIG = {
  API_URL: "https://api.openweathermap.org/data/2.5/weather",
  API_KEY: "f00c38e0279b7bc85480c3fe775d518c",
  UNIT: "metric",
  CACHE_DURATION: 5 * 60 * 1000,
  SEARCH_DEBOUNCE: 300,
};

const ErrorMessages = {
  EMPTY_INPUT: "Please enter a city",
  INVALID_INPUT: "City name must be 1-100 characters",
  NOT_FOUND: "City not found. Please check the spelling.",
  NO_CONNECTION: "No internet connection",
  RATE_LIMITED: "Too many requests. Please wait a moment.",
  SERVER_ERROR: "Server error. Please try again later.",
  UNKNOWN_ERROR: "An unexpected error occurred",
};

class WeatherApp {
  constructor() {
    this.validateDOM();
    this.cache = new Map();
    this.currentRequest = null;
    this.debounceTimer = null;
    this.init();
  }

  validateDOM() {
    this.cityInput = document.getElementById("cityInput");
    this.searchBtn = document.getElementById("searchBtn");
    this.resultDiv = document.getElementById("result");

    if (!this.cityInput || !this.searchBtn || !this.resultDiv) {
      throw new Error("Required DOM element is missing");
    }
  }

  init() {
    this.setupEventListeners();
    this.setupNetworkListeners();
  }

  setupEventListeners() {
    this.searchBtn.addEventListener("click", () => this.handleSearch());
    this.cityInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.handleSearch();
      }
    });
  }

  setupNetworkListeners() {
    window.addEventListener("offline", () => {
      this.showMessage(ErrorMessages.NO_CONNECTION, "error");
    });
    window.addEventListener("online", () => {
      this.showMessage("Back Online", "success");
    });
  }

  async handleSearch() {
    if (!navigator.onLine) {
      this.showMessage(ErrorMessages.NO_CONNECTION, "error");
      return;
    }

    const cityName = this.cityInput.value.trim();

    if (!cityName || cityName.length > 100) {
      this.showMessage("Enter a valid city name (1-100 characters)", "warning");
      return;
    }

    const cached = this.cache.get(cityName);
    const now = Date.now();
    if (cached && now - cached.timestamp < CONFIG.CACHE_DURATION) {
      this.displayWeather(cached.data);
      return;
    }

    this.showLoading();

    try {
      const data = await this.fetchWeather(cityName);
      this.cache.set(cityName, data);
      this.displayWeather(data);
      this.cityInput.value = "";
    } catch (error) {
      this.handleError(error);
    }
  }

  async fetchWeather(cityName) {
    if (this.currentRequest) {
      this.currentRequest.abort();
    }

    const controller = new AbortController();
    this.currentRequest = controller;

    const response = await fetch(
      `${CONFIG.API_URL}?q=${cityName}&appid=${CONFIG.API_KEY}&units=${CONFIG.UNIT}`,
      { signal: controller.signal },
    );

    if (!response.ok) {
      throw this.handleResponseError(response);
    }
    return await response.json();
  }

  handleResponseError(response) {
    const statusCode = response.status;

    if (statusCode === 404) {
      throw new Error(ErrorMessages.NOT_FOUND);
    } else if (statusCode === 429) {
      throw new Error(ErrorMessages.RATE_LIMITED);
    } else if (statusCode === 500) {
      throw new Error(ErrorMessages.SERVER_ERROR);
    }
    throw new Error(`Error ${statusCode}: Unknown error`);
  }

  displayWeather(data) {
    const table = this.createWeatherTable([data]);
    this.resultDiv.innerHTML = "";
    this.resultDiv.appendChild(table);
  }

  createWeatherTable(data) {
    const table = document.createElement("table");
    table.innerHTML = `
    <thead>
      <tr>
        <th>City Name</th>
        <th>Temperature</th>
        <th>Humidity</th>
        <th>Condition</th>
        <th>Weather Icon</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

    const tbody = table.querySelector("tbody");

    data.forEach((city) => {
      const row = document.createElement("tr");
      row.innerHTML = `
      <td>${city.name}</td>
      <td>${city.main.temp}</td>
      <td>${city.main.humidity}</td>
      <td>${city.weather[0].main}</td>
      <td>${this.getWeatherIcon(city.weather[0].main)}</td>
    `;
      tbody.appendChild(row);
    });

    return table;
  }

  getWeatherIcon(condition) {
    const icons = {
      Rain: "🌧️",
      Clouds: "☁️",
      Clear: "☀️",
      Snow: "❄️",
      Thunderstorm: "⛈️",
    };
    return icons[condition] || "🌡️";
  }

  showLoading() {
    this.resultDiv.innerHTML = "<p>Loading...</p>";
  }

  showMessage(message, type = "info") {
    const colors = {
      error: "red",
      warning: "orange",
      success: "green",
      info: "blue",
    };
    this.resultDiv.innerHTML = `<p style="color: ${colors[type]};">${message}</p>`;
  }

  handleError(error) {
    if (error.name === "AbortError") {
      return; // User cancelled
    }
    this.showMessage(error.message, "error");
  }
}

try {
  new WeatherApp();
} catch (error) {
  console.error("App Initialization failed:", error);
}

console.log("Dev branch testing");
