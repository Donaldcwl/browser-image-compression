// https://gist.github.com/tonytonyjan/ffb7cd0e82cb293b843ece7e79364233
// Copyright (c) 2022 Weihang Jian <tonytonyjan@gmail.com>

export default async function copyExifWithoutOrientation(srcBlob, destBlob) {
  const exif = await getApp1Segment(srcBlob);
  return new Blob([destBlob.slice(0, 2), exif, destBlob.slice(2)], {
    type: 'image/jpeg',
  });
}

const SOI = 0xffd8;
const SOS = 0xffda;
const APP1 = 0xffe1;
const EXIF = 0x45786966;
const LITTLE_ENDIAN = 0x4949;
const BIG_ENDIAN = 0x4d4d;
const TAG_ID_ORIENTATION = 0x0112;
const TAG_TYPE_SHORT = 3;
const getApp1Segment = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.addEventListener('load', ({ target: { result: buffer } }) => {
    const view = new DataView(buffer);
    let offset = 0;
    if (view.getUint16(offset) !== SOI) return reject('not a valid JPEG');
    offset += 2;

    while (true) {
      const marker = view.getUint16(offset);
      if (marker === SOS) break;

      const size = view.getUint16(offset + 2);
      if (marker === APP1 && view.getUint32(offset + 4) === EXIF) {
        const tiffOffset = offset + 10;
        let littleEndian;
        switch (view.getUint16(tiffOffset)) {
          case LITTLE_ENDIAN:
            littleEndian = true;
            break;
          case BIG_ENDIAN:
            littleEndian = false;
            break;
          default:
            return reject('TIFF header contains invalid endian');
        }
        if (view.getUint16(tiffOffset + 2, littleEndian) !== 0x2a) { return reject('TIFF header contains invalid version'); }

        const ifd0Offset = view.getUint32(tiffOffset + 4, littleEndian);
        const endOfTagsOffset = tiffOffset
              + ifd0Offset
              + 2
              + view.getUint16(tiffOffset + ifd0Offset, littleEndian) * 12;
        for (
          let i = tiffOffset + ifd0Offset + 2;
          i < endOfTagsOffset;
          i += 12
        ) {
          const tagId = view.getUint16(i, littleEndian);
          if (tagId == TAG_ID_ORIENTATION) {
            if (view.getUint16(i + 2, littleEndian) !== TAG_TYPE_SHORT) { return reject('Orientation data type is invalid'); }

            if (view.getUint32(i + 4, littleEndian) !== 1) { return reject('Orientation data count is invalid'); }

            view.setUint16(i + 8, 1, littleEndian);
            break;
          }
        }
        return resolve(buffer.slice(offset, offset + 2 + size));
      }
      offset += 2 + size;
    }
    return resolve(new Blob());
  });
  reader.readAsArrayBuffer(blob);
});
