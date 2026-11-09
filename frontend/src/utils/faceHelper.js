
import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = null;

// Memuat model pengenalan wajah.
export async function loadFaceModels() {
  if (!modelsLoaded) {
    modelsLoaded = Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      faceapi.nets.tinyFaceDetector.loadFromUri('/models')
    ]).catch(error => {
      modelsLoaded = null;
      throw new Error(
        `Gagal memuat model wajah: ${error.message}`
      );
    });
  }

  await modelsLoaded;
}

// Deteksi cepat lokasi wajah real-time untuk visual reticle tracking
export async function detectFaceBox(videoElement) {
  if (!videoElement || videoElement.readyState < 2) return null;
  await loadFaceModels();

  const detection = await faceapi.detectSingleFace(
    videoElement,
    new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 })
  );

  if (!detection) return null;
  return {
    box: detection.box,
    score: detection.score
  };
}

// Konversi koordinat box video asli ke piksel tampilan container dengan object-cover
export function computeDisplayBox(box, videoElement) {
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
  const left = Math.round(offsetX + box.x * scale);
  const top = Math.round(offsetY + box.y * scale);
  const width = Math.round(box.width * scale);
  const height = Math.round(box.height * scale);

  return { left, top, width, height };
}

// Ekstraksi cepat descriptor biometrik untuk validasi identitas real-time
export async function extractQuickDescriptor(videoElement) {
  if (!videoElement || videoElement.readyState < 2 || !videoElement.videoWidth) return null;
  await loadFaceModels();

  try {
    const detection = await faceapi
      .detectSingleFace(
        videoElement,
        new faceapi.SsdMobilenetv1Options({ minConfidence: 0.65 })
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection || !detection.descriptor) return null;
    const descriptor = Array.from(detection.descriptor);
    if (descriptor.length !== 128 || !descriptor.every(Number.isFinite)) return null;
    return l2Normalize(descriptor);
  } catch {
    return null;
  }
}

// Mengaktifkan kamera.

export async function startFaceCamera(videoElement) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Browser tidak mendukung akses kamera.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 }
    }
  });

  videoElement.srcObject = stream;
  await videoElement.play();

  // Periksa resolusi aktual kamera.
  const track = stream.getVideoTracks()[0];

  console.log('[Camera] Pengaturan kamera:', track.getSettings());

  return stream;
}


function l2Normalize(vector) {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return vector;
  return vector.map(val => val / norm);
}

// Mendeteksi satu frame wajah berkualitas tinggi.
async function detectSingleFrame(videoElement) {
  const detections = await faceapi
    .detectAllFaces(
      videoElement,
      new faceapi.SsdMobilenetv1Options({
        minConfidence: 0.65,
        maxResults: 2
      })
    )
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (detections.length === 0) {
    throw new Error(
      'Wajah belum terdeteksi. Posisikan wajah tegak, dekatkan ke kamera, dan pastikan pencahayaan cukup.'
    );
  }

  if (detections.length > 1) {
    throw new Error(
      'Terdeteksi lebih dari satu wajah. Pastikan hanya ada satu orang di depan kamera.'
    );
  }

  const detection = detections[0];
  const box = detection.detection.box;

  // Validasi ukuran wajah agar tidak terlalu jauh
  if (box.width < 140 || box.height < 140) {
    throw new Error(
      'Wajah terlalu jauh dari kamera. Silakan mendekat ke layar.'
    );
  }

  const descriptor = Array.from(detection.descriptor);
  if (descriptor.length !== 128 || !descriptor.every(Number.isFinite)) {
    throw new Error('Descriptor biometrik wajah tidak valid.');
  }

  return descriptor;
}

// Mendeteksi wajah dengan multi-frame sampling (rata-rata 3 frame untuk kestabilan biometrik).
export async function captureFaceDescriptor(videoElement, onProgress = null) {
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
  const samples = [];

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    if (onProgress) {
      onProgress(i + 1, SAMPLE_COUNT);
    }

    const descriptor = await detectSingleFrame(videoElement);
    samples.push(descriptor);

    if (i < SAMPLE_COUNT - 1) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }

  // Hitung rata-rata tiap elemen vektor 128-d
  const averaged = new Array(128).fill(0);
  for (let i = 0; i < 128; i++) {
    let sum = 0;
    for (const sample of samples) {
      sum += sample[i];
    }
    averaged[i] = sum / samples.length;
  }

  // Normalisasi L2 agar jarak Euclidean presisi
  return l2Normalize(averaged);
}

// Mematikan kamera.
export function stopFaceCamera(stream) {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}
