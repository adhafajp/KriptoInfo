import { describe, it, expect } from 'vitest';
import { cryptoApi, vaultApi, blockchainApi, stegoApi } from './services/api';
import { computeDisplayBox, evaluateFaceProximity, l2Normalize } from './utils/faceHelper';

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

describe('Face Detection & Mirror Coordinate Helpers', () => {
  it('computeDisplayBox membalik koordinat X dengan tepat saat mode mirror aktif', () => {
    const mockVideo = {
      videoWidth: 640,
      videoHeight: 480,
      clientWidth: 320,
      clientHeight: 240
    };
    // Wajah berada di sisi kiri frame asli (x = 40, width = 120)
    const rawBox = { x: 40, y: 60, width: 120, height: 120 };

    const unmirrored = computeDisplayBox(rawBox, mockVideo, false);
    const mirrored = computeDisplayBox(rawBox, mockVideo, true);

    expect(unmirrored).toEqual({ left: 20, top: 30, width: 60, height: 60 });
    // Pada tampilan mirror (lebar 320), posisi kiri harus berada di sisi kanan: 320 - 20 - 60 = 240
    expect(mirrored).toEqual({ left: 240, top: 30, width: 60, height: 60 });
  });

  it('evaluateFaceProximity memberikan angka kedekatan dan mendeteksi wajah kurang dekat vs optimal', () => {
    const mockVideo = { videoWidth: 640, videoHeight: 480 };

    // Wajah kecil / jauh (60px dari min ~101px)
    const farResult = evaluateFaceProximity({ width: 60, height: 60 }, mockVideo);
    expect(farResult.status).toBe('too_far');
    expect(farResult.isOptimal).toBe(false);
    expect(farResult.proximityPct).toBeLessThan(100);
    expect(farResult.deficitPct).toBeGreaterThan(0);
    expect(farResult.distanceCm).toBeGreaterThan(60);

    // Wajah cukup dekat / optimal (140px)
    const optimalResult = evaluateFaceProximity({ width: 140, height: 140 }, mockVideo);
    expect(optimalResult.status).toBe('optimal');
    expect(optimalResult.isOptimal).toBe(true);
    expect(optimalResult.proximityPct).toBeGreaterThanOrEqual(100);
    expect(optimalResult.deficitPct).toBe(0);
  });

  it('l2Normalize menghasilkan vektor dengan panjang Euclidean = 1', () => {
    const vec = [3, 4, 0];
    const norm = l2Normalize(vec);
    expect(norm[0]).toBeCloseTo(0.6);
    expect(norm[1]).toBeCloseTo(0.8);
  });
});
