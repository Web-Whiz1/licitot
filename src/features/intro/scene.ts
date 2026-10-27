// The site intro: a real-time WebGL stage. Bordo velvet curtains part, the LiciTot paddle (bordo
// lacquer) rises through a stage trap into a soft spotlight, holds, then sinks back and the
// curtains close. Browser-only: loaded by components/site-intro.tsx on the first visit.
import * as THREE from "three"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js"
import { OutputPass } from "three/addons/postprocessing/OutputPass.js"
import { RenderPass } from "three/addons/postprocessing/RenderPass.js"
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js"
import { WORDMARK_LICI_PATH, WORDMARK_TOT_PATH } from "@/lib/brand/wordmark"

export type StageState = "closed" | "open"

export type StageOptions = {
  /** Start in this state without animating (used for the still image). */
  initial?: StageState
  onFirstFrame?: () => void
}

export type Stage = {
  /** Opens the curtains and raises the paddle, holds for `hold` seconds, then lowers the
   * paddle and closes the curtains; calls `onDone` once they are shut. */
  play: (show: { hold: number; onDone: () => void }) => void
  /** Pauses rendering while the section is off screen. */
  setActive: (active: boolean) => void
  resize: () => void
  dispose: () => void
}

// ── Palette (scene colors, linear-light values are derived by three.js) ──────────────────────
const VELVET = 0x420714
const VELVET_SHEEN = 0xc94a64
const BACKDROP = 0x1d070d
const ENAMEL = 0x4a0b1a
const WARM = 0xfff0e0
const IVORY = 0xe9e1d3

// ── Stage dimensions (world units ≈ meters) ────────────────────────────────────────────────
const CURTAIN_W = 4.45 // one half, closed
const CURTAIN_H = 5.45
const CURTAIN_Z = 0.75
const OVERLAP = 0.12
const GATHER = 1.15 // width of the bunched fabric when fully open
const FOLDS = 9
const PADDLE_Y = 2.3
const PADDLE_Z = -0.35
const PADDLE_START_Y = -1.9
const REST_YAW = -0.3
const REST_PITCH = 0.08

// The paddle as one outline (head + handle) with the "L" as a hole, on the 64-unit logo grid.
const PADDLE_OUTLINE =
  "M27 5H37A14 14 0 0 1 51 19V27A14 14 0 0 1 37 41H36V55A4 4 0 0 1 28 55V41H27A14 14 0 0 1 13 27V19A14 14 0 0 1 27 5Z" +
  "M23.25 14V31A3.25 3.25 0 0 0 26.5 34.25H39.5A3.25 3.25 0 0 0 39.5 27.75H29.75V14A3.25 3.25 0 0 0 23.25 14Z"

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeOutBack = (t: number) => {
  const c = 1.2
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2
}
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

/** Deterministic noise so the curtains look the same on every visit. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// ── Procedural textures ────────────────────────────────────────────────────────────────────

/** Fine vertical pile for the velvet, as a tangent-space normal map. */
function velvetNormalMap(): THREE.Texture {
  const size = 256
  const heights = new Float32Array(size * size)
  const r = rng(7)
  const cols = Array.from({ length: size }, () => r())
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const streak = cols[x]! * 0.6 + cols[(x + 1) % size]! * 0.4
      heights[y * size + x] = streak * 0.7 + r() * 0.3
    }
  }
  return normalFromHeights(heights, size, 2.2)
}

/** Dark varnished boards running towards the audience. */
function floorTextures(): { map: THREE.Texture; roughnessMap: THREE.Texture } {
  const w = 1024
  const h = 1024
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")!
  const rough = document.createElement("canvas")
  rough.width = w
  rough.height = h
  const rctx = rough.getContext("2d")!
  const r = rng(11)
  const boards = 24
  const bw = w / boards
  for (let i = 0; i < boards; i++) {
    let y = -r() * 400
    while (y < h) {
      const len = 700 + r() * 900
      const l = 11 + r() * 6
      ctx.fillStyle = `hsl(${20 + r() * 8} ${38 + r() * 14}% ${l}%)`
      ctx.fillRect(i * bw, y, bw, len)
      // grain
      for (let g = 0; g < 26; g++) {
        ctx.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.12})`
        ctx.fillRect(i * bw + r() * bw, y, 1 + r() * 1.5, len)
      }
      const g = Math.round(115 + r() * 60)
      rctx.fillStyle = `rgb(${g},${g},${g})`
      rctx.fillRect(i * bw, y, bw, len)
      ctx.fillStyle = "rgba(0,0,0,0.85)"
      ctx.fillRect(i * bw, y, bw, 2)
      y += len
    }
    ctx.fillStyle = "rgba(0,0,0,0.9)"
    ctx.fillRect(i * bw, 0, 2, h)
  }
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  const roughnessMap = new THREE.CanvasTexture(rough)
  for (const t of [map, roughnessMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 8
  }
  return { map, roughnessMap }
}

function normalFromHeights(heights: Float32Array, size: number, strength: number): THREE.Texture {
  const data = new Uint8Array(size * size * 4)
  const at = (x: number, y: number) => heights[((y + size) % size) * size + ((x + size) % size)]!
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength
      const len = Math.hypot(dx, dy, 1)
      const i = (y * size + x) * 4
      data[i] = ((-dx / len) * 0.5 + 0.5) * 255
      data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255
      data[i + 2] = (1 / len) * 255
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, size, size)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.needsUpdate = true
  return tex
}

/** Soft round sprite for the dust in the light beam. */
function dustSprite(): THREE.Texture {
  const c = document.createElement("canvas")
  c.width = c.height = 64
  const ctx = c.getContext("2d")!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, "rgba(255,255,255,1)")
  g.addColorStop(0.35, "rgba(255,255,255,0.35)")
  g.addColorStop(1, "rgba(255,255,255,0)")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

// ── Geometry builders ──────────────────────────────────────────────────────────────────────

/** SVG path (logo grid, y down) → three.js shapes (y up, centered on cx/cy). */
function svgShapes(d: string, cx: number, cy: number): THREE.Shape[] {
  const data = new SVGLoader().parse(
    `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`,
  )
  const shapes: THREE.Shape[] = []
  for (const path of data.paths) {
    for (const s of path.toShapes()) {
      const { shape, holes } = s.extractPoints(48)
      const flip = (p: THREE.Vector2) => new THREE.Vector2(p.x - cx, -(p.y - cy))
      const out = new THREE.Shape(shape.map(flip))
      out.holes = holes.map((h) => new THREE.Path(h.map(flip)))
      shapes.push(out)
    }
  }
  return shapes
}

type Curtain = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial>
  rest: Float32Array // (u, v) per vertex
  seed: number
}

function makeCurtain(material: THREE.MeshPhysicalMaterial, side: 1 | -1, seed: number): Curtain {
  const geo = new THREE.PlaneGeometry(1, 1, 220, 56)
  const uv = geo.attributes.uv!
  const rest = new Float32Array(uv.count * 2)
  for (let i = 0; i < uv.count; i++) {
    rest[i * 2] = uv.getX(i)
    rest[i * 2 + 1] = uv.getY(i)
  }
  geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(uv.count * 3).fill(1), 3))
  const mesh = new THREE.Mesh(geo, material)
  mesh.scale.x = side
  mesh.castShadow = true
  mesh.receiveShadow = true
  return { mesh, rest, seed }
}

/**
 * Lays one curtain half out for an opening amount (0 closed … 1 open). u runs from the inner
 * edge (0) to the outer edge (1). Opening pulls the inner edge out, most at the tie-back
 * height, and the same number of folds bunches into less width, so the folds deepen.
 */
function layoutCurtain(c: Curtain, open: number, sway: number, time: number) {
  const pos = c.mesh.geometry.attributes.position!
  const col = c.mesh.geometry.attributes.color!
  const full = CURTAIN_W + OVERLAP
  const reach = CURTAIN_W - GATHER
  for (let i = 0; i < pos.count; i++) {
    const u = c.rest[i * 2]!
    const v = c.rest[i * 2 + 1]!
    const tie = Math.exp(-(((v - 0.34) / 0.24) ** 2))
    const pull = open * reach * (0.74 + 0.26 * tie + 0.06 * (1 - v))
    const x = -OVERLAP + pull + u * (full - pull)
    const squeeze = (full - pull) / full
    const amp = 0.07 * (1 + 2.1 * (1 - squeeze)) * (0.85 + 0.3 * (1 - v))
    const ph = u * FOLDS * Math.PI * 2
    const fold = Math.sin(ph + c.seed) + 0.32 * Math.sin(ph * 2.13 + c.seed * 1.7 + v * 1.4)
    let z = amp * fold + 0.018 * Math.sin(ph * 4.7 + c.seed * 3.1 + v * 3.0)
    // Fake occlusion: the deep troughs between folds stay dark, crests catch the light.
    const crest = Math.min(1, Math.max(0, (fold + 1.32) / 2.64))
    const ao = (0.42 + 0.58 * crest ** 0.8) * (1 - 0.35 * Math.max(0, (v - 0.86) / 0.14))
    col.setXYZ(i, ao, ao, ao)
    // The inner edge swings back a little where it is tied, as real drapes do.
    z -= open * tie * 0.25 * (1 - u) ** 2
    z += sway * 0.035 * Math.sin(time * 1.6 + v * 3.5 + u * 5) * (1 - v * 0.6)
    const y = v * CURTAIN_H - 0.02
    pos.setXYZ(i, x, y, z)
  }
  pos.needsUpdate = true
  col.needsUpdate = true
  c.mesh.geometry.computeVertexNormals()
}

/** The valance across the top: a pleated band with scalloped swags, a rope and a fringe. */
function makeValance(velvet: THREE.MeshPhysicalMaterial, trim: THREE.MeshPhysicalMaterial) {
  const group = new THREE.Group()
  const width = 11
  const top = CURTAIN_H + 0.95
  const depth = 0.95
  const swag = 2.2
  const drop = (x: number) => {
    const f = ((((x + width / 2) / swag) % 1) + 1) % 1
    return 0.24 * Math.sin(Math.PI * f)
  }
  const geo = new THREE.PlaneGeometry(1, 1, 440, 24)
  const pos = geo.attributes.position!
  const uv = geo.attributes.uv!
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i)
    const v = uv.getY(i)
    const x = (u - 0.5) * width
    const y = top - (1 - v) * (depth + drop(x))
    const z = 0.045 * Math.sin(x * 15.5) + 0.02 * Math.sin(x * 37 + 1.3) + 0.06 * (1 - v) ** 2
    pos.setXYZ(i, x, y, z)
  }
  const shade = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const ao = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(pos.getX(i) * 15.5))
    shade.set([ao, ao, ao], i * 3)
  }
  geo.setAttribute("color", new THREE.BufferAttribute(shade, 3))
  geo.computeVertexNormals()
  const band = new THREE.Mesh(geo, velvet)
  group.add(band)

  // A silk rope along the scalloped hem, and the fringe hanging from it.
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 440; i++) {
    const x = (i / 440 - 0.5) * width
    pts.push(new THREE.Vector3(x, top - depth - drop(x), 0.075))
  }
  const rope = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 600, 0.026, 10),
    trim,
  )
  group.add(rope)
  const strand = new THREE.CylinderGeometry(0.006, 0.004, 0.14, 5)
  strand.translate(0, -0.07, 0)
  const count = Math.round(width / 0.022)
  const fringe = new THREE.InstancedMesh(strand, trim, count)
  const m = new THREE.Matrix4()
  const r = rng(5)
  for (let i = 0; i < count; i++) {
    const x = (i / count - 0.5) * width
    m.makeRotationZ((r() - 0.5) * 0.08)
    m.setPosition(x, top - depth - drop(x) - 0.012, 0.07 + (r() - 0.5) * 0.02)
    fringe.setMatrixAt(i, m)
  }
  group.add(fringe)
  group.position.z = CURTAIN_Z + 0.3
  return group
}

/** Volumetric-looking light cone: additive, brighter near the lamp and towards its axis. */
function makeBeam(from: THREE.Vector3, to: THREE.Vector3, radius: number) {
  const length = from.distanceTo(to)
  const geo = new THREE.CylinderGeometry(0.06, radius, length, 96, 1, true)
  geo.translate(0, -length / 2, 0)
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(WARM) },
      uIntensity: { value: 0 },
      uApex: { value: from.clone() },
      uLength: { value: length },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vWorld;
      void main() {
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform vec3 uApex;
      uniform float uLength;
      varying vec3 vNormal;
      varying vec3 vWorld;
      void main() {
        float d = clamp(distance(vWorld, uApex) / uLength, 0.0, 1.0);
        float fall = pow(1.0 - d, 1.6) * smoothstep(0.0, 0.08, d);
        vec3 viewDir = normalize(cameraPosition - vWorld);
        float facing = pow(abs(dot(normalize(vNormal), viewDir)), 2.2);
        gl_FragColor = vec4(uColor * fall * facing * uIntensity, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.copy(from)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), to.clone().sub(from).normalize())
  return { mesh, uniforms: mat.uniforms as { uIntensity: { value: number } } }
}

// ── The scene ──────────────────────────────────────────────────────────────────────────────

export function createStage(canvas: HTMLCanvasElement, options: StageOptions = {}): Stage {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  })
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
  renderer.setPixelRatio(pixelRatio)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.92
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  RectAreaLightUniformsLib.init()

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x060404)
  const fog = new THREE.Fog(0x060404, 14, 30)
  scene.fog = fog
  // A soft studio reflection: it gives the velvet its sheen and the lacquer its gloss.
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
  scene.environment = envRT.texture
  scene.environmentIntensity = 0.35

  const camera = new THREE.PerspectiveCamera(26, 16 / 9, 0.1, 60)
  const lookAt = new THREE.Vector3(0, 2.8, 0)

  // Materials
  const pile = velvetNormalMap()
  pile.repeat.set(10, 3)
  const velvet = new THREE.MeshPhysicalMaterial({
    color: VELVET,
    roughness: 0.9,
    sheen: 1,
    sheenColor: new THREE.Color(VELVET_SHEEN),
    sheenRoughness: 0.42,
    normalMap: pile,
    normalScale: new THREE.Vector2(0.35, 0.35),
    vertexColors: true,
    side: THREE.DoubleSide,
  })
  const backdropVelvet = velvet.clone()
  backdropVelvet.color = new THREE.Color(BACKDROP)
  backdropVelvet.sheenColor = new THREE.Color(0x8a2a3c)
  backdropVelvet.normalScale = new THREE.Vector2(0.12, 0.12)
  const lacquer = (color: number, roughness: number) =>
    new THREE.MeshPhysicalMaterial({
      color,
      roughness,
      clearcoat: 0.8,
      clearcoatRoughness: 0.12,
      envMap: envRT.texture,
      envMapIntensity: 0.3,
    })
  // No metal anywhere: trims in deep bordo silk, the paddle rim in darker lacquer, the
  // wordmark in ivory.
  const trim = new THREE.MeshPhysicalMaterial({
    color: 0x4a0d19,
    roughness: 0.6,
    sheen: 1,
    sheenColor: new THREE.Color(0xb04257),
    sheenRoughness: 0.5,
  })
  const paddleSide = lacquer(0x3a0812, 0.4)
  const wordMat = lacquer(IVORY, 0.35)
  const enamel = new THREE.MeshPhysicalMaterial({
    color: ENAMEL,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMap: envRT.texture,
    envMapIntensity: 0.35,
  })

  // Floor and apron
  const { map, roughnessMap } = floorTextures()
  map.repeat.set(2.6, 1)
  roughnessMap.repeat.copy(map.repeat)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 9),
    new THREE.MeshStandardMaterial({
      map,
      roughnessMap,
      roughness: 1,
      metalness: 0,
    }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, 0, -1.5)
  floor.receiveShadow = true
  scene.add(floor)
  const apron = new THREE.Mesh(
    new THREE.BoxGeometry(16, 0.7, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x0b0706, roughness: 0.7 }),
  )
  apron.position.set(0, -0.35, 3)
  scene.add(apron)
  const lip = new THREE.Mesh(new THREE.BoxGeometry(16, 0.035, 0.05), trim)
  lip.position.set(0, -0.012, 3.1)
  scene.add(lip)

  // Backdrop: a second, darker velvet far behind.
  const back = makeCurtain(backdropVelvet, 1, 2.1)
  const backPos = back.mesh.geometry.attributes.position!
  for (let i = 0; i < backPos.count; i++) {
    const u = back.rest[i * 2]!
    const v = back.rest[i * 2 + 1]!
    const ph = u * 34 * Math.PI * 2
    const fold = Math.sin(ph) + 0.33 * Math.sin(ph * 2.3 + v)
    backPos.setXYZ(i, (u - 0.5) * 14, v * 7.2, 0.09 * fold)
    const ao = 0.45 + 0.55 * Math.min(1, Math.max(0, (fold + 1.33) / 2.66))
    back.mesh.geometry.attributes.color!.setXYZ(i, ao, ao, ao)
  }
  back.mesh.geometry.computeVertexNormals()
  back.mesh.position.z = -3.6
  back.mesh.castShadow = false
  scene.add(back.mesh)

  // Proscenium: dark pillars framing the opening, with a gilded inner edge.
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x0d0909, roughness: 0.75 })
  for (const side of [-1, 1] as const) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 8, 0.6), pillarMat)
    pillar.position.set(side * (CURTAIN_W + 1.32), 3.6, CURTAIN_Z + 0.55)
    scene.add(pillar)
    const edge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 8, 12), trim)
    edge.position.set(side * (CURTAIN_W + 0.14), 3.6, CURTAIN_Z + 0.86)
    scene.add(edge)
  }

  // Curtains
  const right = makeCurtain(velvet, 1, 0.4)
  const left = makeCurtain(velvet, -1, 2.3)
  for (const c of [right, left]) {
    c.mesh.position.z = CURTAIN_Z
    scene.add(c.mesh)
  }
  scene.add(makeValance(velvet, trim))

  // The paddle: enamel faces, trim-colored sides (ExtrudeGeometry group 0 = caps, 1 = sides).
  const paddleGeo = new THREE.ExtrudeGeometry(svgShapes(PADDLE_OUTLINE, 32, 34), {
    depth: 3.2,
    bevelEnabled: true,
    bevelThickness: 0.9,
    bevelSize: 0.75,
    bevelSegments: 8,
    curveSegments: 48,
  })
  paddleGeo.translate(0, 0, -1.6)
  const paddle = new THREE.Mesh(paddleGeo, [enamel, paddleSide])
  paddle.castShadow = true
  paddle.receiveShadow = true
  const paddleScale = 0.05
  paddle.scale.setScalar(paddleScale)
  paddle.rotation.z = -THREE.MathUtils.degToRad(10)
  const paddleRig = new THREE.Group() // rises and turns; the mesh keeps the logo lean
  paddleRig.add(paddle)
  paddleRig.position.set(0, PADDLE_START_Y, PADDLE_Z)
  scene.add(paddleRig)

  // The wordmark in ivory letters standing at the front of the stage.
  const wordGeo = new THREE.ExtrudeGeometry(
    [...svgShapes(WORDMARK_LICI_PATH, 134.5, 46), ...svgShapes(WORDMARK_TOT_PATH, 134.5, 46)],
    { depth: 2.4, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.22, bevelSegments: 4 },
  )
  const word = new THREE.Mesh(wordGeo, wordMat)
  word.scale.setScalar(0.014)
  word.position.set(0, 0.002, 0.3)
  word.castShadow = true
  scene.add(word)

  // Lights
  const ambient = new THREE.HemisphereLight(0x3a2620, 0x080404, 0.25)
  scene.add(ambient)

  const keyFrom = new THREE.Vector3(1.3, 8.4, 3.4)
  const key = new THREE.SpotLight(WARM, 0, 22, 0.3, 0.55, 1.6)
  key.position.copy(keyFrom)
  key.target.position.set(0, PADDLE_Y - 0.6, PADDLE_Z)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.02
  key.shadow.radius = 4
  scene.add(key, key.target)
  const beam = makeBeam(keyFrom, new THREE.Vector3(0, 0, PADDLE_Z + 0.4), 1.55)
  scene.add(beam.mesh)

  const rims = [-1, 1].map((side) => {
    const rim = new THREE.SpotLight(0xfff0e6, 0, 16, 0.32, 0.7, 1.4)
    rim.position.set(side * 3.4, 6.4, -2.8)
    rim.target.position.set(0, PADDLE_Y, PADDLE_Z)
    scene.add(rim, rim.target)
    return rim
  })

  // Washes that rake across the curtains from the wings, so the folds read.
  const washes = [-1, 1].map((side) => {
    const wash = new THREE.SpotLight(0xffd9c4, 0, 20, 0.55, 0.9, 1.3)
    wash.position.set(side * 7.5, 6.5, 5.5)
    wash.target.position.set(side * 2.2, 2.4, CURTAIN_Z)
    scene.add(wash, wash.target)
    return wash
  })

  // Front of house: a soft, narrow light from the audience on the wordmark and the paddle.
  const front = new THREE.SpotLight(0xfff2e6, 0, 24, 0.13, 0.9, 1)
  front.position.set(-3.5, 4.8, 11)
  front.target.position.set(0, 1.3, 0)
  scene.add(front, front.target)

  // Footlights: a soft strip at the edge of the stage, pointing up at the curtains.
  const foot = new THREE.RectAreaLight(0xffd2a8, 0, 9.5, 0.12)
  foot.position.set(0, 0.06, 2.75)
  foot.lookAt(0, 3.2, CURTAIN_Z)
  scene.add(foot)

  // Dust drifting in the beam.
  const dustCount = 520
  const dustGeo = new THREE.BufferGeometry()
  const dustPos = new Float32Array(dustCount * 3)
  const dustSeed = new Float32Array(dustCount)
  const dr = rng(3)
  const beamDir = new THREE.Vector3(0, 0, PADDLE_Z + 0.4).sub(keyFrom)
  for (let i = 0; i < dustCount; i++) {
    const t = 0.15 + dr() * 0.85
    const rad = Math.sqrt(dr()) * 1.4 * t
    const a = dr() * Math.PI * 2
    const p = keyFrom.clone().addScaledVector(beamDir, t)
    dustPos[i * 3] = p.x + Math.cos(a) * rad
    dustPos[i * 3 + 1] = p.y
    dustPos[i * 3 + 2] = p.z + Math.sin(a) * rad
    dustSeed[i] = dr() * 100
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3))
  const dustMat = new THREE.PointsMaterial({
    map: dustSprite(),
    color: 0xfff2e4,
    size: 0.03,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const dust = new THREE.Points(dustGeo, dustMat)
  scene.add(dust)
  const dustBase = dustPos.slice()

  // Post: multisampled render, then tone mapping and a lens look (no bloom: the light is low).
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: 4,
  })
  const composer = new EffectComposer(renderer, target)
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(new OutputPass())
  // A lens look: soft vignette and fine film grain, after tone mapping.
  const film = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float uTime;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        vec2 d = (vUv - 0.5) * vec2(1.0, 1.2);
        c.rgb *= mix(0.5, 1.0, smoothstep(0.78, 0.18, length(d)));
        float n = hash(gl_FragCoord.xy + fract(uTime) * 97.0) - 0.5;
        c.rgb += n * 0.028;
        gl_FragColor = c;
      }`,
  })
  composer.addPass(film)

  // ── State ──
  // One clock drives the show: 0 = closed, 1 = open with the paddle up. It runs forward to
  // open, holds, then runs back (the paddle sinks first, then the curtains close).
  let openT = options.initial === "open" ? 1 : 0
  let direction: 1 | 0 | -1 = 0
  let holdLeft = 0
  let onClosed: (() => void) | undefined
  let active = false
  let raf = 0
  let last = performance.now()
  let time = 0
  let firstFrame = false
  let compiled = false
  let frameTimes: number[] = []
  let framesOut = 0

  function resize() {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return
    renderer.setPixelRatio(pixelRatio)
    renderer.setSize(w, h, false)
    composer.setPixelRatio(pixelRatio)
    composer.setSize(w, h)
    camera.aspect = w / h
    // Keep the whole opening in view on narrow screens; frame tighter on wide ones.
    const wanted = camera.aspect < 1 ? 5.8 : 9.4
    const halfV = THREE.MathUtils.degToRad(camera.fov / 2)
    const distForWidth = wanted / 2 / (Math.tan(halfV) * camera.aspect)
    const distForHeight = 7.3 / 2 / Math.tan(halfV)
    const dist = Math.max(distForWidth, distForHeight)
    camera.position.set(0, 2.95, dist)
    // The same haze on the stage wherever the camera stands (it stands far back on phones).
    fog.near = dist - 2
    fog.far = dist + 14
    camera.lookAt(lookAt)
    camera.updateProjectionMatrix()
    if (!raf && compiled) renderFrame(0)
  }

  function update(dt: number) {
    time += dt
    framesOut++
    if (framesOut < 6) {
      // Let the first frames (and any late shader compiles) pass before the show moves.
    } else if (direction === 1) {
      openT = Math.min(1, openT + dt / 3.5)
      if (openT === 1) direction = 0
    } else if (direction === 0 && holdLeft > 0 && openT === 1) {
      holdLeft -= dt
      if (holdLeft <= 0) direction = -1
    } else if (direction === -1) {
      openT = Math.max(0, openT - dt / 3)
      if (openT === 0) {
        direction = 0
        const done = onClosed
        onClosed = undefined
        done?.()
      }
    }

    const curtainOpen = easeInOut(clamp01(openT / 0.75))
    const rise = easeOutBack(clamp01((openT - 0.28) / 0.6))
    const lights = clamp01((openT - 0.18) / 0.5)
    const moving = direction !== 0 && openT > 0 && openT < 1
    const sway = 0.35 + (moving ? 0.65 * Math.sin(Math.PI * curtainOpen) : 0)

    layoutCurtain(right, curtainOpen, sway, time)
    layoutCurtain(left, curtainOpen, sway, time + 1.7)

    // The paddle turns as it rises and settles at a slight angle (never quite face-on: a flat
    // lacquer face would mirror the front lights), with a slow idle sway of its own.
    paddleRig.position.y =
      THREE.MathUtils.lerp(PADDLE_START_Y, PADDLE_Y, rise) + Math.sin(time * 0.9) * 0.035 * rise
    paddleRig.rotation.y = REST_YAW + (1 - rise) * Math.PI * 0.9 + Math.sin(time * 0.45) * 0.18
    paddleRig.rotation.x = REST_PITCH + Math.sin(time * 0.7) * 0.025

    key.intensity = lights * 55
    front.intensity = lights * 9
    beam.uniforms.uIntensity.value = lights * 0.045
    dustMat.opacity = lights * 0.22
    for (const rim of rims) rim.intensity = lights * 28
    for (const wash of washes) wash.intensity = 20 + lights * 8
    foot.intensity = 1.8 + lights * 1.2

    const pos = dustGeo.attributes.position!
    for (let i = 0; i < dustCount; i++) {
      const s = dustSeed[i]!
      pos.setXYZ(
        i,
        dustBase[i * 3]! + Math.sin(time * 0.21 + s) * 0.12,
        dustBase[i * 3 + 1]! + Math.sin(time * 0.17 + s * 1.3) * 0.18,
        dustBase[i * 3 + 2]! + Math.cos(time * 0.19 + s) * 0.12,
      )
    }
    pos.needsUpdate = true
  }

  function renderFrame(dt: number) {
    update(dt)
    film.uniforms.uTime!.value = time
    composer.render(dt)
    if (!firstFrame) {
      firstFrame = true
      options.onFirstFrame?.()
    }
  }

  function loop(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    renderFrame(dt)
    // Drop resolution on slow GPUs (never below 1×).
    frameTimes.push(dt)
    if (frameTimes.length === 90) {
      const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
      frameTimes = []
      if (avg > 0.024 && pixelRatio > 1) {
        pixelRatio = Math.max(1, pixelRatio - 0.25)
        resize()
      }
    }
    raf = requestAnimationFrame(loop)
  }

  function start() {
    if (raf || !compiled) return
    last = performance.now()
    raf = requestAnimationFrame(loop)
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  // Compile every shader off the main path first, so the opening never stutters. The scene is
  // drawn into the composer's buffer (linear, tone mapped later), so compile for that target:
  // compiling for the canvas would build different programs and compile them all again.
  renderer.setRenderTarget(composer.readBuffer)
  void renderer.compileAsync(scene, camera).then(() => {
    renderer.setRenderTarget(null)
    compiled = true
    resize()
    renderFrame(0)
    if (active) start()
  })

  return {
    play({ hold, onDone }) {
      holdLeft = hold
      onClosed = onDone
      direction = 1
    },
    setActive(next) {
      active = next
      if (active) start()
      else stop()
    },
    resize,
    dispose() {
      stop()
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
          o.geometry.dispose()
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          for (const m of mats) {
            for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose()
            m.dispose()
          }
        }
      })
      envRT.dispose()
      pmrem.dispose()
      target.dispose()
      composer.dispose()
      renderer.dispose()
    },
  }
}
