// Ember rig: the layered SVG mascot (idle loop, wave, moods, celebration).
// emberRigSvg(uid, label) returns the SVG markup as TEXT; createEmberRig() in ember.js turns it into an element.
// uid must be unique per svg on the page (it prefixes the gradient ids).
// Coordinates are in the design PNG space (viewBox 250 60 870 1100). Only transform and opacity animate (see main.css).
  /* One idle eye, drawn in the design PNG's own axes (origin = socket centre, so each eye group carries
     translate + rotate(9) to cancel the face tilt). side: 1 = left eye, -1 = right eye.
     o: x,y = socket centre in face space; rx,ry = socket radii; ix,iy = iris offset; hx,hy,hrx,hry = main highlight;
     px,py,prx,pry = soft reflection patch; sx,sy,sr = tiny spark; a0,a1 = lid arc start/end angles (deg). */
  function eyeMarkup(u, side, o) {
    function pt(t, rx, ry) { var a = t * Math.PI / 180; return (rx * Math.cos(a)).toFixed(1) + ' ' + (-ry * Math.sin(a)).toFixed(1); }
    var n = side > 0 ? 'l' : 'r';
    var lrx = o.rx + 5, lry = o.ry + 5;
    var lid = 'M' + pt(o.a0, lrx, lry) + 'A' + lrx + ' ' + lry + ' 0 0 1 ' + pt(o.a1, lrx, lry);
    return '' +
'<g transform="translate(' + o.x + ' ' + o.y + ') rotate(9)">' +
'<g class="ember-rig__eye ember-rig__eye--' + n + '">' +
'<path class="ember-rig__lid" d="' + lid + '" fill="none" stroke="url(#' + u + 'lid' + n + ')" stroke-width="11" stroke-linecap="round"/>' +
'<ellipse rx="' + o.rx + '" ry="' + o.ry + '" fill="url(#' + u + 'sock)"/>' +
'<ellipse cx="' + o.px + '" cy="' + o.py + '" rx="' + o.prx + '" ry="' + o.pry + '" fill="#fff4c4" opacity=".8"/>' +
'<circle cx="' + o.sx + '" cy="' + o.sy + '" r="' + o.sr + '" fill="#fff" opacity=".6"/>' +
'<clipPath id="' + u + 'clip' + n + '"><ellipse rx="' + (o.rx + 8) + '" ry="' + (o.ry + 8) + '"/></clipPath>' +
'<g clip-path="url(#' + u + 'clip' + n + ')"><g class="ember-rig__iris">' +
'<ellipse cx="' + o.ix + '" cy="' + o.iy + '" rx="52" ry="68" fill="url(#' + u + 'iris)"/>' +
'<ellipse cx="' + o.ix + '" cy="' + o.iy + '" rx="52" ry="68" fill="url(#' + u + 'irisglow)"/>' +
'</g></g>' +
'<g class="ember-rig__iris"><ellipse cx="' + o.hx + '" cy="' + o.hy + '" rx="' + o.hrx + '" ry="' + o.hry + '" fill="#fff" transform="rotate(-12 ' + o.hx + ' ' + o.hy + ')"/></g>' +
'</g>' +
'<path class="ember-rig__shut" d="M-62 12Q0 38 62 12" fill="none" stroke="' + INK + '" stroke-width="12" stroke-linecap="round"/>' +
'</g>';
  }
  var INK = '#3a0a02';

  var EYE_L = { x: -167.3, y: -17.4, rx: 87, ry: 84, ix: 32.5, iy: 3, hx: -6.5, hy: -26.5, hrx: 19.5, hry: 20,
                px: -3, py: -34, prx: 50, pry: 45, sx: -51, sy: 20, sr: 4, a0: 200, a1: 28 };
  var EYE_R = { x: 154.9, y: 6.3, rx: 87, ry: 86, ix: -40, iy: 10, hx: -69, hy: -21, hrx: 20, hry: 23,
                px: -12, py: -42, prx: 56, pry: 45, sx: 53, sy: 16, sr: 5, a0: 160, a1: -8 };
  function emberRigSvg (uid, label) {
    var u = 'em' + uid + '-';
    var ink = '#3a0a02';
    return '' +
'<svg class="ember-rig" viewBox="250 60 870 1100" role="img" aria-label="' + (label || 'Ember') + '" focusable="false">' +
'<defs>' +
'<radialGradient id="' + u + 'out" cx=".5" cy=".62" r=".62"><stop offset="0" stop-color="#fd7b45"/><stop offset=".55" stop-color="#fb5535"/><stop offset="1" stop-color="#fb3a2f"/></radialGradient>' +
'<linearGradient id="' + u + 'in" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdd22a"/><stop offset=".45" stop-color="#fcc017"/><stop offset="1" stop-color="#fa9a10"/></linearGradient>' +
'<radialGradient id="' + u + 'rim" cx=".5" cy=".5" r=".58"><stop offset=".62" stop-color="#f98a10" stop-opacity="0"/><stop offset="1" stop-color="#f9830f" stop-opacity=".85"/></radialGradient>' +
'<radialGradient id="' + u + 'belly" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#fffef6"/><stop offset=".7" stop-color="#fcf3c4"/><stop offset="1" stop-color="#fbe89a"/></radialGradient>' +
'<radialGradient id="' + u + 'bglow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6c0" stop-opacity=".75"/><stop offset="1" stop-color="#fff6c0" stop-opacity="0"/></radialGradient>' +
'<radialGradient id="' + u + 'halo" cx=".5" cy=".5" r=".5"><stop offset=".45" stop-color="#ffaa14" stop-opacity=".5"/><stop offset="1" stop-color="#ff9600" stop-opacity="0"/></radialGradient>' +
'<linearGradient id="' + u + 'hand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde135"/><stop offset="1" stop-color="#f98d10"/></linearGradient>' +
'<linearGradient id="' + u + 'foot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fcb21a"/><stop offset="1" stop-color="#fb6a1c"/></linearGradient>' +
'<radialGradient id="' + u + 'sock" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#fefa92"/><stop offset="1" stop-color="#fdf47c"/></radialGradient>' +
'<linearGradient id="' + u + 'iris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4e0b09"/><stop offset=".6" stop-color="#5a0d02"/><stop offset=".85" stop-color="#6a1604"/><stop offset="1" stop-color="#8a2a04"/></linearGradient>' +
'<radialGradient id="' + u + 'irisglow" cx=".5" cy="1.04" r=".38"><stop offset="0" stop-color="#f58a0c" stop-opacity=".95"/><stop offset=".6" stop-color="#f26a06" stop-opacity=".3"/><stop offset="1" stop-color="#f26a06" stop-opacity="0"/></radialGradient>' +
'<linearGradient id="' + u + 'lidl" x1="0" y1=".75" x2="1" y2=".1"><stop offset="0" stop-color="#fe9106"/><stop offset=".4" stop-color="#f45204"/><stop offset=".75" stop-color="#ca3601"/><stop offset="1" stop-color="#a8240a"/></linearGradient>' +
'<linearGradient id="' + u + 'lidr" x1="1" y1=".75" x2="0" y2=".1"><stop offset="0" stop-color="#fd9102"/><stop offset=".4" stop-color="#f0500a"/><stop offset=".75" stop-color="#c03003"/><stop offset="1" stop-color="#a11b04"/></linearGradient>' +
'<linearGradient id="' + u + 'thumb" gradientUnits="userSpaceOnUse" x1="0" y1="715" x2="0" y2="905"><stop offset="0" stop-color="#fde135"/><stop offset="1" stop-color="#f98d10"/></linearGradient>' +
'</defs>' +

/* floor shadow (shrinks while Ember floats up) */
'<ellipse class="ember-rig__shadow" cx="690" cy="1128" rx="230" ry="22" fill="#000" opacity=".22"/>' +

'<g class="ember-rig__float"><g class="ember-rig__act"><rect class="ember-rig__anchor" x="165" y="60" width="1040" height="1100" fill="none"/><g class="ember-rig__breathe">' +

/* halo, shown only when lit */
'<ellipse class="ember-rig__halo" cx="685" cy="620" rx="520" ry="540" fill="url(#' + u + 'halo)"/>' +

/* feet */
'<g class="ember-rig__feet">' +
'<path class="ember-rig__foot--l" d="M425 1040C430 1015 470 1010 520 1022C570 1035 590 1070 560 1092C530 1110 470 1112 440 1090C425 1076 422 1056 425 1040Z" fill="url(#' + u + 'foot)" stroke="#e0361e" stroke-width="4" stroke-linejoin="round"/>' +
'<g transform="translate(1372 0) scale(-1 1)"><path d="M425 1040C430 1015 470 1010 520 1022C570 1035 590 1070 560 1092C530 1110 470 1112 440 1090C425 1076 422 1056 425 1040Z" fill="url(#' + u + 'foot)" stroke="#e0361e" stroke-width="4" stroke-linejoin="round"/></g>' +
'</g>' +

/* body: outer flame, inner gold body, rim, gloss */
'<g class="ember-rig__body">' +
'<path d="M645 84C672 84 692 100 712 126C745 168 790 205 850 265C930 342 1010 420 1060 520C1098 596 1112 680 1104 770C1092 880 1030 960 940 1018C880 1056 800 1080 700 1080C600 1080 500 1075 420 1040C350 1008 295 940 270 850C250 770 256 690 280 620C300 565 310 520 303 470C298 430 288 395 288 350C288 318 310 296 345 296C385 298 425 318 460 337C495 285 530 235 560 175C585 130 610 84 645 84Z" fill="url(#' + u + 'out)" stroke="#e3262b" stroke-width="5" stroke-linejoin="round"/>' +
'<path id="' + u + 'inner" d="M385 420C405 408 440 410 470 425C490 435 505 438 520 428C560 400 600 330 630 255C645 225 675 220 705 238C770 280 850 350 920 430C985 505 1020 590 1030 690C1038 790 1000 890 930 965C870 1025 790 1050 700 1050C610 1050 520 1040 450 1000C385 962 340 890 325 800C312 725 335 650 365 600C380 570 376 520 375 470C374 445 376 428 385 420Z" fill="url(#' + u + 'in)"/>' +
'<path d="M385 420C405 408 440 410 470 425C490 435 505 438 520 428C560 400 600 330 630 255C645 225 675 220 705 238C770 280 850 350 920 430C985 505 1020 590 1030 690C1038 790 1000 890 930 965C870 1025 790 1050 700 1050C610 1050 520 1040 450 1000C385 962 340 890 325 800C312 725 335 650 365 600C380 570 376 520 375 470C374 445 376 428 385 420Z" fill="url(#' + u + 'rim)"/>' +
'<ellipse cx="690" cy="985" rx="230" ry="62" fill="#f98a14" opacity=".3"/>' +
/* gloss */
'<path d="M410 455C440 440 480 455 520 455C560 440 600 385 640 365C665 360 675 380 655 410C630 450 580 480 520 480C470 495 430 520 405 540Z" fill="#fde37a" opacity=".55"/>' +
'<path d="M668 272C690 268 735 305 775 372C760 378 740 368 715 340C690 315 668 292 668 272Z" fill="#fff3b0" opacity=".9"/>' +
'<ellipse cx="845" cy="427" rx="22" ry="10" transform="rotate(40 845 427)" fill="#fff3b0" opacity=".9"/>' +
'<ellipse cx="442" cy="482" rx="26" ry="17" transform="rotate(-20 442 482)" fill="#fff2b8" opacity=".85"/>' +
'</g>' +

/* belly glow */
'<g class="ember-rig__belly">' +
'<ellipse cx="690" cy="935" rx="230" ry="170" fill="url(#' + u + 'bglow)"/>' +
'<path d="M690 770C710 775 740 830 785 880C815 915 825 950 815 985C805 1020 760 1042 690 1042C620 1042 575 1020 565 985C555 950 568 915 598 880C640 830 668 775 690 770Z" fill="url(#' + u + 'belly)"/>' +
'</g>' +

/* face (tilted a little, like the design) */
'<g class="ember-rig__head"><g class="ember-rig__face" transform="translate(684 598) rotate(-9)">' +
/* eyes: open (idle, blinks). Built from the idle design PNG: pale socket, orange lid, big dark iris, glossy highlights */
'<g class="ember-rig__eyes-open idle-only">' +
eyeMarkup(u, 1, EYE_L) +
eyeMarkup(u, -1, EYE_R) +
'</g>' +
/* blush */
'<g class="ember-rig__blush">' +
'<ellipse cx="-222" cy="80" rx="52" ry="33" fill="#fb6540" opacity=".8"/>' +
'<path d="M-246 98L-222 66M-226 100L-202 68M-206 100L-190 76" stroke="#e8502e" stroke-width="3" stroke-linecap="round" opacity=".45" fill="none"/>' +
'<g transform="scale(-1 1)"><ellipse cx="-222" cy="80" rx="52" ry="33" fill="#fb6540" opacity=".8"/>' +
'<path d="M-246 98L-222 66M-226 100L-202 68M-206 100L-190 76" stroke="#e8502e" stroke-width="3" stroke-linecap="round" opacity=".45" fill="none"/></g>' +
'</g>' +
/* eyes: happy arcs (used by the cheer / reference pose) */
'<g class="ember-rig__eyes-happy face-happy" fill="none" stroke="' + ink + '" stroke-width="17" stroke-linecap="round">' +
'<path d="M-236 22Q-166 -50 -96 14"/><path d="M96 14Q166 -50 236 22"/>' +
'</g>' +
/* mouth: small smile (idle) and open (cheer) */
'<path class="idle-only idle-smile" d="M-38 84Q0 118 38 84" fill="none" stroke="' + ink + '" stroke-width="12" stroke-linecap="round"/>' +
/* mouths for the moods (E3): small pursed squiggle (not solved today), small round 'o' (no history yet) */
'<path class="mood-wait" d="M-27 98Q-13.5 87 0 98T27 98" fill="none" stroke="' + ink + '" stroke-width="11" stroke-linecap="round"/>' +
'<ellipse class="mood-new" cx="0" cy="100" rx="15" ry="19" fill="' + ink + '"/>' +
'<g class="mood-happy"><path d="M-54 84C-42 152 42 152 54 84C20 98 -20 98 -54 84Z" fill="' + ink + '" stroke="' + ink + '" stroke-width="6" stroke-linejoin="round"/>' +
'<path d="M-28 130C-14 114 14 114 28 130C16 144 -16 144 -28 130Z" fill="#fb5f5c"/></g>' +
'<g class="ember-rig__mouth-open face-happy">' +
'<path d="M-90 34C-55 22 -22 50 0 46C22 50 55 22 90 34C96 110 58 168 0 168C-58 168 -96 110 -90 34Z" fill="' + ink + '"/>' +
'<path d="M-52 150C-40 112 40 112 52 150C30 170 -30 170 -52 150Z" fill="#fb5f5c"/>' +
'</g>' +
'</g></g>' +

/* hands: mirror (attribute) > pose (css) > motion (css) > shape */
'<g class="ember-rig__hand ember-rig__hand--l"><g class="ember-rig__hand-pose"><g class="ember-rig__hand-move">' +
'<path d="M338 768C358 744 410 738 444 770C466 790 472 822 458 846C446 862 424 860 410 866C396 892 372 922 344 912C312 898 306 850 312 810C314 790 324 778 338 768Z" fill="url(#' + u + 'hand)" stroke="#e0361e" stroke-width="4" stroke-linejoin="round"/>' +
'<ellipse cx="362" cy="790" rx="26" ry="11" transform="rotate(-30 362 790)" fill="#fff7c2" opacity=".9"/><circle cx="338" cy="808" r="5" fill="#fff7c2" opacity=".8"/>' +
'</g></g></g>' +
'<g transform="translate(1370 0) scale(-1 1)"><g class="ember-rig__hand ember-rig__hand--r"><g class="ember-rig__hand-pose"><g class="ember-rig__hand-move">' +
'<path d="M338 768C358 744 410 738 444 770C466 790 472 822 458 846C446 862 424 860 410 866C396 892 372 922 344 912C312 898 306 850 312 810C314 790 324 778 338 768Z" fill="url(#' + u + 'hand)" stroke="#e0361e" stroke-width="4" stroke-linejoin="round"/>' +
'<ellipse cx="362" cy="790" rx="26" ry="11" transform="rotate(-30 362 790)" fill="#fff7c2" opacity=".9"/><circle cx="338" cy="808" r="5" fill="#fff7c2" opacity=".8"/>' +
'</g></g></g></g>' +

/* thumbs-up hand and spark burst (cheer only, E4): outline pass first so thumb + fist read as one shape */
'<g class="ember-rig__thumb cheer-only"><g transform="translate(985 850) scale(1.2) translate(-985 -850)">' +
'<g fill="#e0361e" stroke="#e0361e" stroke-width="8" stroke-linejoin="round"><path d="M944 815C938 770 940 735 958 722C978 710 1002 724 1002 750C1004 775 1004 800 1000 818Z"/><ellipse cx="985" cy="842" rx="66" ry="58" transform="rotate(8 985 842)"/></g>' +
'<g fill="url(#' + u + 'thumb)"><path d="M944 815C938 770 940 735 958 722C978 710 1002 724 1002 750C1004 775 1004 800 1000 818Z"/><ellipse cx="985" cy="842" rx="66" ry="58" transform="rotate(8 985 842)"/></g>' +
'<path d="M1000 808Q1022 812 1034 828M996 836Q1018 842 1030 858M988 864Q1008 870 1018 884" fill="none" stroke="#e8801e" stroke-width="5" stroke-linecap="round" opacity=".75"/>' +
'<ellipse cx="962" cy="748" rx="9" ry="19" transform="rotate(-8 962 748)" fill="#fff7c2" opacity=".9"/><ellipse cx="955" cy="824" rx="20" ry="9" transform="rotate(-30 955 824)" fill="#fff7c2" opacity=".9"/>' +
'</g></g>' +
'<g class="ember-rig__burst cheer-only" fill="none" stroke="#fdc22a" stroke-width="14" stroke-linecap="round">' +
'<path d="M900 160L925 122M1010 270L1048 250M1075 395L1115 388M276 520L240 530M270 640L232 652M330 160L304 124"/>' +
'<g fill="#ffe066" stroke="none"><circle cx="840" cy="100" r="9"/><circle cx="1050" cy="200" r="8"/><circle cx="1112" cy="470" r="9"/><circle cx="250" cy="580" r="8"/><circle cx="560" cy="86" r="8"/></g>' +
'</g>' +

/* sparks (cheer only) */
'<g class="ember-rig__sparks ref-only" stroke-linecap="round">' +
'<line x1="410" y1="92" x2="443" y2="178" stroke="#f0b81a" stroke-width="38"/><line x1="410" y1="92" x2="443" y2="178" stroke="#fde24a" stroke-width="28"/>' +
'<line x1="366" y1="222" x2="404" y2="254" stroke="#f0b81a" stroke-width="32"/><line x1="366" y1="222" x2="404" y2="254" stroke="#fde24a" stroke-width="22"/>' +
'</g>' +

/* wave extras: pop sparks + motion arcs (wave only) */
'<g class="ember-rig__pop wave-only" fill="none" stroke="#fdc22a" stroke-width="14" stroke-linecap="round">' +
'<path d="M330 200L352 232M392 160L405 198M292 262L325 282M1000 190L1015 208M1050 262L1090 240"/>' +
'</g>' +
'<g class="ember-rig__arcs wave-only" fill="none" stroke="#fdc22a" stroke-width="12" stroke-linecap="round">' +
'<path d="M1086 540Q1102 562 1086 584"/><path d="M1106 518Q1130 562 1106 606"/><path d="M1126 496Q1158 562 1126 628"/>' +
'</g>' +

'</g></g></g></svg>';
  }

  /* Mood of the idle face: 'wait' (not solved today), 'new' (no history yet), 'happy' (calm lit idle after the daily goal) or null/'' (normal). */
  function emberRigMood (svg, mood) {
    if (!svg) return;
    svg.classList.remove('is-mood-wait', 'is-mood-new', 'is-mood-happy');
    if (mood === 'wait' || mood === 'new' || mood === 'happy') svg.classList.add('is-mood-' + mood);
  }

  /* Plays the one-shot celebration (daily goal completed), then settles into the calm 'happy' mood.
     Reduced motion: no animation, goes straight to the calm happy face. */
  function emberRigCheer (svg) {
    if (!svg || svg.classList.contains('is-cheer')) return;
    emberRigMood(svg, null);
    if (globalThis.matchMedia && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) { emberRigMood(svg, 'happy'); return; }
    var act = svg.querySelector('.ember-rig__act'), done = false;
    function end() { if (done) return; done = true; svg.classList.remove('is-cheer'); act.removeEventListener('animationend', onEnd); emberRigMood(svg, 'happy'); }
    function onEnd(e) { if (e.target === act && e.animationName === 'ember-cheer-act') end(); }
    act.addEventListener('animationend', onEnd);
    svg.classList.remove('is-wave');
    svg.classList.add('is-cheer');
    var t1 = setTimeout(end, 4600); if (t1 && t1.unref) t1.unref();
  }

  /* Plays the one-shot wave (app open). Removes itself when done; skipped for reduced motion. */
  function emberRigWave (svg) {
    if (!svg || svg.classList.contains('is-wave')) return;
    if (globalThis.matchMedia && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var act = svg.querySelector('.ember-rig__act'), done = false;
    function end() { if (done) return; done = true; svg.classList.remove('is-wave'); act.removeEventListener('animationend', onEnd); }
    function onEnd(e) { if (e.target === act && e.animationName === 'ember-wave-act') end(); }
    act.addEventListener('animationend', onEnd);
    svg.classList.add('is-wave');
    var t2 = setTimeout(end, 4200); if (t2 && t2.unref) t2.unref();
  }

export { emberRigSvg, emberRigMood, emberRigCheer, emberRigWave };
