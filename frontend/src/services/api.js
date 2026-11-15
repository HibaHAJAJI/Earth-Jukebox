/**
 * Earth Jukebox — Backend API Client
 *
 * Centralized HTTP client for communicating with the Spring Boot backend.
 * All backend requests go through this module so the base URL, headers,
 * timeouts, and error handling are consistent across the application.
 *
 * Configuration:
 *   VITE_API_BASE_URL — Base URL of the Spring Boot backend
 *     Default: http://localhost:8080
 *     Example: VITE_API_BASE_URL=http://localhost:8080
 *
 * No API keys are stored or sent from the frontend. The OpenAI API key
 * remains exclusively on the backend.
 */

const BASE_URL = (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');

const REQUEST_TIMEOUT = 15000; // 15 seconds

/**
 * Create fetch options with JSON headers and timeout.
 */
function fetchOptions(method, body) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  return {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  };
}

/**
 * Parse JSON response, handling empty bodies gracefully.
 */
async function parseJson(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  return JSON.parse(text);
}

/**
 * Handle non-OK responses by extracting the error message.
 */
async function handleError(response) {
  let message = `HTTP ${response.status}`;
  try {
    const body = await response.text();
    if (body) {
      const parsed = JSON.parse(body);
      message = parsed.detail || parsed.message || parsed.detail || body;
    }
  } catch {
    // Ignore parse errors, use status message
  }
  throw new Error(message);
}

/**
 * GET request to the backend.
 */
async function get(path) {
  const response = await fetch(`${BASE_URL}${path}`, fetchOptions('GET'));
  if (!response.ok) {
    await handleError(response);
  }
  return parseJson(response);
}

/**
 * POST request to the backend.
 */
async function post(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, fetchOptions('POST', body));
  if (!response.ok) {
    await handleError(response);
  }
  return parseJson(response);
}

/**
 * Fetch the monthly temperature anomaly series from the backend.
 *
 * @param phenomenonId - The phenomenon ID (default: 'global-temperature-anomaly')
 * @param from - Optional start (YYYY-MM or YYYY)
 * @param to - Optional end (YYYY-MM or YYYY)
 * @param resolution - 'monthly' or 'annual' (default: 'monthly')
 * @returns Promise resolving to the series response with metadata + data
 */
export async function fetchSeriesFromApi(
  phenomenonId = 'global-temperature-anomaly',
  { from, to, resolution = 'monthly' } = {}
) {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  if (resolution) params.append('resolution', resolution);

  const query = params.toString() ? `?${params.toString()}` : '';
  return get(`/api/v1/phenomena/${encodeURIComponent(phenomenonId)}/series${query}`);
}

/**
 * Fetch the phenomenon catalog metadata.
 *
 * @returns Promise resolving to the phenomenon list response
 */
export async function fetchPhenomena() {
  return get('/api/v1/phenomena');
}

/**
 * Fetch a specific phenomenon by ID.
 *
 * @param id - The phenomenon ID
 * @returns Promise resolving to the phenomenon DTO
 */
export async function fetchPhenomenon(id) {
  return get(`/api/v1/phenomena/${encodeURIComponent(id)}`);
}

/**
 * Fetch the sonification mapping specification.
 *
 * @param id - The phenomenon ID (default: 'global-temperature-anomaly')
 * @returns Promise resolving to the sonification map DTO
 */
export async function fetchSonificationMap(id = 'global-temperature-anomaly') {
  return get(`/api/v1/phenomena/${encodeURIComponent(id)}/sonification-map`);
}

/**
 * Fetch API and dataset metadata.
 *
 * @returns Promise resolving to the API meta DTO
 */
export async function fetchApiMeta() {
  return get('/api/v1/meta');
}

/**
 * Request an AI explanation for NASA temperature data.
 *
 * @param year - The year to explain (required, >= 1880)
 * @param month - Optional month (1-12)
 * @param language - Optional language code (en, fr, ar); defaults to en
 * @returns Promise resolving to the explanation response with FACTS/STATISTICS/INTERPRETATION
 */
export async function explainTemperature(year, month, language = 'en') {
  const body = { year, language };
  if (month) {
    body.month = month;
  }
  return post('/api/v1/ai/explain', body);
}

/**
 * Fetch the NASA dataset catalog metadata.
 *
 * @returns Promise resolving to the list of dataset source info
 */
export async function fetchNasaDatasets() {
  return get('/api/v1/nasa/datasets');
}

/**
 * Fetch environmental data records with optional filters.
 *
 * @param filters - Optional filters: dataset, year, month, region
 * @returns Promise resolving to the list of environmental records
 */
export async function fetchEnvironmentalData(filters = {}) {
  const params = new URLSearchParams();
  if (filters.dataset) params.append('dataset', filters.dataset);
  if (filters.year) params.append('year', filters.year);
  if (filters.month) params.append('month', filters.month);
  if (filters.region) params.append('region', filters.region);

  const query = params.toString() ? `?${params.toString()}` : '';
  return get(`/api/v1/environmental-data${query}`);
}

/**
 * Check if the backend is reachable.
 *
 * @returns Promise resolving to true if the backend responds
 */
export async function isBackendAvailable() {
  try {
    await get('/api/v1/meta');
    return true;
  } catch {
    return false;
  }
}
