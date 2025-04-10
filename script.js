// Wait for the DOM and jsPDF libraries
document.addEventListener("DOMContentLoaded", () => {
  // --- Ensure jsPDF is loaded ---
  // We'll check for jsPDF inside generateReport as it might load slightly after DOMContentLoaded
  // const { jsPDF } = window.jspdf; // Not needed globally if only used in one function

  // --- DOM Elements ---
  const body = document.body;
  const levelDisplay = document.getElementById("level");
  const scoreDisplay = document.getElementById("score");
  const accuracyDisplay = document.getElementById("accuracy");
  const highScoreDisplay = document.getElementById("high-score");
  const maxLevelDisplay = document.getElementById("max-level");
  const modeSelectionDiv = document.getElementById("mode-selection");
  const modeButtons = document.querySelectorAll(".btn-mode");
  const instructionsDiv = document.getElementById("instructions");
  const startButton = document.getElementById("start-button");
  const startModeNameSpan = document.getElementById("start-mode-name");
  const statusBar = document.getElementById("status-bar");
  const modeSpecificStatus = document.getElementById("mode-specific-status");
  const gameAreaWrapper = document.getElementById("game-area-wrapper");
  const targetColorDisplay = document.getElementById("target-color-display");
  const targetColorSwatch = document.getElementById("target-color-swatch");
  const levelObjective = document.getElementById("level-objective");
  const gameArea = document.getElementById("game-area");
  const feedbackArea = document.getElementById("feedback-area");
  const resultsArea = document.getElementById("results-area");
  const finalModeDisplay = document.getElementById("final-mode");
  const finalScoreDisplay = document.getElementById("final-score");
  const finalLevelDisplay = document.getElementById("final-level");
  const finalAccuracyDisplay = document.getElementById("final-accuracy");
  const totalAttemptsDisplay = document.getElementById("total-attempts");
  const achievementsEarnedDiv = document.getElementById("achievements-earned");
  const restartButton = document.getElementById("restart-button");
  const reportButton = document.getElementById("report-button");
  const achievementsDisplayDiv = document.getElementById(
    "achievements-display"
  );
  const achievementsListDiv = document.getElementById("achievements-list");

  // Settings Modal Elements
  const settingsButton = document.getElementById("settings-button");
  const settingsModal = document.getElementById("settings-modal");
  const closeSettingsButton = document.getElementById("close-settings-button");
  const themeSelect = document.getElementById("theme-select");
  const soundToggle = document.getElementById("sound-toggle");
  const focusAreaSelect = document.getElementById("focus-area-select");
  const resetProgressButton = document.getElementById("reset-progress-button");

  // Audio Elements
  const correctSound = document.getElementById("correct-sound");
  const incorrectSound = document.getElementById("incorrect-sound");
  const levelUpSound = document.getElementById("level-up-sound");
  const achievementSound = document.getElementById("achievement-sound");

  // --- Game State & Configuration ---
  let gameState = {
    currentLevel: 1,
    score: 0,
    totalAttempts: 0,
    correctAttempts: 0,
    consecutiveCorrect: 0,
    targetColorHSL: null,
    baseColorHSL: null,
    optionsData: [], // For color match mode [{hsl: HSL, isCorrect: bool}]
    targetIndex: -1, // For odd one out
    gameActive: false,
    levelStartTime: 0,
    currentGameMode: null, // 'oddOneOut', 'colorMatch'
    gameHistory: [], // For report
    // Persistent State (loaded from localStorage)
    highScore: 0,
    maxLevelOverall: 0,
    settings: {
      theme: "light",
      soundEnabled: true,
      focusArea: "all", // 'all', 'rg', 'by'
    },
    achievements: [], // Array of achievement IDs unlocked
  };

  // --- Constants ---
  const MAX_LEVEL = 50; // Increase max level
  const STARTING_GRID_SIZE = 2;
  const MAX_GRID_SIZE = 8;
  const MIN_PERCEPTUAL_DIFFERENCE = 2.5; // Slightly lower min diff for harder levels
  const ACHIEVEMENT_LIST = {
    level5: {
      id: "level5",
      name: "Level 5 Reached",
      icon: "fa-star",
      desc: "Reached Level 5 in any mode.",
    },
    level10: {
      id: "level10",
      name: "Level 10!",
      icon: "fa-medal",
      desc: "Reached Level 10 in any mode.",
    },
    level25: {
      id: "level25",
      name: "Level 25 Pro",
      icon: "fa-trophy",
      desc: "Reached Level 25 in any mode.",
    },
    accuracy80: {
      id: "accuracy80",
      name: "Sharp Eye (80%)",
      icon: "fa-eye",
      desc: "Achieved 80%+ accuracy in a session.",
    },
    accuracy95: {
      id: "accuracy95",
      name: "Eagle Eye (95%)",
      icon: "fa-binoculars",
      desc: "Achieved 95%+ accuracy in a session.",
    },
    streak5: {
      id: "streak5",
      name: "5 Correct Streak",
      icon: "fa-bolt",
      desc: "Got 5 correct answers in a row.",
    },
    streak10: {
      id: "streak10",
      name: "10 Correct Streak!",
      icon: "fa-meteor",
      desc: "Got 10 correct answers in a row.",
    },
    firstMatch: {
      id: "firstMatch",
      name: "Matcher",
      icon: "fa-equals",
      desc: "Completed a Color Match level.",
    },
    firstOddOut: {
      id: "firstOddOut",
      name: "Spotter",
      icon: "fa-search",
      desc: "Completed an Odd One Out level.",
    },
  };

  // --- LocalStorage Handling ---
  const STORAGE_KEY = "colorVisionTrainerState";

  function saveState() {
    try {
      const stateToSave = {
        highScore: gameState.highScore,
        maxLevelOverall: gameState.maxLevelOverall,
        settings: gameState.settings,
        achievements: gameState.achievements,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      // console.log("State saved:", stateToSave);
    } catch (e) {
      console.error("Could not save game state to localStorage:", e);
    }
  }

  function loadState() {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const loaded = JSON.parse(savedState);
        // Merge loaded state carefully, providing defaults if keys are missing
        gameState.highScore = loaded.highScore || 0;
        gameState.maxLevelOverall = loaded.maxLevelOverall || 0;
        // Ensure settings object and its keys exist
        gameState.settings = {
          theme: loaded.settings?.theme || "light",
          soundEnabled:
            typeof loaded.settings?.soundEnabled === "boolean"
              ? loaded.settings.soundEnabled
              : true,
          focusArea: loaded.settings?.focusArea || "all",
        };
        gameState.achievements = Array.isArray(loaded.achievements)
          ? loaded.achievements
          : [];
        // console.log("State loaded:", gameState);
      }
    } catch (e) {
      console.error("Could not load game state from localStorage:", e);
      // Reset to defaults if loading fails? Or just use initial gameState.
    }
    // Apply loaded settings and update UI
    applySettings();
    updateHighScoreDisplay();
    displayAchievements();
  }

  function resetProgress() {
    if (
      confirm(
        "Are you sure you want to reset all progress? High scores, max level, and achievements will be lost."
      )
    ) {
      gameState.highScore = 0;
      gameState.maxLevelOverall = 0;
      gameState.achievements = [];
      // Keep settings unless explicitly reset
      // gameState.settings = { theme: 'light', soundEnabled: true, focusArea: 'all' };
      saveState();
      updateHighScoreDisplay();
      displayAchievements();
      alert("Progress has been reset.");
      // Optionally reload the page or update UI elements directly
      // location.reload();
    }
  }

  // --- Settings ---
  function applySettings() {
    // Theme
    body.classList.remove("light-mode", "dark-mode");
    body.classList.add(gameState.settings.theme + "-mode");
    themeSelect.value = gameState.settings.theme;

    // Sound
    soundToggle.checked = gameState.settings.soundEnabled;

    // Focus Area
    focusAreaSelect.value = gameState.settings.focusArea;
  }

  function handleSettingsChange() {
    gameState.settings.theme = themeSelect.value;
    gameState.settings.soundEnabled = soundToggle.checked;
    gameState.settings.focusArea = focusAreaSelect.value;
    applySettings();
    saveState();
  }

  function openSettingsModal() {
    settingsModal.classList.remove("hidden");
  }
  function closeSettingsModal() {
    settingsModal.classList.add("hidden");
  }

  // --- Sound Effects ---
  function playSound(soundElement) {
    if (gameState.settings.soundEnabled && soundElement) {
      soundElement.currentTime = 0; // Rewind to start
      soundElement.play().catch((e) => console.warn("Sound play failed:", e)); // Play and catch errors
    }
  }

  // --- Achievements ---
  function checkAndGrantAchievement(id) {
    if (!gameState.achievements.includes(id) && ACHIEVEMENT_LIST[id]) {
      gameState.achievements.push(id);
      displayAchievements(); // Update the main list
      saveState();
      showAchievementEarned(id); // Show temporary notification
      playSound(achievementSound);
      console.log(`Achievement Unlocked: ${ACHIEVEMENT_LIST[id].name}`);
    }
  }

  function displayAchievements() {
    achievementsListDiv.innerHTML = ""; // Clear current list
    if (gameState.achievements.length === 0) {
      achievementsListDiv.innerHTML =
        "<p>Play games to unlock achievements!</p>";
      return;
    }
    gameState.achievements.forEach((id) => {
      const achievement = ACHIEVEMENT_LIST[id];
      if (achievement) {
        const badge = document.createElement("span");
        badge.classList.add("badge");
        badge.innerHTML = `<i class="fas ${achievement.icon}"></i> ${achievement.name}`;
        badge.title = achievement.desc; // Tooltip
        achievementsListDiv.appendChild(badge);
      }
    });
  }

  function showAchievementEarned(id) {
    const achievement = ACHIEVEMENT_LIST[id];
    if (achievement) {
      const badge = document.createElement("span");
      badge.classList.add("badge");
      badge.innerHTML = `<i class="fas ${achievement.icon}"></i> Unlocked: ${achievement.name}!`;
      achievementsEarnedDiv.appendChild(badge);
      // Maybe add animation later
    }
  }

  function checkSessionAchievements() {
    // Check accuracy achievements at end of game
    const accuracy =
      gameState.totalAttempts === 0
        ? 0
        : Math.round(
            (gameState.correctAttempts / gameState.totalAttempts) * 100
          );
    if (accuracy >= 95) {
      checkAndGrantAchievement("accuracy95");
    } else if (accuracy >= 80) {
      checkAndGrantAchievement("accuracy80");
    }
  }

  // --- Helper Functions ---
  function hslObjectToString(hslObj, precision = 1) {
    if (!hslObj) return "N/A";
    return `hsl(${hslObj.h.toFixed(0)}, ${hslObj.s.toFixed(
      precision
    )}%, ${hslObj.l.toFixed(precision)}%)`;
  }

  function calculateColorDifference(hsl1, hsl2) {
    if (!hsl1 || !hsl2) return Infinity;
    const hueDiff = Math.min(
      Math.abs(hsl1.h - hsl2.h),
      360 - Math.abs(hsl1.h - hsl2.h)
    );
    const satDiff = Math.abs(hsl1.s - hsl2.s);
    const lightDiff = Math.abs(hsl1.l - hsl2.l);
    return hueDiff + satDiff + lightDiff;
  }

  // Function to constrain hue based on focus setting
  function getFocusedHue() {
    let baseHue;
    const focus = gameState.settings.focusArea;
    if (focus === "rg") {
      // Red-Green range (approx 0-60 and 120-180 are less distinct for RG)
      // Focus on hues around Yellows/Oranges (30-70) and Blue/Violets (200-300)
      baseHue =
        Math.random() < 0.5
          ? 30 + Math.random() * 40
          : 200 + Math.random() * 100;
    } else if (focus === "by") {
      // Blue-Yellow range (approx 240-300 and 60-120 are less distinct for BY)
      // Focus on hues around Reds/Magentas (300-360, 0-30) and Greens/Cyans (90-210)
      baseHue =
        Math.random() < 0.5
          ? (300 + Math.random() * 90) % 360
          : 90 + Math.random() * 120;
    } else {
      // 'all' colors
      baseHue = Math.random() * 360;
    }
    return (baseHue + 360) % 360; // Ensure positive wrap around
  }

  // --- Core Game Logic ---

  function selectMode(mode) {
    gameState.currentGameMode = mode;
    modeButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });
    startButton.classList.remove("hidden");
    const modeName = mode === "oddOneOut" ? "Odd One Out" : "Color Match";
    startModeNameSpan.textContent = modeName;
    instructionsDiv.querySelector(
      "p"
    ).textContent = `Ready to play ${modeName}?`;

    // Reset areas for mode switch
    resultsArea.classList.add("hidden");
    gameAreaWrapper.classList.add("hidden");
    statusBar.classList.add("hidden");
  }

  function startGame() {
    if (!gameState.currentGameMode) {
      alert("Please select a game mode first!");
      return;
    }
    console.log(`Starting game: ${gameState.currentGameMode}`);
    // Reset session state
    gameState.currentLevel = 1;
    gameState.score = 0;
    gameState.totalAttempts = 0;
    gameState.correctAttempts = 0;
    gameState.consecutiveCorrect = 0;
    gameState.gameHistory = [];
    gameState.gameActive = true;

    updateStatusDisplay(); // Initial display
    modeSelectionDiv.classList.add("hidden");
    instructionsDiv.classList.add("hidden");
    startButton.classList.add("hidden");
    resultsArea.classList.add("hidden");
    achievementsEarnedDiv.innerHTML = ""; // Clear previous session achievements
    gameAreaWrapper.classList.remove("hidden");
    statusBar.classList.remove("hidden");
    gameAreaWrapper.style.opacity = 1;
    feedbackArea.textContent = "";
    feedbackArea.className = "";
    feedbackArea.classList.remove("visible");

    generateLevel(); // Generate the first level for the selected mode
  }

  // --- Level Generation (Router) ---
  function generateLevel() {
    if (!gameState.gameActive) return;
    if (gameState.currentLevel > MAX_LEVEL) {
      endGame();
      return;
    }

    gameState.levelStartTime = Date.now();
    gameArea.innerHTML = ""; // Clear previous grid/options
    levelObjective.textContent = `Level ${gameState.currentLevel}: `; // Start objective text
    feedbackArea.classList.remove("visible"); // Hide feedback
    modeSpecificStatus.textContent = ""; // Clear mode status
    targetColorDisplay.classList.add("hidden"); // Hide target swatch by default

    if (gameState.currentGameMode === "oddOneOut") {
      generateOddOneOutLevel();
    } else if (gameState.currentGameMode === "colorMatch") {
      generateColorMatchLevel();
    }

    updateStatusDisplay();
  }

  // --- Odd One Out: Generation ---
  function generateOddOneOutLevel() {
    levelObjective.textContent += "Find the different color.";
    const gridSize = Math.min(
      MAX_GRID_SIZE,
      STARTING_GRID_SIZE + Math.floor(gameState.currentLevel / 3)
    );
    const totalCircles = gridSize * gridSize;

    const maxAllowedDiff = Math.max(
      MIN_PERCEPTUAL_DIFFERENCE + 1,
      70 * Math.pow(0.93, gameState.currentLevel - 1)
    );
    const minAllowedDiff = Math.max(
      MIN_PERCEPTUAL_DIFFERENCE,
      15 * Math.pow(0.96, gameState.currentLevel - 1)
    );
    let actualDifference = 0;

    do {
      const baseH = getFocusedHue(); // Use focus setting
      const baseS = 35 + Math.random() * 60; // Wider range is okay
      const baseL = 30 + Math.random() * 50; // Avoid extremes
      gameState.baseColorHSL = { h: baseH, s: baseS, l: baseL };

      let remainingDiff =
        minAllowedDiff + Math.random() * (maxAllowedDiff - minAllowedDiff);
      let deltaH = 0,
        deltaS = 0,
        deltaL = 0;
      const changeHueProb = 0.6 + gameState.currentLevel * 0.01; // Higher chance of Hue change later
      const changeSatProb = 0.4 + gameState.currentLevel * 0.01;
      const changeLigProb = 0.3 + gameState.currentLevel * 0.01;

      if (Math.random() < changeHueProb && remainingDiff > 0) {
        const huePortion =
          Math.min(remainingDiff, maxAllowedDiff * 0.7) *
          (0.5 + Math.random() * 0.5);
        deltaH = (Math.random() < 0.5 ? -1 : 1) * huePortion;
        remainingDiff -= Math.abs(deltaH);
      }
      if (Math.random() < changeSatProb && remainingDiff > 0) {
        const satPortion =
          Math.min(remainingDiff, maxAllowedDiff * 0.6) *
          (0.5 + Math.random() * 0.5);
        deltaS = (Math.random() < 0.5 ? -1 : 1) * satPortion;
        remainingDiff -= Math.abs(deltaS);
      }
      if (Math.random() < changeLigProb && remainingDiff > 0) {
        deltaL = (Math.random() < 0.5 ? -1 : 1) * remainingDiff;
      }
      // Ensure at least *some* change happens if deltas are zero
      if (deltaH === 0 && deltaS === 0 && deltaL === 0) {
        deltaL = (Math.random() < 0.5 ? -1 : 1) * minAllowedDiff; // Default to lightness change
      }

      let targetH = (gameState.baseColorHSL.h + deltaH + 360) % 360;
      let targetS = Math.max(
        0,
        Math.min(100, gameState.baseColorHSL.s + deltaS)
      );
      let targetL = Math.max(
        5,
        Math.min(95, gameState.baseColorHSL.l + deltaL)
      );
      gameState.targetColorHSL = { h: targetH, s: targetS, l: targetL };

      actualDifference = calculateColorDifference(
        gameState.baseColorHSL,
        gameState.targetColorHSL
      );
    } while (actualDifference < MIN_PERCEPTUAL_DIFFERENCE);

    const baseColorStr = hslObjectToString(gameState.baseColorHSL);
    const targetColorStr = hslObjectToString(gameState.targetColorHSL);
    gameState.targetIndex = Math.floor(Math.random() * totalCircles);

    gameArea.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    gameArea.className = "game-area-odd-one-out"; // Add class for potential specific styling

    for (let i = 0; i < totalCircles; i++) {
      const circle = document.createElement("div");
      circle.classList.add("color-circle");
      circle.style.backgroundColor =
        i === gameState.targetIndex ? targetColorStr : baseColorStr;
      circle.dataset.index = i;
      circle.addEventListener("click", handleOddOneOutClick);
      gameArea.appendChild(circle);
    }
    console.log(
      `OddOut Lvl ${
        gameState.currentLevel
      }: Grid ${gridSize}x${gridSize}, Base: ${baseColorStr}, Target: ${targetColorStr}, Diff: ${actualDifference.toFixed(
        1
      )}`
    );
  }

  // --- Color Match: Generation ---
  function generateColorMatchLevel() {
    levelObjective.textContent += "Select the matching color.";
    const numOptions = Math.min(9, 4 + Math.floor(gameState.currentLevel / 4)); // 4 to 9 options
    const gridSize = Math.ceil(Math.sqrt(numOptions)); // Layout in a grid

    const maxDistractorDiff = Math.max(
      MIN_PERCEPTUAL_DIFFERENCE + 5,
      80 * Math.pow(0.93, gameState.currentLevel - 1)
    ); // How different distractors are
    const minDristractorDiff = Math.max(
      MIN_PERCEPTUAL_DIFFERENCE + 2,
      20 * Math.pow(0.96, gameState.currentLevel - 1)
    ); // Min difference for distractors

    // Generate the target color
    const targetH = getFocusedHue();
    const targetS = 30 + Math.random() * 65;
    const targetL = 25 + Math.random() * 60;
    gameState.targetColorHSL = { h: targetH, s: targetS, l: targetL };
    const targetColorStr = hslObjectToString(gameState.targetColorHSL);

    // Display the target color swatch
    targetColorSwatch.style.backgroundColor = targetColorStr;
    targetColorDisplay.classList.remove("hidden");

    gameState.optionsData = [];
    // Add the correct option
    gameState.optionsData.push({
      hsl: gameState.targetColorHSL,
      isCorrect: true,
    });

    // Generate distractor options
    while (gameState.optionsData.length < numOptions) {
      let distractorHSL;
      let diffFromTarget;
      let diffFromOthers;
      let attempts = 0;

      do {
        const diffMagnitude =
          minDristractorDiff +
          Math.random() * (maxDistractorDiff - minDristractorDiff);
        let deltaH = 0,
          deltaS = 0,
          deltaL = 0;
        // Randomly choose which HSL components to change for variety
        if (Math.random() < 0.6)
          deltaH =
            (Math.random() < 0.5 ? -1 : 1) *
            diffMagnitude *
            (0.4 + Math.random() * 0.6);
        if (Math.random() < 0.5)
          deltaS =
            (Math.random() < 0.5 ? -1 : 1) *
            diffMagnitude *
            (0.3 + Math.random() * 0.4);
        if (Math.random() < 0.4 || (deltaH === 0 && deltaS === 0))
          deltaL =
            (Math.random() < 0.5 ? -1 : 1) *
            diffMagnitude *
            (0.2 + Math.random() * 0.3);

        // Ensure at least one delta is non-zero
        if (deltaH === 0 && deltaS === 0 && deltaL === 0)
          deltaL = (Math.random() < 0.5 ? -1 : 1) * diffMagnitude * 0.5;

        let dH = (gameState.targetColorHSL.h + deltaH + 360) % 360;
        let dS = Math.max(
          0,
          Math.min(100, gameState.targetColorHSL.s + deltaS)
        );
        let dL = Math.max(5, Math.min(95, gameState.targetColorHSL.l + deltaL));
        distractorHSL = { h: dH, s: dS, l: dL };

        diffFromTarget = calculateColorDifference(
          gameState.targetColorHSL,
          distractorHSL
        );
        // Check difference from existing distractors to avoid duplicates
        diffFromOthers = gameState.optionsData.every(
          (opt) =>
            calculateColorDifference(opt.hsl, distractorHSL) >
            MIN_PERCEPTUAL_DIFFERENCE / 2
        ); // Check if sufficiently different from others

        attempts++;
      } while (
        (diffFromTarget < MIN_PERCEPTUAL_DIFFERENCE || !diffFromOthers) &&
        attempts < 50
      ); // Ensure distractors are different enough

      if (attempts < 50) {
        // Only add if a suitable distractor was found
        gameState.optionsData.push({ hsl: distractorHSL, isCorrect: false });
      } else {
        console.warn(
          "Could not generate sufficiently distinct distractor, reducing options."
        );
        break; // Stop adding options if it's too hard to find distinct ones
      }
    }

    // Shuffle the options array (Fisher-Yates shuffle)
    for (let i = gameState.optionsData.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gameState.optionsData[i], gameState.optionsData[j]] = [
        gameState.optionsData[j],
        gameState.optionsData[i],
      ];
    }

    // Display options
    gameArea.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    gameArea.className = "game-area-color-match"; // Add class for potential specific styling

    gameState.optionsData.forEach((option, index) => {
      const optionElement = document.createElement("div");
      optionElement.classList.add("color-circle", "match-option"); // Use square-ish style maybe
      optionElement.style.backgroundColor = hslObjectToString(option.hsl);
      optionElement.dataset.index = index; // Store index in the shuffled array
      optionElement.addEventListener("click", handleColorMatchClick);
      gameArea.appendChild(optionElement);
    });
    console.log(
      `ColorMatch Lvl ${gameState.currentLevel}: ${numOptions} options. Target: ${targetColorStr}`
    );
  }

  // --- Click Handlers (Delegators) ---
  function handleOddOneOutClick(event) {
    if (!gameState.gameActive) return;
    const clickedCircle = event.target;
    const clickedIndex = parseInt(clickedCircle.dataset.index);
    processAttempt(clickedIndex === gameState.targetIndex, clickedCircle);
  }

  function handleColorMatchClick(event) {
    if (!gameState.gameActive) return;
    const clickedOption = event.target;
    const clickedIndex = parseInt(clickedOption.dataset.index);
    const isCorrect = gameState.optionsData[clickedIndex]?.isCorrect ?? false; // Safely check if correct
    processAttempt(isCorrect, clickedOption);
  }

  // --- Attempt Processing (Common Logic) ---
  function processAttempt(isCorrect, clickedElement) {
    const levelEndTime = Date.now();
    const timeTaken = (levelEndTime - gameState.levelStartTime) / 1000;
    gameState.totalAttempts++;

    // --- Record History (Adapt structure slightly) ---
    const attemptData = {
      level: gameState.currentLevel,
      mode: gameState.currentGameMode,
      result: isCorrect ? "Correct" : "Incorrect",
      time: timeTaken.toFixed(2),
      // Store relevant colors based on mode
      baseColorStr:
        gameState.currentGameMode === "oddOneOut"
          ? hslObjectToString(gameState.baseColorHSL)
          : "N/A",
      targetColorStr: hslObjectToString(gameState.targetColorHSL), // Target is relevant for both
      chosenColorStr: clickedElement
        ? hslObjectToString(
            parseHSLString(clickedElement.style.backgroundColor)
          )
        : "N/A", // Store what user clicked
    };
    gameState.gameHistory.push(attemptData);

    // --- Update State & UI ---
    if (isCorrect) {
      gameState.score +=
        gameState.currentLevel * 5 + Math.max(0, 10 - Math.floor(timeTaken));
      gameState.correctAttempts++;
      gameState.consecutiveCorrect++;
      feedbackArea.textContent = "Correct!";
      feedbackArea.className = "feedback-correct visible";
      clickedElement.classList.add("pop-animation");
      playSound(correctSound);

      // Check Achievements related to correct answers/streaks
      if (gameState.currentGameMode === "oddOneOut")
        checkAndGrantAchievement("firstOddOut");
      if (gameState.currentGameMode === "colorMatch")
        checkAndGrantAchievement("firstMatch");
      if (gameState.consecutiveCorrect === 5)
        checkAndGrantAchievement("streak5");
      if (gameState.consecutiveCorrect === 10)
        checkAndGrantAchievement("streak10");

      // --- Proceed to Next Level ---
      gameState.gameActive = false; // Temporarily disable clicks
      setTimeout(() => {
        clickedElement.classList.remove("pop-animation");
        gameState.currentLevel++;
        // Check level achievements
        if (gameState.currentLevel === 6) {
          checkAndGrantAchievement("level5");
          playSound(levelUpSound);
        }
        if (gameState.currentLevel === 11) {
          checkAndGrantAchievement("level10");
          playSound(levelUpSound);
        }
        if (gameState.currentLevel === 26) {
          checkAndGrantAchievement("level25");
          playSound(levelUpSound);
        }

        gameState.gameActive = true; // Re-enable for next level
        generateLevel();
      }, 500);
    } else {
      // --- Incorrect Answer ---
      gameState.consecutiveCorrect = 0; // Reset streak
      feedbackArea.textContent = "Incorrect!";
      feedbackArea.className = "feedback-incorrect visible";
      clickedElement.classList.add("shake-animation");
      playSound(incorrectSound);

      // Highlight correct answer (if applicable and feasible)
      if (gameState.currentGameMode === "oddOneOut") {
        setTimeout(() => {
          const correctCircle = gameArea.querySelector(
            `[data-index='${gameState.targetIndex}']`
          );
          if (correctCircle) correctCircle.style.outline = "3px solid yellow";
        }, 400);
        setTimeout(() => {
          const correctCircle = gameArea.querySelector(
            `[data-index='${gameState.targetIndex}']`
          );
          if (correctCircle) correctCircle.style.outline = "none";
          clickedElement.classList.remove("shake-animation");
        }, 1200); // Keep highlight longer
      } else if (gameState.currentGameMode === "colorMatch") {
        // Find the correct option's index
        const correctIndex = gameState.optionsData.findIndex(
          (opt) => opt.isCorrect
        );
        setTimeout(() => {
          const correctOption = gameArea.querySelector(
            `[data-index='${correctIndex}']`
          );
          if (correctOption) correctOption.style.outline = "3px solid yellow";
        }, 400);
        setTimeout(() => {
          const correctOption = gameArea.querySelector(
            `[data-index='${correctIndex}']`
          );
          if (correctOption) correctOption.style.outline = "none";
          clickedElement.classList.remove("shake-animation");
        }, 1200);
      }

      // Decide whether to repeat level or move on. Let's move on for flow.
      gameState.gameActive = false; // Disable clicks during feedback/highlight
      setTimeout(() => {
        gameState.currentLevel++; // Still go to next level after incorrect
        gameState.gameActive = true;
        generateLevel();
      }, 1300); // Longer delay after incorrect to see highlight/feedback
    }

    // --- Update High Scores and Save ---
    if (gameState.score > gameState.highScore) {
      gameState.highScore = gameState.score;
    }
    if (gameState.currentLevel - 1 > gameState.maxLevelOverall) {
      // Check level completed
      gameState.maxLevelOverall = gameState.currentLevel - 1;
    }
    updateHighScoreDisplay();
    updateStatusDisplay(); // Update score, accuracy etc.
    saveState(); // Save progress after each attempt
  }

  // --- Update UI Functions ---
  function updateStatusDisplay() {
    levelDisplay.textContent =
      gameState.currentLevel > MAX_LEVEL ? MAX_LEVEL : gameState.currentLevel;
    scoreDisplay.textContent = gameState.score;
    const accuracy =
      gameState.totalAttempts === 0
        ? 100
        : Math.round(
            (gameState.correctAttempts / gameState.totalAttempts) * 100
          );
    accuracyDisplay.textContent = `${accuracy}%`;
  }

  function updateHighScoreDisplay() {
    highScoreDisplay.textContent = gameState.highScore;
    maxLevelDisplay.textContent =
      gameState.maxLevelOverall > 0 ? gameState.maxLevelOverall : "0"; // Show 0 if never played
  }

  // --- End Game ---
  function endGame() {
    console.log("Game Over!");
    gameState.gameActive = false;
    gameAreaWrapper.classList.add("hidden");
    statusBar.classList.add("hidden");
    gameAreaWrapper.style.opacity = 0;
    resultsArea.classList.remove("hidden");

    const finalLevelReached = Math.max(1, gameState.currentLevel - 1); // Level completed
    const finalAccuracy =
      gameState.totalAttempts === 0
        ? 100
        : Math.round(
            (gameState.correctAttempts / gameState.totalAttempts) * 100
          );

    finalModeDisplay.textContent =
      gameState.currentGameMode === "oddOneOut" ? "Odd One Out" : "Color Match";
    finalScoreDisplay.textContent = gameState.score;
    finalLevelDisplay.textContent = finalLevelReached;
    finalAccuracyDisplay.textContent = `${finalAccuracy}%`;
    totalAttemptsDisplay.textContent = gameState.totalAttempts;

    checkSessionAchievements(); // Check final achievements like accuracy

    feedbackArea.textContent = "Session Complete!";
    feedbackArea.className = "feedback-correct visible";

    // Show mode selection again
    modeSelectionDiv.classList.remove("hidden");
    instructionsDiv.querySelector("p").textContent =
      "Select a mode for your next session, or view your report.";
    instructionsDiv.classList.remove("hidden");

    // Update persistent high scores again just in case
    if (gameState.score > gameState.highScore)
      gameState.highScore = gameState.score;
    if (finalLevelReached > gameState.maxLevelOverall)
      gameState.maxLevelOverall = finalLevelReached;
    updateHighScoreDisplay();
    saveState();
  }

  // --- PDF Report Generation ---
  function generateReport() {
    // Check if jsPDF and autoTable are loaded
    if (
      typeof window.jspdf === "undefined" ||
      typeof window.jspdf.jsPDF === "undefined"
    ) {
      console.error("jsPDF core library not loaded!");
      alert(
        "Error: PDF generation library (jsPDF) failed to load. Please check your connection or try again later."
      );
      return;
    }
    const { jsPDF } = window.jspdf; // Now we know it exists

    if (typeof jsPDF.API?.autoTable === "undefined") {
      console.error("jsPDF AutoTable plugin not loaded!");
      alert(
        "Error: PDF generation library (AutoTable plugin) failed to load. Please check your connection or try again later."
      );
      return;
    }

    if (gameState.gameHistory.length === 0) {
      alert(
        "No session data recorded. Complete at least one level to generate a report."
      );
      return;
    }

    console.log("Generating PDF report with AutoTable...");
    const doc = new jsPDF();
    const reportDate = new Date().toLocaleDateString();
    const reportTime = new Date().toLocaleTimeString();
    const finalLevelReached = Math.max(1, gameState.currentLevel - 1);
    const finalAccuracy =
      gameState.totalAttempts === 0
        ? "N/A"
        : `${Math.round(
            (gameState.correctAttempts / gameState.totalAttempts) * 100
          )}%`;
    const sessionMode =
      gameState.gameHistory[0]?.mode === "oddOneOut"
        ? "Odd One Out"
        : "Color Match"; // Get mode from history

    // --- PDF Content ---
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text(
      "Advanced Color Vision Training Report",
      doc.internal.pageSize.getWidth() / 2,
      20,
      { align: "center" }
    );
    doc.setFontSize(11);
    doc.setTextColor(127, 140, 141);
    doc.text(
      `Report Generated: ${reportDate} ${reportTime}`,
      doc.internal.pageSize.getWidth() / 2,
      28,
      { align: "center" }
    );

    // Summary
    doc.setFontSize(16);
    doc.setTextColor(52, 152, 219);
    doc.text("Session Summary", 14, 45);
    doc.autoTable({
      startY: 50,
      body: [
        ["Game Mode:", sessionMode],
        ["Final Score:", gameState.score], // Use final score from state if game ended properly
        ["Level Reached:", finalLevelReached],
        ["Overall Accuracy:", finalAccuracy],
        ["Total Attempts:", gameState.totalAttempts],
        ["Color Focus Used:", gameState.settings.focusArea.toUpperCase()], // Show focus setting
      ],
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 1.5 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 45 },
        1: { cellWidth: "auto" },
      },
      margin: { left: 14 },
    });

    // Details Table
    const summaryTableEndY = doc.lastAutoTable.finalY || 75;
    doc.setFontSize(16);
    doc.setTextColor(52, 152, 219);
    doc.text("Attempt Details", 14, summaryTableEndY + 15);

    const tableData = gameState.gameHistory.map((attempt) => [
      attempt.level,
      attempt.result,
      attempt.time,
      attempt.mode === "oddOneOut"
        ? attempt.baseColorStr
        : attempt.targetColorStr, // Show Base for OOO, Target for Match
      attempt.mode === "oddOneOut"
        ? attempt.targetColorStr
        : attempt.chosenColorStr, // Show Target for OOO, Chosen for Match
    ]);

    doc.autoTable({
      startY: summaryTableEndY + 20,
      head: [
        [
          "Lvl",
          "Result",
          "Time (s)",
          sessionMode === "oddOneOut" ? "Base Color" : "Target Color", // Dynamic Header
          sessionMode === "oddOneOut" ? "Odd Color" : "Chosen Color", // Dynamic Header
        ],
      ],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [52, 152, 219],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
      },
      styles: { fontSize: 8, cellPadding: 1.5, overflow: "linebreak" }, // Smaller font size for more data
      columnStyles: {
        0: { halign: "center", cellWidth: 12 },
        1: { halign: "center", cellWidth: 22 },
        2: { halign: "right", cellWidth: 18 },
        3: { cellWidth: 65 }, // Color column 1
        4: { cellWidth: 65 }, // Color column 2
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didParseCell: function (data) {
        if (data.column.index === 1 && data.cell.section === "body") {
          if (data.cell.raw === "Correct") {
            data.cell.styles.textColor = [39, 174, 96];
            data.cell.styles.fontStyle = "bold";
          } else if (data.cell.raw === "Incorrect") {
            data.cell.styles.textColor = [192, 57, 43];
          }
        }
      },
    });

    // --- Save PDF ---
    try {
      const filename = `Color_Vision_Report_${reportDate.replace(
        /\//g,
        "-"
      )}_${sessionMode.replace(" ", "")}.pdf`;
      doc.save(filename);
      console.log(`Report saved as ${filename}`);
    } catch (e) {
      console.error("Error saving PDF:", e);
      alert("Could not generate or save PDF. See browser console for details.");
    }
  }

  // --- Utility to parse HSL string back to object (basic) ---
  function parseHSLString(hslStr) {
    if (!hslStr || !hslStr.startsWith("hsl")) return null;
    try {
      const parts = hslStr.match(
        /hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/i
      );
      if (parts && parts.length === 4) {
        return {
          h: parseFloat(parts[1]),
          s: parseFloat(parts[2]),
          l: parseFloat(parts[3]),
        };
      }
    } catch (e) {
      console.error("Error parsing HSL string:", hslStr, e);
    }
    return null;
  }

  // --- Event Listeners ---
  modeButtons.forEach((button) => {
    button.addEventListener("click", () => selectMode(button.dataset.mode));
  });
  startButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", startGame); // Restarts with the *last selected mode*
  reportButton.addEventListener("click", generateReport);

  // Settings Listeners
  settingsButton.addEventListener("click", openSettingsModal);
  closeSettingsButton.addEventListener("click", closeSettingsModal);
  settingsModal.addEventListener("click", (e) => {
    // Close on overlay click
    if (e.target === settingsModal) {
      closeSettingsModal();
    }
  });
  themeSelect.addEventListener("change", handleSettingsChange);
  soundToggle.addEventListener("change", handleSettingsChange);
  focusAreaSelect.addEventListener("change", handleSettingsChange);
  resetProgressButton.addEventListener("click", resetProgress);

  // --- Initialisation ---
  loadState(); // Load saved state, apply settings, update UI
}); // End DOMContentLoaded listener
