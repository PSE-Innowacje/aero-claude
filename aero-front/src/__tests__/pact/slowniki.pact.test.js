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

const slownikBody = like({
  success: boolean(true),
  data: eachLike({ id: integer(1), nazwa: string('Nazwa') }),
  errors: [],
});

const endpoints = [
  { name: 'role użytkowników', path: '/api/slowniki/role-uzytkownikow' },
  { name: 'role załogi', path: '/api/slowniki/role-zalogi' },
  { name: 'rodzaje czynności', path: '/api/slowniki/rodzaje-czynnosci' },
  { name: 'statusy operacji', path: '/api/slowniki/statusy-operacji' },
  { name: 'statusy zleceń', path: '/api/slowniki/statusy-zlecen' },
];

describe('Slowniki (Dictionaries) API Contract', () => {
  it('verifies all dictionary endpoints', async () => {
    for (const { name, path } of endpoints) {
      provider
        .given('dictionaries are populated')
        .uponReceiving(`a request for ${name}`)
        .withRequest({ method: 'GET', path, headers: authHeaders })
        .willRespondWith({
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: slownikBody,
        });
    }

    await provider.executeTest(async (mockServer) => {
      const client = apiClient(mockServer.url);

      for (const { path } of endpoints) {
        const data = unwrap(await client.get(path));
        expect(Array.isArray(data)).toBe(true);
        expect(data[0]).toHaveProperty('id');
        expect(data[0]).toHaveProperty('nazwa');
      }
    });
  });
});
