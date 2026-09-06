import { WorldGestures } from './touch-controls';
import type { Quality } from './preferences';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
const MeshBuilder = { CreateBox, CreateCylinder, CreateSphere, CreateTorus };
import { CHARACTER_CLASSES, COLORS, ENEMIES, NPC, OBSTACLES, WORLD, randomSeed, type CharacterClass, type EnemyKind } from '../shared/content';
type Actor = { root: TransformNode; limbs: TransformNode[]; sword?: TransformNode; label: HTMLDivElement; ring?: Mesh; appearance?: string; lastX: number; lastZ: number; };
import type { WorldState } from '../shared/schema';
export class WorldView {
  engine: Engine; scene: Scene; camera: ArcRotateCamera;
  state?: WorldState; selfId = ''; selected = ''; playing = false; suspended = false;
  onSelect: (id: string) => void = () => {}; onGround: (x: number, z: number) => void = () => {};
  private actors = new Map<string, Actor>(); private drops = new Map<string, TransformNode>();
  private materials = new Map<string, StandardMaterial>(); private shadows: ShadowGenerator;
  private target = new Vector3(0, 1, 5); private time = 0; private labelLayer: HTMLDivElement;
  private effects: { mesh: Mesh; age: number; kind: string }[] = [];
  private particles: { mesh: Mesh; phase: number }[] = [];
  private labelQueue = new Map<Actor, { y: number; show: boolean }>();
  private selection: Mesh; private fountain!: Mesh; private npc: Actor;
  gestures: WorldGestures; canInteract = () => false; tapToMove = false; sensitivity = 1; reducedMotion = false;
  private glow: GlowLayer; private quality: Quality = 'auto'; private qualityLevel: 'low' | 'medium' | 'high' = 'medium';
  private lastFrame = 0; private measuredFPS = 0; private frames = 0; private measuredAt = 0;
  private cost = 0; private qualityAt = 0; private fastWindows = 0;
  constructor(public canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, powerPreference: 'high-performance' }, true);
    this.engine.renderEvenInBackground = false;
    this.engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.5));
    this.scene = new Scene(this.engine);
    this.scene.clearColor = Color4.FromHexString('#b7c8c6ff');
    this.scene.fogMode = Scene.FOGMODE_LINEAR; this.scene.fogStart = 38; this.scene.fogEnd = 110; this.scene.fogColor = Color3.FromHexString('#b7c8c6');
    this.scene.ambientColor = Color3.FromHexString('#a5bab4');
    this.camera = new ArcRotateCamera('camera', Math.PI / 2 + 0.15, 0.96, 39, this.target.clone(), this.scene);
    this.camera.lowerRadiusLimit = 11; this.camera.upperRadiusLimit = 45;
    this.camera.lowerBetaLimit = 0.3; this.camera.upperBetaLimit = 1.25;
    this.camera.minZ = 0.2; this.camera.maxZ = 180;
    const hemi = new HemisphericLight('sky', new Vector3(0, 1, 0), this.scene); hemi.intensity = 0.7; hemi.groundColor = Color3.FromHexString('#59655c');
    const sun = new DirectionalLight('sun', new Vector3(-0.6, -1, -0.5), this.scene); sun.position = new Vector3(30, 45, 20); sun.intensity = 0.9; sun.diffuse = Color3.FromHexString('#ffe8c7');
    sun.shadowMinZ = 1; sun.shadowMaxZ = 130;
    this.shadows = new ShadowGenerator(1024, sun); this.shadows.usePercentageCloserFiltering = true; this.shadows.bias = 0.008; this.shadows.normalBias = 0.1; this.shadows.setDarkness(0.25);
    const glow = this.glow = new GlowLayer('glow', this.scene, { mainTextureFixedSize: 512 }); glow.intensity = 0.5;
    this.labelLayer = document.createElement('div'); this.labelLayer.id = 'labels'; document.body.append(this.labelLayer);
    this.buildWorld(); this.mergeScenery();
    this.npc = this.createPerson('npc', '#d6bd82'); this.npc.root.position.set(NPC.x, 0, NPC.z); this.npc.root.rotation.y = 0.4;
    this.npc.label.innerHTML = `<span class="quest-mark">!</span><strong>Elara</strong><small>Guardiana del valle</small>`;
    this.selection = MeshBuilder.CreateTorus('selection', { diameter: 2.6, thickness: 0.055, tessellation: 48 }, this.scene);
    this.selection.material = this.mat('#e4bd71', true); this.selection.isPickable = false; this.selection.setEnabled(false);
    this.gestures = new WorldGestures(canvas, {
      enabled: () => this.canInteract(),
      rotate: (x, y) => { this.camera.alpha -= x * .004 * this.sensitivity; this.camera.beta = Math.max(.3, Math.min(1.25, this.camera.beta - y * .004 * this.sensitivity)); },
      zoom: factor => this.zoom(factor),
      tap: (x, y, touch) => {
        const hit = this.scene.pick(x, y, mesh => mesh.isPickable && (mesh.name === 'terrain' || !!mesh.metadata?.enemy));
        if (hit?.pickedMesh?.metadata?.enemy) this.onSelect(hit.pickedMesh.metadata.enemy);
        else if (hit?.pickedPoint && (!touch || this.tapToMove)) { this.onSelect(''); this.onGround(hit.pickedPoint.x, hit.pickedPoint.z); this.effect('move', hit.pickedPoint.x, hit.pickedPoint.z); }
      },
    });
    window.addEventListener('resize', () => this.engine.resize());
    // Labels use the camera matrix of the frame that has just been rendered.
    this.scene.onAfterRenderObservable.add(() => {
      const occupied: { x: number; y: number }[] = [];
      const selected = this.actors.get(this.selected), self = this.actors.get(this.selfId);
      const priority = (actor: Actor) => actor === selected ? 0 : actor === this.npc ? 1 : actor === self ? 2 : 3;
      [...this.labelQueue].sort(([a], [b]) => priority(a) - priority(b)).forEach(([actor, { y, show }]) => {
        const p = actor.root.position, screen = this.project(p.x, p.y + y, p.z);
        const visible = show && screen.visible && screen.x >= 0 && screen.x <= this.canvas.clientWidth && screen.y > 0 && screen.y <= this.canvas.clientHeight;
        const overlap = occupied.some(other => Math.abs(other.x - screen.x) < 100 && Math.abs(other.y - screen.y) < 42);
        actor.label.style.display = visible && !overlap ? '' : 'none';
        if (visible && !overlap) occupied.push(screen);
        actor.label.style.transform = `translate(${screen.x}px, ${screen.y}px) translate(-50%, -100%)`;
      });
      this.labelQueue.clear();
    });
    this.engine.runRenderLoop(() => {
      const now = performance.now(), capped = this.quality === 'battery' || this.qualityLevel === 'low';
      if (this.suspended || document.hidden || capped && now - this.lastFrame < 32) return;
      const dt = Math.min(.05, (now - (this.lastFrame || now - 16)) / 1000); this.lastFrame = now;
      this.update(dt); this.scene.render(); this.frames++;
      this.cost = this.cost * .95 + (performance.now() - now) * .05;
      if (now - this.measuredAt > 2000) { this.measuredFPS = Math.round(this.frames * 1000 / (now - this.measuredAt)); this.frames = 0; this.measuredAt = now; }
      if (this.quality === 'auto' && now - this.qualityAt > 10000) {
        this.qualityAt = now;
        const levels = ['low', 'medium', 'high'] as const, index = levels.indexOf(this.qualityLevel);
        if (this.cost > 25 && index > 0) { this.applyQuality(levels[index - 1]); this.fastWindows = 0; }
        else if (this.cost < 10 && index < 2 && ++this.fastWindows >= 3) { this.applyQuality(levels[index + 1]); this.fastWindows = 0; }
        else if (this.cost >= 10) this.fastWindows = 0;
      }
    });
    this.setQuality('auto');
  }
  private mergeScenery() {
    const animated = new Set<Mesh>([this.fountain, ...this.particles.map(p => p.mesh)]);
    const groups = new Map<StandardMaterial, Mesh[]>();
    for (const mesh of [...this.scene.meshes]) {
      if (mesh.name === 'mountain' || mesh.name === 'island') { this.shadows.removeShadowCaster(mesh); mesh.receiveShadows = false; mesh.freezeWorldMatrix(); continue; }
      if (!(mesh instanceof Mesh) || mesh.name === 'terrain' || animated.has(mesh) || !mesh.material) continue;
      const material = mesh.material as StandardMaterial;
      const group = groups.get(material) ?? []; group.push(mesh); groups.set(material, group);
    }
    groups.forEach(meshes => {
      meshes.forEach(m => this.shadows.removeShadowCaster(m));
      const merged = Mesh.MergeMeshes(meshes, true, true);
      if (merged) { merged.isPickable = false; merged.receiveShadows = true; merged.freezeWorldMatrix(); this.shadows.addShadowCaster(merged); }
    });
  }
  mat(color: string, glow = false) {
    const key = color + glow; let m = this.materials.get(key); if (m) return m;
    m = new StandardMaterial(key, this.scene); m.diffuseColor = Color3.FromHexString(color); m.specularColor = Color3.Black();
    if (glow) m.emissiveColor = Color3.FromHexString(color).scale(0.75);
    this.materials.set(key, m); return m;
  }
  private dress(mesh: Mesh, color: string, x: number, y: number, z: number, parent?: TransformNode, shadow = true) {
    mesh.material = this.mat(color); mesh.position.set(x, y, z); if (parent) mesh.parent = parent;
    mesh.isPickable = false; if (shadow) this.shadows.addShadowCaster(mesh); mesh.receiveShadows = true; return mesh;
  }
  private box(name: string, w: number, h: number, d: number, color: string, x: number, y: number, z: number, parent?: TransformNode) {
    return this.dress(MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this.scene), color, x, y, z, parent);
  }
  private sphere(name: string, size: number, color: string, x: number, y: number, z: number, parent?: TransformNode) {
    return this.dress(MeshBuilder.CreateSphere(name, { diameter: size, segments: 3 }, this.scene), color, x, y, z, parent);
  }
  private cylinder(name: string, bottom: number, top: number, h: number, sides: number, color: string, x: number, y: number, z: number, parent?: TransformNode) {
    return this.dress(MeshBuilder.CreateCylinder(name, { diameterBottom: bottom, diameterTop: top, height: h, tessellation: sides }, this.scene), color, x, y, z, parent);
  }
  private buildWorld() {
    const rand = randomSeed(912); const positions: number[] = [], indices: number[] = [], colors: number[] = [], normals: number[] = [];
    for (let x = -40; x < 40; x += 2) for (let z = -46; z < 36; z += 2) {
      const base = Color3.FromHexString(z < -27 ? '#687e71' : z < 4 ? '#6e9365' : '#8caa75').scale(0.88 + rand() * 0.2);
      const offset = positions.length / 3;
      for (const [dx, dz] of [[0, 0], [0, 2], [2, 0], [2, 2]]) { positions.push(x + dx, 0, z + dz); normals.push(0, 1, 0); colors.push(base.r, base.g, base.b, 1); }
      indices.push(offset, offset + 1, offset + 2, offset + 2, offset + 1, offset + 3);
    }
    const terrain = new Mesh('terrain', this.scene); const data = new VertexData(); Object.assign(data, { positions, indices, colors, normals }); data.applyToMesh(terrain); terrain.receiveShadows = true;
    const groundMat = this.mat('#ffffff'); terrain.material = groundMat;
    this.box('island', 80, 6, 82, '#667166', 0, -3.05, -5);
    // A hand-laid path connects the sanctuary, forest and northern ruins.
    for (let z = -38; z < 31; z += 1.35) for (let j = -1; j <= 1; j++) {
      const stone = this.cylinder('path', 1.45 + rand() * 0.3, 1.4, 0.08, 6, ['#b5b4a0', '#c3bcaa', '#a9ad96'][Math.floor(rand() * 3)], j * 1.55 + (rand() - 0.5) * 0.25, 0.025, z + (j % 2) * 0.4); stone.rotation.y = rand();
    }
    this.cylinder('plaza', 14, 14, 0.06, 12, '#bebba6', 0, 0.02, 14);
    for (const o of OBSTACLES) {
      if (o.kind === 'tree') {
        const h = 3.5 + rand() * 3, scale = o.radius / 0.8;
        this.cylinder('trunk', 0.7 * scale, 0.45, h, 5, '#655646', o.x, h / 2, o.z);
        if (o.variant === 0 || o.z < -17) {
          for (let j = 0; j < 3; j++) this.cylinder('pine', (4.7 - j * 0.9) * scale, 0, h * 0.8, 6, ['#335f58', '#46796a', '#568879'][j], o.x, h * (0.65 + j * 0.25), o.z);
        } else {
          const color = o.x < -8 ? (o.variant === 1 ? '#c99861' : '#cdac70') : (o.variant === 1 ? '#759a69' : '#90ad73');
          const crown = this.sphere('crown', 4.5 * scale, color, o.x, h, o.z); crown.scaling.y = 0.9;
          this.sphere('crown', 3 * scale, color, o.x + 1.3, h - 0.8, o.z + 0.6);
        }
      } else if (o.kind === 'rock') {
        const rock = this.sphere('rock', o.radius * 2.6, '#859083', o.x, 0.45, o.z); rock.scaling.y = 0.7; rock.rotation.z = rand();
      } else if (o.kind === 'house') this.house(o.x, o.z, o.variant);
      else {
        this.box('pillar foot', 2.3, 0.5, 2.3, '#7e9288', o.x, 0.25, o.z);
        this.cylinder('ancient pillar', 1.3, 1.1, 5, 6, '#97a79a', o.x, 2.8, o.z);
        this.box('capital', 2, 0.5, 2, '#c2c6ac', o.x, 5.4, o.z);
        const rune = this.box('rune', 0.2, 1.2, 0.03, '#85dccb', o.x, 3, o.z + 0.58); rune.material = this.mat('#85dccb', true);
      }
    }
    // Sanctuary and ancient gate are visual landmarks; their bases remain walkable.
    this.cylinder('sanctuary base', 4.3, 4, 0.3, 10, '#899c95', 4, 0.2, 13);
    this.cylinder('sanctuary', 2.8, 3.1, 0.65, 8, '#b2b6a2', 4, 0.55, 13);
    this.fountain = this.cylinder('astral crystal', 0.9, 0, 2.8, 5, '#87decd', 4, 2.6, 13); this.fountain.material = this.mat('#87decd', true);
    const baseCrystal = this.cylinder('astral crystal bottom', 0, 0.9, 1, 5, '#87decd', 4, 0.7, 13); baseCrystal.material = this.mat('#87decd', true);
    this.cylinder('arena', 19, 19, 0.1, 12, '#87958a', 0, 0.03, -34);
    const portal = MeshBuilder.CreateTorus('ancient arch', { diameter: 8, thickness: 0.8, tessellation: 12 }, this.scene); portal.rotation.x = Math.PI / 2; this.dress(portal, '#a6b2a3', 0, 4, -40);
    const inner = MeshBuilder.CreateTorus('portal runes', { diameter: 7.9, thickness: 0.09, tessellation: 48 }, this.scene); inner.rotation.x = Math.PI / 2; this.dress(inner, '#8de4d4', 0, 4, -39.55); inner.material = this.mat('#8de4d4', true);
    for (let i = 0; i < 32; i++) {
      const angle = i / 32 * Math.PI * 2, radius = 56 + rand() * 18, h = 13 + rand() * 24;
      this.cylinder('mountain', 22 + rand() * 20, 0, h, 5, ['#829f95', '#76958c', '#a2b7aa'][i % 3], Math.cos(angle) * radius, h / 2 - 6, Math.sin(angle) * radius - 8);
    }
    for (let i = 0; i < 210; i++) {
      const x = (rand() - 0.5) * 68, z = rand() * 69 - 41;
      if (Math.abs(x) < 4 || (z > 7 && z < 21 && Math.abs(x) < 8)) continue;
      this.cylinder('grass', 0.35, 0, 0.35 + rand() * 0.4, 3, i % 7 === 0 ? '#e2cc8e' : '#728d59', x, 0.2, z);
    }
    for (let i = 0; i < 25; i++) {
      const mesh = this.sphere('mote', 0.055, '#fce3a0', (rand() - 0.5) * 35, 1.4 + rand() * 3, rand() * 53 - 29); mesh.material = this.mat('#fce3a0', true); this.particles.push({ mesh, phase: rand() * 10 });
    }
    for (const z of [7, 22]) for (const x of [-6, 6]) {
      this.cylinder('lamppost', 0.18, 0.13, 3, 6, '#625947', x, 1.5, z);
      const lantern = this.box('lantern', 0.45, 0.6, 0.45, '#f6d38e', x, 3.1, z); lantern.material = this.mat('#f6d38e', true);
      this.cylinder('lantern roof', 0.8, 0.2, 0.3, 4, '#5b6459', x, 3.5, z);
    }
  }
  private house(x: number, z: number, variant: number) {
    this.box('foundation', 6.6, 0.4, 5.8, '#9b9c88', x, 0.2, z);
    this.box('plaster walls', 6, 3.8, 5.2, '#d4c5a2', x, 2.2, z);
    for (const dx of [-2.9, 0, 2.9]) this.box('timber', 0.22, 3.9, 5.35, '#75604b', x + dx, 2.2, z);
    this.box('beam', 6.2, 0.2, 5.4, '#75604b', x, 3.5, z);
    const roof = this.cylinder('roof', 10.2, 0, 3.6, 4, ['#ac6952', '#567e76', '#b1855d'][variant], x, 5.7, z); roof.rotation.y = Math.PI / 4; roof.scaling.z = 0.9;
    this.box('chimney', 0.8, 2.5, 0.9, '#a6a58f', x + 1.8, 6, z - 0.6);
    this.box('door', 1.2, 2.2, 0.1, '#635846', x, 1.5, z + 2.66);
    for (const dx of [-1.8, 1.8]) {
      this.box('window frame', 1.2, 1.4, 0.15, '#685a45', x + dx, 2.4, z + 2.7);
      const window = this.box('warm window', 0.95, 1.15, 0.17, '#e9cc8d', x + dx, 2.4, z + 2.73); window.material = this.mat('#e9cc8d', true);
      this.box('window cross', 0.07, 1.2, 0.2, '#79664e', x + dx, 2.4, z + 2.79);
    }
    this.box('step', 2.2, 0.2, 1, '#b7b09a', x, 0.2, z + 3.1);
    for (let i = 0; i < 2; i++) this.cylinder('barrel', 0.85, 0.85, 1.1, 8, '#947655', x - 3.7, 0.55, z + i * 1.1);
  }
  private label() { const label = document.createElement('div'); label.className = 'world-label'; this.labelLayer.append(label); return label; }
  private createPerson(id: string, color: string): Actor {
    const root = new TransformNode(id, this.scene), limbs: TransformNode[] = [];
    const ring = MeshBuilder.CreateTorus('player-ring', { diameter: 1.85, thickness: 0.08, tessellation: 18 }, this.scene);
    ring.position.y = 0.08; ring.parent = root; ring.isPickable = false; ring.material = this.mat('#dfe9c7', true);
    this.cylinder('tunic', 0.8, 0.65, 0.95, 6, color, 0, 1.1, 0, root);
    this.box('belt', 0.76, 0.12, 0.5, '#534f44', 0, 0.83, 0, root);
    this.box('buckle', 0.16, 0.16, 0.08, '#e0c68d', 0, 0.84, 0.3, root);
    this.sphere('head', 0.58, '#ddbf99', 0, 1.84, 0.02, root);
    const hair = this.sphere('hair', 0.61, '#4f5049', 0, 1.96, -0.07, root); hair.scaling.y = 0.7;
    this.box('face', 0.4, 0.17, 0.12, '#ddbf99', 0, 1.82, 0.24, root);
    this.box('eye', 0.055, 0.065, 0.05, '#293d38', -0.12, 1.87, 0.31, root); this.box('eye', 0.055, 0.065, 0.05, '#293d38', 0.12, 1.87, 0.31, root);
    const cape = this.box('cape', 0.75, 1.2, 0.12, color, 0, 1.03, -0.34, root); cape.rotation.x = 0.15;
    for (const side of [-1, 1]) {
      const leg = new TransformNode('leg', this.scene); leg.parent = root; leg.position.set(side * 0.21, 0.75, 0); limbs.push(leg);
      this.box('leg', 0.26, 0.6, 0.28, '#4a5651', 0, -0.3, 0, leg); this.box('boot', 0.3, 0.22, 0.43, '#4e4940', 0, -0.66, 0.07, leg);
      const arm = new TransformNode('arm', this.scene); arm.parent = root; arm.position.set(side * 0.48, 1.4, 0); limbs.push(arm);
      this.sphere('shoulder', 0.36, '#bbc0ab', 0, 0, 0, arm); this.box('sleeve', 0.23, 0.5, 0.26, color, 0, -0.25, 0, arm); this.sphere('hand', 0.22, '#ddbf99', 0, -0.52, 0, arm);
    }
    const sword = new TransformNode('sword', this.scene); sword.parent = limbs[3]; sword.position.set(0, -0.48, 0.12);
    this.box('blade', 0.12, 0.07, 1.1, '#d4dfd5', 0, 0, 0.6, sword); this.box('guard', 0.4, 0.1, 0.12, '#dab877', 0, 0, 0.14, sword);
    const label = this.label(); label.classList.add('player-label'); label.innerHTML = '<strong>Personaje</strong><small>Viajero</small><i><b></b></i>';
    return { root, limbs, sword, label, ring, lastX: 0, lastZ: 0 };
  }
  private createEnemy(id: string, kind: EnemyKind): Actor {
    const root = new TransformNode(id, this.scene), color = ENEMIES[kind].color, limbs: TransformNode[] = [];
    if (kind === 'slime') {
      const body = this.sphere('slime', 1.5, color, 0, 0.6, 0, root); body.scaling.y = 0.75;
      this.cylinder('sprout', 0.25, 0, 0.7, 3, '#d1d28c', 0.2, 1.5, 0, root);
      for (const x of [-0.25, 0.25]) this.sphere('eye', 0.12, '#31463c', x, 0.75, 0.62, root);
    } else if (kind === 'boar') {
      const body = this.sphere('boar', 1.6, color, 0, 0.75, 0, root); body.scaling.z = 1.3; body.scaling.y = 0.75;
      this.sphere('head', 0.9, '#8b795b', 0, 0.8, 0.85, root); this.box('snout', 0.5, 0.35, 0.4, '#ba9b78', 0, 0.7, 1.23, root);
      for (const x of [-0.35, 0.35]) { this.cylinder('tusk', 0.17, 0, 0.5, 4, '#e0d6b4', x, 0.77, 1.22, root); this.sphere('eye', 0.11, '#263e37', x, 1, 1.13, root); }
      for (const x of [-0.48, 0.48]) for (const z of [-0.5, 0.5]) this.box('hoof', 0.24, 0.55, 0.26, '#5d5d4e', x, 0.3, z, root);
    } else if (kind === 'wisp') {
      const core = this.sphere('wisp core', 0.75, color, 0, 1.2, 0, root); core.material = this.mat(color, true);
      for (const side of [-1, 1]) { const wing = this.cylinder('wisp wing', 0.65, 0, 1.1, 3, '#b9d8d6', side * 0.65, 1.3, 0, root); wing.rotation.z = side * 0.7; limbs.push(wing); }
    } else {
      this.cylinder('warden body', 2.1, 2.7, 2.7, 5, color, 0, 2.2, 0, root);
      this.box('head', 1.3, 1.1, 1.1, '#a7b5a3', 0, 4, 0, root);
      const eye = this.box('visor', 0.95, 0.18, 0.1, '#a0ead3', 0, 4, 0.58, root); eye.material = this.mat('#a0ead3', true);
      const heart = this.cylinder('heart', 0.6, 0, 0.9, 4, '#9ce6c7', 0, 2.7, 1.2, root); heart.material = this.mat('#9ce6c7', true);
      for (const side of [-1, 1]) { this.box('stone leg', 0.75, 1.4, 0.8, '#637b70', side * 0.7, 0.7, 0, root); const arm = this.box('stone arm', 1, 2.5, 1.1, '#8b9e8b', side * 1.8, 2.3, 0, root); limbs.push(arm); this.sphere('pauldron', 1.5, '#a0ac96', side * 1.6, 3.4, 0, root); }
      this.cylinder('crown', 1.8, 1.3, 0.4, 5, '#dac48e', 0, 4.8, 0, root);
    }
    root.getChildMeshes().forEach(mesh => { mesh.isPickable = true; mesh.metadata = { enemy: id }; });
    const label = this.label(); label.classList.add('enemy-label'); label.innerHTML = `<strong>${ENEMIES[kind].name}</strong><i><b></b></i>`;
    return { root, limbs, label, lastX: 0, lastZ: 0 };
  }
  effect(kind: string, x: number, z: number) {
    const mesh = MeshBuilder.CreateTorus('effect', { diameter: 1, thickness: kind === 'move' ? 0.025 : 0.09, tessellation: 40 }, this.scene);
    mesh.position.set(x, 0.13, z); mesh.material = this.mat(kind === 'slam' ? '#ec9878' : kind === 'heal' ? '#a4e4a3' : '#d5db9d', true); mesh.isPickable = false;
    this.effects.push({ mesh, age: 0, kind });
  }
  project(x: number, y: number, z: number) {
    const screen = Vector3.Project(new Vector3(x, y, z), Matrix.IdentityReadOnly, this.scene.getTransformMatrix(), this.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight()));
    return { x: screen.x / this.engine.getRenderWidth() * this.canvas.clientWidth, y: screen.y / this.engine.getRenderHeight() * this.canvas.clientHeight, visible: screen.z > 0 && screen.z < 1 };
  }
  private positionLabel(actor: Actor, y: number, show: boolean) {
    this.labelQueue.set(actor, { y, show });
  }
  private classPalette(classType: string) {
    const palette: Record<string, { primary: string; accent: string; trim: string }> = {
      traveler: { primary: '#64b8ab', accent: '#d4efe8', trim: '#8ed7c5' },
      guardian: { primary: '#cf8d60', accent: '#f2d3ad', trim: '#dca066' },
      mage: { primary: '#9595d4', accent: '#dfe1ff', trim: '#babdf1' },
    };
    return palette[classType] ?? palette.traveler;
  }
  private recolorActor(actor: Actor, classType: string, banner: string) {
    const { primary, accent, trim } = this.classPalette(classType);
    if (actor.ring) actor.ring.scaling.setAll(1.05 + Math.sin(this.time * 2.2) * 0.04);
    const appearance = `${classType}:${banner}`;
    if (actor.appearance === appearance) return;
    actor.appearance = appearance;
    if (actor.ring) actor.ring.material = this.mat(COLORS.includes(banner) ? banner : primary, true);
    actor.root.getChildMeshes().forEach(mesh => {
      if (!(mesh.material instanceof StandardMaterial)) return;
      const name = mesh.name.toLowerCase();
      // Assign cached materials instead of mutating materials shared with NPCs.
      if (['tunic', 'cape', 'sleeve'].includes(name)) mesh.material = this.mat(primary);
      if (name === 'shoulder') mesh.material = this.mat(accent);
      if (['guard', 'buckle'].includes(name)) mesh.material = this.mat(trim);
    });
  }
  private update(dt: number) {
    this.time += dt;
    if (this.playing && (!this.state?.players || !this.state.enemies || !this.state.loot)) return;
    const me = this.state?.players.get(this.selfId), t = this.reducedMotion ? 0 : this.time;
    this.fountain.rotation.y = t * 0.4; this.fountain.position.y = 2.6 + Math.sin(t * 1.5) * 0.15;
    this.particles.forEach(p => { p.mesh.position.y += Math.sin(t + p.phase) * dt * 0.12; });
    this.effects = this.effects.filter(e => { e.age += dt; const s = e.kind === 'nova' ? 1 + e.age * 15 : e.kind === 'slam' ? 1 + e.age * 12 : 1 + e.age * 3; e.mesh.scaling.setAll(s); e.mesh.visibility = Math.max(0, 1 - e.age * 1.5); if (e.age > 0.7) { e.mesh.dispose(); return false; } return true; });
    if (!this.playing) { if (!this.reducedMotion) this.camera.alpha += dt * 0.012; this.positionLabel(this.npc, 2.8, false); return; }
    const live = new Set<string>();
    this.state?.players.forEach((p, id) => {
      live.add(id); let a = this.actors.get(id);
      if (!a) { a = this.createPerson(id, p.color || COLORS[0]); a.root.position.set(p.x, 0, p.z); this.actors.set(id, a); }
      const classInfo = CHARACTER_CLASSES[(p.classType || 'traveler') as CharacterClass] ?? CHARACTER_CLASSES.traveler;
      const nameLabel = a.label.querySelector('strong')!, classLabel = a.label.querySelector('small')!;
      if (nameLabel.textContent !== p.name) nameLabel.textContent = p.name;
      if (classLabel.textContent !== classInfo.name) classLabel.textContent = classInfo.name;
      const pos = a.root.position, snap = Math.hypot(pos.x - p.x, pos.z - p.z) > 8;
      pos.x += (p.x - pos.x) * (snap ? 1 : Math.min(1, dt * 18)); pos.z += (p.z - pos.z) * (snap ? 1 : Math.min(1, dt * 18));
      const angle = Math.atan2(Math.sin(p.yaw - a.root.rotation.y), Math.cos(p.yaw - a.root.rotation.y)); a.root.rotation.y += angle * Math.min(1, dt * 14);
      a.root.rotation.z = p.hp <= 0 ? Math.PI / 2 : 0; pos.y = p.moving ? Math.abs(Math.sin(t * 11)) * 0.05 : 0;
      this.recolorActor(a, p.classType || 'traveler', p.color);
      const stride = p.moving ? Math.sin(t * 11) * 0.9 : 0;
      a.limbs.forEach((limb, i) => {
        const isLeg = i % 2 === 0;
        const swing = p.moving ? stride * (i < 2 ? 1 : -1) * (isLeg ? 1 : -1) : 0;
        limb.rotation.x = swing;
      });
      if (p.attackUntil > (this.state?.time ?? 0)) {
        const swing = -1.8 + Math.sin(t * 30) * 1.1;
        a.limbs[1].rotation.x = swing;
        a.limbs[3].rotation.x = swing;
      }
      const bar = a.label.querySelector('b'); if (bar) (bar as HTMLElement).style.width = `${Math.max(0, Math.min(100, (p.hp / (p.maxHp || 100)) * 100))}%`;
      this.positionLabel(a, 2.8, p.connected && (!!me && Math.hypot(me.x - p.x, me.z - p.z) < 20));
      if (id === this.selfId) { this.target.copyFrom(pos); this.target.y = 1; }
    });
    this.state?.enemies.forEach((e, id) => {
      live.add(id); let a = this.actors.get(id);
      if (!a) { a = this.createEnemy(id, e.kind as EnemyKind); a.root.position.set(e.x, 0, e.z); this.actors.set(id, a); }
      a.root.setEnabled(e.hp > 0); a.root.position.x += (e.x - a.root.position.x) * Math.min(1, dt * 12); a.root.position.z += (e.z - a.root.position.z) * Math.min(1, dt * 12);
      a.root.rotation.y = e.yaw; a.root.position.y = e.kind === 'wisp' ? Math.sin(t * 2 + e.x) * 0.22 : e.kind === 'slime' ? Math.abs(Math.sin(t * 3 + e.z)) * 0.15 : 0;
      if (e.kind === 'slime') a.root.scaling.y = 1 + Math.sin(t * 3 + e.z) * 0.07;
      if (e.kind === 'warden') a.limbs.forEach(l => { l.rotation.x = e.attackUntil > (this.state?.time ?? 0) ? -1 : Math.sin(t) * 0.08; });
      const bar = a.label.querySelector('b'); if (bar) (bar as HTMLElement).style.width = `${e.hp / e.maxHp * 100}%`;
      this.positionLabel(a, e.kind === 'warden' ? 5.5 : 2.1, e.hp > 0 && !!me && Math.hypot(me.x - e.x, me.z - e.z) < 17);
    });
    this.actors.forEach((a, id) => { if (!live.has(id)) { a.root.dispose(); a.label.remove(); this.actors.delete(id); } });
    this.state?.loot.forEach((l, id) => {
      let mesh = this.drops.get(id);
      if (!mesh) { mesh = this.cylinder('loot', 0.55, 0, 0.9, 4, '#f5da91', l.x, 0.7, l.z); (mesh as Mesh).material = this.mat('#f5da91', true); this.drops.set(id, mesh); }
      mesh.rotation.y = t; mesh.position.y = 0.65 + Math.sin(t * 3) * 0.12;
    });
    this.drops.forEach((mesh, id) => { if (!this.state?.loot.has(id)) { mesh.dispose(); this.drops.delete(id); } });
    const selected = this.state?.enemies.get(this.selected);
    this.selection.setEnabled(!!selected && selected.hp > 0);
    if (selected) { this.selection.position.set(selected.x, 0.14, selected.z); this.selection.scaling.setAll(selected.kind === 'warden' ? 1.9 : 1); }
    this.positionLabel(this.npc, 2.8, !!me && Math.hypot(me.x - NPC.x, me.z - NPC.z) < 24);
    this.camera.setTarget(Vector3.Lerp(this.camera.target, this.target, this.reducedMotion ? 1 : Math.min(1, dt * 7)), false, true, true);
  }
  zoom(factor: number) { this.camera.radius = Math.max(11, Math.min(this.playing ? 36 : 45, this.camera.radius * factor)); }
  centerCamera() { this.camera.alpha = Math.PI / 2; this.camera.beta = .87; this.camera.radius = 23; }
  setQuality(quality: Quality | boolean) {
    this.quality = typeof quality === 'boolean' ? quality ? 'low' : 'high' : quality;
    this.fastWindows = 0; this.qualityAt = performance.now();
    this.applyQuality(this.quality === 'auto' ? 'medium' : this.quality === 'battery' ? 'low' : this.quality);
  }
  private applyQuality(level: 'low' | 'medium' | 'high') {
    this.qualityLevel = level;
    this.scene.shadowsEnabled = level === 'high'; this.glow.isEnabled = level !== 'low';
    this.particles.forEach((p, i) => p.mesh.setEnabled(level === 'high' || level === 'medium' && i % 2 === 0));
    // Engine adapts to device ratio; scale is expressed against CSS resolution.
    const ratio = window.devicePixelRatio || 1;
    this.engine.setHardwareScalingLevel(1 / (level === 'low' ? .75 : level === 'medium' ? 1 : Math.min(ratio, 1.5)));
  }
  get fps() { return this.measuredFPS; }
}
