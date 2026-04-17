// AccHub provider client
// IMPORTANT: Endpoint paths below are placeholders — verify against AccHub's actual API docs.
// Update BASE_URL and request shapes once you have AccHub API documentation.
const axios = require('axios');

const BASE_URL = process.env.ACCHUB_BASE_URL || 'https://acchub.io/api';
const API_KEY = process.env.ACCHUB_API_KEY || '';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// All requests carry the API key — adjust header name if AccHub uses a different one
function authParams(extra = {}) {
  return { api_key: API_KEY, ...extra };
}

module.exports = {
  id: 'acchub',
  name: 'AccHub',
  mode: 'auto',

  async listCountries() {
    // TODO: confirm endpoint
    const { data } = await client.get('/countries', { params: authParams() });
    return data?.countries || data || [];
  },

  async listOperators(countryId) {
    // TODO: confirm endpoint
    const { data } = await client.get(`/operators/${countryId}`, { params: authParams() });
    return data?.operators || data || [];
  },

  async getNumber({ countryId, operatorId }) {
    // TODO: confirm endpoint + response shape
    const { data } = await client.post('/getNumber', authParams({ country_id: countryId, operator_id: operatorId }));
    if (!data?.phone_number && !data?.number) throw new Error(data?.error || 'No number available');
    return {
      provider_ref: String(data.id || data.activation_id || ''),
      phone_number: data.phone_number || data.number,
      operator: data.operator || null,
      country_code: data.country_code || null,
    };
  },

  async checkOtp(providerRef) {
    // TODO: confirm endpoint
    const { data } = await client.get(`/getStatus/${providerRef}`, { params: authParams() });
    return {
      otp: data?.code || data?.otp || null,
      status: data?.status || 'waiting',
    };
  },

  async releaseNumber(providerRef) {
    try {
      await client.post(`/cancel/${providerRef}`, authParams());
    } catch (_) { /* best effort */ }
  },
};
