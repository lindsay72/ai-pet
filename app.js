(() => {
if (window.__aiPetInitialized) {
  return;
}
window.__aiPetInitialized = true;

const pet = document.querySelector("#pet");
const bubble = document.querySelector("#bubble");
const thought = document.querySelector("#thought");
const moodValue = document.querySelector("#moodValue");
const energyValue = document.querySelector("#energyValue");
const customPetImage = document.querySelector("#customPetImage");
const petVideo = document.querySelector("#petVideo");
const petVideoCanvas = document.querySelector("#petVideoCanvas");
const petVideoContext = petVideoCanvas.getContext("2d", { willReadFrequently: true });
const petImageInput = document.querySelector("#petImageInput");
const closeButton = document.querySelector("#closeButton");
const actionsMenu = document.querySelector(".actions");
const actionButtons = document.querySelectorAll("[data-action]");
const isDesktop = new URLSearchParams(window.location.search).get("desktop") === "1";
const desktopPet = window.desktopPet;
const spriteFrameRoot = "assets/pets/royal-kitsune/frames";
const defaultPetImage = `${spriteFrameRoot}/idle.png`;
const walkVideoSource = "assets/pets/royal-kitsune/walk.mp4";

const state = {
  mood: 84,
  energy: 76,
  sleeping: false,
  outfit: 0,
  drag: {
    active: false,
    moved: false,
    pointerId: null,
    offsetX: 0,
    offsetY: 0,
  },
};

const outfitClasses = ["outfit-cream", "outfit-mint", "outfit-berry", "outfit-night"];
const motionClasses = ["happy", "wave", "jump", "spin", "dance", "stretch"];
const spriteAnimations = {
  idle: {
    frames: [`${spriteFrameRoot}/idle.png`],
    fps: 1,
    loop: true,
  },
  cute: {
    frames: Array.from({ length: 121 }, (_item, index) => `${spriteFrameRoot}/cute-${index + 1}.png`),
    fps: 24,
    loop: false,
    next: "idle",
  },
};

Object.values(spriteAnimations).forEach((animation) => {
  animation.frames.forEach((frame) => {
    const image = new Image();
    image.src = frame;
  });
});

document.body.classList.toggle("desktop-mode", isDesktop);
document.body.classList.add(outfitClasses[state.outfit]);
actionsMenu.setAttribute("aria-hidden", isDesktop ? "true" : "false");

window.performPetAction = (action) => {
  performAction(action);
  hideActionsMenu();
};

function applyPetImage(source, announce = true) {
  window.clearInterval(playSpriteAnimation.frameTimer);
  window.clearTimeout(playSpriteAnimation.durationTimer);
  stopVideoAnimation();
  setSpriteFrame(source);
  if (announce) {
    say("新形象加载好了。", "outfit");
  }
}

window.setPetImage = (dataUrl) => {
  applyPetImage(dataUrl);
};

window.clearPetImage = () => {
  stopVideoAnimation();
  customPetImage.style.backgroundImage = "";
  document.body.classList.remove("custom-pet");
  say("恢复默认形象。", "outfit");
};

applyPetImage(defaultPetImage, false);

const lines = {
  idle: [
    "我在等你摸摸头。",
    "今天也要陪你写点厉害的东西。",
    "我刚刚巡逻了一圈桌面，安全。",
    "摸我一下，我会认真开心。",
  ],
  cute: ["卖萌成功。", "今天也要可爱一点。"],
  walk: ["我去巡逻一小圈。", "走路模式启动。"],
  outfit: ["换个颜色，换个心情。", "新造型已保存到本次会话。"],
  upload: ["挑一张透明 PNG 会更像桌宠。", "我准备好换新形象了。"],
  pet: ["嘿嘿。", "头顶收到。", "再摸一下也可以。"],
};

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function updateStats() {
  moodValue.textContent = state.mood;
  energyValue.textContent = state.energy;
}

function say(message, type = "idle") {
  bubble.textContent = message;
  thought.textContent = message;
  bubble.classList.add("show");
  window.clearTimeout(say.hideTimer);
  say.hideTimer = window.setTimeout(() => {
    bubble.classList.remove("show");
    if (!state.sleeping) {
      thought.textContent = randomLine(lines.idle);
    }
  }, type === "idle" ? 1800 : 2600);
}

function randomLine(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function celebrate() {
  triggerMotion("happy", 650);
}

function triggerMotion(motion, duration = 900) {
  motionClasses.forEach((className) => pet.classList.remove(className));
  void pet.offsetWidth;
  pet.classList.add(motion);
  window.clearTimeout(triggerMotion.timer);
  triggerMotion.timer = window.setTimeout(() => {
    pet.classList.remove(motion);
  }, duration);
}

function setSpriteFrame(source) {
  stopVideoAnimation();
  customPetImage.style.backgroundImage = `url("${source}")`;
  document.body.classList.add("custom-pet");
}

function stopVideoAnimation() {
  window.cancelAnimationFrame(playVideoAnimation.frameTimer);
  petVideo.pause();
  petVideo.removeAttribute("src");
  petVideo.load();
  petVideoContext.clearRect(0, 0, petVideoCanvas.width, petVideoCanvas.height);
  document.body.classList.remove("video-pet");
}

function playVideoAnimation(source) {
  window.clearInterval(playSpriteAnimation.frameTimer);
  window.clearTimeout(playSpriteAnimation.durationTimer);
  customPetImage.style.backgroundImage = "";
  document.body.classList.remove("custom-pet");
  document.body.classList.add("video-pet");
  petVideo.src = source;
  petVideo.currentTime = 0;
  const playPromise = petVideo.play();
  playVideoAnimation.frameTimer = window.requestAnimationFrame(renderVideoFrame);

  if (playPromise) {
    playPromise.catch(() => {
      playSpriteAnimation("idle");
      say("走路视频没有播放成功。", "outfit");
    });
  }
}

function renderVideoFrame() {
  if (!document.body.classList.contains("video-pet")) {
    return;
  }

  if (petVideo.videoWidth && petVideo.videoHeight) {
    if (petVideoCanvas.width !== petVideo.videoWidth || petVideoCanvas.height !== petVideo.videoHeight) {
      petVideoCanvas.width = petVideo.videoWidth;
      petVideoCanvas.height = petVideo.videoHeight;
    }

    petVideoContext.drawImage(petVideo, 0, 0, petVideoCanvas.width, petVideoCanvas.height);
    const frame = petVideoContext.getImageData(0, 0, petVideoCanvas.width, petVideoCanvas.height);
    const pixels = frame.data;
    const keyColor = getVideoKeyColor(pixels, petVideoCanvas.width, petVideoCanvas.height);

    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const redDelta = red - keyColor.red;
      const greenDelta = green - keyColor.green;
      const blueDelta = blue - keyColor.blue;
      const keyDistance = Math.sqrt(redDelta * redDelta + greenDelta * greenDelta + blueDelta * blueDelta);
      const greenBias = green - Math.max(red, blue);

      if (greenBias > 4) {
        pixels[index + 1] = Math.max(red, blue) + Math.max(0, greenBias * 0.18);
      }

      if (keyDistance < 42) {
        pixels[index + 3] = 0;
      } else if (keyDistance < 96 && greenBias > -8) {
        pixels[index + 3] = Math.round(((keyDistance - 42) / 54) * 255);
      }
    }

    petVideoContext.putImageData(frame, 0, 0);
  }

  playVideoAnimation.frameTimer = window.requestAnimationFrame(renderVideoFrame);
}

function getVideoKeyColor(pixels, width, height) {
  const samples = [];
  const step = Math.max(6, Math.floor(Math.min(width, height) / 24));
  const edge = Math.max(8, Math.floor(Math.min(width, height) * 0.06));

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (x > edge && x < width - edge && y > edge && y < height - edge) {
        continue;
      }

      const index = (y * width + x) * 4;
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const greenBias = green - Math.max(red, blue);

      if (greenBias > 8) {
        samples.push([red, green, blue]);
      }
    }
  }

  if (!samples.length) {
    return { red: 74, green: 128, blue: 94 };
  }

  samples.sort((left, right) => left[1] - right[1]);
  const midpoint = Math.floor(samples.length / 2);
  return {
    red: samples[midpoint][0],
    green: samples[midpoint][1],
    blue: samples[midpoint][2],
  };
}

function playSpriteAnimation(name) {
  const animation = spriteAnimations[name] || spriteAnimations.idle;
  let frame = 0;

  window.clearInterval(playSpriteAnimation.frameTimer);
  window.clearTimeout(playSpriteAnimation.durationTimer);

  const render = () => {
    setSpriteFrame(animation.frames[frame]);
    frame += 1;
    if (frame >= animation.frames.length) {
      if (animation.loop) {
        frame = 0;
      } else {
        window.clearInterval(playSpriteAnimation.frameTimer);
        playSpriteAnimation(animation.next || "idle");
      }
    }
  };

  render();
  if (animation.frames.length > 1) {
    playSpriteAnimation.frameTimer = window.setInterval(render, 1000 / animation.fps);
  }

  if (animation.duration) {
    playSpriteAnimation.durationTimer = window.setTimeout(() => {
      playSpriteAnimation(animation.next || "idle");
    }, animation.duration);
  }
}

function setSleeping(isSleeping) {
  state.sleeping = isSleeping;
  pet.classList.toggle("sleeping", isSleeping);
}

function performAction(action) {
  if (action === "cute") {
    setSleeping(false);
    state.mood = clamp(state.mood + 7);
    playSpriteAnimation("cute");
    say(randomLine(lines.cute), action);
  } else if (action === "walk") {
    setSleeping(false);
    state.mood = clamp(state.mood + 4);
    state.energy = clamp(state.energy - 2);
    playVideoAnimation(walkVideoSource);
    say(randomLine(lines.walk), action);
  } else if (action === "upload-image") {
    if (desktopPet) {
      say(randomLine(lines.upload), action);
    } else {
      petImageInput.click();
    }
  } else if (action === "reset-image") {
    playSpriteAnimation("idle");
    say("恢复默认动作帧。", "outfit");
  }

  updateStats();
}

function showActionsMenu(event) {
  if (!isDesktop) {
    return;
  }

  event.preventDefault();
  if (desktopPet) {
    desktopPet.showMenu();
    return;
  }

  const menuWidth = 112;
  const menuHeight = 430;
  const x = clampRange(event.clientX, 8, window.innerWidth - menuWidth - 8);
  const y = clampRange(event.clientY, 8, window.innerHeight - menuHeight - 8);

  actionsMenu.style.setProperty("--menu-x", `${x}px`);
  actionsMenu.style.setProperty("--menu-y", `${y}px`);
  actionsMenu.classList.add("open");
  actionsMenu.setAttribute("aria-hidden", "false");
}

function hideActionsMenu() {
  if (!isDesktop) {
    return;
  }

  actionsMenu.classList.remove("open");
  actionsMenu.setAttribute("aria-hidden", "true");
}

function startDrag(event) {
  if (event.button !== 0) {
    return;
  }

  hideActionsMenu();
  const rect = pet.getBoundingClientRect();
  if (isDesktop && desktopPet) {
    state.drag = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      offsetX: event.clientX,
      offsetY: event.clientY,
    };
    pet.classList.add("dragging");
    pet.setPointerCapture(event.pointerId);
    desktopPet.startDrag({ x: Math.round(event.clientX), y: Math.round(event.clientY) });
    return;
  }

  state.drag = {
    active: true,
    moved: false,
    pointerId: event.pointerId,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  };
  pet.classList.add("dragging");
  pet.setPointerCapture(event.pointerId);
}

function moveDrag(event) {
  if (!state.drag.active || event.pointerId !== state.drag.pointerId) {
    return;
  }

  if (isDesktop && desktopPet) {
    state.drag.moved = true;
    return;
  }

  const petWidth = pet.offsetWidth;
  const petHeight = pet.offsetHeight;
  const nextX = clampRange(event.clientX - state.drag.offsetX, 4, window.innerWidth - petWidth - 4);
  const nextY = clampRange(event.clientY - state.drag.offsetY, 4, window.innerHeight - petHeight - 4);

  state.drag.moved = true;
  pet.style.left = `${nextX}px`;
  pet.style.top = `${nextY}px`;
  pet.style.bottom = "auto";
}

function endDrag(event) {
  if (!state.drag.active || event.pointerId !== state.drag.pointerId) {
    return;
  }

  state.drag.active = false;
  pet.classList.remove("dragging");
  if (isDesktop && desktopPet) {
    desktopPet.stopDrag();
  }
  pet.releasePointerCapture(event.pointerId);
}

function clampRange(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

pet.addEventListener("pointerdown", startDrag);
pet.addEventListener("pointermove", moveDrag);
pet.addEventListener("pointerup", endDrag);
pet.addEventListener("pointercancel", endDrag);
pet.addEventListener("contextmenu", showActionsMenu);
petVideo.addEventListener("ended", () => {
  playSpriteAnimation("idle");
});
closeButton.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});
closeButton.addEventListener("click", (event) => {
  event.stopPropagation();
  if (desktopPet) {
    desktopPet.close();
  } else {
    document.querySelector(".desktop").hidden = true;
  }
});
document.addEventListener("pointerup", endDrag);
document.addEventListener("pointercancel", endDrag);

pet.addEventListener("click", () => {
  if (state.drag.moved) {
    state.drag.moved = false;
    return;
  }
  state.mood = clamp(state.mood + 3);
  say(randomLine(lines.pet), "pet");
  celebrate();
  updateStats();
});

actionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    performAction(button.dataset.action);
    hideActionsMenu();
  });
});

petImageInput.addEventListener("change", () => {
  const file = petImageInput.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    window.setPetImage(reader.result);
    triggerMotion("stretch", 900);
  });
  reader.readAsDataURL(file);
  petImageInput.value = "";
});

document.addEventListener("pointerdown", (event) => {
  if (!actionsMenu.contains(event.target) && !pet.contains(event.target)) {
    hideActionsMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hideActionsMenu();
  }
});

window.setInterval(() => {
  if (state.sleeping) {
    state.energy = clamp(state.energy + 1);
  } else {
    state.energy = clamp(state.energy - 1);
    state.mood = clamp(state.mood - (state.energy < 25 ? 2 : 1));
  }
  updateStats();
}, 7000);

window.setInterval(() => {
  if (!state.sleeping) {
    say(randomLine(lines.idle), "idle");
  }
}, 9000);

updateStats();
})();
