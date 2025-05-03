let width = 800;
let height = 600;
let citizen;
let foods = []; // Array to store food items
const foodCount = 15; // Number of food items

function setup() {
  createCanvas(width, height);
  frameRate(30);
  
  // Create the citizen at the center of the canvas
  citizen = new Citizen(width/2, height/2);
  
  // Generate initial food
  for (let i = 0; i < foodCount; i++) {
    generateFood();
  }
}

function draw() {
  background(20, 20, 40); // Dark blue-ish background
  
  // Draw world
  drawWorld();
  
  // Update and display citizen
  citizen.update();
  citizen.display();
  
  // Display all food
  for (let i = foods.length - 1; i >= 0; i--) {
    foods[i].display();
    
    // Check if citizen has found the food
    if (dist(citizen.x, citizen.y, foods[i].x, foods[i].y) < citizen.size/2 + foods[i].size/2) {
      // Food found! Increase citizen's fullness and remove the food
      citizen.fullness += foods[i].nutritionValue;
      foods.splice(i, 1);
      
      // Generate a new food
      generateFood();
    }
  }
  
  // Display UI
  drawUI();
}

function drawWorld() {
  // Draw a simple environment with land and water
  
  // Water (outer layer)
  fill(20, 80, 180, 150);
  noStroke();
  rect(0, 0, width, height);
  
  // Land (inner layer)
  fill(100, 180, 80, 200);
  rect(width*0.1, height*0.1, width*0.8, height*0.8);
}

function drawUI() {
  // Display citizen's stats
  fill(255);
  textSize(16);
  text("Energy: " + citizen.energy.toFixed(1), 20, 30);
  
  // Display fullness with color coding
  let fullnessColor;
  if (citizen.fullness < 20) {
    fullnessColor = color(255, 50, 50); // Red when hungry
  } else if (citizen.fullness < 60) {
    fullnessColor = color(255, 255, 50); // Yellow when partially full
  } else {
    fullnessColor = color(50, 255, 50); // Green when mostly full
  }
  fill(fullnessColor);
  text("Fullness: " + citizen.fullness.toFixed(1), 20, 55);
  
  // Display boredom level
  let boredomColor;
  if (citizen.boredom > 70) {
    boredomColor = color(255, 0, 0); // Red when very bored
  } else if (citizen.boredom > 30) {
    boredomColor = color(255, 165, 0); // Orange when moderately bored
  } else {
    boredomColor = color(200, 200, 200); // Gray when not bored
  }
  fill(boredomColor);
  text("Boredom: " + citizen.boredom.toFixed(1), 20, 80);
  
  // Display current state
  fill(255);
  text("State: " + (citizen.isResting ? "Resting" : (citizen.isSeeking ? "Seeking" : "Idle")), 20, 105);
}

function generateFood() {
  // Create a new food item at a random position
  let x = random(width * 0.15, width * 0.85);
  let y = random(height * 0.15, height * 0.85);
  
  // Randomize the nutrition value (size affects visibility)
  let nutritionValue = random(10, 50);
  let size = map(nutritionValue, 10, 50, 3, 10);
  
  foods.push(new Food(x, y, nutritionValue, size));
}