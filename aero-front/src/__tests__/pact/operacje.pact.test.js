import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import axios from 'axios';

const { like, eachLike, string, integer, boolean, decimal } = MatchersV3;

const provider = new PactV3({
  consumer: 'AeroFront',
  provider: 'AeroApi',
  dir: './pacts',
});

const authHeaders = { Authorization: 'Bearer valid-jwt-token' };

const apiClient = (url) =>
  axios.create({ baseURL: url, headers: { 'Content-Type': 'application/json', ...authHeaders }, adapter: 'http' });

const unwrap = (r) => r.data?.data ?? r.data;

const operacjaListShape = {
  id: integer(1),
  numer: string('OP-2026-001'),
  numerZleceniaProjektu: string('ZP-001'),
  opisSkrocony: string('Inspekcja terenu'),
  liczbaKmTrasy: integer(50),
  rodzajeCzynnosci: eachLike('Inspekcja'),
  proponowanaDataOd: string('2026-04-01'),
  proponowanaDataDo: string('2026-04-05'),
  planowanaDataOd: string('2026-04-02'),
  planowanaDataDo: string('2026-04-04'),
  statusId: integer(1),
  statusNazwa: string('Wprowadzone'),
};

const newOp = {
  numerZleceniaProjektu: 'ZP-NEW-001',
  opisSkrocony: 'Nowa operacja testowa',
  kmlNazwaPliku: null,
  kmlZawartosc: null,
  liczbaKmTrasy: 30,
  proponowanaDataOd: '2026-05-01',
  proponowanaDataDo: '2026-05-03',
  dodatkoweInfo: null,
  rodzajeCzynnosciIds: [1],
  punktyTrasy: [
    { kolejnosc: 1, szerokosc: 51.1, dlugosc: 17.0 },
    { kolejnosc: 2, szerokosc: 51.2, dlugosc: 17.1 },
  ],
  osobyKontaktoweIds: [1],
};

describe('Operacje (Operations) API Contract', () => {
  it('verifies operation interactions', async () => {
    provider
      .given('operations exist')
      .uponReceiving('a request for paged operations')
      .withRequest({
        method: 'GET',
        path: '/api/operacje',
        headers: authHeaders,
        query: { strona: '1', rozmiarStrony: '20' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: like({
          success: boolean(true),
          data: {
            items: eachLike(operacjaListShape),
            strona: integer(1),
            rozmiarStrony: integer(20),
            lacznaLiczba: integer(1),
            lacznaLiczbaStron: integer(1),
            maPoprzednia: boolean(false),
            maNastepna: boolean(false),
          },
          errors: [],
        }),
      });

    provider
      .given('operation with id 1 exists')
      .uponReceiving('a request for operation by id')
      .withRequest({ method: 'GET', path: '/api/operacje/1', headers: authHeaders })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: like({
          success: boolean(true),
          data: {
            id: integer(1),
            numer: string('OP-2026-001'),
            numerZleceniaProjektu: string('ZP-001'),
            opisSkrocony: string('Inspekcja terenu'),
            kmlNazwaPliku: string('trasa.kml'),
            kmlZawartosc: string('<kml>...</kml>'),
            liczbaKmTrasy: integer(50),
            proponowanaDataOd: string('2026-04-01'),
            proponowanaDataDo: string('2026-04-05'),
            planowanaDataOd: string('2026-04-02'),
            planowanaDataDo: string('2026-04-04'),
            dodatkoweInfo: string('Uwagi dodatkowe'),
            komentarz: string(''),
            uwagiPoRealizacji: string(''),
            statusId: integer(1),
            statusNazwa: string('Wprowadzone'),
            wprowadzajacyId: integer(1),
            wprowadzajacyEmail: string('admin@example.com'),
            rodzajeCzynnosciIds: eachLike(1),
            rodzajeCzynnosciNazwy: eachLike('Inspekcja'),
            punktyTrasy: eachLike({
              kolejnosc: integer(1),
              szerokosc: decimal(51.1),
              dlugosc: decimal(17.0),
            }),
            osobyKontaktoweIds: eachLike(1),
            createdAt: string('2026-03-30T10:00:00'),
            updatedAt: string('2026-03-30T10:00:00'),
          },
          errors: [],
        }),
      });

    provider
      .given('user is authorized to create operations')
      .uponReceiving('a request to create an operation')
      .withRequest({
        method: 'POST',
        path: '/api/operacje',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: newOp,
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: like({ success: boolean(true), data: integer(1), errors: [] }),
      });

    provider
      .given('operation with id 1 exists in status Wprowadzone')
      .uponReceiving('a request to change operation status')
      .withRequest({
        method: 'POST',
        path: '/api/operacje/1/status',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: { statusId: 3, komentarz: 'Potwierdzam do planowania' },
      })
      .willRespondWith({ status: 204 });

    provider
      .given('operation with id 1 has comments')
      .uponReceiving('a request for operation comments')
      .withRequest({ method: 'GET', path: '/api/operacje/1/komentarze', headers: authHeaders })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: like({
          success: boolean(true),
          data: eachLike({
            id: integer(1),
            tresc: string('Komentarz testowy'),
            autorEmail: string('admin@example.com'),
            createdAt: string('2026-03-30T10:00:00'),
          }),
          errors: [],
        }),
      });

    provider
      .given('operation with id 1 has change history')
      .uponReceiving('a request for operation history')
      .withRequest({ method: 'GET', path: '/api/operacje/1/historia', headers: authHeaders })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: like({
          success: boolean(true),
          data: eachLike({
            id: integer(1),
            pole: string('Status'),
            staraWartosc: string('Wprowadzone'),
            nowaWartosc: string('Potwierdzone do planowania'),
            zmienionePrzezEmail: string('admin@example.com'),
            dataZmiany: string('2026-03-30T12:00:00'),
          }),
          errors: [],
        }),
      });

    await provider.executeTest(async (mockServer) => {
      const client = apiClient(mockServer.url);

      const paged = unwrap(
        await client.get('/api/operacje', { params: { strona: 1, rozmiarStrony: 20 } })
      );
      expect(paged.items).toBeDefined();
      expect(Array.isArray(paged.items)).toBe(true);

      const detail = unwrap(await client.get('/api/operacje/1'));
      expect(detail.id).toBe(1);
      expect(detail.punktyTrasy).toBeDefined();

      const created = unwrap(await client.post('/api/operacje', newOp));
      expect(typeof created).toBe('number');

      const statusRes = await client.post('/api/operacje/1/status', {
        statusId: 3,
        komentarz: 'Potwierdzam do planowania',
      });
      expect(statusRes.status).toBe(204);

      const comments = unwrap(await client.get('/api/operacje/1/komentarze'));
      expect(Array.isArray(comments)).toBe(true);
      expect(comments[0]).toHaveProperty('tresc');

      const history = unwrap(await client.get('/api/operacje/1/historia'));
      expect(Array.isArray(history)).toBe(true);
      expect(history[0]).toHaveProperty('pole');
    });
  });
});
