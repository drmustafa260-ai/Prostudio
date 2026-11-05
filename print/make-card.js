const QR = require('qrcode');
const fs = require('fs');
const { chromium } = require('playwright');
const OUT = '/home/user/Prostudio/print';
const SCR = process.argv[2];

(async () => {
  const qrSvg = await QR.toString('https://wa.me/9647738223911', { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#3b2716', light: '#00000000' } });

  const css = `
  @page { margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --green:#778A3F; --brown:#6E4B2C; --orange:#F16619; --cream:#F7EFE4; --ink:#3b2716; --deep:#4a3220; }
  html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: "Cairo", sans-serif; }
  .card { position: relative; overflow: hidden; direction: rtl; }
  .logo { direction: ltr; display: flex; align-items: center; gap: 2.2mm; }
  .mark { width: 9mm; height: 9mm; border-radius: 2.4mm; background: var(--orange); display: grid; place-items: center; }
  .mark svg { width: 4.2mm; fill: var(--cream); margin-left: .6mm; }
  .word { font-weight: 900; font-size: 7.4mm; letter-spacing: -.1mm; color: var(--cream); line-height: 1; }
  .word b { color: var(--orange); }

  /* FRONT */
  .front { background: radial-gradient(circle at 80% 15%, #8a5f39 0%, var(--brown) 45%, var(--deep) 100%); }
  .front .center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3mm; padding-bottom: 6mm; }
  .front .tag { color: var(--cream); font-weight: 700; font-size: 3.3mm; }
  .front .tag span { color: var(--orange); }
  .front .sub { color: #e4cfb5; font-size: 2.35mm; font-weight: 600; letter-spacing: .1mm; }
  .front .ecg { position: absolute; left: 0; right: 0; height: 9mm; }
  .front .bars { position: absolute; left: 0; right: 0; bottom: 0; display: flex; }
  .front .bars i { flex: 1; }

  /* BACK */
  .back { background: var(--cream); color: var(--ink); }
  .back .bars { position: absolute; top: 0; bottom: 0; display: flex; flex-direction: column; }
  .back .bars i { flex: 1; }
  .back .main { position: absolute; display: flex; justify-content: space-between; align-items: center; gap: 4mm; }
  .back .info { display: flex; flex-direction: column; gap: 1.9mm; min-width: 0; }
  .back .name { font-size: 6.6mm; font-weight: 900; line-height: 1.1; color: var(--brown); }
  .back .role { font-size: 2.7mm; font-weight: 700; color: var(--orange); }
  .back hr { border: 0; height: .35mm; width: 14mm; background: var(--green); margin: .8mm 0; }
  .row { display: flex; align-items: center; gap: 1.2mm; }
  .row > div { margin-right: .8mm; }
  .ic { width: 5.2mm; height: 5.2mm; border-radius: 50%; display: grid; place-items: center; flex: none; }
  .ic svg { width: 2.9mm; height: 2.9mm; fill: var(--cream); }
  .phone { direction: ltr; font-size: 4.7mm; font-weight: 800; color: var(--ink); letter-spacing: .15mm; line-height: 1; }
  .lbl { font-size: 2.1mm; color: #7a6450; font-weight: 600; line-height: 1.2; }
  .svc { font-size: 2.15mm; font-weight: 600; color: var(--ink); line-height: 1.5; }
  .svc b { color: var(--green); font-weight: 900; }
  .qrbox { display: flex; flex-direction: column; align-items: center; gap: 1mm; flex: none; }
  .qr { width: 17mm; height: 17mm; padding: 1.2mm; background: #fff; border-radius: 1.6mm; border: .35mm solid var(--green); }
  .qr svg { width: 100%; height: 100%; display: block; }
  .qrcap { font-size: 1.85mm; font-weight: 700; color: var(--brown); text-align: center; line-height: 1.25; }
  `;

  const play = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  const phoneIc = '<svg viewBox="0 0 24 24"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/></svg>';
  const waIc = '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .3-3.4-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.5c-.2.2-.3.4-.1.7.2.3.9 1.4 1.9 2.3 1.3 1.1 2.3 1.5 2.7 1.6.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.3.1.2.1.7-.2 1.4z"/></svg>';
  const ecg = (w) => `<svg viewBox="0 0 300 40" preserveAspectRatio="none" style="width:100%;height:100%">
      <path d="M0 22 H95 L103 22 L109 10 L116 34 L124 2 L131 30 L136 22 H300" fill="none" stroke="#F16619" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M0 22 H190 L196 22 L201 14 L207 30 L212 22 H300" fill="none" stroke="#778A3F" stroke-width="1.2" stroke-linejoin="round" opacity=".9"/></svg>`;

  // b = bleed (mm) around a 90x50 trim
  const front = (b) => `
    <div class="card front" style="width:${90 + 2 * b}mm;height:${50 + 2 * b}mm">
      <div class="center">
        <div class="logo"><span class="mark">${play}</span><span class="word">Pro<b>Studio</b></span></div>
        <div class="tag">مونتاج وتصوير <span>الفيديوهات الطبية</span></div>
        <div class="sub">مونتاج احترافي · فريق تصوير يوصل لمكانك</div>
      </div>
      <div class="ecg" style="bottom:${b + 3.2}mm">${ecg()}</div>
      <div class="bars" style="height:${b + 1.6}mm"><i style="background:var(--green)"></i><i style="background:var(--orange)"></i><i style="background:var(--deep)"></i></div>
    </div>`;
  const back = (b) => `
    <div class="card back" style="width:${90 + 2 * b}mm;height:${50 + 2 * b}mm">
      <div class="bars" style="right:0;width:${b + 1.8}mm"><i style="background:var(--green)"></i><i style="background:var(--brown)"></i><i style="background:var(--orange)"></i></div>
      <div class="main" style="top:${b + 5}mm;bottom:${b + 5}mm;right:${b + 7}mm;left:${b + 5}mm">
        <div class="info">
          <div class="name">مصطفى</div>
          <div class="role">مونتير فيديوهات طبية · ProStudio</div>
          <hr>
          <div class="row"><span class="ic" style="background:var(--orange)">${phoneIc}</span><span class="ic" style="background:var(--green)">${waIc}</span>
            <div><div class="phone">0773 822 3911</div><div class="lbl">اتصال مباشر · واتساب</div></div></div>
          <div class="svc"><b>✚</b> مونتاج · تصوير ميداني · ريلز · موشن جرافيك</div>
        </div>
        <div class="qrbox"><div class="qr">${qrSvg}</div><div class="qrcap">امسح الكود<br>وراسلنا واتساب</div></div>
      </div>
    </div>`;

  const head = (extra) => `<!doctype html><html lang="ar"><head><meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&display=swap" rel="stylesheet">
    <style>${css}${extra}</style></head><body>`;

  // 1) Print-shop file: 2 pages, 96x56mm (3mm bleed)
  const B = 3;
  const shop = head(`@page{size:96mm 56mm}.pg{page-break-after:always}`) +
    `<div class="pg">${front(B)}</div><div class="pg">${back(B)}</div></body></html>`;

  // 2) Home print: A4 sheet, 2x5 cards with cut marks; back page mirrored for duplex
  const cols = 2, rows = 5, W = 90, H = 50;
  const mx = (210 - cols * W) / 2, my = (297 - rows * H) / 2;
  const marks = () => {
    let m = '';
    const L = 4, g = 1.5;
    for (let c = 0; c <= cols; c++) {
      const x = mx + c * W;
      m += `<i style="left:${x}mm;top:${my - g - L}mm;width:.2mm;height:${L}mm"></i><i style="left:${x}mm;top:${my + rows * H + g}mm;width:.2mm;height:${L}mm"></i>`;
    }
    for (let r = 0; r <= rows; r++) {
      const y = my + r * H;
      m += `<i style="top:${y}mm;left:${mx - g - L}mm;height:.2mm;width:${L}mm"></i><i style="top:${y}mm;left:${mx + cols * W + g}mm;height:.2mm;width:${L}mm"></i>`;
    }
    return m;
  };
  const sheet = (fn) => {
    let s = '';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
      s += `<div style="position:absolute;left:${mx + c * W}mm;top:${my + r * H}mm">${fn(0)}</div>`;
    return `<div class="a4">${s}${marks()}</div>`;
  };
  const a4 = head(`@page{size:A4}.a4{position:relative;width:210mm;height:297mm;page-break-after:always;background:#fff}.a4>i{position:absolute;background:#000}`) +
    sheet(front) + sheet(back) + '</body></html>';

  fs.writeFileSync(SCR + '/card_shop.html', shop);
  fs.writeFileSync(SCR + '/card_a4.html', a4);

  const br = await chromium.launch();
  const p = await br.newPage();
  await p.goto('file://' + SCR + '/card_shop.html'); await p.waitForTimeout(1500);
  await p.pdf({ path: OUT + '/ProStudio-Business-Card-2pages.pdf', width: '96mm', height: '56mm', printBackground: true });
  await p.goto('file://' + SCR + '/card_a4.html'); await p.waitForTimeout(1500);
  await p.pdf({ path: OUT + '/ProStudio-cards-A4.pdf', format: 'A4', printBackground: true });

  // Preview PNG (trim size, front + back)
  const pv = await br.newPage({ deviceScaleFactor: 4, viewport: { width: 760, height: 460 } });
  await pv.setContent(head(`body{background:#e9e2d8;display:flex;flex-direction:column;gap:8mm;padding:8mm;align-items:center}.card{box-shadow:0 2mm 6mm rgba(0,0,0,.25);border-radius:1.5mm}`) + front(0) + back(0) + '</body></html>');
  await pv.waitForTimeout(1500);
  await pv.screenshot({ path: OUT + '/ProStudio-card-preview.png', fullPage: true });
  await br.close();
  console.log('done');
})();
