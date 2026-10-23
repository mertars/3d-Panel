/**
 * Fotoğrafı tarayıcıda yeniden boyutlandırıp JPEG/WebP olarak sıkıştırır.
 * Hedef: ≤ maxBytes (varsayılan ~400 KB).
 */
export async function compressImage(file: Blob, maxBytes = 400 * 1024, maxSide = 1280): Promise<Blob> {
  const bitmap = await loadBitmap(file)
  let side = maxSide
  let quality = 0.85
  for (let attempt = 0; attempt < 8; attempt++) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas desteklenmiyor')
    ctx.drawImage(bitmap, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality))
    if (blob && blob.size <= maxBytes) return blob
    // Önce kaliteyi, sonra boyutu düşür
    if (quality > 0.6) quality -= 0.1
    else side = Math.round(side * 0.8)
  }
  throw new Error('Fotoğraf yeterince küçültülemedi')
}

async function loadBitmap(file: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* aşağıdaki yönteme düş */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}
