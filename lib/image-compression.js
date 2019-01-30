import { drawFileInCanvas, canvasToFile } from './utils'

/**
 * Compress an image file.
 *
 * @param {File} file
 * @param options - { maxSizeMB=Number.POSITIVE_INFINITY, maxWidthOrHeight }
 * @returns {Promise<File>}
 */
export default async function compress (file, options) {
  let remainingTrials = options.maxIteration || 10

  const maxSizeByte = options.maxSizeMB * 1024 * 1024

  const temp = await drawFileInCanvas(file, options)
  const img = temp[0]
  const canvas = temp[1]

  let quality = 1
  let compressedFile = await canvasToFile(canvas, file.type, file.name, file.lastModified, quality)
  if (file.type === 'image/png') {
    while (remainingTrials-- && compressedFile.size > maxSizeByte) {
      canvas.width *= 0.9
      canvas.height *= 0.9

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      compressedFile = await canvasToFile(canvas, file.type, file.name, file.lastModified, quality)
    }
  } else { // if (file.type === 'image/jpeg') {
    while (remainingTrials-- && compressedFile.size > maxSizeByte) {
      canvas.width *= 0.9
      canvas.height *= 0.9

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      quality *= 0.9
      compressedFile = await canvasToFile(canvas, file.type, file.name, file.lastModified, quality)
    }
  }

  return compressedFile
}