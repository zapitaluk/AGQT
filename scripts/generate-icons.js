/**
 * Generate colored tray icons as base64 PNG
 * Run with: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Simple 16x16 PNG icons with solid colors
// These are minimal valid PNGs created programmatically

function createPngIcon(r, g, b) {
    // PNG header
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    // IHDR chunk (image header)
    const width = 16;
    const height = 16;
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8;  // bit depth
    ihdrData[9] = 2;  // color type (RGB)
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace

    const ihdrChunk = createChunk('IHDR', ihdrData);

    // IDAT chunk (image data)
    const rawData = [];
    for (let y = 0; y < height; y++) {
        rawData.push(0); // filter byte
        for (let x = 0; x < width; x++) {
            // Create a filled circle
            const cx = width / 2 - 0.5;
            const cy = height / 2 - 0.5;
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= 6) {
                rawData.push(r, g, b);
            } else {
                rawData.push(0, 0, 0); // transparent (will show as black)
            }
        }
    }

    const zlib = require('zlib');
    const compressed = zlib.deflateSync(Buffer.from(rawData));
    const idatChunk = createChunk('IDAT', compressed);

    // IEND chunk
    const iendChunk = createChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const typeBuffer = Buffer.from(type);
    const crcData = Buffer.concat([typeBuffer, data]);
    const crc = crc32(crcData);

    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc, 0);

    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 implementation for PNG
function crc32(data) {
    let crc = 0xFFFFFFFF;
    const table = makeCrcTable();

    for (let i = 0; i < data.length; i++) {
        crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }

    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeCrcTable() {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            if (c & 1) {
                c = 0xEDB88320 ^ (c >>> 1);
            } else {
                c = c >>> 1;
            }
        }
        table[n] = c;
    }
    return table;
}

// Generate icons
const greenPng = createPngIcon(0, 200, 80);   // Green
const yellowPng = createPngIcon(255, 200, 0);  // Yellow
const redPng = createPngIcon(220, 50, 50);     // Red

console.log('// Green icon (RGB: 0, 200, 80)');
console.log(`const ICON_GREEN = '${greenPng.toString('base64')}';`);
console.log('');
console.log('// Yellow icon (RGB: 255, 200, 0)');
console.log(`const ICON_YELLOW = '${yellowPng.toString('base64')}';`);
console.log('');
console.log('// Red icon (RGB: 220, 50, 50)');
console.log(`const ICON_RED = '${redPng.toString('base64')}';`);
