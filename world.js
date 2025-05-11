let width = 800;
let height = 600;
let foods = []; // Array to store food items
let citizens = []; // Array to store citizens
let woods = []; // Array to store wood resources
let houses = []; // Array to store houses
const foodCount = 15; // Number of food items
const woodCount = 10; // Number of wood resources
let showAllUI = true; // Global UI toggle

// Camera variables
let cameraX = 0;
let cameraY = 0;
let targetCameraX = 0;
let targetCameraY = 0;
let cameraSpeed = 0.1; // How quickly camera moves to target (0-1)
let cameraZoom = 1;
let targetZoom = 1;
let zoomSpeed = 0.05;
let followingCitizen = null; // The citizen the camera is following (null for free camera)

// Asset management
let assets = {
  spritesheets: {} // Add spritesheets property to the assets object
};

function preload() {
  assets.spritesheets.citizen = loadImage("assets/MiniWorldSprites/Characters/Workers/FarmerTemplate.png");
  assets.spritesheets.food = loadImage("assets/MiniWorldSprites/Nature/Wheatfield.png");
}

function setup() {
  console.log(assets)
  createCanvas(width, height);
  pixelDensity(1); // High pixel density for better quality on high-DPI screens
  noSmooth(); // Prevents image smoothing
  frameRate(30);
  
  // Generate initial food
  for (let i = 0; i < foodCount; i++) {
    generateFood();
  }
  
  // Generate initial wood resources
  for (let i = 0; i < woodCount; i++) {
    generateWood();
  }

  // Create multiple citizens for the simulation
  for (let i = 0; i < 1; i++) {
    let x = random(width * 0.15, width * 0.85);
    let y = random(height * 0.15, height * 0.85);
    citizens.push(new Citizen(x, y, assets.spritesheets.citizen));
  }
  
  // Initialize camera position to center of canvas
  cameraX = width/2;
  cameraY = height/2;
  targetCameraX = cameraX;
  targetCameraY = cameraY;
}

function draw() {
  background(20, 20, 40); // Dark blue-ish background
  
  // Update camera position with smooth movement
  updateCamera();
  
  // Apply camera transformation
  push(); // Save the current transformation state
  translate(width/2, height/2); // Move to the center of the screen
  scale(cameraZoom); // Apply zoom
  translate(-cameraX, -cameraY); // Apply camera offset
  
  // Draw world
  drawWorld();
  
  // Display all houses (draw first so they appear behind citizens)
  for (let i = 0; i < houses.length; i++) {
    houses[i].display();
  }
  
  // Display all wood resources
  for (let i = woods.length - 1; i >= 0; i--) {
    woods[i].display();
    
    // Remove depleted wood sources
    if (woods[i].isDepleted()) {
      woods.splice(i, 1);
      generateWood(); // Generate a new wood source
    }
  }
  
  // Display all food
  for (let i = foods.length - 1; i >= 0; i--) {
    foods[i].display();
  }
  
  // Process each citizen
  for (let i = 0; i < citizens.length; i++) {
    citizens[i].update();
    citizens[i].display();
    
    // Check if citizen has found food (only if not dead)
    if (!citizens[i].state.isDead) {
      // Check for food
      for (let j = foods.length - 1; j >= 0; j--) {
        if (dist(citizens[i].x, citizens[i].y, foods[j].x, foods[j].y) < citizens[i].size/2 + foods[j].size/2) {
          // Food found! Track food eaten
          if (citizens[i].eatFood) {
            citizens[i].eatFood(foods[j].nutritionValue);
          }
          
          foods.splice(j, 1);
          
          // Generate a new food
          generateFood();
          break; // Only eat one food item per frame
        }
      }
      
      // Check for interaction with wood resources
      if (citizens[i].state.isCollectingWood) {
        // Continue collecting from current wood target
        let woodTarget = citizens[i].woodTarget;
        
        if (woodTarget && woods.includes(woodTarget)) {
          let collectedAmount = woodTarget.updateCollection(1.5); // Progress wood collection
          
          if (collectedAmount > 0) {
            // Wood collected successfully
            citizens[i].collectWood(collectedAmount);
          }
        } else {
          // Wood target no longer valid
          citizens[i].stopCollectingWood();
        }
      }
      
      // Check for house construction
      if (citizens[i].state.isConstructing) {
        // Continue building current house
        citizens[i].continueConstruction();
      }
    }
  }
  
  pop(); // Restore the transformation state (un-apply the camera)
  
  // Display simulation stats and controls (not affected by camera)
  displayStats();
}

function updateCamera() {
  // If following a citizen, update target position
  if (followingCitizen !== null) {
    if (followingCitizen.state && followingCitizen.state.isDead) {
      // Stop following dead citizens
      followingCitizen = null;
    } else {
      targetCameraX = followingCitizen.x;
      targetCameraY = followingCitizen.y;
    }
  }
  
  // Smoothly move camera toward target position
  cameraX = lerp(cameraX, targetCameraX, cameraSpeed);
  cameraY = lerp(cameraY, targetCameraY, cameraSpeed);
  
  // Smoothly adjust zoom
  cameraZoom = lerp(cameraZoom, targetZoom, zoomSpeed);
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
  
  // Draw grid lines
  stroke(255, 255, 255, 30);
  strokeWeight(1);
  
  // Vertical grid lines
  for (let x = 0; x <= width; x += 100) {
    line(x, 0, x, height);
  }
  
  // Horizontal grid lines
  for (let y = 0; y <= height; y += 100) {
    line(0, y, width, y);
  }
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
    if (citizen.state && citizen.state.isDead) {
      deadCount++;
    } else {
      aliveCount++;
    }
  }
  
  text("Citizens: " + citizens.length, 10, 10);
  text("Alive: " + aliveCount, 10, 30);
  text("Dead: " + deadCount, 10, 50);
  text("Food: " + foods.length, 10, 70);
  text("Wood: " + woods.length, 10, 90);
  text("Houses: " + houses.length, 10, 110);
  
  // Count completed houses
  let completedHouses = 0;
  for (let house of houses) {
    if (house.isComplete) {
      completedHouses++;
    }
  }
  text("Completed Houses: " + completedHouses, 10, 130);
  
  // Display camera information
  text("Camera Position: " + Math.floor(cameraX) + ", " + Math.floor(cameraY), 10, 170);
  text("Zoom: " + cameraZoom.toFixed(2) + "x", 10, 190);
  if (followingCitizen !== null) {
    text("Following: Citizen #" + citizens.indexOf(followingCitizen), 10, 210);
  } else {
    text("Following: None (Free Camera)", 10, 210);
  }
  
  // Instructions for controls
  text("U: Toggle UI", 10, height - 140);
  text("R: Reset simulation", 10, height - 120);
  text("N: Add new citizen", 10, height - 100);
  text("F: Follow random citizen", 10, height - 80);
  text("C: Reset camera", 10, height - 60);
  text("B: Place new house", 10, height - 40);
  text("W: Generate wood", 10, height - 20);
  
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

function generateWood() {
  // Create a new wood resource at a random position
  let x = random(width * 0.15, width * 0.85);
  let y = random(height * 0.15, height * 0.85);
  
  woods.push(new Wood(x, y));
}

function createHouse(x, y, owner = null) {
  let house = new House(x, y);
  
  // Set owner if provided
  if (owner) {
    house.setOwner(owner);
  }
  
  houses.push(house);
  return house;
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
    for (let i = 0; i < 1; i++) {
      let x = random(width * 0.15, width * 0.85);
      let y = random(height * 0.15, height * 0.85);
      citizens.push(new Citizen(x, y, assets.images.citizen));
    }
    
    // Clear and regenerate food and resources
    foods = [];
    woods = [];
    houses = [];
    
    for (let i = 0; i < foodCount; i++) {
      generateFood();
    }
    
    for (let i = 0; i < woodCount; i++) {
      generateWood();
    }
  }
  
  if (key === 'n' || key === 'N') {
    // Add a new citizen
    let x = random(width * 0.15, width * 0.85);
    let y = random(height * 0.15, height * 0.85);
    citizens.push(new Citizen(x, y, assets.images.citizen));
  }
  
  if (key === 'f' || key === 'F') {
    // Follow a random citizen
    if (citizens.length > 0) {
      // Find any citizens that are still alive
      let aliveCitizens = citizens.filter(c => !c.state.isDead);
      
      if (aliveCitizens.length > 0) {
        // Pick a random alive citizen to follow
        followingCitizen = aliveCitizens[Math.floor(random(aliveCitizens.length))];
      } else {
        // No alive citizens to follow
        followingCitizen = null;
      }
    }
  }
  
  if (key === 'c' || key === 'C') {
    // Reset camera to center and stop following
    followingCitizen = null;
    targetCameraX = width/2;
    targetCameraY = height/2;
    targetZoom = 1;
  }
  
  if (key === 'w' || key === 'W') {
    // Generate a new wood resource
    generateWood();
  }
}

// Mouse wheel event for zooming
function mouseWheel(event) {
  // Adjust zoom with mouse wheel
  targetZoom -= event.delta * 0.001;
  
  // Constrain zoom level
  targetZoom = constrain(targetZoom, 0.5, 2.5);
  
  // Prevent default browser behavior (scrolling the page)
  return false;
}

// Functions for panning with mouse drag
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let cameraDragStartX = 0;
let cameraDragStartY = 0;

function mousePressed() {
  if (mouseButton === LEFT) {
    // Start camera drag
    isDragging = true;
    dragStartX = mouseX;
    dragStartY = mouseY;
    cameraDragStartX = targetCameraX;
    cameraDragStartY = targetCameraY;
    
    // Stop following a citizen when manual camera control is used
    followingCitizen = null;
  }
}

function mouseDragged() {
  if (isDragging) {
    // Calculate how much the mouse has moved since drag started
    let deltaX = (mouseX - dragStartX) / cameraZoom;
    let deltaY = (mouseY - dragStartY) / cameraZoom;
    
    // Update camera target position
    targetCameraX = cameraDragStartX - deltaX;
    targetCameraY = cameraDragStartY - deltaY;
  }
}

function mouseReleased() {
  if (mouseButton === LEFT) {
    isDragging = false;
  }
}

// Double-click functionality to focus on a citizen
function doubleClicked() {
  // Convert mouse position to world coordinates
  let worldMouseX = (mouseX - width/2)/cameraZoom + cameraX;
  let worldMouseY = (mouseY - height/2)/cameraZoom + cameraY;
  
  // Check if a citizen was clicked
  let closestCitizen = null;
  let closestDistance = 20; // Minimum distance to select
  
  for (let i = 0; i < citizens.length; i++) {
    let d = dist(worldMouseX, worldMouseY, citizens[i].x, citizens[i].y);
    if (d < closestDistance) {
      closestDistance = d;
      closestCitizen = citizens[i];
    }
  }
  
  if (closestCitizen !== null) {
    // Follow the selected citizen
    followingCitizen = closestCitizen;
    targetZoom = 1.5; // Zoom in a little when focusing on a citizen
  }
}