const imageInput = document.getElementById('imageInput');
const emptyState = document.getElementById('emptyState');
const previewContainer = document.getElementById('previewContainer');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const lockRatio = document.getElementById('lockRatio');
const imageInfo = document.getElementById('imageInfo');

const tolSlider = document.getElementById('tolSlider');
const tolVal = document.getElementById('tolVal');
const qualitySlider = document.getElementById('qualitySlider');
const qualityVal = document.getElementById('qualityVal');
const brightnessSlider = document.getElementById('brightnessSlider');
const brightnessVal = document.getElementById('brightnessVal');
const contrastSlider = document.getElementById('contrastSlider');
const contrastVal = document.getElementById('contrastVal');

const bgColorInput = document.getElementById('bgColorInput');
const watermarkInput = document.getElementById('watermarkInput');
const textColorInput = document.getElementById('textColorInput');
const watermarkPos = document.getElementById('watermarkPos');
const formatSelect = document.getElementById('formatSelect');

let originalImage = null;
let workingImage = null;
let isImageLoaded = false;
let aspectRatio = 1;
let currentBgColor = null;
let hasFrame = false;
let rotation = 0;
let flipH = 1;
let flipV = 1;
let activeFilter = 'none';
let bgRemoved = false;

function getVal(arr, i) { return Reflect.get(arr, i); }
function setVal(arr, i, v) { Reflect.set(arr, i, v); }

imageInput.addEventListener('change', function(e) {
    const file = e.target.files.item(0);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        const img = new Image();
        img.onload = function() {
            originalImage = img;
            workingImage = img;
            isImageLoaded = true;
            aspectRatio = img.width / img.height;
            widthInput.value = img.width;
            heightInput.value = img.height;
            emptyState.style.display = 'none';
            previewContainer.style.display = 'flex';
            resetStates();
            drawImage();
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
});

function resetStates() {
    currentBgColor = null; hasFrame = false; rotation = 0;
    flipH = 1; flipV = 1; activeFilter = 'none'; bgRemoved = false;
    brightnessSlider.value = 0; contrastSlider.value = 0; watermarkInput.value = '';
    updateLabels();
}

function updateLabels() {
    brightnessVal.textContent = brightnessSlider.value;
    contrastVal.textContent = contrastSlider.value;
    qualityVal.textContent = qualitySlider.value + '%';
    tolVal.textContent = tolSlider.value;
}
function drawImage() {
    if (!isImageLoaded || !workingImage) return;
    let w = parseInt(widthInput.value) || workingImage.width;
    let h = parseInt(heightInput.value) || workingImage.height;
    let cW = (rotation % 180 !== 0) ? h : w;
    let cH = (rotation % 180 !== 0) ? w : h;
    let fSize = hasFrame ? Math.round(Math.min(cW, cH) * 0.04) : 0;

    canvas.width = cW + (fSize * 2);
    canvas.height = cH + (fSize * 2);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH, flipV);
    ctx.drawImage(workingImage, -w / 2, -h / 2, w, h);
    ctx.restore();

    let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imgData.data;

    if (bgRemoved) {
        let tol = parseInt(tolSlider.value) * 2.5;
        let r0 = getVal(data, 0), g0 = getVal(data, 1), b0 = getVal(data, 2);
        for (let i = 0; i < data.length; i += 4) {
            let diff = Math.abs(getVal(data, i) - r0) + Math.abs(getVal(data, i + 1) - g0) + Math.abs(getVal(data, i + 2) - b0);
            if (diff < tol) setVal(data, i + 3, 0);
        }
    }

    let bright = parseInt(brightnessSlider.value) * 2.55;
    let cont = parseInt(contrastSlider.value);
    let factor = (259 * (cont + 255)) / (255 * (259 - cont));

    for (let i = 0; i < data.length; i += 4) {
        if (getVal(data, i + 3) === 0) continue;
        let r = factor * (getVal(data, i) - 128) + 128 + bright;
        let g = factor * (getVal(data, i + 1) - 128) + 128 + bright;
        let b = factor * (getVal(data, i + 2) - 128) + 128 + bright;

        if (activeFilter === 'bw') { r = g = b = 0.299 * r + 0.587 * g + 0.114 * b; }
        else if (activeFilter === 'sepia') {
            let tr = 0.393 * r + 0.769 * g + 0.189 * b;
            let tg = 0.349 * r + 0.686 * g + 0.168 * b;
            let tb = 0.272 * r + 0.534 * g + 0.131 * b;
            r = tr; g = tg; b = tb;
        } else if (activeFilter === 'invert') { r = 255 - r; g = 255 - g; b = 255 - b; }
        else if (activeFilter === 'warm') { r += 25; g += 8; b -= 20; }

        setVal(data, i, Math.min(255, Math.max(0, r)));
        setVal(data, i + 1, Math.min(255, Math.max(0, g)));
        setVal(data, i + 2, Math.min(255, Math.max(0, b)));
    }
    ctx.putImageData(imgData, 0, 0);

    if (currentBgColor || hasFrame) {
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = currentBgColor || '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
    }

    const text = watermarkInput.value.trim();
    if (text) {
        const fontSize = Math.max(18, Math.round(canvas.width * 0.045));
        ctx.font = 'bold ' + fontSize + 'px sans-serif';
        ctx.fillStyle = textColorInput.value;
        const pos = watermarkPos.value;
        if (pos === 'bottom-right') { ctx.textAlign = 'right'; ctx.fillText(text, canvas.width - 20, canvas.height - 20); }
        else if (pos === 'bottom-left') { ctx.textAlign = 'left'; ctx.fillText(text, 20, canvas.height - 20); }
        else if (pos === 'top-right') { ctx.textAlign = 'right'; ctx.fillText(text, canvas.width - 20, fontSize + 15); }
        else { ctx.textAlign = 'center'; ctx.fillText(text, canvas.width / 2, canvas.height / 2); }
    }
    updateFileSizeInfo();
}

function updateFileSizeInfo() {
    if (!isImageLoaded) return;
    const format = formatSelect.value;
    const quality = parseInt(qualitySlider.value) / 100;
    const dataUrl = canvas.toDataURL(format, quality);
    const sizeInKB = Math.max(1, Math.round((dataUrl.length * 3) / 4 / 1024));
    imageInfo.textContent = canvas.width + ' × ' + canvas.height + ' px | ' + sizeInKB + ' KB';
}

window.scrollToSection = function(id) { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth' }); };
window.removeSmartBg = function() { if (!isImageLoaded) return; bgRemoved = !bgRemoved; if (bgRemoved) formatSelect.value = 'image/png'; drawImage(); };
window.applyBgColor = function() { if (!isImageLoaded) return; currentBgColor = bgColorInput.value; drawImage(); };
window.toggleFrame = function() { if (!isImageLoaded) return; hasFrame = !hasFrame; if (!currentBgColor) currentBgColor = '#ffffff'; drawImage(); };
window.rotateImage = function() { if (!isImageLoaded) return; rotation = (rotation + 90) % 360; drawImage(); };
window.flipHorizontal = function() { if (!isImageLoaded) return; flipH *= -1; drawImage(); };
window.flipVertical = function() { if (!isImageLoaded) return; flipV *= -1; drawImage(); };
window.toggleFilter = function(t) { if (!isImageLoaded) return; activeFilter = (activeFilter === t) ? 'none' : t; drawImage(); };
window.autoEnhance = function() { if (!isImageLoaded) return; brightnessSlider.value = 12; contrastSlider.value = 20; updateLabels(); drawImage(); };
window.setPreset = function(w, h) { if (!isImageLoaded) return; lockRatio.checked = false; widthInput.value = w; heightInput.value = h; drawImage(); };

window.cropAspect = function(rw, rh) {
    if (!isImageLoaded || !workingImage) return;
    const targetRatio = rw / rh;
    let sw = workingImage.width, sh = workingImage.height, cw = sw, ch = sh;
    if (sw / sh > targetRatio) cw = Math.round(sh * targetRatio); else ch = Math.round(sw / targetRatio);
    const temp = document.createElement('canvas'); temp.width = cw; temp.height = ch;
    temp.getContext('2d').drawImage(workingImage, Math.round((sw - cw) / 2), Math.round((sh - ch) / 2), cw, ch, 0, 0, cw, ch);
    const img = new Image();
    img.onload = function() { workingImage = img; aspectRatio = cw / ch; widthInput.value = cw; heightInput.value = ch; rotation = 0; drawImage(); };
    img.src = temp.toDataURL('image/png');
};

window.resetImage = function() {
    if (!isImageLoaded || !originalImage) return;
    workingImage = originalImage; aspectRatio = originalImage.width / originalImage.height;
    widthInput.value = originalImage.width; heightInput.value = originalImage.height;
    resetStates(); drawImage();
};

window.downloadImage = function() {
    if (!isImageLoaded) return alert("اختر صورة أولاً!");
    const format = formatSelect.value;
    const quality = parseInt(qualitySlider.value) / 100;
    const ext = format === 'image/png' ? 'png' : (format === 'image/webp' ? 'webp' : 'jpg');
    const exp = document.createElement('canvas'); exp.width = canvas.width; exp.height = canvas.height;
    const eCtx = exp.getContext('2d');
    if (format === 'image/jpeg') { eCtx.fillStyle = '#ffffff'; eCtx.fillRect(0, 0, exp.width, exp.height); }
    eCtx.drawImage(canvas, 0, 0);
    const link = document.createElement('a');
    link.href = exp.toDataURL(format, quality);
    link.download = 'PixelForge_' + Date.now() + '.' + ext;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

tolSlider.addEventListener('input', function() { updateLabels(); if (bgRemoved) drawImage(); });
brightnessSlider.addEventListener('input', function() { updateLabels(); drawImage(); });
contrastSlider.addEventListener('input', function() { updateLabels(); drawImage(); });
qualitySlider.addEventListener('input', function() { updateLabels(); updateFileSizeInfo(); });
formatSelect.addEventListener('change', updateFileSizeInfo);
watermarkInput.addEventListener('input', drawImage);
textColorInput.addEventListener('input', drawImage);
watermarkPos.addEventListener('change', drawImage);
widthInput.addEventListener('input', function() { if (isImageLoaded && lockRatio.checked) heightInput.value = Math.round(parseInt(widthInput.value) / aspectRatio); drawImage(); });
heightInput.addEventListener('input', function() { if (isImageLoaded && lockRatio.checked) widthInput.value = Math.round(parseInt(heightInput.value) * aspectRatio); drawImage(); });

