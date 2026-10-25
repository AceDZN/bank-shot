// Loads the Tripo GLBs. Every model is optional: if one is missing the scene uses a procedural
// stand-in, so the game always runs.
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export interface Models {
  attendant: GLTF | null;
  stone: GLTF | null;
  fountain: GLTF | null;
  column: GLTF | null;
  lamp: GLTF | null;
  cue: GLTF | null;
}

const FILES: Record<keyof Models, string> = {
  attendant: 'attendant.glb',
  stone: 'curling-stone.glb',
  fountain: 'lion-fountain.glb',
  column: 'column.glb',
  lamp: 'oil-lamp.glb',
  cue: 'cue.glb',
};

export async function loadModels(onProgress?: (done: number, total: number) => void): Promise<Models> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const keys = Object.keys(FILES) as (keyof Models)[];
  let done = 0;
  const base = import.meta.env.BASE_URL;
  const loaded = await Promise.all(
    keys.map(
      (k) =>
        new Promise<GLTF | null>((resolve) => {
          loader.load(
            `${base}models/${FILES[k]}`,
            (g) => {
              onProgress?.(++done, keys.length);
              resolve(g);
            },
            undefined,
            () => {
              onProgress?.(++done, keys.length);
              resolve(null);
            },
          );
        }),
    ),
  );
  const out = {} as Models;
  keys.forEach((k, i) => (out[k] = loaded[i]));
  return out;
}

/** Scale an object so its bounding box height is `h`, and sit it on y = 0, centred in x/z. */
export function fitHeight(obj: THREE.Object3D, h: number): THREE.Object3D {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const s = h / (size.y || 1);
  obj.scale.multiplyScalar(s);
  const box2 = new THREE.Box3().setFromObject(obj);
  const c = box2.getCenter(new THREE.Vector3());
  obj.position.x -= c.x;
  obj.position.z -= c.z;
  obj.position.y -= box2.min.y;
  const wrap = new THREE.Group();
  wrap.add(obj);
  return wrap;
}

export function shadowsOn(obj: THREE.Object3D, cast = true, receive = true) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = cast;
      m.receiveShadow = receive;
    }
  });
}

/** Clip lookup by loose name (Tripo names clips after the preset). */
export function findClip(clips: THREE.AnimationClip[], ...names: string[]): THREE.AnimationClip | null {
  for (const n of names) {
    const c = clips.find((c) => c.name.toLowerCase().includes(n));
    if (c) return c;
  }
  return null;
}
