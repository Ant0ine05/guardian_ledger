const axios = require('axios');

const bungieRequest = async (endpoint, token = null) => {
    const headers = { 'X-API-Key': process.env.BUNGIE_API_KEY };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await axios.get(`https://www.bungie.net/Platform${endpoint}`, { headers });
    return response.data.Response;
};

module.exports = { bungieRequest };