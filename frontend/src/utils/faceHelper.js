
import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = null;

// Memuat model pengenalan wajah.
export async function loadFaceModels() {
  if (!modelsLoaded) {
    modelsLoaded = Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models')
    ]).catch(error => {
      modelsLoaded = null;
      throw new Error(
        `Gagal memuat model wajah: ${error.message}`
      );
    });
  }

  await modelsLoaded;
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
      width: { ideal: 640 },
      height: { ideal: 480 }
    }
  });

  videoElement.srcObject = stream;
  await videoElement.play();

  return stream;
}

// Mendeteksi wajah dan menghasilkan descriptor 128 angka.
export async function captureFaceDescriptor(videoElement) {
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

  console.log(
    '[Face] Resolusi kamera:',
    videoElement.videoWidth,
    'x',
    videoElement.videoHeight
  );

  // Deteksi menggunakan SSD MobileNet V1.
  const detections = await faceapi
    .detectAllFaces(
      videoElement,
      new faceapi.SsdMobilenetv1Options({
        minConfidence: 0.4,
        maxResults: 5
      })
    )
    .withFaceLandmarks()
    .withFaceDescriptors();

  console.log(
    '[Face] Jumlah wajah terdeteksi:',
    detections.length
  );

  if (detections.length === 0) {
    throw new Error(
      'Wajah belum terdeteksi. Pastikan wajah terlihat jelas dan pencahayaan cukup.'
    );
  }

  if (detections.length > 1) {
    throw new Error(
      'Terdeteksi beberapa wajah. Pastikan hanya satu wajah terlihat.'
    );
  }

  const descriptor = Array.from(detections[0].descriptor);

  if (
    descriptor.length !== 128 ||
    !descriptor.every(Number.isFinite)
  ) {
    throw new Error('Descriptor wajah tidak valid.');
  }

  console.log('[Face] Descriptor berhasil dibuat.');

  return descriptor;
}

// Mematikan kamera.
export function stopFaceCamera(stream) {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}
