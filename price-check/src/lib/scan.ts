export function canScanCamera() {
  return Boolean(window.BarcodeDetector) && Boolean(navigator.mediaDevices?.getUserMedia);
}

export async function startCameraScan(
  video: HTMLVideoElement,
  onCode: (value: string) => void,
) {
  const Detector = window.BarcodeDetector;
  if (!Detector) throw new Error("Camera barcode scan needs Chrome or Edge.");
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  const detector = new Detector({
    formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code", "upc_a", "upc_e"],
  });
  let active = true;
  const tick = async () => {
    if (!active) return;
    try {
      if (video.readyState >= 2) {
        const codes = await detector.detect(video);
        const value = codes[0]?.rawValue?.trim();
        if (value) {
          onCode(value);
          return;
        }
      }
    } catch {
      // keep scanning
    }
    requestAnimationFrame(() => void tick());
  };
  void tick();
  return () => {
    active = false;
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  };
}
