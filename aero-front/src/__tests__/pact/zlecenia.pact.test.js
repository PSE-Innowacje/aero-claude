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

const newOrder = {
  planowanyStartDt: '2026-05-10T08:00:00',
  planowaneLadowanieDt: '2026-05-10T14:00:00',
  helikopterId: 1,
  ladowiskoStartoweId: 1,
  ladowiskoKoncoweId: 2,
  szacowanaDlugoscTrasy: 100,
  czlonkowieZalogiIds: [1, 2],
  operacjeIds: [1],
};

describe('Zlecenia (Flight Orders) API Contract', () => {
  it('verifies flight order interactions', async () => {
    provider
      .given('flight orders exist')
      .uponReceiving('a request for paged flight orders')
      .withRequest({
        method: 'GET',
        path: '/api/zlecenia',
        headers: authHeaders,
        query: { strona: '1', rozmiarStrony: '20' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: like({
          success: boolean(true),
          data: {
            items: eachLike({
              id: integer(1),
              numer: string('ZL-2026-001'),
              planowanyStartDt: string('2026-04-10T08:00:00'),
              helikopterNr: string('SP-ABC'),
              pilotImieNazwisko: string('Jan Kowalski'),
              statusId: integer(1),
              statusNazwa: string('Wprowadzone'),
            }),
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
      .given('flight order with id 1 exists')
      .uponReceiving('a request for flight order by id')
      .withRequest({ method: 'GET', path: '/api/zlecenia/1', headers: authHeaders })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: like({
          success: boolean(true),
          data: {
            id: integer(1),
            numer: string('ZL-2026-001'),
            planowanyStartDt: string('2026-04-10T08:00:00'),
            planowaneLadowanieDt: string('2026-04-10T12:00:00'),
            rzeczywistyStartDt: null,
            rzeczywisteLadowanieDt: null,
            pilotId: integer(1),
            pilotImieNazwisko: string('Jan Kowalski'),
            helikopterId: integer(1),
            helikopterNr: string('SP-ABC'),
            ladowiskoStartoweId: integer(1),
            ladowiskoStartoweNazwa: string('Baza Główna'),
            ladowiskoKoncoweId: integer(2),
            ladowiskoKoncoweNazwa: string('Punkt B'),
            szacowanaDlugoscTrasy: integer(120),
            wagaZalogiKg: integer(320),
            statusId: integer(1),
            statusNazwa: string('Wprowadzone'),
            czlonkowieZalogiIds: eachLike(1),
            czlonkowieZalogiImiona: eachLike('Jan Kowalski'),
            operacje: eachLike({
              id: integer(1),
              numer: string('OP-2026-001'),
              opisSkrocony: string('Inspekcja terenu'),
              statusId: integer(4),
              statusNazwa: string('Zaplanowane do zlecenia'),
            }),
            createdAt: string('2026-03-30T10:00:00'),
            updatedAt: string('2026-03-30T10:00:00'),
          },
          errors: [],
        }),
      });

    provider
      .given('prerequisites for creating a flight order exist')
      .uponReceiving('a request to create a flight order')
      .withRequest({
        method: 'POST',
        path: '/api/zlecenia',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: newOrder,
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: like({ success: boolean(true), data: integer(1), errors: [] }),
      });

    provider
      .given('flight order with id 1 exists in status Wprowadzone')
      .uponReceiving('a request to change flight order status')
      .withRequest({
        method: 'POST',
        path: '/api/zlecenia/1/status',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: { statusId: 2 },
      })
      .willRespondWith({ status: 204 });

    provider
      .given('flight order with id 1 has change history')
      .uponReceiving('a request for flight order history')
      .withRequest({ method: 'GET', path: '/api/zlecenia/1/historia', headers: authHeaders })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: like({
          success: boolean(true),
          data: eachLike({
            id: integer(1),
            pole: string('Status'),
            staraWartosc: string('Wprowadzone'),
            nowaWartosc: string('Przekazane do akceptacji'),
            zmienionePrzezEmail: string('admin@example.com'),
            dataZmiany: string('2026-03-30T14:00:00'),
          }),
          errors: [],
        }),
      });

    await provider.executeTest(async (mockServer) => {
      const client = apiClient(mockServer.url);

      const paged = unwrap(
        await client.get('/api/zlecenia', { params: { strona: 1, rozmiarStrony: 20 } })
      );
      expect(paged.items).toBeDefined();
      expect(paged.items[0]).toHaveProperty('numer');

      const detail = unwrap(await client.get('/api/zlecenia/1'));
      expect(detail.id).toBe(1);
      expect(detail.operacje).toBeDefined();

      const created = unwrap(await client.post('/api/zlecenia', newOrder));
      expect(typeof created).toBe('number');

      const statusRes = await client.post('/api/zlecenia/1/status', { statusId: 2 });
      expect(statusRes.status).toBe(204);

      const history = unwrap(await client.get('/api/zlecenia/1/historia'));
      expect(Array.isArray(history)).toBe(true);
      expect(history[0]).toHaveProperty('pole');
    });
  });
});
