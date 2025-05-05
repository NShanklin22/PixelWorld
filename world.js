let width = 800;
let height = 600;
let citizen;
let foods = []; // Array to store food items
let citizens = []; // Array to store citizens
const foodCount = 15; // Number of food items
let showAllUI = true; // Global UI toggle

// At the top of world.js, add asset management
let assets = {
  images: {
    citizen: null,
    food: null
  }
};

// Add preload function to load images before setup
function preload() {
  // Load images
  assets.images.citizen = loadImage("assets/citizen.png");
  // assets.images.food = loadImage("assets/food.png");
}

function setup() {
  createCanvas(width, height);
  frameRate(30);
  
  // Create the citizen at the center of the canvas
  citizen = new Citizen(width/2, height/2, assets.images.citizen);
  
  // Generate initial food
  for (let i = 0; i < foodCount; i++) {
    generateFood();
  }

  // Create multiple citizens for the simulation
  for (let i = 0; i < 5; i++) {
    let x = random(width * 0.15, width * 0.85);
    let y = random(height * 0.15, height * 0.85);
    citizens.push(new Citizen(x, y, assets.images.citizen));
  }
}

function draw() {
  background(20, 20, 40); // Dark blue-ish background
  
  // Draw world
  drawWorld();
  
  // Display all food
  for (let i = foods.length - 1; i >= 0; i--) {
    foods[i].display();
  }
  
  // Process each citizen
  for (let i = 0; i < citizens.length; i++) {
    citizens[i].update();
    citizens[i].display();
    
    // Check if citizen has found food (only if not dead)
    if (!citizens[i].isDead) {
      for (let j = foods.length - 1; j >= 0; j--) {
        if (dist(citizens[i].x, citizens[i].y, foods[j].x, foods[j].y) < citizens[i].size/2 + foods[j].size/2) {
          // Food found! Increase citizen's fullness and remove the food
          citizens[i].fullness += foods[j].nutritionValue;
          
          // Track food eaten using the new method
          if (citizens[i].eatFood) {
            citizens[i].eatFood(foods[j].nutritionValue);
          }
          
          foods.splice(j, 1);
          
          // Generate a new food
          generateFood();
          break; // Only eat one food item per frame
        }
      }
    }
  }
  
  // Display simulation stats
  displayStats();
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

function displayStats() {
  // Display global stats in the corner
  push();
  fill(255);
  textSize(14);
  textAlign(LEFT, TOP);
  
  // Count alive and dead citizens
  let aliveCount = 0;
  let deadCount = 0;
  
  for (let citizen of citizens) {
    if (citizen.isDead) {
      deadCount++;
    } else {
      aliveCount++;
    }
  }
  
  text("Citizens: " + citizens.length, 10, 10);
  text("Alive: " + aliveCount, 10, 30);
  text("Dead: " + deadCount, 10, 50);
  text("Food: " + foods.length, 10, 70);
  
  // Instructions for controls
  text("U: Toggle UI", 10, height - 60);
  text("R: Reset simulation", 10, height - 40);
  text("N: Add new citizen", 10, height - 20);
  
  pop();
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

function keyPressed() {
  if (key === 'u' || key === 'U') {
    // Toggle all UI displays
    showAllUI = !showAllUI;
    for (let citizen of citizens) {
      citizen.showUI = showAllUI;
    }
  }
  
  if (key === 'r' || key === 'R') {
    // Reset simulation with new citizens
    citizens = [];
    for (let i = 0; i < 5; i++) {
      let x = random(width * 0.15, width * 0.85);
      let y = random(height * 0.15, height * 0.85);
      citizens.push(new Citizen(x, y));
    }
    
    // Clear and regenerate food
    foods = [];
    for (let i = 0; i < foodCount; i++) {
      generateFood();
    }
  }
  
  if (key === 'n' || key === 'N') {
    // Add a new citizen
    let x = random(width * 0.15, width * 0.85);
    let y = random(height * 0.15, height * 0.85);
    citizens.push(new Citizen(x, y));
  }
}