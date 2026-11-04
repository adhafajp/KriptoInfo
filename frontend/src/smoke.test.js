import { describe, it, expect } from 'vitest';
import { cryptoApi, vaultApi, blockchainApi, stegoApi } from './services/api';

describe('Frontend API Service Contract', () => {
  it('cryptoApi memiliki fungsi enkripsi dan dekripsi', () => {
    expect(typeof cryptoApi.encryptMessage).toBe('function');
    expect(typeof cryptoApi.decryptMessage).toBe('function');
    expect(typeof cryptoApi.encryptFile).toBe('function');
    expect(typeof cryptoApi.decryptFile).toBe('function');
  });

  it('vaultApi memiliki fungsi CRUD', () => {
    expect(typeof vaultApi.list).toBe('function');
    expect(typeof vaultApi.get).toBe('function');
    expect(typeof vaultApi.create).toBe('function');
    expect(typeof vaultApi.delete).toBe('function');
  });

  it('stegoApi memiliki fungsi embed dan extract', () => {
    expect(typeof stegoApi.embed).toBe('function');
    expect(typeof stegoApi.extract).toBe('function');
  });

  it('blockchainApi memiliki fungsi list, add, dan verify', () => {
    expect(typeof blockchainApi.list).toBe('function');
    expect(typeof blockchainApi.add).toBe('function');
    expect(typeof blockchainApi.verify).toBe('function');
  });
});
