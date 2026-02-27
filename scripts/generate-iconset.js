/**
 * Generate iconset PNGs for macOS .app icon
 * Usage: node generate-iconset.js <output-directory>
 */

const fs = require('fs');
const zlib = require('zlib');

function createPngIcon(size, r, g, b) {
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(size, 0);
    ihdrData.writeUInt32BE(size, 4);
    ihdrData[8] = 8;
    ihdrData[9] = 6; // RGBA
    const ihdrChunk = createChunk('IHDR', ihdrData);

    const rawData = [];
    const cx = size / 2 - 0.5;
    const cy = size / 2 - 0.5;
    const outerR = size * 0.42;
    const innerR = size * 0.35;

    for (let y = 0; y < size; y++) {
        rawData.push(0);
        for (let x = 0; x < size; x++) {
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
            if (dist <= innerR) {
                rawData.push(r, g, b, 255);
            } else if (dist <= outerR) {
                const alpha = Math.round(255 * (1 - (dist - innerR) / (outerR - innerR)));
                rawData.push(r, g, b, alpha);
            } else {
                rawData.push(0, 0, 0, 0);
            }
        }
    }

    const compressed = zlib.deflateSync(Buffer.from(rawData));
    const idatChunk = createChunk('IDAT', compressed);
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
            c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        }
        table[n] = c;
    }
    return table;
}

const dir = process.argv[2];
if (!dir) {
    console.error('Usage: node generate-iconset.js <output-directory>');
    process.exit(1);
}

const sizes = [16, 32, 64, 128, 256, 512, 1024];
for (const s of sizes) {
    const png = createPngIcon(s, 0, 200, 80);
    fs.writeFileSync(`${dir}/icon_${s}x${s}.png`, png);
    if (s <= 512) {
        fs.writeFileSync(`${dir}/icon_${s / 2}x${s / 2}@2x.png`, png);
    }
}
console.log('Generated iconset PNGs');
