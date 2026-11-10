import { describe, expect, it } from 'vitest';
import { isPublicAddress } from '../../src/infrastructure/http/job-page/public-address';

describe('isPublicAddress', () => {
  it.each([
    '8.8.8.8',
    '151.101.1.69',
    '2606:4700::1111',
    '2001:4860:4860::8888',
    '::ffff:8.8.8.8',
  ])('aceita o endereço público %s', (address) => {
    expect(isPublicAddress(address)).toBe(true);
  });

  it.each([
    '0.0.0.0',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '172.31.255.255',
    '192.0.0.1',
    '192.168.1.10',
    '198.18.0.1',
    '224.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    '[::1]',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'ff02::1',
    '2001:db8::1',
    '64:ff9b::a00:1',
    '::ffff:10.0.0.1',
    '::ffff:127.0.0.1',
    'localhost',
    'not-an-ip',
  ])('recusa o endereço interno ou inválido %s', (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });
});
