let faceapiModule = null;
let modelsLoaded = null;
let ssdLoaded = null;
let isInferenceBusy = false;

async function getFaceApi() {
  if (!faceapiModule) {
    faceapiModule = await import('@vladmandic/face-api');
  }
  return faceapiModule;
}

// Cache sampel descriptor berkualitas tinggi terbaru agar proses login/enroll instan & stabil
const recentDescriptorsCache = [];
const MAX_CACHE_SIZE = 4;
const CACHE_TTL_MS = 3500;

export function clearFaceCache() {
  recentDescriptorsCache.length = 0;
}

function pushDescriptorCache(descriptor, score) {
  if (!Array.isArray(descriptor) || descriptor.length !== 128) return;
  const now = Date.now();
  // Bersihkan cache yang sudah kedaluwarsa
  while (recentDescriptorsCache.length > 0 && now - recentDescriptorsCache[0].timestamp > CACHE_TTL_MS) {
    recentDescriptorsCache.shift();
  }
  recentDescriptorsCache.push({
    descriptor,
    score: score || 0.8,
    timestamp: now
  });
  if (recentDescriptorsCache.length > MAX_CACHE_SIZE) {
    recentDescriptorsCache.shift();
  }
}

function getFreshCachedDescriptors(maxAgeMs = 2800) {
  const now = Date.now();
  return recentDescriptorsCache
    .filter(item => now - item.timestamp <= maxAgeMs)
    .map(item => item.descriptor);
}

// Memuat model pengenalan wajah utama dengan prioritas kecepatan & efisiensi memori.
export async function loadFaceModels() {
  const faceapi = await getFaceApi();
  if (!modelsLoaded) {
    modelsLoaded = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models')
    ]).catch(error => {
      modelsLoaded = null;
      throw new Error(`Gagal memuat model wajah: ${error.message}`);
    });
  }

  await modelsLoaded;
}

async function loadSsdModelFallback() {
  const faceapi = await getFaceApi();
  if (!ssdLoaded) {
    ssdLoaded = faceapi.nets.ssdMobilenetv1.loadFromUri('/models').catch(err => {
      ssdLoaded = null;
      throw err;
    });
  }
  await ssdLoaded;
}

export function l2Normalize(vector) {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return vector;
  return vector.map(val => val / norm);
}

/**
 * Menghitung metrik kedekatan wajah (proximity) secara numerik:
 * - proximityPct: Persentase kedekatan menuju syarat minimal (0 - 100%+)
 * - distanceCm: Estimasi jarak wajah ke kamera dalam cm
 * - faceSizePx & minRequiredPx: Ukuran piksel kotak wajah aktual vs minimal
 * - status: 'optimal' | 'too_far' | 'too_close'
 */
export function evaluateFaceProximity(box, videoElement) {
  const vw = videoElement?.videoWidth || 640;
  const vh = videoElement?.videoHeight || 480;
  const shortSide = Math.min(vw, vh);

  const faceSizePx = Math.round(Math.min(box.width, box.height));
  // Minimal ~21% dari sisi pendek frame (sekitar 100px pada 480p)
  const minRequiredPx = Math.max(92, Math.round(shortSide * 0.21));
  const maxAllowedPx = Math.round(shortSide * 0.78);

  // Persentase kedekatan terhadap batas minimal
  const rawRatioPct = Math.round((faceSizePx / minRequiredPx) * 100);
  const proximityPct = faceSizePx < minRequiredPx
    ? Math.max(10, Math.min(99, rawRatioPct))
    : Math.min(140, Math.max(100, rawRatioPct));

  // Estimasi jarak dalam sentimeter berdasarkan proporsi optik webcam standar
  const distanceCm = Math.max(15, Math.min(150, Math.round((shortSide * 13.5) / Math.max(1, faceSizePx))));
  const targetMaxCm = 60;
  const moveCloserCm = Math.max(0, distanceCm - targetMaxCm);
  const deficitPct = Math.max(0, 100 - proximityPct);

  let status = 'optimal';
  if (faceSizePx < minRequiredPx) {
    status = 'too_far';
  } else if (faceSizePx > maxAllowedPx) {
    status = 'too_close';
  }

  return {
    status,
    isOptimal: status === 'optimal',
    proximityPct,
    distanceCm,
    targetMaxCm,
    moveCloserCm,
    deficitPct,
    faceSizePx,
    minRequiredPx
  };
}

/**
 * Konversi koordinat box video asli ke piksel tampilan container dengan object-cover.
 * Mendukung mode mirror (scaleX(-1)) agar kotak deteksi menempel presisi pada wajah.
 */
export function computeDisplayBox(box, videoElement, mirrored = true) {
  if (!box || !videoElement || !videoElement.videoWidth || !videoElement.videoHeight) {
    return null;
  }

  const vw = videoElement.videoWidth;
  const vh = videoElement.videoHeight;
  const cw = videoElement.clientWidth;
  const ch = videoElement.clientHeight;

  if (cw === 0 || ch === 0) return null;

  const videoAspect = vw / vh;
  const containerAspect = cw / ch;

  let renderedW, renderedH, offsetX = 0, offsetY = 0;

  if (containerAspect > videoAspect) {
    renderedW = cw;
    renderedH = cw / videoAspect;
    offsetY = (ch - renderedH) / 2;
  } else {
    renderedH = ch;
    renderedW = ch * videoAspect;
    offsetX = (cw - renderedW) / 2;
  }

  const scale = renderedW / vw;
  const width = Math.round(box.width * scale);
  const height = Math.round(box.height * scale);
  const rawLeft = offsetX + box.x * scale;
  const left = Math.round(mirrored ? (cw - rawLeft - width) : rawLeft);
  const top = Math.round(offsetY + box.y * scale);

  // Pastikan tetap berada di dalam batas aman frame tampilan
  const clampedLeft = Math.max(4, Math.min(cw - width - 4, left));
  const clampedTop = Math.max(4, Math.min(ch - height - 4, top));

  return {
    left: clampedLeft,
    top: clampedTop,
    width: Math.min(width, cw - 8),
    height: Math.min(height, ch - 8)
  };
}

/**
 * Deteksi terpadu real-time yang hemat CPU/GPU (menggunakan mutex lock agar tidak tabrakan).
 * Jika includeDescriptor = true dan posisi wajah sudah cukup dekat, sekaligus mengekstrak 128-D descriptor.
 */
export async function detectFaceRealtime(videoElement, { includeDescriptor = false } = {}) {
  if (!videoElement || videoElement.readyState < 2 || !videoElement.videoWidth) {
    return null;
  }
  if (isInferenceBusy) {
    return { skipped: true };
  }

  isInferenceBusy = true;
  try {
    await loadFaceModels();
    const faceapi = await getFaceApi();
    const tinyOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: 224,
      scoreThreshold: 0.42
    });

    if (includeDescriptor) {
      const fullDet = await faceapi
        .detectSingleFace(videoElement, tinyOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!fullDet) return null;

      const box = fullDet.detection.box;
      const score = fullDet.detection.score;
      const proximity = evaluateFaceProximity(box, videoElement);
      let descriptor = null;

      if (fullDet.descriptor) {
        const raw = Array.from(fullDet.descriptor);
        if (raw.length === 128 && raw.every(Number.isFinite)) {
          descriptor = l2Normalize(raw);
          if (proximity.isOptimal && score >= 0.52) {
            pushDescriptorCache(descriptor, score);
          }
        }
      }

      return { box, score, proximity, descriptor };
    }

    const detection = await faceapi.detectSingleFace(videoElement, tinyOptions);
    if (!detection) return null;

    const proximity = evaluateFaceProximity(detection.box, videoElement);
    return {
      box: detection.box,
      score: detection.score,
      proximity,
      descriptor: null
    };
  } finally {
    isInferenceBusy = false;
  }
}

// Kompatibilitas fungsi lama
export async function detectFaceBox(videoElement) {
  const res = await detectFaceRealtime(videoElement, { includeDescriptor: false });
  if (!res || res.skipped) return null;
  return {
    box: res.box,
    score: res.score,
    proximity: res.proximity
  };
}

export async function extractQuickDescriptor(videoElement) {
  const res = await detectFaceRealtime(videoElement, { includeDescriptor: true });
  if (!res || res.skipped) return null;
  return res.descriptor || null;
}

// Mengaktifkan kamera dengan resolusi 640x480 (rasio 4:3) yang sangat ringan dan optimal untuk CNN wajah.
export async function startFaceCamera(videoElement) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Browser tidak mendukung akses kamera.');
  }

  clearFaceCache();

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: 'user',
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30 }
    }
  });

  videoElement.srcObject = stream;
  await videoElement.play();

  return stream;
}

async function waitForInferenceIdle(timeoutMs = 300) {
  const start = Date.now();
  while (isInferenceBusy && Date.now() - start < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

// Mendeteksi satu frame wajah berkualitas tinggi (menggunakan TinyFaceDetector cepat + fallback SSD).
async function detectSingleFrame(videoElement) {
  await waitForInferenceIdle(350);
  isInferenceBusy = true;

  try {
    const faceapi = await getFaceApi();
    const tinyOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: 256,
      scoreThreshold: 0.42
    });

    let detections = await faceapi
      .detectAllFaces(videoElement, tinyOptions)
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (detections.length === 0) {
      await loadSsdModelFallback();
      detections = await faceapi
        .detectAllFaces(
          videoElement,
          new faceapi.SsdMobilenetv1Options({ minConfidence: 0.55, maxResults: 2 })
        )
        .withFaceLandmarks()
        .withFaceDescriptors();
    }

    if (detections.length === 0) {
      throw new Error(
        'Wajah belum terdeteksi. Posisikan wajah menghadap kamera dengan pencahayaan cukup.'
      );
    }

    if (detections.length > 1) {
      throw new Error(
        'Terdeteksi lebih dari satu wajah. Pastikan hanya ada satu orang di depan kamera.'
      );
    }

    const detection = detections[0];
    const box = detection.detection.box;
    const proximity = evaluateFaceProximity(box, videoElement);

    if (proximity.status === 'too_far') {
      throw new Error(
        `Wajah kurang dekat ke kamera (Kedekatan: ${proximity.proximityPct}%, estimasi ~${proximity.distanceCm} cm). Majukan wajah hingga mencapai minimal 100% (≤ ${proximity.targetMaxCm} cm).`
      );
    }

    const descriptor = Array.from(detection.descriptor);
    if (descriptor.length !== 128 || !descriptor.every(Number.isFinite)) {
      throw new Error('Descriptor biometrik wajah tidak valid.');
    }

    const normalized = l2Normalize(descriptor);
    pushDescriptorCache(normalized, detection.detection.score);
    return normalized;
  } finally {
    isInferenceBusy = false;
  }
}

function averageSamples(samples) {
  const averaged = new Array(128).fill(0);
  for (let i = 0; i < 128; i++) {
    let sum = 0;
    for (const sample of samples) {
      sum += sample[i];
    }
    averaged[i] = sum / samples.length;
  }
  return l2Normalize(averaged);
}

/**
 * Mengambil sampel wajah untuk Login.
 * Memanfaatkan cache descriptor real-time yang masih segar + pengumpulan frame cepat,
 * lalu melakukan smoothing antar-sampel agar tahan terhadap noise sensor webcam.
 */
export async function captureFaceSamples(videoElement, onProgress = null) {
  await loadFaceModels();

  if (!videoElement) {
    throw new Error('Kamera tidak ditemukan.');
  }

  if (
    videoElement.readyState < 2 ||
    !videoElement.videoWidth ||
    !videoElement.videoHeight
  ) {
    throw new Error('Video belum siap. Aktifkan kamera kembali.');
  }

  const SAMPLE_COUNT = 3;
  const cached = getFreshCachedDescriptors(2500);
  const rawSamples = [...cached.slice(-2)];

  while (rawSamples.length < SAMPLE_COUNT) {
    if (onProgress) {
      onProgress(rawSamples.length + 1, SAMPLE_COUNT);
    }

    const descriptor = await detectSingleFrame(videoElement);
    rawSamples.push(descriptor);

    if (rawSamples.length < SAMPLE_COUNT) {
      await new Promise(resolve => setTimeout(resolve, 70));
    }
  }

  if (onProgress) {
    onProgress(SAMPLE_COUNT, SAMPLE_COUNT);
  }

  // Stabilkan setiap sampel dengan rata-rata terbobot terhadap centroid untuk meredam jitter frame tunggal
  const centroid = averageSamples(rawSamples);
  return rawSamples.map(sample => averageSamples([sample, centroid, centroid]));
}

// Mendeteksi wajah dengan multi-frame sampling (rata-rata 3 frame untuk kestabilan biometrik saat Enroll).
export async function captureFaceDescriptor(videoElement, onProgress = null) {
  const samples = await captureFaceSamples(videoElement, onProgress);
  return averageSamples(samples);
}

// Mematikan kamera dan membersihkan cache.
export function stopFaceCamera(stream) {
  clearFaceCache();
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}
