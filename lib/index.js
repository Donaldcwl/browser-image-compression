import { drawImageInCanvas, getDataUrlFromFile, getFilefromDataUrl, loadImage } from './utils.js';

/**
 * Compress an image file.
 *
 * @param {File} file
 * @param {number} [maxSizeMB=Number.POSITIVE_INFINITY]
 * @param {number} [maxWidthOrHeight]
 * @returns {Promise.<File>}
 */
async function imageCompression(file, maxSizeMB = Number.POSITIVE_INFINITY, maxWidthOrHeight) {

  if (!(file instanceof Blob || file instanceof File)) {
    throw new Error('The file given is not an instance of Blob or File');
  } else if (!/^image/.test(file.type)) {
    throw new Error('The file given is not an image');
  }

  let remainingTrials = 5;

  const maxSizeByte = maxSizeMB * 1024 * 1024;

  const dataUrl = await getDataUrlFromFile(file);
  const img = await loadImage(dataUrl);
  const canvas = drawImageInCanvas(img, maxWidthOrHeight);

  let quality = 0.9;
  let compressedFile = await getFilefromDataUrl(canvas.toDataURL(file.type, quality), file.name, file.lastModified);
  if (file.type === 'image/png') {
    while (remainingTrials-- && compressedFile.size > maxSizeByte) {
      canvas.width *= 0.9;
      canvas.height *= 0.9;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const compressedDataUrl = canvas.toDataURL(file.type, quality);
      compressedFile = await getFilefromDataUrl(compressedDataUrl, file.name, file.lastModified);
    }
  } else {
    while (remainingTrials-- && compressedFile.size > maxSizeByte) {
      quality *= 0.9;
      const compressedDataUrl = canvas.toDataURL(file.type, quality);
      compressedFile = await getFilefromDataUrl(compressedDataUrl, file.name, file.lastModified);
    }
  }

  return compressedFile;

}

imageCompression.drawImageInCanvas = drawImageInCanvas;
imageCompression.getDataUrlFromFile = getDataUrlFromFile;
imageCompression.getFilefromDataUrl = getFilefromDataUrl;
imageCompression.loadImage = loadImage;

export default imageCompression;