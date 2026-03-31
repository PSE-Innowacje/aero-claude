import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import axios from 'axios';

const { like, eachLike, string, integer, boolean } = MatchersV3;

const provider = new PactV3({
  consumer: 'AeroFront',
  provider: 'AeroApi',
  dir: './pacts',
});

const authHeaders = { Authorization: 'Bearer valid-jwt-token' };

const apiClient = (url) =>
  axios.create({ baseURL: url, headers: { 'Content-Type': 'application/json', ...authHeaders }, adapter: 'http' });

const unwrap = (r) => r.data?.data ?? r.data;

const uzytkownikShape = {
  id: integer(1),
  imie: string('Jan'),
  nazwisko: string('Kowalski'),
  email: string('jan@example.com'),
  rolaId: integer(1),
  rolaNazwa: string('Administrator'),
  aktywny: boolean(true),
};

const newUser = {
  imie: 'Anna',
  nazwisko: 'Nowak',
  email: 'anna@example.com',
  haslo: 'Secure123!',
  rolaId: 2,
};

const updateData = {
  imie: 'Jan',
  nazwisko: 'Kowalski-Zmieniony',
  email: 'jan@example.com',
  rolaId: 1,
  aktywny: true,
};

describe('Uzytkownicy (Users) API Contract', () => {
  it('verifies user CRUD interactions', async () => {
    provider
      .given('users exist')
      .uponReceiving('a request for all users')
      .withRequest({ method: 'GET', path: '/api/uzytkownicy', headers: authHeaders })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: like({ success: boolean(true), data: eachLike(uzytkownikShape), errors: [] }),
      });

    provider
      .given('user with id 1 exists')
      .uponReceiving('a request for user by id')
      .withRequest({ method: 'GET', path: '/api/uzytkownicy/1', headers: authHeaders })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: like({ success: boolean(true), data: uzytkownikShape, errors: [] }),
      });

    provider
      .given('no user with email anna@example.com exists')
      .uponReceiving('a request to create a user')
      .withRequest({
        method: 'POST',
        path: '/api/uzytkownicy',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: newUser,
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: like({ success: boolean(true), data: integer(2), errors: [] }),
      });

    provider
      .given('user with id 1 exists')
      .uponReceiving('a request to update user 1')
      .withRequest({
        method: 'PUT',
        path: '/api/uzytkownicy/1',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: updateData,
      })
      .willRespondWith({ status: 204 });

    await provider.executeTest(async (mockServer) => {
      const client = apiClient(mockServer.url);

      const list = unwrap(await client.get('/api/uzytkownicy'));
      expect(Array.isArray(list)).toBe(true);
      expect(list[0]).toHaveProperty('email');

      const single = unwrap(await client.get('/api/uzytkownicy/1'));
      expect(single.id).toBe(1);

      const created = unwrap(await client.post('/api/uzytkownicy', newUser));
      expect(typeof created).toBe('number');

      const updateRes = await client.put('/api/uzytkownicy/1', updateData);
      expect(updateRes.status).toBe(204);
    });
  });
});
