import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { PointerLockControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js";

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2e8b57);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 20);

// Renderer
const renderer = new THREE.WebGLReznderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new PointerLockControls(camera, document.body);
document.body.addEventListener("click", () => controls.lock());

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(10, 20, 10);
scene.add(dir);

// Field
const field = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 60),
  new THREE.MeshPhongMaterial({ color: 0x2e8b57 })
);
field.rotation.x = -Math.PI / 2;
scene.add(field);

// Goal
const goalZ = -28;
const goalWidth = 12;
const goalHeight = 5;

function post(x) {
  const p = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, goalHeight, 0.3),
    new THREE.MeshPhongMaterial({ color: 0xffffff })
  );
  p.position.set(x, goalHeight / 2, goalZ);
  return p;
}

scene.add(post(-goalWidth / 2), post(goalWidth / 2));

const crossbar = new THREE.Mesh(
  new THREE.BoxGeometry(goalWidth, 0.3, 0.3),
  new THREE.MeshPhongMaterial({ color: 0xffffff })
);
crossbar.position.set(0, goalHeight, goalZ);
scene.add(crossbar);

// Player model
const player = new THREE.Object3D();
player.position.set(0, 0, 15);
scene.add(player);

// Ball
const ball = new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 16, 16),
  new THREE.MeshPhongMaterial({ color: 0xffffff })
);
scene.add(ball);

let ballVelocity = new THREE.Vector3();
let ballInMotion = false;

function resetBall() {
  ball.position.set(player.position.x, 0.5, player.position.z - 1.5);
  ballVelocity.set(0, 0, 0);
  ballInMotion = false;
}
resetBall();

// Keeper (AI)
const keeper = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 1),
  new THREE.MeshPhongMaterial({ color: 0xff0000 })
);
keeper.position.set(0, 1, goalZ + 0.5);
scene.add(keeper);

// Score
let score = 0;
let shotsLeft = 5;
const scoreEl = document.getElementById("score");
function updateUI() {
  scoreEl.textContent = `Score: ${score} | Shots left: ${shotsLeft}`;
}
updateUI();

// Movement
const keys = {};
document.addEventListener("keydown", e => keys[e.code] = true);
document.addEventListener("keyup", e => keys[e.code] = false);

// Shoot
document.addEventListener("click", () => {
  if (!controls.isLocked || ballInMotion || shotsLeft <= 0) return;

  ballInMotion = true;
  shotsLeft--;
  updateUI();

  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0.15;
  dir.normalize();

  ballVelocity.copy(dir.multiplyScalar(0.6));
});

// AI Keeper
function updateKeeper(delta) {
  const speed = 6;
  const targetX = ballInMotion ? ball.position.x : 0;
  const dx = targetX - keeper.position.x;
  keeper.position.x += THREE.MathUtils.clamp(dx, -speed * delta, speed * delta);
}

// Goal check
function checkGoal() {
  if (ball.position.z < goalZ) {
    const insideX = Math.abs(ball.position.x) < goalWidth / 2;
    const insideY = ball.position.y < goalHeight;

    if (insideX && insideY) score++;

    updateUI();
    resetBall();
  }
}

// Keeper collision
function checkSave() {
  if (ball.position.distanceTo(keeper.position) < 1.5) {
    ballVelocity.z *= -0.4;
    ballVelocity.x *= 0.4;
  }
}

// Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  // Player movement
  if (controls.isLocked) {
    const speed = 10 * delta;
    if (keys["KeyW"]) player.position.z -= speed;
    if (keys["KeyS"]) player.position.z += speed;
    if (keys["KeyA"]) player.position.x -= speed;
    if (keys["KeyD"]) player.position.x += speed;

    player.position.x = THREE.MathUtils.clamp(player.position.x, -18, 18);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -5, 25);

    if (!ballInMotion) {
      ball.position.set(player.position.x, 0.5, player.position.z - 1.5);
    }
  }

  // Ball physics
  if (ballInMotion) {
    ballVelocity.y -= 9.8 * delta * 0.4;
    ball.position.addScaledVector(ballVelocity, delta);

    if (ball.position.y < 0.5) {
      ball.position.y = 0.5;
      ballVelocity.y *= -0.3;
    }

    checkSave();
    checkGoal();
  }

  updateKeeper(delta);

  renderer.render(scene, camera);
}

animate();
