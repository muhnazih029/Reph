/** Compress an image File to at most `maxBytes` using canvas; returns original if already small or not an image. */
export async function compressImage(file: File, maxBytes = 2 * 1024 * 1024): Promise<File> {
  if (file.size <= maxBytes || !file.type.startsWith("image/")) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    const handleLoad = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const scale = Math.sqrt(maxBytes / file.size);
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(new File([blob], file.name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.85,
      );
    };
    img.addEventListener("load", handleLoad, { once: true });
    img.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      resolve(file);
    }, { once: true });
    img.src = url;
  });
}
