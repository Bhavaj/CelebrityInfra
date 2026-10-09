import { GLSL_LAYOUT } from "./layout.js";

/* ---------- shared chunks ---------- */
const NOISE = /* glsl */ `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 x){
  vec2 i = floor(x), f = x - i; vec2 u = f*f*(3.-2.*f);
  float a = hash12(i), b = hash12(i+vec2(1,0)), c = hash12(i+vec2(0,1)), d = hash12(i+vec2(1,1));
  return a + (b-a)*u.x + (c-a)*u.y + (a-b-c+d)*u.x*u.y;
}
float fbm3(vec2 p){ float s = 0., a = .5; for(int i=0;i<3;i++){ s += a*vnoise(p); p = p*2.03 + 17.1; a *= .5; } return s/.875; }
float fbm2(vec2 p){ return (vnoise(p)*.667 + vnoise(p*2.03 + 17.1)*.333); }
`;

const TERRAIN = /* glsl */ `
float terrainH(vec2 p){
  float d = max(abs(p.x), abs(p.y));
  float r = length(p);
  float w = smoothstep(118., 420., d);
  float h = w * ((vnoise(p*0.0035)*2.-1.)*14. + (vnoise(vec2(p.x*0.011+7.3, p.y*0.011))*2.-1.)*3.5);
  float far = smoothstep(900., 3400., r);
  float n = vnoise(vec2(p.x*0.0009+3.1, p.y*0.0009));
  h += far*n*n*300.;
  float road = 1. - smoothstep(4., 26., abs(p.y - (ACC0+ACC1)*.5));
  return h * (1. - road*(1. - smoothstep(300., 700., abs(p.x))));
}
`;

// Atmosphere shared by every material: exp² fog that warms toward the sun (aerial perspective).
const FOG = /* glsl */ `
uniform vec3 uFogCol; uniform vec3 uSunCol; uniform vec3 uSunDir; uniform float uFogDen;
// restrained grade: slight desaturation, gentle S-curve, hue-preserving highlight shoulder
vec3 grade(vec3 c){
  float l = dot(c, vec3(.3,.55,.15));
  c = mix(vec3(l), c, .9);
  c = mix(c, c*c*(3.-2.*min(c, vec3(1.))), .16);
  float mx = max(c.r, max(c.g, c.b));
  if (mx > .85) c *= (.85 + .15*(1. - exp(-(mx - .85)/.15))) / mx;
  return c;
}
vec3 applyFog(vec3 col, vec3 wpos){
  vec3 v = wpos - cameraPosition; float dist = length(v);
  float f = 1. - exp(-pow(dist*uFogDen, 2.));
  // low-lying haze: thickens toward the ground and with distance, so far fields melt into the horizon
  float lowHaze = (1. - exp(-dist*.0011)) * exp(-max(wpos.y, 0.)*.012) * .32;
  f = f + (1. - f) * lowHaze;
  float s = pow(max(dot(v/dist, normalize(vec3(uSunDir.x, 0.05, uSunDir.z))), 0.), 6.);
  vec3 fc = mix(uFogCol, uSunCol*.9, s*.55);
  return grade(mix(col, fc, f));
}
float fogAmt(vec3 wpos){ float dist = length(wpos - cameraPosition); return 1. - exp(-pow(dist*uFogDen, 2.)); }
`;

const LIGHT_UNIFORMS = /* glsl */ `uniform vec3 uSkyCol; uniform vec3 uBounce; uniform float uTime; uniform float uDusk;`;

/* ---------- ground: terrain + the whole site plan drawn analytically ---------- */
export const groundVert = /* glsl */ `
${GLSL_LAYOUT}
${NOISE}
${TERRAIN}
varying vec3 vW; varying vec3 vN;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.);
  float h = terrainH(w.xz);
  float e = 3.;
  float hx = terrainH(w.xz + vec2(e,0.)), hz = terrainH(w.xz + vec2(0.,e));
  vN = normalize(vec3(h - hx, e, h - hz));
  w.y = h;
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const groundFrag = /* glsl */ `
${GLSL_LAYOUT}
${NOISE}
${FOG}
${LIGHT_UNIFORMS}
uniform float uReveal, uHi, uMap, uLamps;
uniform vec4 uHiRect;
varying vec3 vW; varying vec3 vN;

float band(float d, float w, float fw){ return 1. - smoothstep(w - fw, w + fw, d); }

void main(){
  vec2 p = vW.xz;
  vec2 fw2 = fwidth(p); float fw = max(fw2.x, fw2.y);
  float ax = abs(p.x), az = abs(p.y), m = max(ax, az);
  float n1 = vnoise(p*0.35), n2 = vnoise(p*0.045 + 4.);

  // palette (albedo, already warm-graded)
  // lawn: broad colour patches, dry straw-coloured drifts, and blade-scale grain that fades once sub-pixel
  float gBig = fbm3(p*0.021 + 9.), gDry = smoothstep(.52, .82, vnoise(p*0.014 + 31.)), gMid = vnoise(p*1.7 + 3.);
  float bladeFade = 1. - smoothstep(.03, .22, fw);
  float blades = mix(.5, vnoise(p*7.3)*.55 + vnoise(p*21.)*.45, bladeFade);
  vec3 grass  = mix(vec3(.105,.205,.05), vec3(.20,.30,.085), gBig);
  grass = mix(grass, vec3(.30,.285,.13), gDry*.5);
  grass *= (.78 + .22*gMid + .3*blades) * (.9 + .2*n1);
  // red soil: pebbles and clods
  float pebble = mix(.5, hash12(floor(p*9.)), bladeFade * .6);
  vec3 soil   = mix(vec3(.40,.215,.13), vec3(.50,.30,.18), n2) * (.86 + .2*n1 + .12*pebble);
  // asphalt: aggregate speckle, uneven wear
  float agg = mix(.5, hash12(floor(p*26.)), bladeFade);
  vec3 tar    = vec3(.125,.12,.115) * (.88 + .12*n1 + .2*agg) * (.9 + .2*vnoise(p*.21 + 2.));
  vec3 kerb   = vec3(.55,.52,.46);

  vec3 alb; float line = 0.; float lineA = 0.; float plotMask = 0.;
  float wallShade = 1.;

  if (m > SITE + .3) {
    // ---- outside the compound: patchwork of fields, bunds, access road ----
    vec2 q = mat2(.96,-.28,.28,.96) * p;
    vec2 cell = floor(q / vec2(64., 46.));
    vec2 fq = fract(q / vec2(64., 46.));
    float hsh = hash12(cell);
    // mostly paddy and pulses in leaf, the odd field gone gold or freshly turned
    vec3 fc = hsh < .34 ? vec3(.13,.30,.05) : hsh < .6 ? vec3(.18,.34,.07) : hsh < .8 ? vec3(.10,.22,.05) : hsh < .95 ? vec3(.30,.33,.10) : vec3(.36,.24,.14);
    alb = fc * (.85 + .3*vnoise(p*0.02 + hsh*9.));
    // crop rows
    alb *= .94 + .06*sin(dot(q, hsh < .5 ? vec2(1.,0.) : vec2(0.,1.)) * 2.4);
    vec2 bd = min(fq, 1.-fq) * vec2(64., 46.);
    alb = mix(alb, vec3(.09,.17,.05), band(min(bd.x, bd.y), .8, fw*1.5) * .7);
    // distant hills: scrub forest
    float hillF = smoothstep(500., 1600., length(p));
    alb = mix(alb, mix(vec3(.08,.17,.05), vec3(.13,.22,.07), vnoise(p*.004)) * (.8 + .4*vnoise(p*.03)), hillF);
    // access road + approach
    float rd = abs(p.y - (ACC0+ACC1)*.5);
    float approach = step(p.y, ACC0) * step(ax, GATE - .5);
    if (rd < (ACC1-ACC0)*.5 || approach > .5) alb = tar*1.1;
    alb = mix(alb, kerb*.6, band(abs(rd - (ACC1-ACC0)*.5), .25, fw) * step(abs(p.x), 900.));
    alb = mix(alb, grass, smoothstep(0., 2., SITE + 8. - m) * step(rd, 30.) * (1.-approach) * step((ACC1-ACC0)*.5, rd));
    // the wall's shadow falls outside on the east (+x) side
    wallShade = 1. - .45 * step(SITE, p.x) * (1. - smoothstep(0., 14., p.x - SITE)) * step(az, SITE);
  } else if (m > RING_IN) {
    // ---- perimeter road and wall verge ----
    alb = m < RING_OUT ? tar : grass;
    alb = mix(alb, kerb, band(abs(m - RING_OUT), .18, fw) + band(abs(m - RING_IN), .18, fw));
    if (p.y > RING_IN && ax < AVE) alb = tar;                          // gate throat
    // wall shadows inside: west and north walls
    wallShade = 1. - .45 * (1. - smoothstep(0., 14., p.x + SITE)) - .3 * (1. - smoothstep(0., 6., p.y + SITE));
  } else if (ax < AVE) {
    // ---- main avenue with planted median ----
    alb = ax < MED ? grass * 1.05 : tar;
    alb = mix(alb, kerb, band(abs(ax - MED), .16, fw) + band(abs(ax - AVE), .16, fw));
    alb = mix(alb, vec3(.62,.58,.50), band(abs(ax - (MED+AVE)*.5), .06, fw) * step(.5, fract(p.y/6.)) * .5);
    wallShade = 1. - .45 * (1. - smoothstep(0., 14., p.x + SITE));
  } else if (p.y < PARK_Z) {
    // ---- landscaped open space ----
    alb = grass * 1.12;
    float path = band(abs(length(p - vec2(0., (PARK_Z - RING_IN)*.5)) - 14.), .9, fw);
    alb = mix(alb, vec3(.48,.40,.30), path);
  } else {
    float k = floor((Z0 - p.y) / PITCH);
    float local = (Z0 - p.y) - k*PITCH;
    if (k >= 0. && k < NB && local < BLOCK && ax > BX0 && ax < BX1) {
      // ---- a plot ----
      vec2 c = vec2((ax - BX0)/PW, local/PD);
      vec2 id = floor(c);
      float ph = hash12(id + k*13. + step(0., p.x)*71.);
      alb = mix(grass * (1.06 + .16*ph), soil, .12 + .1*vnoise(p*.6));   // levelled, grassed plot
      // soil basin around the plot's mango tree (positions mirror layout.js mangoInPlot)
      vec2 tp = vec2((fract(c.x) - .5) * PW, local - (PD + (id.y < .5 ? -MANGO_BACK : MANGO_BACK)));
      float basin = 1. - smoothstep(1.1, 1.3 + fw, length(tp));
      alb = mix(alb, soil * .62, basin * .85);
      plotMask = 1.;
      vec2 f = fract(c);
      vec2 dm = min(f, 1. - f) * vec2(PW, PD);
      line = band(min(dm.x, dm.y), .09, fw*.9);
      // plot reveal: lines sweep in from the gate
      vec2 pc = vec2((id.x + .5)*PW + BX0, Z0 - k*PITCH - (id.y + .5)*PD);
      float dly = length(vec2(pc.x, pc.y - SITE)) / 230.;
      lineA = smoothstep(dly*.75, dly*.75 + .25, uReveal);
    } else if (k >= 0. && k < NB && local < BLOCK) {
      alb = grass * 1.05;                            // side verges
    } else {
      alb = tar;                                     // cross road
      float e = min(abs(local - BLOCK), abs(local - PITCH));
      alb = mix(alb, kerb, band(e, .16, fw));
    }
    wallShade = 1. - .45 * (1. - smoothstep(0., 14., p.x + SITE));
  }

  // ---- lighting ----
  vec3 N = normalize(vN);
  float sunH = max(uSunDir.y, 0.);
  float ndl = max(dot(N, uSunDir), 0.);
  float cloud = smoothstep(.35, .75, fbm2(p*0.0042 + vec2(uTime*.006, uTime*.0025)));
  float sh = wallShade * (1. - .38*cloud);
  float sunUp = smoothstep(-.02, .06, uSunDir.y);
  vec3 col = alb * (uSunCol * ndl * sh * 3.6 * sunUp + uSkyCol * (.55 + .45*N.y) + uBounce);

  // lamp pools along the avenue
  float lz = mod(p.y - 6., 24.) - 12.;
  float pool = exp(-(pow(ax - (AVE - .5), 2.) + lz*lz) / 26.) * step(p.y, SITE) * step(-RING_IN, p.y);
  col += vec3(1., .66, .36) * pool * uLamps * .55 * (alb*2.2 + .08);

  // ---- survey lines (gold) ----
  vec3 gold = vec3(1., .78, .40);
  float lineVis = line * lineA * (.62 + .38*uMap) * (1. - fogAmt(vW)*.8);
  col = mix(col, gold * (.75 + .35*uLamps) , lineVis * .85);

  // highlighted plot
  vec2 hc = (uHiRect.xy + uHiRect.zw) * .5, hs = (uHiRect.zw - uHiRect.xy) * .5;
  vec2 hd = abs(p - hc) - hs;
  float inside = step(max(hd.x, hd.y), 0.);
  float edge = band(abs(max(hd.x, hd.y)), .16, fw);
  float pulse = .85 + .15*sin(uTime*2.2);
  col = mix(col, col*1.25 + gold*.12, inside * uHi);
  col = mix(col, gold * 1.6 * pulse, edge * uHi);
  col += gold * .5 * exp(-max(max(hd.x,hd.y), 0.)*1.2) * (1.-inside) * uHi * .35;

  // ---- map mode: contours + grid, muted palette ----
  if (uMap > .001) {
    float lum = dot(col, vec3(.3,.55,.15));
    col = mix(col, vec3(lum)*vec3(.98,1.04,.88), uMap*.35);
    float hgt = vW.y / 3.;
    float contour = 1. - smoothstep(0., 1.5, abs(fract(hgt + .5) - .5) / max(fwidth(hgt), 1e-4));
    vec2 g = abs(fract(p / 100.) - .5) * 100.;
    float grid = band(min(g.x, g.y) - 49.5, .25, fw) * step(SITE + 1., m);
    col = mix(col, gold*.55, (contour*.35*step(SITE + 20., m) + grid*.25) * uMap);
  }

  col = applyFog(col, vW);
  col += (hash12(gl_FragCoord.xy) - .5) / 255.;
  gl_FragColor = vec4(col, 1.);
}`;

/* ---------- sky dome ---------- */
export const skyVert = /* glsl */ `
varying vec3 vDir;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.);
  vDir = w.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * w;
  gl_Position.z = gl_Position.w; // pin to the far plane
}`;

export const skyFrag = /* glsl */ `
${NOISE}
uniform vec3 uZenith, uHorizon, uSunCol, uSunDir, uFogCol; uniform float uTime, uDusk;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  float s = max(dot(d, uSunDir), 0.);
  vec3 col = mix(uHorizon, uZenith, pow(smoothstep(-.02, .55, h), .55));
  // warm band hugging the horizon, stronger toward the sun
  float hb = exp(-max(h, 0.) * 14.);
  col = mix(col, uSunCol * .95, hb * (.25 + .6*pow(s, 3.)));
  col += uSunCol * (pow(s, 10.) * .32 + pow(s, 90.) * .7);
  col += uSunCol * smoothstep(.99935, .99965, s) * 1.4 * smoothstep(-.02, .01, uSunDir.y);
  // soft cumulus bands with a warm sun-side rim and bluish, shaded undersides
  vec2 cp = d.xz / (h + .16) * 1.15 + vec2(uTime*.004, 0.);
  float cb = fbm3(cp + 3.);
  float cn = cb * .8 + vnoise(cp*4.1 + cb*2.2) * .32;
  float cm = smoothstep(.5, .86, cn) * smoothstep(.015, .12, h) * smoothstep(.7, .16, h);
  float thick = smoothstep(.55, 1., cn);
  vec3 shade = uZenith * .75 + uHorizon * .35;
  vec3 cc = mix(shade, uSunCol * 1.05 + uHorizon*.1, clamp(pow(s, 1.6) * .85 + .3*(1. - thick), 0., 1.));
  col = mix(col, cc, cm * .82);
  col = mix(col, uFogCol, smoothstep(.02, -.06, h));
  // warm→cool gradients pass through olive in RGB; keep green under red so the blend reads as dusky rose
  float mx = max(col.r, max(col.g, col.b));          // hue-preserving highlight roll-off (no clipping to yellow-white)
  if (mx > .8) col *= (.8 + .2 * (1. - exp(-(mx - .8) / .2))) / mx;
  col.g = mix(col.g, min(col.g, col.r * .86 + .01), smoothstep(.12, .45, uDusk));
  float sl = dot(col, vec3(.3,.55,.15)); col = mix(vec3(sl), col, .92);
  col += (hash12(gl_FragCoord.xy) - .5) / 200.;
  gl_FragColor = vec4(col, 1.);
}`;

/* ---------- lit props (wall, gate, stones, poles, trees, palms) ---------- */
export const litVert = /* glsl */ `
${LIGHT_UNIFORMS}
uniform float uSway;
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vKind;
attribute float aSway; attribute float aKind;
void main(){
  vKind = aKind;
  mat4 im = mat4(1.);
  #ifdef USE_INSTANCING
    im = instanceMatrix;
  #endif
  vec3 pos = position;
  vec4 base = modelMatrix * im * vec4(0.,0.,0.,1.);
  // wind: bend grows with height, per-instance phase from the instance origin
  float ph = base.x * .13 + base.z * .07;
  float bend = aSway * uSway * pos.y * pos.y * .002;
  pos.x += bend * (sin(uTime*1.1 + ph) + .35*sin(uTime*2.7 + ph*1.7));
  pos.z += bend * .6 * cos(uTime*.9 + ph*1.3);
  vec4 w = modelMatrix * im * vec4(pos, 1.);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix * im) * normal);
  vC = color;
  #ifdef USE_INSTANCING_COLOR
    vC *= instanceColor;
  #endif
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const litFrag = /* glsl */ `
${NOISE}
${FOG}
${LIGHT_UNIFORMS}
uniform float uWrap; uniform vec3 uEmissive; uniform float uLamps;
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vKind;
void main(){
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 alb = vC;
  vec3 V = cameraPosition - vW; float dist = length(V); V /= dist;
  float spec = 0., shine = 1.;
  #if SURFACE_DETAIL
  if (vKind > .5) {
    // close up, break the surface into leaf clumps / give the skin a soft mottle. Faded out with distance
    // (and wherever a clump would be smaller than a pixel) so far trees stay calm instead of shimmering.
    float near = 1. - smoothstep(30., 120., dist);
    if (vKind < 1.5) {
      spec = .16; shine = 22.;                        // waxy mango leaves
      if (near > 0.) {                                // far canopies skip the noise entirely
        vec2 q = vW.xz*2.6 + vW.y*1.9;
        float a = vnoise(q), b = vnoise(q.yx*1.37 + 11.7);
        float fade = near * (1. - smoothstep(.15, .5, fwidth(q.x)));
        N = normalize(N + vec3(a - .5, (a + b) * .5 - .5, b - .5) * 1.3 * fade);
        alb *= mix(1., .62 + .76*a, fade);
      }
    } else {
      spec = .42; shine = 46.;                        // glossy ripe skin
    }
  } else {
    // plaster / stone / bark: weathering mottle and vertical streaking, fading out with distance
    float nr = 1. - smoothstep(25., 170., dist);
    if (nr > 0.) {
      vec2 q = vec2(vW.x + vW.z, vW.y*1.8);
      float m = vnoise(q*vec2(2.3, .7))*.55 + vnoise(q*7.1)*.3 + vnoise(q*vec2(19., 3.))*.15;
      alb *= mix(1., .72 + .5*m, nr);
    }
  }
  #else
  if (vKind > 1.5) { spec = .42; shine = 46.; } else if (vKind > .5) { spec = .16; shine = 22.; }
  #endif
  if (vKind < .5) alb *= mix(.74, 1., smoothstep(0., 1.4, vW.y));   // dirt and damp near the ground
  float ndl = max((dot(N, uSunDir) + uWrap) / (1. + uWrap), 0.);
  float sunUp = smoothstep(-.02, .06, uSunDir.y);
  vec3 col = alb * (uSunCol * ndl * 1.9 * sunUp + uSkyCol * (.6 + .4*N.y) + uBounce);
  if (spec > 0.) {
    vec3 H = normalize(uSunDir + V);
    col += uSunCol * spec * pow(max(dot(N, H), 0.), shine) * sunUp * step(0., dot(N, uSunDir));
    col += uSkyCol * spec * .5 * pow(1. - max(dot(N, V), 0.), 4.);   // rim sheen against the sky
  }
  col += uEmissive * (.35 + .65*uLamps);
  col = applyFog(col, vW);
  gl_FragColor = vec4(col, 1.);
}`;

/* ---------- lamp glows: camera-facing additive sprites ---------- */
export const glowVert = /* glsl */ `
uniform float uTime, uLamps;
attribute float aSeed;
varying vec2 vUv; varying float vI; varying vec3 vW;
void main(){
  vec4 c = modelMatrix * instanceMatrix * vec4(0.,0.,0.,1.);
  vW = c.xyz;
  vec4 mv = viewMatrix * c;
  float thr = .15 + aSeed * .55;
  float on = smoothstep(thr, thr + .06, uLamps);
  // brief flicker while a lamp warms up
  float warming = on * (1. - smoothstep(thr + .06, thr + .16, uLamps));
  float fl = mix(1., step(.35, fract(sin(floor(uTime*14.) + aSeed*91.) * 437.5)), warming);
  vI = on * fl;
  mv.xy += position.xy * (1.5 + 2.5*on);
  vUv = uv;
  gl_Position = projectionMatrix * mv;
}`;

export const glowFrag = /* glsl */ `
${FOG}
varying vec2 vUv; varying float vI; varying vec3 vW;
void main(){
  float r = length(vUv - .5) * 2.;
  float g = exp(-r*r*5.) * .55 + exp(-r*r*60.) * 1.4;
  float f = fogAmt(vW);
  gl_FragColor = vec4(vec3(1., .7, .38) * g * vI * (1. - f*.7), 1.);
}`;

/* ---------- soft contact/cast shadow decals ---------- */
export const shadowVert = /* glsl */ `
varying vec2 vUv; varying vec3 vW;
void main(){
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.);
  vW = w.xyz; vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
export const shadowFrag = /* glsl */ `
${FOG}
uniform float uStrength;
varying vec2 vUv; varying vec3 vW;
void main(){
  vec2 q = vUv*2. - 1.;
  float a = 1. - smoothstep(.15, 1., length(q));
  a *= mix(1., .55, smoothstep(-.6, 1., q.y));   // denser near the trunk
  a *= uStrength * (1. - fogAmt(vW));
  gl_FragColor = vec4(0.02, 0.015, 0.02, a);
}`;

/* ---------- birds: tiny flock, wings flap in the vertex shader ---------- */
export const birdVert = /* glsl */ `
uniform float uTime;
attribute vec4 aBird; // x: phase, y: lateral offset, z: height offset, w: speed jitter
varying vec3 vW;
void main(){
  float t = uTime * (.022 + aBird.w*.004) + aBird.x*.02;
  vec3 c = vec3(cos(t)*300., 72. + aBird.z + sin(t*3.)*6., sin(t)*210. - 40.);
  vec3 fwd = normalize(vec3(-sin(t)*300., 0., cos(t)*210.));
  vec3 side = normalize(cross(fwd, vec3(0.,1.,0.)));
  c += side * aBird.y + fwd * aBird.x * 2.2;
  vec3 p = position;
  float flap = sin(uTime*7. + aBird.x*5.) * abs(p.x);
  vec3 w = c + side * p.x * 1.1 + fwd * p.z * 1.1 + vec3(0., p.y + flap*.55, 0.);
  vW = w;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.);
}`;
export const birdFrag = /* glsl */ `
${FOG}
varying vec3 vW;
void main(){ gl_FragColor = vec4(applyFog(vec3(.05,.04,.04), vW), 1.); }`;

export const FOG_CHUNK = FOG;
