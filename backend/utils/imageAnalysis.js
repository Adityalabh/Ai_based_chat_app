import {Jimp} from 'jimp';

export const analyzeImage = async (base64Data) => {
    try {
        const buffer = Buffer.from(base64Data, 'base64');
        const image = await Jimp.read(buffer);
        
        const width = image.bitmap.width;
        const height = image.bitmap.height;
        const aspectRatio = width / height;
        
        // Get dominant colors
        const colors = {};
        image.scan(0, 0, width, height, (x, y, idx) => {
            const r = image.bitmap.data[idx + 0];
            const g = image.bitmap.data[idx + 1];
            const b = image.bitmap.data[idx + 2];
            const color = `${r},${g},${b}`;
            colors[color] = (colors[color] || 0) + 1;
        });
        
        const sortedColors = Object.entries(colors)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([color]) => color);
        
        return {
            isPortrait: aspectRatio < 0.8,
            isLandscape: aspectRatio > 1.2,
            isSquare: aspectRatio >= 0.95 && aspectRatio <= 1.05,
            dominantColors: sortedColors,
            brightness: image.getBrightness()
        };
    } catch (error) {
        console.error("Image analysis error:", error);
        return {
            isPortrait: false,
            isLandscape: true,
            isSquare: false,
            dominantColors: [],
            brightness: 0.5
        };
    }
}