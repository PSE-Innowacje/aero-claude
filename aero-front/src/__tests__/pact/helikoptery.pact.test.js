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

const helikopterShape = {
  id: integer(1),
  numerRejestracyjny: string('SP-ABC'),
  typ: string('Bell 407'),
  opis: string('Helikopter ratunkowy'),
  maksLiczbaCzlonkowZalogi: integer(4),
  maksUdzwigKg: integer(1200),
  zasiegKm: integer(600),
  status: string('Aktywny'),
  dataWaznosciPrzegladu: string('2026-12-31'),
};

const newHeli = {
  numerRejestracyjny: 'SP-NEW',
  typ: 'Airbus H135',
  opis: 'Nowy helikopter',
  maksLiczbaCzlonkowZalogi: 6,
  maksUdzwigKg: 1500,
  zasiegKm: 650,
  status: 'Aktywny',
  dataWaznosciPrzegladu: '2027-06-15',
};

describe('Helikoptery (Helicopters) API Contract', () => {
  it('verifies helicopter interactions', async () => {
    provider
      .given('helicopters exist')
      .uponReceiving('a request for all helicopters')
      .withRequest({ method: 'GET', path: '/api/helikoptery', headers: authHeaders })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: like({ success: boolean(true), data: eachLike(helikopterShape), errors: [] }),
      });

    provider
      .given('helicopter with id 1 exists')
      .uponReceiving('a request for helicopter by id')
      .withRequest({ method: 'GET', path: '/api/helikoptery/1', headers: authHeaders })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: like({ success: boolean(true), data: helikopterShape, errors: [] }),
      });

    provider
      .given('no helicopter with registration SP-NEW exists')
      .uponReceiving('a request to create a helicopter')
      .withRequest({
        method: 'POST',
        path: '/api/helikoptery',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: newHeli,
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: like({ success: boolean(true), data: integer(2), errors: [] }),
      });

    await provider.executeTest(async (mockServer) => {
      const client = apiClient(mockServer.url);

      const list = unwrap(await client.get('/api/helikoptery'));
      expect(Array.isArray(list)).toBe(true);
      expect(list[0]).toHaveProperty('numerRejestracyjny');

      const single = unwrap(await client.get('/api/helikoptery/1'));
      expect(single.id).toBe(1);

      const created = unwrap(await client.post('/api/helikoptery', newHeli));
      expect(typeof created).toBe('number');
    });
  });
});
