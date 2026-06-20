/**
 * Exercise Illustrations — SVG-based stick-figure illustrations for each exercise.
 * Returns unique SVG data URLs for workout exercise cards.
 * Uses minimal vector art with consistent style (dark bg, colored stroke figures).
 */

const SVG_W = 200;
const SVG_H = 160;

// Build SVG string → data URL
const toDataUrl = (inner, accent = "#6366f1") =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${SVG_H}"><rect width="${SVG_W}" height="${SVG_H}" fill="#0c0f1a" rx="8"/><g stroke="${accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none">${inner}</g></svg>`)}`;

// Reusable body primitives
const head = (cx, cy, r = 8) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
const line = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;

// ── Per-exercise SVG definitions ──────────────────────────────────────────────

const illustrations = {
  // CHEST
  "Barbell Bench Press": toDataUrl(
    // Person lying on bench pressing barbell up
    head(100, 60) +
    line(100, 68, 100, 105) + // torso
    line(100, 105, 85, 135) + line(100, 105, 115, 135) + // legs on bench
    line(100, 78, 70, 60) + line(100, 78, 130, 60) + // arms up
    line(60, 60, 140, 60) + // barbell
    `<circle cx="55" cy="60" r="6" fill="#6366f1" opacity="0.3"/>` +
    `<circle cx="145" cy="60" r="6" fill="#6366f1" opacity="0.3"/>` +
    line(80, 108, 120, 108), // bench
    "#6366f1"
  ),
  "Incline Bench Press": toDataUrl(
    head(95, 48) +
    line(95, 56, 100, 100) +
    line(100, 100, 85, 135) + line(100, 100, 115, 135) +
    line(95, 68, 68, 45) + line(95, 68, 125, 45) +
    line(58, 45, 135, 45) +
    `<circle cx="53" cy="45" r="6" fill="#6366f1" opacity="0.3"/>` +
    `<circle cx="140" cy="45" r="6" fill="#6366f1" opacity="0.3"/>`,
    "#6366f1"
  ),
  "Push-Up": toDataUrl(
    head(60, 75) +
    line(60, 83, 130, 83) + // body horizontal
    line(60, 83, 55, 115) + line(55, 115, 60, 115) + // front arm
    line(130, 83, 135, 115) + line(135, 115, 140, 115) + // back arm
    line(130, 83, 142, 110) + line(142, 110, 150, 115), // legs
    "#4f9cf9"
  ),
  "Dumbbell Fly": toDataUrl(
    head(100, 65) +
    line(100, 73, 100, 108) +
    line(100, 108, 85, 135) + line(100, 108, 115, 135) +
    line(100, 82, 65, 65) + line(100, 82, 135, 65) + // arms out
    line(60, 62, 70, 68) + line(130, 62, 140, 68), // dumbbells
    "#6366f1"
  ),
  // BACK
  "Deadlift": toDataUrl(
    head(100, 50) +
    line(100, 58, 100, 95) + // torso (bent slightly)
    line(100, 95, 85, 130) + line(100, 95, 115, 130) + // legs
    line(100, 80, 90, 115) + line(100, 80, 110, 115) + // arms down
    line(82, 115, 118, 115) + // barbell
    `<circle cx="77" cy="115" r="6" fill="#0f9d58" opacity="0.3"/>` +
    `<circle cx="123" cy="115" r="6" fill="#0f9d58" opacity="0.3"/>`,
    "#0f9d58"
  ),
  "Romanian Deadlift": toDataUrl(
    head(90, 55) +
    line(90, 63, 105, 100) + // torso hinged
    line(105, 100, 95, 140) + line(105, 100, 115, 140) +
    line(90, 75, 80, 108) + line(90, 75, 100, 108) +
    line(72, 108, 108, 108),
    "#0f9d58"
  ),
  "Pull-Up": toDataUrl(
    line(70, 30, 130, 30) + // bar
    head(100, 50) +
    line(100, 58, 100, 100) +
    line(100, 100, 88, 130) + line(100, 100, 112, 130) +
    line(100, 50, 80, 30) + line(100, 50, 120, 30), // arms up to bar
    "#0f9d58"
  ),
  "Barbell Row": toDataUrl(
    head(80, 55) +
    line(80, 63, 110, 90) + // bent torso
    line(110, 90, 100, 130) + line(110, 90, 125, 130) +
    line(90, 72, 85, 105) + line(90, 72, 105, 95) +
    line(75, 105, 115, 105),
    "#0f9d58"
  ),
  "Lat Pulldown": toDataUrl(
    line(60, 25, 140, 25) + // cable bar
    head(100, 55) +
    line(100, 63, 100, 105) +
    line(100, 105, 85, 135) + line(100, 105, 115, 135) +
    line(100, 55, 75, 30) + line(100, 55, 125, 30), // arms pulling
    "#0f9d58"
  ),
  "Face Pull": toDataUrl(
    head(100, 60) +
    line(100, 68, 100, 105) +
    line(100, 105, 88, 135) + line(100, 105, 112, 135) +
    line(100, 78, 80, 62) + line(100, 78, 120, 62) + // arms at face
    line(80, 62, 50, 62) + line(120, 62, 50, 62), // cable
    "#0f9d58"
  ),
  // SHOULDERS
  "Overhead Press": toDataUrl(
    head(100, 45) +
    line(100, 53, 100, 100) +
    line(100, 100, 88, 135) + line(100, 100, 112, 135) +
    line(100, 68, 75, 40) + line(100, 68, 125, 40) + // arms up
    line(65, 40, 135, 40) + // barbell
    `<circle cx="60" cy="40" r="5" fill="#f4b400" opacity="0.3"/>` +
    `<circle cx="140" cy="40" r="5" fill="#f4b400" opacity="0.3"/>`,
    "#f4b400"
  ),
  "Lateral Raise": toDataUrl(
    head(100, 55) +
    line(100, 63, 100, 108) +
    line(100, 108, 88, 140) + line(100, 108, 112, 140) +
    line(100, 78, 62, 70) + line(100, 78, 138, 70) + // arms out lateral
    line(58, 68, 66, 72) + line(134, 68, 142, 72), // dumbbells
    "#f4b400"
  ),
  "Front Raise": toDataUrl(
    head(100, 55) +
    line(100, 63, 100, 108) +
    line(100, 108, 88, 140) + line(100, 108, 112, 140) +
    line(100, 78, 85, 50) + line(100, 78, 115, 50) +
    line(81, 48, 89, 52) + line(111, 48, 119, 52),
    "#f4b400"
  ),
  // BICEPS
  "Barbell Curl": toDataUrl(
    head(100, 50) +
    line(100, 58, 100, 105) +
    line(100, 105, 88, 140) + line(100, 105, 112, 140) +
    line(100, 78, 85, 62) + line(100, 78, 115, 62) + // arms curling
    line(78, 62, 122, 62) + // barbell
    `<circle cx="73" cy="62" r="5" fill="#ab47bc" opacity="0.3"/>` +
    `<circle cx="127" cy="62" r="5" fill="#ab47bc" opacity="0.3"/>`,
    "#ab47bc"
  ),
  "Dumbbell Curl": toDataUrl(
    head(100, 50) +
    line(100, 58, 100, 105) +
    line(100, 105, 88, 140) + line(100, 105, 112, 140) +
    line(100, 78, 80, 60) + line(100, 78, 120, 100) + // one up one down
    line(76, 58, 84, 62) + line(116, 98, 124, 102),
    "#ab47bc"
  ),
  "Hammer Curl": toDataUrl(
    head(100, 50) +
    line(100, 58, 100, 105) +
    line(100, 105, 88, 140) + line(100, 105, 112, 140) +
    line(100, 78, 82, 62) + line(100, 78, 118, 62) +
    line(80, 58, 84, 66) + line(116, 58, 120, 66), // vertical dumbbells
    "#ab47bc"
  ),
  "Preacher Curl": toDataUrl(
    head(100, 48) +
    line(100, 56, 100, 100) +
    line(100, 100, 88, 135) + line(100, 100, 112, 135) +
    line(100, 72, 80, 95) + line(80, 95, 78, 80) + // arm on pad
    line(70, 90, 120, 90), // preacher pad
    "#ab47bc"
  ),
  // TRICEPS
  "Tricep Pushdown": toDataUrl(
    head(100, 50) +
    line(100, 58, 100, 105) +
    line(100, 105, 88, 140) + line(100, 105, 112, 140) +
    line(100, 75, 90, 105) + line(100, 75, 110, 105) + // arms pushing down
    line(100, 30, 100, 75), // cable
    "#db4437"
  ),
  "Skull Crusher": toDataUrl(
    head(80, 68) +
    line(80, 76, 130, 76) + // body horizontal
    line(130, 76, 135, 110) + line(130, 76, 145, 110) +
    line(90, 76, 85, 55) + line(85, 55, 95, 50) + // arms back behind head
    line(80, 48, 100, 52),
    "#db4437"
  ),
  "Tricep Dip": toDataUrl(
    head(100, 45) +
    line(100, 53, 100, 95) +
    line(100, 95, 90, 135) + line(100, 95, 110, 135) +
    line(100, 70, 75, 70) + line(100, 70, 125, 70) + // arms on bars
    line(75, 65, 75, 75) + line(125, 65, 125, 75), // dip bars
    "#db4437"
  ),
  // LEGS
  "Barbell Squat": toDataUrl(
    head(100, 48) +
    line(100, 56, 100, 90) + // torso
    line(100, 90, 82, 120) + line(82, 120, 80, 140) + // left leg bent
    line(100, 90, 118, 120) + line(118, 120, 120, 140) + // right leg
    line(100, 62, 75, 55) + line(100, 62, 125, 55) + // arms on bar
    line(65, 55, 135, 55) + // barbell
    `<circle cx="60" cy="55" r="5" fill="#00acc1" opacity="0.3"/>` +
    `<circle cx="140" cy="55" r="5" fill="#00acc1" opacity="0.3"/>`,
    "#00acc1"
  ),
  "Leg Press": toDataUrl(
    head(70, 75) +
    line(70, 83, 90, 100) + // reclined torso
    line(90, 100, 110, 80) + line(110, 80, 130, 90) + // legs pushing
    line(130, 75, 130, 105) + // sled
    `<rect x="125" y="70" width="15" height="40" rx="2" fill="none" stroke="#00acc1"/>`,
    "#00acc1"
  ),
  "Leg Curl": toDataUrl(
    head(65, 80) +
    line(65, 88, 130, 88) + // prone body
    line(130, 88, 140, 65) + // leg curling up
    line(65, 88, 55, 108) + line(55, 108, 60, 108), // arms
    "#00acc1"
  ),
  "Lunge": toDataUrl(
    head(95, 42) +
    line(95, 50, 95, 85) +
    line(95, 85, 70, 115) + line(70, 115, 68, 140) + // front leg
    line(95, 85, 120, 110) + line(120, 110, 130, 130) + // back leg
    line(95, 65, 85, 85) + line(95, 65, 105, 85), // arms at sides
    "#00acc1"
  ),
  "Bulgarian Split Squat": toDataUrl(
    head(85, 42) +
    line(85, 50, 85, 85) +
    line(85, 85, 70, 115) + line(70, 115, 68, 140) + // front leg deep
    line(85, 85, 115, 95) + line(115, 95, 135, 90) + // back leg on bench
    line(130, 85, 140, 85), // bench
    "#00acc1"
  ),
  "Calf Raise": toDataUrl(
    head(100, 40) +
    line(100, 48, 100, 95) +
    line(100, 95, 95, 120) + line(95, 120, 95, 130) + // legs
    line(100, 95, 105, 120) + line(105, 120, 105, 130) +
    line(88, 130, 112, 130) + // platform
    line(90, 130, 90, 140) + line(110, 130, 110, 140), // raised heels
    "#00acc1"
  ),
  "Hip Thrust": toDataUrl(
    head(70, 72) +
    line(70, 80, 100, 65) + // torso bridging up
    line(100, 65, 120, 100) + line(120, 100, 120, 115) + // legs
    line(100, 65, 130, 100) + line(130, 100, 132, 115) +
    line(60, 80, 60, 90), // bench support
    "#00acc1"
  ),
  // CORE
  "Plank": toDataUrl(
    head(60, 80) +
    line(60, 88, 145, 82) + // body horizontal
    line(60, 88, 55, 115) + line(55, 115, 58, 118) + // forearms
    line(145, 82, 150, 115) + line(150, 115, 155, 118), // toes
    "#ff7043"
  ),
  "Side Plank": toDataUrl(
    head(80, 55) +
    line(80, 63, 130, 95) + // body diagonal
    line(80, 63, 75, 40) + // arm up
    line(80, 75, 75, 110) + // supporting arm
    line(130, 95, 140, 120), // legs
    "#ff7043"
  ),
  "Russian Twist": toDataUrl(
    head(100, 52) +
    line(100, 60, 100, 90) + // torso (seated V)
    line(100, 90, 80, 120) + line(80, 120, 70, 115) + // legs up
    line(100, 90, 120, 120) + line(120, 120, 130, 115) +
    line(100, 72, 70, 68) + line(100, 72, 130, 68), // arms twisting
    "#ff7043"
  ),
  "Hanging Leg Raise": toDataUrl(
    line(80, 20, 120, 20) + // bar
    head(100, 38) +
    line(100, 46, 100, 75) +
    line(100, 38, 85, 20) + line(100, 38, 115, 20) + // arms on bar
    line(100, 75, 80, 100) + line(80, 100, 75, 95) + // legs raised forward
    line(100, 75, 120, 100) + line(120, 100, 125, 95),
    "#ff7043"
  ),
  "Ab Wheel": toDataUrl(
    head(70, 72) +
    line(70, 80, 130, 85) + // extended body
    line(70, 80, 60, 105) + // arms reaching forward
    line(60, 105, 50, 105) +
    `<circle cx="48" cy="105" r="8" fill="none"/>` + // wheel
    line(130, 85, 140, 115), // legs/feet
    "#ff7043"
  ),
  "Cable Crunch": toDataUrl(
    head(100, 68) +
    line(100, 76, 100, 105) + // crunched torso
    line(100, 105, 88, 120) + line(88, 120, 85, 140) + // kneeling
    line(100, 105, 112, 120) + line(112, 120, 115, 140) +
    line(100, 76, 100, 40), // cable up
    "#ff7043"
  ),
  // CARDIO
  "Burpees": toDataUrl(
    head(90, 35) +
    line(90, 43, 90, 70) +
    line(90, 70, 75, 95) + line(75, 95, 70, 85) + // legs jumping
    line(90, 70, 105, 95) + line(105, 95, 110, 85) +
    line(90, 55, 72, 35) + line(90, 55, 108, 35), // arms up (jump)
    "#f4b400"
  ),
  "Mountain Climbers": toDataUrl(
    head(65, 68) +
    line(65, 76, 130, 78) + // body angled
    line(65, 76, 60, 100) + line(60, 100, 62, 105) + // arms
    line(130, 78, 110, 105) + // one leg forward
    line(130, 78, 150, 110), // one leg back
    "#f4b400"
  ),
  "Jump Squats": toDataUrl(
    head(100, 32) +
    line(100, 40, 100, 75) +
    line(100, 75, 85, 100) + line(85, 100, 82, 105) + // legs in air
    line(100, 75, 115, 100) + line(115, 100, 118, 105) +
    line(100, 55, 80, 38) + line(100, 55, 120, 38) + // arms up
    `<line x1="82" y1="115" x2="118" y2="115" stroke-dasharray="4" opacity="0.3"/>`, // ground
    "#f4b400"
  ),
  "High Knees": toDataUrl(
    head(100, 42) +
    line(100, 50, 100, 85) +
    line(100, 85, 90, 70) + line(90, 70, 88, 85) + // knee up
    line(100, 85, 110, 120) + line(110, 120, 108, 140) + // standing leg
    line(100, 62, 85, 55) + line(100, 62, 115, 70),
    "#f4b400"
  ),
  "Box Jumps": toDataUrl(
    head(100, 35) +
    line(100, 43, 100, 75) +
    line(100, 75, 88, 95) + line(88, 95, 85, 90) +
    line(100, 75, 112, 95) + line(112, 95, 115, 90) +
    line(100, 55, 82, 38) + line(100, 55, 118, 38) + // arms swinging
    `<rect x="80" y="100" width="40" height="30" rx="2" fill="none" stroke="#f4b400" opacity="0.4"/>`, // box
    "#f4b400"
  ),
  "Battle Ropes": toDataUrl(
    head(100, 50) +
    line(100, 58, 100, 95) +
    line(100, 95, 88, 130) + line(100, 95, 112, 130) +
    line(100, 70, 80, 55) + line(100, 70, 120, 80) + // asymmetric arms
    `<path d="M 80 55 Q 60 48, 40 55 Q 20 62, 10 55" fill="none"/>` + // wavy rope
    `<path d="M 120 80 Q 135 72, 150 80 Q 165 88, 180 80" fill="none"/>`,
    "#f4b400"
  ),
};

// ── Aliases — map exercise names to illustration keys ─────────────────────────
const aliases = {
  "Incline Dumbbell Press": "Incline Bench Press",
  "Decline Bench Press": "Barbell Bench Press",
  "Dumbbell Bench Press": "Barbell Bench Press",
  "Close-Grip Push-Up": "Push-Up",
  "Diamond Push-Up": "Push-Up",
  "Chest Dip": "Tricep Dip",
  "Cable Fly": "Dumbbell Fly",
  "Pec Deck": "Dumbbell Fly",
  "Sumo Deadlift": "Deadlift",
  "Trap Bar Deadlift": "Deadlift",
  "Chin-Up": "Pull-Up",
  "Weighted Pull-Up": "Pull-Up",
  "Dumbbell Row": "Barbell Row",
  "T-Bar Row": "Barbell Row",
  "Pendlay Row": "Barbell Row",
  "Cable Row": "Barbell Row",
  "Good Morning": "Romanian Deadlift",
  "Barbell Overhead Press": "Overhead Press",
  "Dumbbell Shoulder Press": "Overhead Press",
  "Arnold Press": "Overhead Press",
  "Rear Delt Fly": "Face Pull",
  "Upright Row": "Overhead Press",
  "Shrug": "Overhead Press",
  "Cable Curl": "Barbell Curl",
  "Incline Dumbbell Curl": "Dumbbell Curl",
  "Concentration Curl": "Dumbbell Curl",
  "Zottman Curl": "Hammer Curl",
  "EZ Bar Curl": "Barbell Curl",
  "Overhead Tricep Extension": "Tricep Pushdown",
  "Cable Overhead Extension": "Tricep Pushdown",
  "Close-Grip Bench Press": "Barbell Bench Press",
  "Kickback": "Tricep Pushdown",
  "Goblet Squat": "Barbell Squat",
  "Front Squat": "Barbell Squat",
  "Hack Squat": "Barbell Squat",
  "Zercher Squat": "Barbell Squat",
  "Leg Extension": "Leg Curl",
  "Walking Lunge": "Lunge",
  "Reverse Lunge": "Lunge",
  "Step-Up": "Lunge",
  "Sissy Squat": "Barbell Squat",
  "Glute Bridge": "Hip Thrust",
  "Seated Calf Raise": "Calf Raise",
  "Crunch": "Russian Twist",
  "Bicycle Crunch": "Russian Twist",
  "Sit-Up": "Russian Twist",
  "Leg Raise": "Hanging Leg Raise",
  "Toes to Bar": "Hanging Leg Raise",
  "Ab Wheel Rollout": "Ab Wheel",
  "Dead Bug": "Plank",
  "Dragon Flag": "Hanging Leg Raise",
  "V-Up": "Russian Twist",
  "Mountain Climber": "Mountain Climbers",
  "Flutter Kick": "Hanging Leg Raise",
  "Hollow Body Hold": "Plank",
  "Running": "High Knees",
  "Treadmill": "High Knees",
  "Sprints": "High Knees",
  "Cycling": "High Knees",
  "Stationary Bike": "High Knees",
  "Jump Rope": "High Knees",
  "Burpee": "Burpees",
  "Jump Squat": "Jump Squats",
  "Box Jump": "Box Jumps",
  "Rowing Machine": "Barbell Row",
};

/**
 * Get SVG illustration data URL for an exercise name.
 * Returns null if no illustration available.
 */
export function getExerciseIllustration(name) {
  return illustrations[name] || illustrations[aliases[name]] || null;
}

/**
 * Get all available exercise illustration names.
 */
export function getAvailableIllustrations() {
  return Object.keys(illustrations);
}
