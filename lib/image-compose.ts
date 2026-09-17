export async function imageBlobToFormat(blob: Blob, format: "png" | "webp", quality = 90): Promise<Blob> {
  if (format === "png" && blob.type === "image/png") return blob;
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare the download.");
    context.drawImage(bitmap, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("Could not create the image file."))),
        `image/${format}`,
        quality / 100,
      ),
    );
  } finally {
    bitmap.close();
  }
}

export async function applyMask(source: Blob, mask: Blob): Promise<Blob> {
  const [image, matte] = await Promise.all([createImageBitmap(source), createImageBitmap(mask)]);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Your browser could not apply the mask.");
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
    if (!maskContext) throw new Error("Your browser could not read the mask.");
    maskContext.drawImage(matte, 0, 0, canvas.width, canvas.height);
    const alpha = maskContext.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let index = 0; index < pixels.data.length; index += 4) pixels.data[index + 3] = alpha[index];
    context.putImageData(pixels, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("Could not apply the mask."))),
        "image/png",
      ),
    );
  } finally {
    image.close();
    matte.close();
  }
}
