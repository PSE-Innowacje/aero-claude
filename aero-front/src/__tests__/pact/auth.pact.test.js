import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import axios from 'axios';

const { like, string, integer, boolean, eachLike } = MatchersV3;

const provider = new PactV3({
  consumer: 'AeroFront',
  provider: 'AeroApi',
  dir: './pacts',
});

const apiClient = (url) =>
  axios.create({ baseURL: url, headers: { 'Content-Type': 'application/json' }, adapter: 'http' });

const unwrap = (r) => r.data?.data ?? r.data;

const uzytkownikShape = {
  id: integer(1),
  imie: string('Jan'),
  nazwisko: string('Kowalski'),
  email: string('admin@example.com'),
  rolaId: integer(1),
  rolaNazwa: string('Administrator'),
  aktywny: boolean(true),
};

describe('Auth API Contract', () => {
  it('verifies auth interactions', async () => {
    provider
      .given('user admin@example.com exists with password Test123!')
      .uponReceiving('a login request with valid credentials')
      .withRequest({
        method: 'POST',
        path: '/api/auth/login',
        headers: { 'Content-Type': 'application/json' },
        body: { email: 'admin@example.com', haslo: 'Test123!' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: like({
          success: boolean(true),
          data: {
            token: string('eyJ...'),
            refreshToken: string('rt_abc123'),
            uzytkownik: uzytkownikShape,
          },
          errors: [],
        }),
      });

    provider
      .given('user admin@example.com exists with password Test123!')
      .uponReceiving('a login request with wrong password')
      .withRequest({
        method: 'POST',
        path: '/api/auth/login',
        headers: { 'Content-Type': 'application/json' },
        body: { email: 'admin@example.com', haslo: 'WrongPass' },
      })
      .willRespondWith({
        status: 401,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: like({
          success: boolean(false),
          data: null,
          errors: eachLike('Nieprawidłowy e-mail lub hasło.'),
        }),
      });

    provider
      .given('a valid refresh token exists')
      .uponReceiving('a token refresh request')
      .withRequest({
        method: 'POST',
        path: '/api/auth/refresh',
        headers: { 'Content-Type': 'application/json' },
        body: { refreshToken: 'valid_refresh_token' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: like({
          success: boolean(true),
          data: {
            token: string('new_jwt_token'),
            refreshToken: string('new_refresh_token'),
            uzytkownik: uzytkownikShape,
          },
          errors: [],
        }),
      });

    await provider.executeTest(async (mockServer) => {
      const client = apiClient(mockServer.url);

      // login success
      const login = unwrap(
        await client.post('/api/auth/login', { email: 'admin@example.com', haslo: 'Test123!' })
      );
      expect(login.token).toBeDefined();
      expect(login.uzytkownik.email).toBe('admin@example.com');

      // login 401
      try {
        await client.post('/api/auth/login', { email: 'admin@example.com', haslo: 'WrongPass' });
        throw new Error('Expected 401');
      } catch (err) {
        expect(err.response.status).toBe(401);
        expect(err.response.data.success).toBe(false);
      }

      // refresh
      const refresh = unwrap(
        await client.post('/api/auth/refresh', { refreshToken: 'valid_refresh_token' })
      );
      expect(refresh.token).toBeDefined();
      expect(refresh.refreshToken).toBeDefined();
    });
  });
});
