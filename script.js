// Ensure jsPDF and autoTable are loaded
const { jsPDF } = window.jspdf;
// autoTable will be attached to jsPDF instance prototype

// --- DOM Elements ---
const levelDisplay = document.getElementById('level');
const scoreDisplay = document.getElementById('score');
const accuracyDisplay = document.getElementById('accuracy');
const instructionsDiv = document.getElementById('instructions');
const startButton = document.getElementById('start-button');
const gameAreaWrapper = document.getElementById('game-area-wrapper');
const levelObjective = document.getElementById('level-objective');
const gameArea = document.getElementById('game-area');
const feedbackArea = document.getElementById('feedback-area');
const resultsArea = document.getElementById('results-area');
const finalScoreDisplay = document.getElementById('final-score');
const finalLevelDisplay = document.getElementById('final-level');
const finalAccuracyDisplay = document.getElementById('final-accuracy');
const totalAttemptsDisplay = document.getElementById('total-attempts');
const restartButton = document.getElementById('restart-button');
const reportButton = document.getElementById('report-button');

// --- Game State ---
let currentLevel = 1;
let score = 0;
let totalAttempts = 0; // Renamed from 'attempts' for clarity in results
let correctAttempts = 0;
let targetColorHSL; // Store as object {h, s, l}
let baseColorHSL;   // Store as object {h, s, l}
let targetIndex;
let gameActive = false;
let levelStartTime;
const gameHistory = []; // Stores { level, result, time, baseColorStr, targetColorStr }

// --- Game Configuration ---
const MAX_LEVEL = 30; // Increased max level
const STARTING_GRID_SIZE = 2;
const MAX_GRID_SIZE = 8; // Slightly larger max grid
const MIN_PERCEPTUAL_DIFFERENCE = 3; // Minimum difference in H, S, or L (sum of abs differences)

// --- Helper Functions ---

// Convert HSL object to CSS string, rounded for display
function hslObjectToString(hslObj) {
    return `hsl(${hslObj.h.toFixed(0)}, ${hslObj.s.toFixed(1)}%, ${hslObj.l.toFixed(1)}%)`;
}

// Calculate perceptual difference (simple sum of absolute differences)
function calculateColorDifference(hsl1, hsl2) {
    const hueDiff = Math.min(Math.abs(hsl1.h - hsl2.h), 360 - Math.abs(hsl1.h - hsl2.h)); // Handle hue wrap-around
    const satDiff = Math.abs(hsl1.s - hsl2.s);
    const lightDiff = Math.abs(hsl1.l - hsl2.l);
    return hueDiff + satDiff + lightDiff;
}

// Generate HSL color object with rounded values
function generateHSLValue(baseValue, diffMagnitude, minVal, maxVal, allowNegative = true) {
    const change = (allowNegative && Math.random() < 0.5 ? -1 : 1) * (Math.random() * diffMagnitude);
    let newValue = baseValue + change;
    // Clamp value
    newValue = Math.max(minVal, Math.min(maxVal, newValue));
    return newValue;
}


// --- Core Game Logic ---

function startGame() {
    console.log("Starting game...");
    currentLevel = 1;
    score = 0;
    totalAttempts = 0;
    correctAttempts = 0;
    gameHistory.length = 0;
    gameActive = true;

    updateStatusDisplay();
    instructionsDiv.classList.add('hidden');
    resultsArea.classList.add('hidden');
    gameAreaWrapper.classList.remove('hidden');
    gameAreaWrapper.style.opacity = 1;
    feedbackArea.textContent = '';
    feedbackArea.className = ''; // Reset feedback class
    feedbackArea.classList.remove('visible');

    generateLevel();
}

function generateLevel() {
    if (!gameActive) return;
    if (currentLevel > MAX_LEVEL) {
        endGame();
        return;
    }

    console.log(`Generating Level ${currentLevel}`);
    levelStartTime = Date.now();
    gameArea.innerHTML = ''; // Clear previous grid
    levelObjective.textContent = `Level ${currentLevel}: Find the different color...`;
    feedbackArea.classList.remove('visible'); // Hide feedback initially

    // --- Refined Difficulty Progression ---
    const gridSize = Math.min(MAX_GRID_SIZE, STARTING_GRID_SIZE + Math.floor(currentLevel / 3)); // Increase grid size faster initially
    const totalCircles = gridSize * gridSize;

    // Color Difference Logic (more refined)
    // Base difference starts larger and decreases. Use Math.pow for smoother curve.
    const maxAllowedDiff = Math.max(MIN_PERCEPTUAL_DIFFERENCE + 2, 70 * Math.pow(0.92, currentLevel - 1));
    // Ensure minimum difference to keep it solvable
    const minAllowedDiff = Math.max(MIN_PERCEPTUAL_DIFFERENCE, 15 * Math.pow(0.95, currentLevel - 1));
    let actualDifference = 0;

    // Generate base and target colors until minimum difference is met
    do {
        // Base Color Generation
        const baseH = Math.random() * 360;
        // Keep saturation and lightness away from extremes initially, allow closer later
        const baseS = 40 + Math.random() * (currentLevel < 15 ? 50 : 60); // Wider range later
        const baseL = 35 + Math.random() * (currentLevel < 15 ? 35 : 50); // Wider range later

        baseColorHSL = { h: baseH, s: baseS, l: baseL };

        // Target Color Generation - Calculate differences based on allowed range
        // Distribute the allowed difference somewhat randomly across H, S, L
        let remainingDiff = minAllowedDiff + Math.random() * (maxAllowedDiff - minAllowedDiff);
        let deltaH = 0, deltaS = 0, deltaL = 0;

        // Prioritize Hue difference first, then Saturation, then Lightness
        const huePortion = Math.min(remainingDiff, maxAllowedDiff * 0.6) * (0.5 + Math.random() * 0.5); // Up to 60% on Hue
        deltaH = (Math.random() < 0.5 ? -1 : 1) * huePortion;
        remainingDiff -= Math.abs(deltaH);

        if (remainingDiff > 0 && currentLevel > 3) { // Introduce S diff later
            const satPortion = Math.min(remainingDiff, maxAllowedDiff * 0.5) * (0.5 + Math.random() * 0.5);
            deltaS = (Math.random() < 0.5 ? -1 : 1) * satPortion;
            remainingDiff -= Math.abs(deltaS);
        }
        if (remainingDiff > 0 && currentLevel > 6) { // Introduce L diff later
             deltaL = (Math.random() < 0.5 ? -1 : 1) * remainingDiff;
        }


        let targetH = (baseColorHSL.h + deltaH + 360) % 360; // Wrap hue
        let targetS = Math.max(0, Math.min(100, baseColorHSL.s + deltaS)); // Clamp S
        let targetL = Math.max(5, Math.min(95, baseColorHSL.l + deltaL)); // Clamp L (avoid pure black/white)

        targetColorHSL = { h: targetH, s: targetS, l: targetL };

        actualDifference = calculateColorDifference(baseColorHSL, targetColorHSL);
        // console.log(`Attempt Diff: ${actualDifference.toFixed(2)}, Target Range: [${minAllowedDiff.toFixed(2)} - ${maxAllowedDiff.toFixed(2)}]`);

    } while (actualDifference < MIN_PERCEPTUAL_DIFFERENCE); // Ensure minimum difference


    const baseColorStr = hslObjectToString(baseColorHSL);
    const targetColorStr = hslObjectToString(targetColorHSL);

    console.log(`Level ${currentLevel}: Grid ${gridSize}x${gridSize}, Base: ${baseColorStr}, Target: ${targetColorStr}, Diff: ${actualDifference.toFixed(1)}`);

    // Randomly select the target circle's position
    targetIndex = Math.floor(Math.random() * totalCircles);

    // Create and populate the grid
    gameArea.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    for (let i = 0; i < totalCircles; i++) {
        const circle = document.createElement('div');
        circle.classList.add('color-circle');
        circle.style.backgroundColor = (i === targetIndex) ? targetColorStr : baseColorStr;
        circle.dataset.index = i;
        circle.addEventListener('click', handleCircleClick);
        gameArea.appendChild(circle);
    }

    updateStatusDisplay();
}

function handleCircleClick(event) {
    if (!gameActive) return;

    const clickedCircle = event.target;
    const clickedIndex = parseInt(clickedCircle.dataset.index);
    const levelEndTime = Date.now();
    const timeTaken = (levelEndTime - levelStartTime) / 1000;
    totalAttempts++;

    const isCorrect = (clickedIndex === targetIndex);

    // Store attempt data *with formatted strings*
    const attemptData = {
        level: currentLevel,
        result: isCorrect ? "Correct" : "Incorrect",
        time: timeTaken.toFixed(2),
        baseColorStr: hslObjectToString(baseColorHSL),
        targetColorStr: hslObjectToString(targetColorHSL),
        // Store raw HSL too if needed for more analysis later
        // baseHSL: { ...baseColorHSL },
        // targetHSL: { ...targetColorHSL }
    };
    gameHistory.push(attemptData);

    if (isCorrect) {
        // --- Correct Answer ---
        score += currentLevel * 5 + Math.max(0, 10 - Math.floor(timeTaken)); // Points for level + speed bonus
        correctAttempts++;
        feedbackArea.textContent = 'Correct!';
        feedbackArea.className = 'feedback-correct visible';
        clickedCircle.classList.add('pop-animation');

        // Short delay before next level
        setTimeout(() => {
            currentLevel++;
            generateLevel();
        }, 500); // Slightly shorter delay

    } else {
        // --- Incorrect Answer ---
        feedbackArea.textContent = 'Incorrect!';
        feedbackArea.className = 'feedback-incorrect visible';
        clickedCircle.classList.add('shake-animation');

        // Highlight the correct one briefly after a delay
        setTimeout(() => {
            const correctCircle = gameArea.querySelector(`[data-index='${targetIndex}']`);
            if (correctCircle) {
                correctCircle.style.outline = '3px solid yellow'; // Highlight correct answer
                 correctCircle.style.outlineOffset = '2px';
            }
        }, 400); // Delay highlight slightly


        // Optional: Penalty or Game Over after X mistakes?
        // For now, just track accuracy. Player stays on the level.
        // If you want to move on even after mistake:
        /*
        setTimeout(() => {
             const correctCircle = gameArea.querySelector(`[data-index='${targetIndex}']`);
             if (correctCircle) correctCircle.style.outline = 'none'; // Remove highlight
             currentLevel++;
             generateLevel();
        }, 1200); // Longer delay to see the correct one
        */
       // If staying on the level, remove highlight later
        setTimeout(() => {
            const correctCircle = gameArea.querySelector(`[data-index='${targetIndex}']`);
            if (correctCircle) correctCircle.style.outline = 'none'; // Remove highlight
             clickedCircle.classList.remove('shake-animation'); // Allow re-click
        }, 1000);

    }

    // Remove animation class after it finishes
     setTimeout(() => {
        if (isCorrect) clickedCircle.classList.remove('pop-animation');
        // Shake animation is removed above for incorrect case after highlight
     }, 400);


    updateStatusDisplay(); // Update score and accuracy immediately
}

function updateStatusDisplay() {
    levelDisplay.textContent = currentLevel > MAX_LEVEL ? MAX_LEVEL : currentLevel;
    scoreDisplay.textContent = score;
    const accuracy = totalAttempts === 0 ? 100 : Math.round((correctAttempts / totalAttempts) * 100);
    accuracyDisplay.textContent = `${accuracy}%`;
}

function endGame() {
    console.log("Game Over!");
    gameActive = false;
    gameAreaWrapper.classList.add('hidden');
    gameAreaWrapper.style.opacity = 0;
    resultsArea.classList.remove('hidden');

    const finalLevelReached = currentLevel > MAX_LEVEL ? MAX_LEVEL : (currentLevel > 1 ? currentLevel -1 : 1);
    const finalAccuracy = totalAttempts === 0 ? 100 : Math.round((correctAttempts / totalAttempts) * 100);

    finalScoreDisplay.textContent = score;
    finalLevelDisplay.textContent = finalLevelReached;
    finalAccuracyDisplay.textContent = `${finalAccuracy}%`;
    totalAttemptsDisplay.textContent = totalAttempts; // Show total attempts

    feedbackArea.textContent = 'Session Complete!';
    feedbackArea.className = 'feedback-correct visible';
}

function generateReport() {
    if (gameHistory.length === 0) {
        alert("No session data recorded. Complete at least one level to generate a report.");
        return;
    }
    if (typeof jsPDF === 'undefined' || typeof jsPDF.API.autoTable === 'undefined') {
         console.error("jsPDF or jsPDF-AutoTable is not loaded!");
         alert("Error: Could not load PDF generation library. Please check your internet connection and try again.");
         return;
     }

    console.log("Generating PDF report with AutoTable...");
    const doc = new jsPDF();
    const reportDate = new Date().toLocaleDateString();
    const reportTime = new Date().toLocaleTimeString();
    const finalLevelReached = currentLevel > MAX_LEVEL ? MAX_LEVEL : (currentLevel > 1 ? currentLevel -1 : 1);
     const finalAccuracy = totalAttempts === 0 ? "N/A" : `${Math.round((correctAttempts / totalAttempts) * 100)}%`;

    // --- PDF Content ---

    // Title
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80); // Dark grey-blue
    doc.text("Color Vision Training Report", doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

    // Subtitle (Date)
    doc.setFontSize(11);
    doc.setTextColor(127, 140, 141); // Medium grey
    doc.text(`Report Generated: ${reportDate} ${reportTime}`, doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });

    // Summary Section
    doc.setFontSize(16);
    doc.setTextColor(52, 152, 219); // Primary blue
    doc.text("Session Summary", 14, 45);

    // Use autoTable for summary for consistent styling (optional, simple text is also fine)
     doc.autoTable({
        startY: 50,
        head: [], // No header for summary
        body: [
            ['Final Score:', score],
            ['Highest Level Reached:', finalLevelReached],
            ['Overall Accuracy:', finalAccuracy],
            ['Total Attempts:', totalAttempts],
        ],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 1.5 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 45 },
            1: { cellWidth: 'auto'}
        },
        margin: { left: 14 }
     });

    // Detailed History Table
    doc.setFontSize(16);
    doc.setTextColor(52, 152, 219); // Primary blue
    // Calculate Y position after the summary table
    const summaryTableEndY = doc.lastAutoTable.finalY || 75; // Fallback Y
    doc.text("Level Details", 14, summaryTableEndY + 15);

    // Prepare data for the table
    const tableData = gameHistory.map(attempt => [
        attempt.level,
        attempt.result,
        attempt.time,
        attempt.baseColorStr,
        attempt.targetColorStr
    ]);

    doc.autoTable({
        startY: summaryTableEndY + 20,
        head: [['Lvl', 'Result', 'Time (s)', 'Base Color (HSL)', 'Target Color (HSL)']],
        body: tableData,
        theme: 'grid', // 'striped', 'grid', 'plain'
        headStyles: {
            fillColor: [52, 152, 219], // Primary blue header
            textColor: [255, 255, 255], // White text
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: {
            fontSize: 9,
            cellPadding: 2,
            overflow: 'linebreak' // Handle potential text overflow
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 }, // Lvl
            1: { halign: 'center', cellWidth: 25 }, // Result
            2: { halign: 'right', cellWidth: 20 }, // Time
            3: { cellWidth: 60 }, // Base Color
            4: { cellWidth: 60 }  // Target Color
        },
         alternateRowStyles: {
             fillColor: [245, 245, 245] // Light grey for alternate rows
         },
         didParseCell: function (data) {
            // Center 'Result' text vertically if needed (usually auto)
            if (data.column.index === 1) {
                data.cell.styles.valign = 'middle';
            }
            // Color 'Result' text
            if (data.column.dataKey === 1 && data.cell.section === 'body') { // Check column index/key and section
                if (data.cell.raw === 'Correct') {
                    data.cell.styles.textColor = [39, 174, 96]; // Green
                     data.cell.styles.fontStyle = 'bold';
                } else if (data.cell.raw === 'Incorrect') {
                    data.cell.styles.textColor = [192, 57, 43]; // Red
                }
            }
        }
    });

    // --- Save PDF ---
    try {
        const filename = `Color_Vision_Report_${reportDate.replace(/\//g, '-')}.pdf`;
        doc.save(filename);
        console.log(`Report saved as ${filename}`);
    } catch (e) {
        console.error("Error saving PDF:", e);
        alert("Could not generate or save PDF. See browser console for details.");
    }
}


// --- Event Listeners ---
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
reportButton.addEventListener('click', generateReport);

// --- Initial State ---
// (No changes needed here, handled by CSS/JS logic)
