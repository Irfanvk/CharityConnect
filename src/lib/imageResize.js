/**
 * Shrinks a photo on the device before uploading (fast on mobile data): at most `maxWidth`
 * wide, saved as JPEG. Returns a File; small images are only re-encoded.
 */
export async function resizeImage(file, { maxWidth = 1600, quality = 0.85 } = {}) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("This file is not a picture the phone can open."));
      el.src = url;
    });
    const scale = Math.min(1, maxWidth / img.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background in JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new Error("Could not prepare the picture.");
    const name = String(file.name || "banner").replace(/\.[^.]+$/, "") + ".jpg";
    return { file: new File([blob], name, { type: "image/jpeg" }), width: canvas.width, height: canvas.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
