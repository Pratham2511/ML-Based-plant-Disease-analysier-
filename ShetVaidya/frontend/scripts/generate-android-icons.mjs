import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const iconPackRoot = path.join(projectRoot, 'android-icon-pack');
const sourceDir = path.join(iconPackRoot, 'source');
const outputRoot = path.join(iconPackRoot, 'res');

const fullIconSvgPath = path.join(projectRoot, 'public', 'assets', 'shetvaidya-navbar-mobile.svg');
const foregroundSvgPath = fullIconSvgPath;
const monochromeSvgPath = fullIconSvgPath;

const densitySizes = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function writeFile(targetPath, content) {
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, content);
}

function renderSvgToPng(svgPath, outputPath, width, height = width) {
  const svg = fs.readFileSync(svgPath);
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: width,
    },
  });
  const pngData = resvg.render({
    width,
    height,
  }).asPng();

  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, pngData);
}

function writeAdaptiveXmls() {
  const v26Icon = `<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background" />\n    <foreground android:drawable="@drawable/ic_launcher_foreground" />\n</adaptive-icon>\n`;

  const v33Icon = `<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background" />\n    <foreground android:drawable="@drawable/ic_launcher_foreground" />\n    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />\n</adaptive-icon>\n`;

  const colors = `<resources>\n    <color name="ic_launcher_background">#1B5E20</color>\n</resources>\n`;

  writeFile(path.join(outputRoot, 'mipmap-anydpi-v26', 'ic_launcher.xml'), v26Icon);
  writeFile(path.join(outputRoot, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), v26Icon);
  writeFile(path.join(outputRoot, 'mipmap-anydpi-v33', 'ic_launcher.xml'), v33Icon);
  writeFile(path.join(outputRoot, 'mipmap-anydpi-v33', 'ic_launcher_round.xml'), v33Icon);
  writeFile(path.join(outputRoot, 'values', 'ic_launcher_colors.xml'), colors);
}

function generateLegacyPngs() {
  for (const [density, size] of Object.entries(densitySizes)) {
    const mipmapDir = path.join(outputRoot, `mipmap-${density}`);
    renderSvgToPng(fullIconSvgPath, path.join(mipmapDir, 'ic_launcher.png'), size);
    renderSvgToPng(fullIconSvgPath, path.join(mipmapDir, 'ic_launcher_round.png'), size);
  }
}

function generateAdaptiveLayers() {
  const drawableNoDpi = path.join(outputRoot, 'drawable-nodpi');
  renderSvgToPng(foregroundSvgPath, path.join(drawableNoDpi, 'ic_launcher_foreground.png'), 432);
  renderSvgToPng(monochromeSvgPath, path.join(drawableNoDpi, 'ic_launcher_monochrome.png'), 432);
}

function main() {
  generateLegacyPngs();
  generateAdaptiveLayers();
  writeAdaptiveXmls();
  console.log('Android launcher icons generated at:', outputRoot);
}

main();
