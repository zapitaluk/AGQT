/**
 * Create ICO files for system tray
 * Run with: node scripts/create-ico-files.js
 */

const fs = require('fs');
const path = require('path');

// Create a 16x16 32-bit ICO file with a colored filled circle
function createIcoFile(r, g, b, filename) {
    const width = 16;
    const height = 16;

    // ICO header (6 bytes)
    const icoHeader = Buffer.alloc(6);
    icoHeader.writeUInt16LE(0, 0);      // Reserved
    icoHeader.writeUInt16LE(1, 2);      // Type (1 = ICO)
    icoHeader.writeUInt16LE(1, 4);      // Number of images

    // ICO directory entry (16 bytes)
    const dirEntry = Buffer.alloc(16);
    dirEntry.writeUInt8(width, 0);       // Width
    dirEntry.writeUInt8(height, 1);      // Height
    dirEntry.writeUInt8(0, 2);           // Color palette (0 = no palette)
    dirEntry.writeUInt8(0, 3);           // Reserved
    dirEntry.writeUInt16LE(1, 4);        // Color planes
    dirEntry.writeUInt16LE(32, 6);       // Bits per pixel

    // BMP data
    const bmpHeaderSize = 40;
    const pixelDataSize = width * height * 4; // BGRA
    const maskSize = Math.ceil(width / 8) * height; // 1-bit mask
    const imageSize = bmpHeaderSize + pixelDataSize + maskSize;

    dirEntry.writeUInt32LE(imageSize, 8);  // Image size
    dirEntry.writeUInt32LE(22, 12);        // Offset to image data (6 + 16 = 22)

    // BMP info header (BITMAPINFOHEADER - 40 bytes)
    const bmpHeader = Buffer.alloc(40);
    bmpHeader.writeUInt32LE(40, 0);           // Header size
    bmpHeader.writeInt32LE(width, 4);         // Width
    bmpHeader.writeInt32LE(height * 2, 8);    // Height (doubled for ICO)
    bmpHeader.writeUInt16LE(1, 12);           // Planes
    bmpHeader.writeUInt16LE(32, 14);          // Bits per pixel
    bmpHeader.writeUInt32LE(0, 16);           // Compression (none)
    bmpHeader.writeUInt32LE(pixelDataSize + maskSize, 20); // Image size
    bmpHeader.writeInt32LE(0, 24);            // X pixels per meter
    bmpHeader.writeInt32LE(0, 28);            // Y pixels per meter
    bmpHeader.writeUInt32LE(0, 32);           // Colors used
    bmpHeader.writeUInt32LE(0, 36);           // Important colors

    // Pixel data (BGRA, bottom-up)
    const pixelData = Buffer.alloc(pixelDataSize);
    const cx = width / 2 - 0.5;
    const cy = height / 2 - 0.5;
    const radius = 6;

    for (let y = height - 1; y >= 0; y--) {
        for (let x = 0; x < width; x++) {
            const idx = ((height - 1 - y) * width + x) * 4;
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= radius) {
                // Inside circle - use the color
                pixelData[idx + 0] = b;     // Blue
                pixelData[idx + 1] = g;     // Green
                pixelData[idx + 2] = r;     // Red
                pixelData[idx + 3] = 255;   // Alpha (opaque)
            } else {
                // Outside circle - transparent
                pixelData[idx + 0] = 0;
                pixelData[idx + 1] = 0;
                pixelData[idx + 2] = 0;
                pixelData[idx + 3] = 0;     // Alpha (transparent)
            }
        }
    }

    // AND mask (1-bit, all zeros for full opacity where we have pixels)
    const andMask = Buffer.alloc(maskSize, 0xFF); // Start with all transparent
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= radius) {
                // Inside circle - set bit to 0 (opaque)
                const byteIdx = (height - 1 - y) * Math.ceil(width / 8) + Math.floor(x / 8);
                const bitIdx = 7 - (x % 8);
                andMask[byteIdx] &= ~(1 << bitIdx);
            }
        }
    }

    // Combine all parts
    const ico = Buffer.concat([icoHeader, dirEntry, bmpHeader, pixelData, andMask]);

    // Write file
    const assetsDir = path.join(__dirname, '..', 'assets');
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }

    const filepath = path.join(assetsDir, filename);
    fs.writeFileSync(filepath, ico);
    console.log(`Created: ${filepath}`);
    return filepath;
}

// Create the three icon files
createIcoFile(0, 200, 80, 'icon-green.ico');    // Green
createIcoFile(255, 200, 0, 'icon-yellow.ico');   // Yellow
createIcoFile(220, 50, 50, 'icon-red.ico');      // Red

console.log('\nIcon files created successfully!');
