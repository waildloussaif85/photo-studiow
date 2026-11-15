const c = document.getElementById('canvas');
const x = c.getContext('2d');
const fInp = document.getElementById('imgFile');
let oImg = null, wImg = null, ok = false, rat = 1;
let bgC = null, frm = false, rot = 0, fh = 1, fv = 1, fl = 'none', nBg = false, tm = null;

document.getElementById('pickBtn').onclick = function() { fInp.click(); };
document.getElementById('newBtn').onclick = function() { fInp.click(); };

fInp.onchange = function() {
    const file = fInp.files.item(0);
    if (!file) return;
    const r = new FileReader();
    r.onload = function(e) {
        const im = new Image();
        im.onload = function() {
            oImg = wImg = im; ok = true; rat = im.width / im.height;
            document.getElementById('wInp').value = im.width;
            document.getElementById('hInp').value = im.height;
            document.getElementById('emptyBox').style.display = 'none';
            document.getElementById('workBox').style.display = 'flex';
            bgC = null; frm = false; rot = 0; fh = 1; fv = 1; fl = 'none'; nBg = false;
            draw();
        };
        im.src = e.target.result;
    };
    r.readAsDataURL(file);
};

function draw() {
    if (!ok || !wImg) return;
    let w = parseInt(document.getElementById('wInp').value) || wImg.width;
    let h = parseInt(document.getElementById('hInp').value) || wImg.height;
    let cw = (rot % 180 !== 0) ? h : w, ch = (rot % 180 !== 0) ? w : h;
    let fs = frm ? Math.round(Math.min(cw, ch) * 0.04) : 0;
    c.width = cw + fs * 2; c.height = ch + fs * 2;
    x.clearRect(0, 0, c.width, c.height);
    x.save();
    x.translate(c.width / 2, c.height / 2);
    x.rotate((rot * Math.PI) / 180);
    x.scale(fh, fv);
    x.drawImage(wImg, -w / 2, -h / 2, w, h);
    x.restore();

    let id = x.getImageData(0, 0, c.width, c.height), d = id.data;
    let tol = parseInt(document.getElementById('tolInp').value) * 2.5;
    let br = parseInt(document.getElementById('brInp').value) * 2.55;
    let ct = parseInt(document.getElementById('ctInp').value);
    let fac = (259 * (ct + 255)) / (255 * (259 - ct));
    let r0 = d.at(0), g0 = d.at(1), b0 = d.at(2);

    for (let i = 0; i < d.length; i += 4) {
        let r = d.at(i), g = d.at(i + 1), b = d.at(i + 2);
        if (nBg && (Math.abs(r - r0) + Math.abs(g - g0) + Math.abs(b - b0) < tol)) {
            Reflect.set(d, i + 3, 0); continue;
        }
        r = fac * (r - 128) + 128 + br; g = fac * (g - 128) + 128 + br; b = fac * (b - 128) + 128 + br;
        if (fl === 'bw') r = g = b = 0.299 * r + 0.587 * g + 0.114 * b;
        else if (fl === 'sepia') { let tr = 0.393*r+0.769*g+0.189*b, tg = 0.349*r+0.686*g+0.168*b, tb = 0.272*r+0.534*g+0.131*b; r=tr; g=tg; b=tb; }
        else if (fl === 'invert') { r = 255 - r; g = 255 - g; b = 255 - b; }
        else if (fl === 'warm') { r += 25; g += 8; b -= 20; }
        Reflect.set(d, i, Math.min(255, Math.max(0, r)));
        Reflect.set(d, i + 1, Math.min(255, Math.max(0, g)));
        Reflect.set(d, i + 2, Math.min(255, Math.max(0, b)));
    }
    x.putImageData(id, 0, 0);

    if (bgC || frm) {
        x.globalCompositeOperation = 'destination-over';
        x.fillStyle = bgC || '#ffffff';
        x.fillRect(0, 0, c.width, c.height);
        x.globalCompositeOperation = 'source-over';
    }
    const tx = document.getElementById('wmInp').value.trim();
    if (tx) {
        const fz = Math.max(18, Math.round(c.width * 0.045));
        x.font = 'bold ' + fz + 'px sans-serif'; x.fillStyle = document.getElementById('wmCol').value;
        const p = document.getElementById('wmPos').value;
        if (p === 'br') { x.textAlign = 'right'; x.fillText(tx, c.width - 20, c.height - 20); }
        else if (p === 'bl') { x.textAlign = 'left'; x.fillText(tx, 20, c.height - 20); }
        else if (p === 'tr') { x.textAlign = 'right'; x.fillText(tx, c.width - 20, fz + 15); }
        else { x.textAlign = 'center'; x.fillText(tx, c.width / 2, c.height / 2); }
    }
    const fmt = document.getElementById('fmtSel').value, q = parseInt(document.getElementById('qInp').value) / 100;
    const kb = Math.max(1, Math.round((c.toDataURL(fmt, q).length * 3) / 4 / 1024));
    document.getElementById('infoBar').textContent = c.width + ' × ' + c.height + ' px | ' + kb + ' KB';
}

function goSec(id) { document.getElementById(id).scrollIntoView({ behavior: 'smooth' }); }
function remBg() { if (!ok) return; nBg = !nBg; if (nBg) document.getElementById('fmtSel').value = 'image/png'; draw(); }
function setBg() { if (!ok) return; bgC = document.getElementById('bgColInp').value; draw(); }
function togFrm() { if (!ok) return; frm = !frm; if (!bgC) bgC = '#ffffff'; draw(); }
function rotImg() { if (!ok) return; rot = (rot + 90) % 360; draw(); }
function flpH() { if (!ok) return; fh *= -1; draw(); }
function flpV() { if (!ok) return; fv *= -1; draw(); }
function flt(t) { if (!ok) return; fl = (fl === t) ? 'none' : t; draw(); }
function autoEnh() { if (!ok) return; document.getElementById('brInp').value = 12; document.getElementById('ctInp').value = 20; document.getElementById('brTxt').textContent = 12; document.getElementById('ctTxt').textContent = 20; draw(); }
function pre(w, h) { if (!ok) return; document.getElementById('lockInp').checked = false; document.getElementById('wInp').value = w; document.getElementById('hInp').value = h; draw(); }
function rstImg() { if (!ok) return; wImg = oImg; rat = oImg.width / oImg.height; document.getElementById('wInp').value = oImg.width; document.getElementById('hInp').value = oImg.height; bgC = null; frm = false; rot = 0; fh = 1; fv = 1; fl = 'none'; nBg = false; draw(); }

function crp(rw, rh) {
    if (!ok) return;
    const tr = rw / rh; let sw = wImg.width, sh = wImg.height, cw = sw, ch = sh;
    if (sw / sh > tr) cw = Math.round(sh * tr); else ch = Math.round(sw / tr);
    const t = document.createElement('canvas'); t.width = cw; t.height = ch;
    t.getContext('2d').drawImage(wImg, Math.round((sw - cw) / 2), Math.round((sh - ch) / 2), cw, ch, 0, 0, cw, ch);
    const im = new Image(); im.onload = function() { wImg = im; rat = cw / ch; document.getElementById('wInp').value = cw; document.getElementById('hInp').value = ch; rot = 0; draw(); };
    im.src = t.toDataURL('image/png');
}

function dlImg() {
    if (!ok) return alert("Select an image first!");
    const box = document.getElementById('adBox'), txt = document.getElementById('adSec'), btn = document.getElementById('adBtn');
    let s = 15;
    box.style.display = 'flex';
    btn.disabled = true;
    btn.style.background = '#475569';
    btn.style.cursor = 'not-allowed';
    txt.textContent = '⏳ Please wait ' + s + 's...';
    btn.textContent = 'Wait ' + s + 's...';
    btn.onclick = null;

    if (tm) clearInterval(tm);
    tm = setInterval(function() {
        s--;
        if (s > 0) {
            txt.textContent = '⏳ Please wait ' + s + 's...';
            btn.textContent = 'Wait ' + s + 's...';
        } else {
            clearInterval(tm);
            txt.textContent = '✅ Ready to Save!';
            btn.disabled = false;
            btn.style.background = '#10b981';
            btn.style.cursor = 'pointer';
            btn.textContent = '⬇️ Save Image Now';
            btn.onclick = function() {
                saveFile();
                box.style.display = 'none';
            };
        }
    }, 1000);
}

function saveFile() {
    const fmt = document.getElementById('fmtSel').value;
    const q = parseInt(document.getElementById('qInp').value) / 100;
    const ext = fmt === 'image/png' ? 'png' : (fmt === 'image/webp' ? 'webp' : 'jpg');
    const filename = 'PixelForge_' + Date.now() + '.' + ext;

    const exp = document.createElement('canvas');
    exp.width = c.width;
    exp.height = c.height;
    const ec = exp.getContext('2d');
    if (fmt === 'image/jpeg') {
        ec.fillStyle = '#ffffff';
        ec.fillRect(0, 0, exp.width, exp.height);
    }
    ec.drawImage(c, 0, 0);

    exp.toBlob(function(blob) {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 3000);
    }, fmt, q);
}

document.getElementById('tolInp').oninput = function() { document.getElementById('tolTxt').textContent = this.value; if (nBg) draw(); };
document.getElementById('brInp').oninput = function() { document.getElementById('brTxt').textContent = this.value; draw(); };
document.getElementById('ctInp').oninput = function() { document.getElementById('ctTxt').textContent = this.value; draw(); };
document.getElementById('qInp').oninput = function() { document.getElementById('qTxt').textContent = this.value + '%'; draw(); };
document.getElementById('fmtSel').onchange = draw;
document.getElementById('watermarkInput').oninput = draw;
document.getElementById('wmCol').oninput = draw;
document.getElementById('wmPos').onchange = draw;
document.getElementById('wInp').oninput = function() { if (ok && document.getElementById('lockInp').checked) document.getElementById('hInp').value = Math.round(parseInt(this.value) / rat); draw(); };
document.getElementById('hInp').oninput = function() { if (ok && document.getElementById('lockInp').checked) document.getElementById('wInp').value = Math.round(parseInt(this.value) * rat); draw(); };
