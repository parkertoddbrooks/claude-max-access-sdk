const axios = require('axios');
const { generatePKCE } = require('./pkce');

const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const REDIRECT_URI = 'https://console.anthropic.com/oauth/code/callback';
const AUTH_URL = 'https://claude.ai/oauth/authorize';
const TOKEN_URL = 'https://console.anthropic.com/v1/oauth/token';

class OAuthClient {
  constructor() {
    this.pkce = null;
  }

  /**
   * Start OAuth flow and return authorization URL
   * @returns {string} Authorization URL
   */
  startAuth() {
    this.pkce = generatePKCE();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code_challenge: this.pkce.challenge,
      code_challenge_method: this.pkce.method,
      scope: 'org:create_api_key user:profile user:inference',
      state: this.pkce.verifier
    });

    return `${AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   * @param {string} callbackUrl - The full callback URL with code
   * @returns {Promise<Object>} Token response
   */
  async exchangeCode(callbackUrl) {
    if (!this.pkce) {
      throw new Error('Must call startAuth() before exchangeCode()');
    }

    // Extract code and state from callback URL
    const url = new URL(callbackUrl);
    const code = url.searchParams.get('code');

    if (!code) {
      // Handle fragment-based code
      const hash = url.hash.substring(1);
      const [codeParam] = hash.split('&');
      if (!codeParam) {
        throw new Error('No authorization code found in callback URL');
      }

      const splits = codeParam.split('#');
      const authCode = splits[0];
      const state = splits[1];

      const response = await axios.post(TOKEN_URL, {
        code: authCode,
        state: state || this.pkce.verifier,
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code_verifier: this.pkce.verifier
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    }

    // Standard OAuth flow
    const response = await axios.post(TOKEN_URL, {
      code,
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code_verifier: this.pkce.verifier
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New token response
   */
  async refreshToken(refreshToken) {
    const response = await axios.post(TOKEN_URL, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }
}

module.exports = OAuthClient;