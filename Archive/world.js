let width = 500;
let height = 500;
let grid = [];
let resources = []; // For the original gradient resource system
let berryBushes = []; // Array to hold berry bush objects
let cellSize = 5; // Smaller cells for higher resolution

// Cell types
const OCEAN = 0;
const GROUND = 1;

// Resource levels
const MAX_RESOURCE = 1.0;

// Berry bush properties
const MAX_BERRY_BUSHES = 200; // Maximum number of berry bushes
const BERRY_SPAWN_CHANCE = 0.005; // Chance of a new berry bush appearing each frame
const BERRY_SIZE = 8; // Size of berry bushes
const BERRY_HARVEST_DISTANCE = 15; // How close organism needs to be to harvest
const BERRY_REGROW_RATE = 0.001; // How fast berries regrow

// Noise parameters
let noiseScale = 0.05; // Scale factor for noise
let resourceNoiseScale = 0.1; // Different scale for resources
let seedValue;
let oceanThreshold = 0.45; // Threshold for ocean/land division

// Organism reference
let organism;

function setup() {
  createCanvas(width, height);
  frameRate(60);
  
  // Set a random seed for reproducible terrain
  seedValue = random(10000);
  noiseSeed(seedValue);
  
  // Generate initial terrain
  generateTerrain();
  
  // Create initial berry bushes
  spawnInitialBerryBushes();
  
  // Create organism
  let pos = findLandPosition();
  organism = new Organism(pos.x, pos.y);
}

function draw() {
  background(240);
  
  const cols = floor(width/cellSize);
  const rows = floor(height/cellSize);
  
  // Draw the terrain with resources
  noStroke();
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let x = i * cellSize;
      let y = j * cellSize;
      
      // Color based on cell type with subtle variations
      if (grid[i][j] === OCEAN) {
        // Ocean with depth variation
        let depthVariation = noise(i * 0.1, j * 0.1, 100) * 40;
        fill(64 + depthVariation, 95 + depthVariation, 237);
      } else {
        // Ground with height variation and resource tinting
        let heightVariation = noise(i * 0.1, j * 0.1, 200) * 40;
        
        // Add green tint based on resource level (more resources = more green)
        let resourceLevel = resources[i][j];
        
        // Much more dramatic color differentiation for resources
        // Low resources: brownish
        // High resources: vibrant green
        let green = 100 + resourceLevel * 155; // More dramatic green scaling
        let red = 160 - resourceLevel * 100;   // Red reduces more with resources
        let blue = 50 - resourceLevel * 30;    // Less blue for more differentiation
        
        fill(red, green, blue);
      }
      
      rect(x, y, cellSize, cellSize);
    }
  }
  
  // Update berry bushes
  updateBerryBushes();
  
  // Draw berry bushes
  for (let bush of berryBushes) {
    bush.display();
  }
  
  // Update and draw organism
  organism.move();
  organism.display();
  
  // Random chance to spawn new berry bushes
  if (random() < BERRY_SPAWN_CHANCE && berryBushes.length < MAX_BERRY_BUSHES) {
    spawnBerryBush();
  }
  
  // Display FPS
  if (frameCount % 30 === 0) {
    let fps = frameRate();
    console.log("FPS: " + fps.toFixed(2));
  }
}

// Create initial berry bushes
function spawnInitialBerryBushes() {
  // Clear any existing bushes
  berryBushes = [];
  
  // Create initial berry bushes
  for (let i = 0; i < MAX_BERRY_BUSHES / 2; i++) {
    spawnBerryBush();
  }
}

// Spawn a new berry bush on land
function spawnBerryBush() {
  const cols = floor(width/cellSize);
  const rows = floor(height/cellSize);
  
  // Try to find a valid land position
  for (let attempts = 0; attempts < 20; attempts++) {
    let gridX = floor(random(cols));
    let gridY = floor(random(rows));
    
    // Check if it's land
    if (grid[gridX][gridY] === GROUND) {
      // Convert to pixel coordinates (center of cell)
      let x = gridX * cellSize + cellSize/2;
      let y = gridY * cellSize + cellSize/2;
      
      // Check if not too close to other bushes (minimum distance)
      let tooClose = false;
      for (let bush of berryBushes) {
        let d = dist(x, y, bush.x, bush.y);
        if (d < BERRY_SIZE * 3) {
          tooClose = true;
          break;
        }
      }
      
      // If it's a good spot, create a new berry bush
      if (!tooClose) {
        berryBushes.push(new BerryBush(x, y));
        return;
      }
    }
  }
}

// Update all berry bushes
function updateBerryBushes() {
  // Update each bush
  for (let bush of berryBushes) {
    bush.update();
  }
  
  // Check if organism is near any berry bush and can harvest
  for (let bush of berryBushes) {
    let d = dist(organism.x, organism.y, bush.x, bush.y);
    if (d < BERRY_HARVEST_DISTANCE && bush.berries > 0) {
      // Organism is close enough to harvest berries
      let harvestAmount = 0.01; // Small amount per frame
      let harvested = bush.harvest(harvestAmount);
      
      // The organism could store or use the harvested berries here
      // For example, increase energy or a berry counter
    }
  }
  
  // Remove depleted bushes
  berryBushes = berryBushes.filter(bush => !bush.isDead());
}

// Helper function: get nearest berry bush and its distance
function getNearestBerryBush(x, y) {
  let closestBush = null;
  let closestDist = Infinity;
  
  for (let bush of berryBushes) {
    if (bush.berries > 0) { // Only consider bushes with berries
      let d = dist(x, y, bush.x, bush.y);
      if (d < closestDist) {
        closestDist = d;
        closestBush = bush;
      }
    }
  }
  
  return { bush: closestBush, distance: closestDist };
}

// Get resource value at a specific position (including berry bushes)
function getResourceAt(x, y) {
  // First, check if any berry bush is nearby
  for (let bush of berryBushes) {
    let d = dist(x, y, bush.x, bush.y);
    if (d < BERRY_HARVEST_DISTANCE && bush.berries > 0) {
      // Berry bush resource is valued higher than regular terrain resources
      return 0.8 + bush.berries * 0.2; // Value between 0.8 and 1.0 based on berry amount
    }
  }
  
  // If no berry bush is nearby, use the regular resource value
  const cols = floor(width/cellSize);
  const rows = floor(height/cellSize);
  
  // Convert position to grid coordinates
  let gridX = floor(x / cellSize);
  let gridY = floor(y / cellSize);
  
  // Make sure grid position is valid with wrapping
  gridX = (gridX + cols) % cols;
  gridY = (gridY + rows) % rows;
  
  return resources[gridX][gridY];
}

// Generate terrain using multi-octave Perlin noise
function generateTerrain() {
  const cols = floor(width/cellSize);
  const rows = floor(height/cellSize);
  
  // Initialize grid and resources
  grid = new Array(cols);
  resources = new Array(cols);
  
  for (let i = 0; i < cols; i++) {
    grid[i] = new Array(rows);
    resources[i] = new Array(rows);
  }
  
  // Generate terrain
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      // Use multi-octave Perlin noise for more natural terrain
      let nx = i * noiseScale;
      let ny = j * noiseScale;
      
      // First octave - large features
      let value = noise(nx, ny) * 0.5;
      
      // Second octave - medium features
      value += noise(nx * 2 + 500, ny * 2 + 500) * 0.25;
      
      // Third octave - small details
      value += noise(nx * 4 + 1000, ny * 4 + 1000) * 0.125;
      
      // Fourth octave - tiny details
      value += noise(nx * 8 + 2000, ny * 8 + 2000) * 0.0625;
      
      // Normalize value (0.5 + 0.25 + 0.125 + 0.0625 = 0.9375)
      value = value / 0.9375;
      
      // Apply threshold to determine land or water
      if (value < oceanThreshold) {
        grid[i][j] = OCEAN;
        resources[i][j] = 0; // No resources in water
      } else {
        grid[i][j] = GROUND;
        
        // Generate resources for land using different noise frequency
        resources[i][j] = generateResourceValue(i, j);
      }
    }
  }
  
  // Apply cellular automaton rules to smooth coastlines
  smoothCoastlines();
}

// Generate resource value for a cell
function generateResourceValue(i, j) {
  // Use a different noise scale and seed offset for resources
  let nx = i * resourceNoiseScale;
  let ny = j * resourceNoiseScale;
  
  // Create primary resource patches with much more contrast
  let resourceValue = noise(nx + 3000, ny + 3000);
  
  // Make the contrast more extreme by applying a power function
  resourceValue = pow(resourceValue, 1.5); // Enhances contrast
  
  // Create secondary smaller, more concentrated patches
  let secondaryValue = noise(nx * 3 + 5000, ny * 3 + 5000);
  secondaryValue = pow(secondaryValue, 2) * 1.2; // Even more contrast
  resourceValue = max(resourceValue, secondaryValue);
  
  // Add very small rare rich patches
  let rareValue = noise(nx * 5 + 7000, ny * 5 + 7000);
  rareValue = pow(rareValue, 3) * 1.5; // Very concentrated high-value spots
  resourceValue = max(resourceValue, rareValue);
  
  // Ensure values stay in 0-1 range
  return constrain(resourceValue, 0, 1);
}

// Apply cellular automaton rules to make coastlines more natural
function smoothCoastlines() {
  const cols = floor(width/cellSize);
  const rows = floor(height/cellSize);
  
  // Create a temporary grid
  let tempGrid = new Array(cols);
  for (let i = 0; i < cols; i++) {
    tempGrid[i] = new Array(rows);
    for (let j = 0; j < rows; j++) {
      tempGrid[i][j] = grid[i][j];
    }
  }
  
  // Number of smoothing iterations
  let iterations = 3;
  
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        let oceanNeighbors = countOceanNeighbors(i, j);
        let landNeighbors = 8 - oceanNeighbors;
        
        // Apply cellular automaton rules
        if (grid[i][j] === OCEAN) {
          // Ocean becomes land if surrounded by mostly land
          if (landNeighbors > 5) {
            tempGrid[i][j] = GROUND;
            // New land gets average resource value of surrounding land
            resources[i][j] = calculateAverageResourcesAround(i, j);
          }
        } else {
          // Land becomes ocean if surrounded by mostly ocean
          if (oceanNeighbors > 5) {
            tempGrid[i][j] = OCEAN;
            resources[i][j] = 0; // No resources in water
          }
        }
      }
    }
    
    // Copy tempGrid back to grid
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        grid[i][j] = tempGrid[i][j];
      }
    }
  }
}

// Count how many ocean neighbors a cell has
function countOceanNeighbors(x, y) {
  const cols = floor(width/cellSize);
  const rows = floor(height/cellSize);
  let count = 0;
  
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      // Skip the center cell
      if (i === 0 && j === 0) continue;
      
      // Get neighbor coordinates with wrapping
      let ni = (x + i + cols) % cols;
      let nj = (y + j + rows) % rows;
      
      // Count ocean neighbors
      if (grid[ni][nj] === OCEAN) {
        count++;
      }
    }
  }
  
  return count;
}

// Calculate average resource value of surrounding land cells
function calculateAverageResourcesAround(x, y) {
  const cols = floor(width/cellSize);
  const rows = floor(height/cellSize);
  let totalResources = 0;
  let landCount = 0;
  
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      // Skip the center cell
      if (i === 0 && j === 0) continue;
      
      // Get neighbor coordinates with wrapping
      let ni = (x + i + cols) % cols;
      let nj = (y + j + rows) % rows;
      
      // Count resources from land cells
      if (grid[ni][nj] === GROUND) {
        totalResources += resources[ni][nj];
        landCount++;
      }
    }
  }
  
  // Return average resource value or default if no land found
  return landCount > 0 ? totalResources / landCount : 0.3;
}

// Helper function: get terrain type at a specific position
function getTerrainTypeAt(x, y) {
  const cols = floor(width/cellSize);
  const rows = floor(height/cellSize);
  
  // Convert position to grid coordinates
  let gridX = floor(x / cellSize);
  let gridY = floor(y / cellSize);
  
  // Make sure grid position is valid with wrapping
  gridX = (gridX + cols) % cols;
  gridY = (gridY + rows) % rows;
  
  return grid[gridX][gridY];
}

// Find a valid spawn position on land
function findLandPosition() {
  const cols = floor(width/cellSize);
  const rows = floor(height/cellSize);
  
  for (let attempts = 0; attempts < 50; attempts++) {
    let gridX = floor(random(cols));
    let gridY = floor(random(rows));
    
    if (grid[gridX][gridY] === GROUND) {
      return {
        x: gridX * cellSize + cellSize/2,
        y: gridY * cellSize + cellSize/2
      };
    }
  }
  
  // Fallback - center of map
  return {
    x: width/2,
    y: height/2
  };
}

// Keyboard input handling
function keyPressed() {
  if (key === ' ') {
    // Generate new terrain with the same seed
    generateTerrain();
    spawnInitialBerryBushes();
    let pos = findLandPosition();
    organism = new Organism(pos.x, pos.y);
  } else if (key === 'r' || key === 'R') {
    // Generate new terrain with a new random seed
    seedValue = random(10000);
    noiseSeed(seedValue);
    generateTerrain();
    spawnInitialBerryBushes();
    let pos = findLandPosition();
    organism = new Organism(pos.x, pos.y);
  } else if (key === '+' || key === '=') {
    // Increase cell size
    cellSize = constrain(cellSize + 1, 2, 40);
    generateTerrain();
    spawnInitialBerryBushes();
    let pos = findLandPosition();
    organism = new Organism(pos.x, pos.y);
  } else if (key === '-' || key === '_') {
    // Decrease cell size
    cellSize = constrain(cellSize - 1, 2, 40);
    generateTerrain();
    spawnInitialBerryBushes();
    let pos = findLandPosition();
    organism = new Organism(pos.x, pos.y);
  } else if (key === 'o' || key === 'O') {
    // More ocean
    oceanThreshold += 0.05;
    oceanThreshold = constrain(oceanThreshold, 0.2, 0.8);
    generateTerrain();
    spawnInitialBerryBushes();
    let pos = findLandPosition();
    organism = new Organism(pos.x, pos.y);
  } else if (key === 'l' || key === 'L') {
    // More land
    oceanThreshold -= 0.05;
    oceanThreshold = constrain(oceanThreshold, 0.2, 0.8);
    generateTerrain();
    spawnInitialBerryBushes();
    let pos = findLandPosition();
    organism = new Organism(pos.x, pos.y);
  }
}