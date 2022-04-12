// Type definitions for browser-image-compression 2.0
// Project: https://github.com/Donaldcwl/browser-image-compression
// Definitions by: Donald <https://github.com/Donaldcwl> & Jamie Haywood <https://github.com/jamiehaywood>

interface Options {
    /** @default Number.POSITIVE_INFINITY */
    maxSizeMB?: number;
    /** @default undefined */
    maxWidthOrHeight?: number;
    /** @default true */
    useWebWorker?: boolean;
    /** @default 10 */
    maxIteration?: number;
    /** Default to be the exif orientation from the image file */
    exifOrientation?: number;
    /** A function takes one progress argument (progress from 0 to 100) */
    onProgress?: (progress: number) => void;
    /** Default to be the original mime type from the image file */
    fileType?: string;
    /** @default 1.0 */
    initialQuality?: number;
    /** @default false */
    alwaysKeepResolution?: boolean;
    /** @default undefined */
    signal?: AbortSignal;
}

declare function imageCompression(image: File, options: Options): Promise<File>;

declare namespace imageCompression {
    function getDataUrlFromFile(file: File): Promise<string>;
    function getFilefromDataUrl(dataUrl: string, filename: string, lastModified?: number): Promise<File>;
    function loadImage(src: string): Promise<HTMLImageElement>;
    function drawImageInCanvas(img: HTMLImageElement, fileType?: string): HTMLCanvasElement;
    function drawFileInCanvas(file: File, options?: Options): Promise<[ImageBitmap | HTMLImageElement, HTMLCanvasElement]>;
    function canvasToFile(canvas: HTMLCanvasElement, fileType: string, fileName: string, fileLastModified: number, quality?: number): Promise<File>;
    function getExifOrientation(file: File): Promise<number>;
}

export as namespace imageCompression;

export default imageCompression;
