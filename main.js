import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Octree } from "three/addons/math/Octree.js";
import { Capsule } from "three/addons/math/Capsule.js";

//Audio with Howler.js
const sounds = {
  backgroundMusic: new Howl({
    src: ["./sfx/music.ogg"],
    loop: true,
    volume: 0.3,
    preload: true,
  }),

  projectsSFX: new Howl({
    src: ["./sfx/projects.ogg"],
    volume: 0.5,
    preload: true,
  }),

  pokemonSFX: new Howl({
    src: ["./sfx/pokemon.ogg"],
    volume: 0.5,
    preload: true,
  }),

  jumpSFX: new Howl({
    src: ["./sfx/jumpsfx.ogg"],
    volume: 1.0,
    preload: true,
  }),
};

let touchHappened = false;

let isMuted = false;

function playSound(soundId) {
  if (!isMuted && sounds[soundId]) {
    sounds[soundId].play();
  }
}

function stopSound(soundId) {
  if (sounds[soundId]) {
    sounds[soundId].stop();
  }
}

//three.js setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaec972);
const canvas = document.getElementById("experience-canvas");
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Physics stuff
const GRAVITY = 30;
const CAPSULE_RADIUS = 0.35;
const CAPSULE_HEIGHT = 1;
const JUMP_HEIGHT = 11;
const MOVE_SPEED = 7;

let character = {
  instance: null,
  isMoving: false,
  spawnPosition: new THREE.Vector3(),
};
let targetRotation = Math.PI / 2;

const colliderOctree = new Octree();
const playerCollider = new Capsule(
  new THREE.Vector3(0, CAPSULE_RADIUS, 0),
  new THREE.Vector3(0, CAPSULE_HEIGHT, 0),
  CAPSULE_RADIUS
);

let playerVelocity = new THREE.Vector3();
let playerOnFloor = false;
let groundColliderMesh = null;
let hasMoveTarget = false;
const moveTarget = new THREE.Vector3();
const MOVE_TARGET_STOP_DISTANCE = 1.2;
let lastDistanceToMoveTarget = Infinity;
const moveApproachDirection = new THREE.Vector2();

// Renderer Stuff
// See: https://threejs.org/docs/?q=render#api/en/constants/Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.7;

// Some of our DOM elements, others are scattered in the file
let isModalOpen = false;
const modal = document.querySelector(".modal");
const modalbgOverlay = document.querySelector(".modal-bg-overlay");
const modalTitle = document.querySelector(".modal-title");
const modalProjectDescription = document.querySelector(
  ".modal-project-description"
);
const modalExitButton = document.querySelector(".modal-exit-button");
const modalVisitProjectButton = document.querySelector(
  ".modal-project-visit-button"
);
const themeToggleButton = document.querySelector(".theme-mode-toggle-button");
const firstIcon = document.querySelector(".first-icon");
const secondIcon = document.querySelector(".second-icon");

const audioToggleButton = document.querySelector(".audio-toggle-button");
const firstIconTwo = document.querySelector(".first-icon-two");
const secondIconTwo = document.querySelector(".second-icon-two");
const modalProjectImage = document.querySelector(".modal-project-image");

const PROJECT_IMAGE_BY_ID = {
  Project_1: "./media/project-1.png",
  Project_2: "./media/project-2.png",
  Project_3: "./media/project-3.png",
};
const projectBoardNames = new Set(["Project_1", "Project_2", "Project_3"]);
const textureLoader = new THREE.TextureLoader();
const projectBoardTextures = Object.fromEntries(
  Object.entries(PROJECT_IMAGE_BY_ID).map(([projectId, imagePath]) => {
    const texture = textureLoader.load(imagePath);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    return [projectId, texture];
  })
);

// Modal stuff
const modalContent = {
  Project_1: {
    title: "Web Vulnerability Scanner🔍",
    content:
      "Detects common security flaws such as SQL Injection, reflected XSS, and missing HTTP security headers. The tool uses a BFS-based crawler to explore web applications, test inputs in forms and parameters, and identify vulnerabilities with a risk-based scoring system (HIGH/MEDIUM/LOW). It includes features like rate limiting, stealth headers, and duplicate URL handling to simulate realistic scanning behavior, and generates detailed reports in JSON, HTML, and CSV formats for analysis.",
    link: "https://github.com/MuskanDhamuria/WebVulnerabilityScanner",
    image: PROJECT_IMAGE_BY_ID.Project_1,
  },
  Project_2: {
    title: "ESMOS Cloud-Native Platform☁️",
    content:
      "Designed and deployed cloud-native enterprise applications on Azure Kubernetes Service (AKS) using Docker, ArgoCD GitOps, and CI/CD pipelines. Implemented TLS-secured ingress routing with NGINX Ingress and cert-manager, container orchestration, persistent storage provisioning, monitoring/log analytics, and automated deployment workflows for scalable microservice-based healthcare systems.",
    link: "https://example.com/",
    image: PROJECT_IMAGE_BY_ID.Project_2,
  },
  Project_3: {
    title: "Koryori Hayashi🍳",
    content:
      "Developed an AI-enabled digital transformation platform for a local restaurant, integrating online ordering, analytics dashboards, inventory and pricing optimization, loyalty systems, queue management, and a machine learning-powered digital twin for operational simulation and decision support.",
    link: "https://github.com/MuskanDhamuria/Koryori_Hayashi",
    image: PROJECT_IMAGE_BY_ID.Project_3,
  },
  Chest: {
    title: "💁‍♀️ About Me",
    content:
      "Hi, you found my chest 👋 I’m Muskan, an aspiring Cybersecurity professional and Software Engineer passionate about building secure, scalable, and creative tech solutions."
  },
  Picnic: {
    title: "🍷 Picnic! 🧺",
    content:
      " Yayyy!!!",
  },
};

function showModal(id) {
  const content = modalContent[id];
  if (content) {
    modalTitle.textContent = content.title;
    modalProjectDescription.textContent = content.content;

    if (content.image) {
      modalProjectImage.src = content.image;
      modalProjectImage.classList.remove("hidden");
    } else {
      modalProjectImage.classList.add("hidden");
    }

    if (content.link) {
      modalVisitProjectButton.href = content.link;
      modalVisitProjectButton.classList.remove("hidden");
    } else {
      modalVisitProjectButton.classList.add("hidden");
    }
    modal.classList.remove("hidden");
    modalbgOverlay.classList.remove("hidden");
    isModalOpen = true;
  }
}

function hideModal() {
  isModalOpen = false;
  modal.classList.add("hidden");
  modalbgOverlay.classList.add("hidden");
  if (!isMuted) {
    playSound("projectsSFX");
  }
}

// Our Intersecting objects
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let intersectObject = "";
const intersectObjects = [];
const intersectObjectsNames = [
  "Project_1",
  "Project_2",
  "Project_3",
  "Picnic",
  "Squirtle",
  "Chicken",
  "Pikachu",
  "Bulbasaur",
  "Charmander",
  "Snorlax",
  "Chest",
];
const glowingProjectNames = new Set(["Project_1", "Project_2", "Project_3"]);
const interactiveGlowMaterials = [];

function registerInteractiveGlow(rootObject) {
  rootObject.traverse((node) => {
    if (!node.isMesh || !node.material) return;

    const materials = Array.isArray(node.material)
      ? node.material
      : [node.material];

    materials.forEach((material) => {
      if (!material || !("emissive" in material)) return;
      interactiveGlowMaterials.push({
        material,
        baseEmissive: material.emissive.clone(),
        baseIntensity: material.emissiveIntensity ?? 1,
      });
    });
  });
}

// Loading screen and loading manager
// See: https://threejs.org/docs/#api/en/loaders/managers/LoadingManager
const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.querySelector(".loading-text");
const enterButton = document.querySelector(".enter-button");
const instructions = document.querySelector(".instructions");

const manager = new THREE.LoadingManager();

manager.onLoad = function () {
  const t1 = gsap.timeline();

  t1.to(loadingText, {
    opacity: 0,
    duration: 0,
  });

  t1.to(enterButton, {
    opacity: 1,
    duration: 0,
  });
};

enterButton.addEventListener("click", () => {
  gsap.to(loadingScreen, {
    opacity: 0,
    duration: 0,
  });
  gsap.to(instructions, {
    opacity: 0,
    duration: 0,
    onComplete: () => {
      loadingScreen.remove();
    },
  });

  if (!isMuted) {
    playSound("projectsSFX");
    playSound("backgroundMusic");
  }
});

//Audio

// GLTF Loader
// See: https://threejs.org/docs/?q=glt#examples/en/loaders/GLTFLoader
const loader = new GLTFLoader(manager);

loader.load(
  "./Portfolio.glb",
  function (glb) {
    const applyBoardTexture = (mesh) => {
      const projectRootName = mesh.parent?.name;
      if (!projectBoardNames.has(projectRootName)) return;
      const projectTexture = projectBoardTextures[projectRootName];
      if (!projectTexture) return;

      const applyTextureToMaterial = (material) => {
        if (!material || !material.map) return;
        mesh.material = material.clone();
        mesh.material.map = projectTexture;
        mesh.material.needsUpdate = true;
      };

      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(applyTextureToMaterial);
      } else {
        applyTextureToMaterial(mesh.material);
      }
    };

    glb.scene.traverse((child) => {
      if (intersectObjectsNames.includes(child.name)) {
        intersectObjects.push(child);
        if (glowingProjectNames.has(child.name)) {
          registerInteractiveGlow(child);
        }
      }
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        applyBoardTexture(child);
      }

      if (child.name === "Character") {
        character.spawnPosition.copy(child.position);
        character.instance = child;
        playerCollider.start
          .copy(child.position)
          .add(new THREE.Vector3(0, CAPSULE_RADIUS, 0));
        playerCollider.end
          .copy(child.position)
          .add(new THREE.Vector3(0, CAPSULE_HEIGHT, 0));
      }
      if (child.name === "Ground_Collider") {
        groundColliderMesh = child;
        colliderOctree.fromGraphNode(child);
        child.visible = false;
      }
    });
    scene.add(glb.scene);
  },
  undefined,
  function (error) {
    console.error(error);
  }
);

// Lighting and Enviornment Stuff
// See: https://threejs.org/docs/?q=light#api/en/lights/DirectionalLight
// See: https://threejs.org/docs/?q=light#api/en/lights/AmbientLight
const sun = new THREE.DirectionalLight(0xffffff);
sun.castShadow = true;
sun.position.set(280, 200, -80);
sun.target.position.set(100, 0, -10);
sun.shadow.mapSize.width = 4096;
sun.shadow.mapSize.height = 4096;
sun.shadow.camera.left = -150;
sun.shadow.camera.right = 300;
sun.shadow.camera.top = 150;
sun.shadow.camera.bottom = -100;
sun.shadow.normalBias = 0.2;
scene.add(sun.target);
scene.add(sun);

// const shadowCameraHelper = new THREE.CameraHelper(sun.shadow.camera);
// scene.add(shadowCameraHelper);

// const sunHelper = new THREE.CameraHelper(sun);
// scene.add(sunHelper);

const light = new THREE.AmbientLight(0x404040, 2.7);
scene.add(light);

// Camera Stuff
// See: https://threejs.org/docs/?q=orth#api/en/cameras/OrthographicCamera
const aspect = sizes.width / sizes.height;
const camera = new THREE.OrthographicCamera(
  -aspect * 50,
  aspect * 50,
  50,
  -50,
  1,
  1000
);

camera.position.x = -13;
camera.position.y = 39;
camera.position.z = -67;

const cameraOffset = new THREE.Vector3(-13, 39, -67);

camera.zoom = 2.2;
camera.updateProjectionMatrix();

const controls = new OrbitControls(camera, canvas);
controls.update();

// Handle when window resizes
function onResize() {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  const aspect = sizes.width / sizes.height;
  camera.left = -aspect * 50;
  camera.right = aspect * 50;
  camera.top = 50;
  camera.bottom = -50;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

// Interact with Objects and Raycaster
// See: https://threejs.org/docs/?q=raycas#api/en/core/Raycaster
let isCharacterReady = true;

function jumpCharacter(meshID) {
  if (!isCharacterReady) return;

  const mesh = scene.getObjectByName(meshID);
  const jumpHeight = 2;
  const jumpDuration = 0.5;
  const isSnorlax = meshID === "Snorlax";

  const currentScale = {
    x: mesh.scale.x,
    y: mesh.scale.y,
    z: mesh.scale.z,
  };

  const t1 = gsap.timeline();

  t1.to(mesh.scale, {
    x: isSnorlax ? currentScale.x * 1.2 : 1.2,
    y: isSnorlax ? currentScale.y * 0.8 : 0.8,
    z: isSnorlax ? currentScale.z * 1.2 : 1.2,
    duration: jumpDuration * 0.2,
    ease: "power2.out",
  });

  t1.to(mesh.scale, {
    x: isSnorlax ? currentScale.x * 0.8 : 0.8,
    y: isSnorlax ? currentScale.y * 1.3 : 1.3,
    z: isSnorlax ? currentScale.z * 0.8 : 0.8,
    duration: jumpDuration * 0.3,
    ease: "power2.out",
  });

  t1.to(
    mesh.position,
    {
      y: mesh.position.y + jumpHeight,
      duration: jumpDuration * 0.5,
      ease: "power2.out",
    },
    "<"
  );

  t1.to(mesh.scale, {
    x: isSnorlax ? currentScale.x * 1.2 : 1,
    y: isSnorlax ? currentScale.y * 1.2 : 1,
    z: isSnorlax ? currentScale.z * 1.2 : 1,
    duration: jumpDuration * 0.3,
    ease: "power1.inOut",
  });

  t1.to(
    mesh.position,
    {
      y: mesh.position.y,
      duration: jumpDuration * 0.5,
      ease: "bounce.out",
      onComplete: () => {
        isCharacterReady = true;
      },
    },
    ">"
  );

  if (!isSnorlax) {
    t1.to(mesh.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: jumpDuration * 0.2,
      ease: "elastic.out(1, 0.3)",
    });
  }
}

function onClick(event) {
  if (touchHappened) return;
  if (isUIEventTarget(event.target)) return;

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  handleInteraction();
}

function handleInteraction() {
  if (!modal.classList.contains("hidden")) {
    return;
  }

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(intersectObjects);

  if (intersects.length > 0) {
    intersectObject = intersects[0].object.parent.name;
  } else {
    intersectObject = "";
  }

  if (intersectObject !== "") {
    if (
      [
        "Bulbasaur",
        "Chicken",
        "Pikachu",
        "Charmander",
        "Squirtle",
        "Snorlax",
      ].includes(intersectObject)
    ) {
      if (isCharacterReady) {
        if (!isMuted) {
          playSound("pokemonSFX");
        }
        jumpCharacter(intersectObject);
        isCharacterReady = false;
      }
    } else {
      if (intersectObject) {
        showModal(intersectObject);
        if (!isMuted) {
          playSound("projectsSFX");
        }
      }
    }
  } else {
    setMoveTargetFromPointer();
  }
}

function onMouseMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  touchHappened = false;
}

function onTouchEnd(event) {
  if (isUIEventTarget(event.target)) return;

  const touch = event.changedTouches && event.changedTouches[0];
  if (!touch) return;

  pointer.x = (touch.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(touch.clientY / window.innerHeight) * 2 + 1;

  touchHappened = true;
  handleInteraction();
}

function isUIEventTarget(target) {
  if (!target || typeof target.closest !== "function") return false;

  return Boolean(
    target.closest(
      ".loading-screen, .enter-button, .modal, .modal-bg-overlay, .theme-mode-toggle-button, .audio-toggle-button, .mobile-control"
    )
  );
}

function setMoveTargetFromPointer() {
  if (!groundColliderMesh || !character.instance) return false;

  raycaster.setFromCamera(pointer, camera);
  const groundHit = raycaster.intersectObject(groundColliderMesh, true);

  if (groundHit.length === 0) return false;

  moveTarget.copy(groundHit[0].point);
  moveApproachDirection.set(
    moveTarget.x - character.instance.position.x,
    moveTarget.z - character.instance.position.z
  );
  if (moveApproachDirection.lengthSq() > 0) {
    moveApproachDirection.normalize();
  }
  hasMoveTarget = true;
  lastDistanceToMoveTarget = Infinity;
  return true;
}

// Movement and Gameplay functions
function respawnCharacter() {
  character.instance.position.copy(character.spawnPosition);

  playerCollider.start
    .copy(character.spawnPosition)
    .add(new THREE.Vector3(0, CAPSULE_RADIUS, 0));
  playerCollider.end
    .copy(character.spawnPosition)
    .add(new THREE.Vector3(0, CAPSULE_HEIGHT, 0));

  playerVelocity.set(0, 0, 0);
  character.isMoving = false;
}

function playerCollisions() {
  const result = colliderOctree.capsuleIntersect(playerCollider);
  playerOnFloor = false;

  if (result) {
    playerOnFloor = result.normal.y > 0;
    playerCollider.translate(result.normal.multiplyScalar(result.depth));

    if (playerOnFloor) {
      character.isMoving = false;
      playerVelocity.x = 0;
      playerVelocity.z = 0;
    }
  }
}

function updatePlayer() {
  if (!character.instance) return;

  if (character.instance.position.y < -20) {
    respawnCharacter();
    return;
  }

  if (!playerOnFloor) {
    playerVelocity.y -= GRAVITY * 0.035;
  }

  playerCollider.translate(playerVelocity.clone().multiplyScalar(0.035));

  playerCollisions();

  character.instance.position.copy(playerCollider.start);
  character.instance.position.y -= CAPSULE_RADIUS;

  let rotationDiff =
    ((((targetRotation - character.instance.rotation.y) % (2 * Math.PI)) +
      3 * Math.PI) %
      (2 * Math.PI)) -
    Math.PI;
  let finalRotation = character.instance.rotation.y + rotationDiff;

  character.instance.rotation.y = THREE.MathUtils.lerp(
    character.instance.rotation.y,
    finalRotation,
    0.4
  );
}

function onKeyDown(event) {
  hasMoveTarget = false;
  lastDistanceToMoveTarget = Infinity;
  moveApproachDirection.set(0, 0);

  if (event.code.toLowerCase() === "keyr") {
    respawnCharacter();
    return;
  }

  switch (event.code.toLowerCase()) {
    case "keyw":
    case "arrowup":
      pressedButtons.up = true;
      break;
    case "keys":
    case "arrowdown":
      pressedButtons.down = true;
      break;
    case "keya":
    case "arrowleft":
      pressedButtons.left = true;
      break;
    case "keyd":
    case "arrowright":
      pressedButtons.right = true;
      break;
  }
}

function onKeyUp(event) {
  switch (event.code.toLowerCase()) {
    case "keyw":
    case "arrowup":
      pressedButtons.up = false;
      break;
    case "keys":
    case "arrowdown":
      pressedButtons.down = false;
      break;
    case "keya":
    case "arrowleft":
      pressedButtons.left = false;
      break;
    case "keyd":
    case "arrowright":
      pressedButtons.right = false;
      break;
  }
}

// Toggle Theme Function
function toggleTheme() {
  if (!isMuted) {
    playSound("projectsSFX");
  }
  const isDarkTheme = document.body.classList.contains("dark-theme");
  document.body.classList.toggle("dark-theme");
  document.body.classList.toggle("light-theme");

  if (firstIcon.style.display === "none") {
    firstIcon.style.display = "block";
    secondIcon.style.display = "none";
  } else {
    firstIcon.style.display = "none";
    secondIcon.style.display = "block";
  }

  gsap.to(light.color, {
    r: isDarkTheme ? 1.0 : 0.25,
    g: isDarkTheme ? 1.0 : 0.31,
    b: isDarkTheme ? 1.0 : 0.78,
    duration: 1,
    ease: "power2.inOut",
  });

  gsap.to(light, {
    intensity: isDarkTheme ? 0.8 : 0.9,
    duration: 1,
    ease: "power2.inOut",
  });

  gsap.to(sun, {
    intensity: isDarkTheme ? 1 : 0.8,
    duration: 1,
    ease: "power2.inOut",
  });

  gsap.to(sun.color, {
    r: isDarkTheme ? 1.0 : 0.25,
    g: isDarkTheme ? 1.0 : 0.41,
    b: isDarkTheme ? 1.0 : 0.88,
    duration: 1,
    ease: "power2.inOut",
  });
}

// Toggle Audio Function
function toggleAudio() {
  if (!isMuted) {
    playSound("projectsSFX");
  }
  if (firstIconTwo.style.display === "none") {
    firstIconTwo.style.display = "block";
    secondIconTwo.style.display = "none";
    isMuted = false;
    sounds.backgroundMusic.play();
  } else {
    firstIconTwo.style.display = "none";
    secondIconTwo.style.display = "block";
    isMuted = true;
    sounds.backgroundMusic.pause();
  }
}

// Mobile controls
const mobileControls = {
  up: document.querySelector(".mobile-control.up-arrow"),
  left: document.querySelector(".mobile-control.left-arrow"),
  right: document.querySelector(".mobile-control.right-arrow"),
  down: document.querySelector(".mobile-control.down-arrow"),
};

const pressedButtons = {
  up: false,
  left: false,
  right: false,
  down: false,
};

function handleJumpAnimation() {
  if (!character.instance || !character.isMoving) return;

  const jumpDuration = 0.5;
  const jumpHeight = 2;

  const t1 = gsap.timeline();

  t1.to(character.instance.scale, {
    x: 1.08,
    y: 0.9,
    z: 1.08,
    duration: jumpDuration * 0.2,
    ease: "power2.out",
  });

  t1.to(character.instance.scale, {
    x: 0.92,
    y: 1.1,
    z: 0.92,
    duration: jumpDuration * 0.3,
    ease: "power2.out",
  });

  t1.to(character.instance.scale, {
    x: 1,
    y: 1,
    z: 1,
    duration: jumpDuration * 0.3,
    ease: "power1.inOut",
  });

  t1.to(character.instance.scale, {
    x: 1,
    y: 1,
    z: 1,
    duration: jumpDuration * 0.2,
  });
}

function handleContinuousMovement() {
  if (!character.instance) return;

  const isManualMovement = Object.values(pressedButtons).some((pressed) => pressed);
  if (isManualMovement) {
    hasMoveTarget = false;
    lastDistanceToMoveTarget = Infinity;
    moveApproachDirection.set(0, 0);
  }

  if (
    isManualMovement &&
    !character.isMoving
  ) {
    if (!isMuted) {
      playSound("jumpSFX");
    }
    if (pressedButtons.up) {
      playerVelocity.z += MOVE_SPEED;
      targetRotation = 0;
    }
    if (pressedButtons.down) {
      playerVelocity.z -= MOVE_SPEED;
      targetRotation = Math.PI;
    }
    if (pressedButtons.left) {
      playerVelocity.x += MOVE_SPEED;
      targetRotation = Math.PI / 2;
    }
    if (pressedButtons.right) {
      playerVelocity.x -= MOVE_SPEED;
      targetRotation = -Math.PI / 2;
    }

    playerVelocity.y = JUMP_HEIGHT;
    character.isMoving = true;
    handleJumpAnimation();
  }

  if (hasMoveTarget && !character.isMoving && playerOnFloor) {
    const moveDirection = new THREE.Vector3(
      moveTarget.x - character.instance.position.x,
      0,
      moveTarget.z - character.instance.position.z
    );

    const distanceToTarget = moveDirection.length();
    const directionProgress =
      moveDirection.x * moveApproachDirection.x +
      moveDirection.z * moveApproachDirection.y;
    if (
      distanceToTarget <= MOVE_TARGET_STOP_DISTANCE ||
      directionProgress <= 0 ||
      distanceToTarget > lastDistanceToMoveTarget
    ) {
      hasMoveTarget = false;
      lastDistanceToMoveTarget = Infinity;
      moveApproachDirection.set(0, 0);
      playerVelocity.x = 0;
      playerVelocity.z = 0;
      return;
    }

    lastDistanceToMoveTarget = distanceToTarget;

    moveDirection.normalize();
    playerVelocity.x = moveDirection.x * MOVE_SPEED;
    playerVelocity.z = moveDirection.z * MOVE_SPEED;
    targetRotation = Math.atan2(moveDirection.x, moveDirection.z);

    if (!isMuted) {
      playSound("jumpSFX");
    }

    playerVelocity.y = JUMP_HEIGHT;
    character.isMoving = true;
    handleJumpAnimation();
  }
}

Object.entries(mobileControls).forEach(([direction, element]) => {
  element.addEventListener("touchstart", (e) => {
    e.preventDefault();
    pressedButtons[direction] = true;
  });

  element.addEventListener("touchend", (e) => {
    e.preventDefault();
    pressedButtons[direction] = false;
  });

  element.addEventListener("mousedown", (e) => {
    e.preventDefault();
    pressedButtons[direction] = true;
  });

  element.addEventListener("mouseup", (e) => {
    e.preventDefault();
    pressedButtons[direction] = false;
  });

  element.addEventListener("mouseleave", (e) => {
    pressedButtons[direction] = false;
  });

  element.addEventListener("touchcancel", (e) => {
    pressedButtons[direction] = false;
  });
});

window.addEventListener("blur", () => {
  Object.keys(pressedButtons).forEach((key) => {
    pressedButtons[key] = false;
  });
});

// Adding Event Listeners (tbh could make some of these just themselves rather than seperating them, oh well)
modalExitButton.addEventListener("click", hideModal);
modalbgOverlay.addEventListener("click", hideModal);
themeToggleButton.addEventListener("click", toggleTheme);
audioToggleButton.addEventListener("click", toggleAudio);
window.addEventListener("resize", onResize);
window.addEventListener("click", onClick, { passive: false });
window.addEventListener("mousemove", onMouseMove);
window.addEventListener("touchend", onTouchEnd, { passive: false });
window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);

// Like our movie strip!!! Calls on each frame.
function animate() {
  updatePlayer();
  handleContinuousMovement();

  const glowPulse = 0.05 + 0.08 * (0.5 + 0.5 * Math.sin(performance.now() * 0.004));
  for (const entry of interactiveGlowMaterials) {
    entry.material.emissive.copy(entry.baseEmissive);
    entry.material.emissive.addScalar(glowPulse);
    entry.material.emissiveIntensity = Math.max(entry.baseIntensity, 1);
  }

  if (character.instance) {
    const targetCameraPosition = new THREE.Vector3(
      character.instance.position.x + cameraOffset.x - 20,
      cameraOffset.y,
      character.instance.position.z + cameraOffset.z + 30
    );
    camera.position.copy(targetCameraPosition);
    camera.lookAt(
      character.instance.position.x + 10,
      camera.position.y - 39,
      character.instance.position.z + 10
    );
  }

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(intersectObjects);

  if (intersects.length > 0) {
    document.body.style.cursor = "pointer";
  } else {
    document.body.style.cursor = "default";
    intersectObject = "";
  }

  for (let i = 0; i < intersects.length; i++) {
    intersectObject = intersects[0].object.parent.name;
  }

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
