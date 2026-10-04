// Example-record tabs
(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function select(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { select(tab); });
    tab.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      select(next);
      next.focus();
    });
  });
})();

// Dotted globe drawn from the land mask in globe-data.js
(function () {
  var canvas = document.getElementById('globe');
  var land = window.CFG_LAND;
  if (!canvas || !land || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  // Unpack the mask into unit vectors, thinning columns toward the poles so dot density stays even.
  var pts = [];
  for (var y = 0; y < land.h; y++) {
    var lat = (90 - (y + 0.5) * 180 / land.h) * Math.PI / 180;
    var stride = Math.max(1, Math.round(1 / Math.cos(lat)));
    for (var x = 0; x < land.w; x += stride) {
      var i = y * land.w + x;
      if (!((parseInt(land.hex[i >> 2], 16) >> (3 - (i & 3))) & 1)) continue;
      var lon = (-180 + (x + 0.5) * 360 / land.w) * Math.PI / 180;
      pts.push([Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)]);
    }
  }
  // A fixed handful of dots drawn brighter, standing in for flagged repos.
  var marked = {};
  for (var m = 17; m < pts.length; m += Math.floor(pts.length / 16)) marked[m] = true;

  var tilt = 0.32, ct = Math.cos(tilt), st = Math.sin(tilt);
  var size = 0, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = Math.round(canvas.clientWidth * dpr);
    canvas.width = canvas.height = size;
  }

  function draw(angle) {
    var c = size / 2, r = size * 0.46;
    var ca = Math.cos(angle), sa = Math.sin(angle);
    ctx.clearRect(0, 0, size, size);

    var glow = ctx.createRadialGradient(c - r * 0.3, c - r * 0.3, r * 0.1, c, c, r * 1.08);
    glow.addColorStop(0, 'rgba(108, 60, 233, 0.30)');
    glow.addColorStop(0.75, 'rgba(108, 60, 233, 0.07)');
    glow.addColorStop(1, 'rgba(108, 60, 233, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(c, c, r * 1.08, 0, Math.PI * 2); ctx.fill();

    var d = Math.max(1.5, size / 250);
    var bright = [];
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var x = p[0] * ca + p[2] * sa;
      var z0 = -p[0] * sa + p[2] * ca;
      var yy = p[1] * ct - z0 * st;
      var z = p[1] * st + z0 * ct;
      if (z <= 0) continue;
      var px = c + x * r, py = c - yy * r;
      if (marked[i]) { bright.push(px, py, z); continue; }
      ctx.fillStyle = 'rgba(139, 104, 255, ' + (0.35 + 0.65 * z).toFixed(2) + ')';
      ctx.fillRect(px - d / 2, py - d / 2, d, d);
    }
    for (var b = 0; b < bright.length; b += 3) {
      ctx.fillStyle = 'rgba(190, 168, 255, ' + (0.25 * bright[b + 2]).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(bright[b], bright[b + 1], d * 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(240, 234, 255, ' + (0.4 + 0.6 * bright[b + 2]).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(bright[b], bright[b + 1], d * 1.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  var start = 1.4; // opens on the Atlantic
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  resize();
  draw(start);
  window.addEventListener('resize', function () { resize(); if (still) draw(start); });
  if (still) return;

  (function frame(t) {
    if (!document.hidden) draw(start + t / 22000);
    requestAnimationFrame(frame);
  })(0);
})();
