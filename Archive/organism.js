class Organism {
  constructor(x, y) {
    // Position
    this.x = x;
    this.y = y;
    
    // Physical attributes
    this.size = 4; // Slightly increased size for visibility
    
    // Memory of visited locations
    this.visitedLocations = new Map(); // Grid coordinates -> timestamp
    this.memoryDuration = 20; // How many moves to remember
    
    // Movement state
    this.moveCount = 0;
    this.lastDirection = null;
    
    // Track movement history for visualization
    this.history = [];
    this.maxHistoryLength = 10;
    
    // Berry-related attributes
    this.Energy = 5.0; // Starting energy from berries
    this.MaxEnergy = 10.0;
    this.EnergyLossRate = 0.01; // Energy consumed per frame
  }
  
  // Display the organism with improved visualization
  display() {
    // Draw movement history first (so it appears behind the organism)
    // noFill(); // No fill for the shape
    // stroke(255, 150); // White stroke with some transparency
    // strokeWeight(4); // Adjust thickness of the path
    // beginShape();
    // for (let i = 0; i < this.history.length; i++) {
    //   let pos = this.history[i];
    //   vertex(pos.x, pos.y); // Add each point in history as a vertex
    // }
    // endShape();
    
    // Size variation based on berry energy
    let sizeVariation = map(this.Energy, 0, this.MaxEnergy, 0.8, 2.5);
    let displaySize = this.size * sizeVariation;
    
    // Color variation based on berry energy
    // Higher energy = brighter color
    let energyRatio = this.Energy / this.MaxEnergy;
    // fill(255 * energyRatio, 255 * energyRatio, 255*energyRatio); // White with transparency
    fill(255,0,0);
    noStroke();
    ellipse(this.x, this.y, displaySize, displaySize);
    
    // Draw direction indicator
    if (this.lastDirection !== null) {
      // 8 directions (NSEW + diagonals) aligned with grid
      const directions = [
        { dx: 0, dy: -1 },   // North
        { dx: 1, dy: -1 },   // Northeast
        { dx: 1, dy: 0 },    // East
        { dx: 1, dy: 1 },    // Southeast
        { dx: 0, dy: 1 },    // South
        { dx: -1, dy: 1 },   // Southwest
        { dx: -1, dy: 0 },   // West
        { dx: -1, dy: -1 }   // Northwest
      ];
    }
  }
  
  // Improved movement with better decision making
  move() {
    // Only move every certain number of frames
    if (frameCount % 30 !== 0) {
      return;
    }
    
    // Deplete energy over time
    this.berryEnergy -= this.energyDepletionRate * 2;
    this.berryEnergy = max(0, this.berryEnergy);
    
    // Increment move counter
    this.moveCount++;
    
    // Get current grid position
    let gridX = floor(this.x / cellSize);
    let gridY = floor(this.y / cellSize);
    
    const cols = floor(width / cellSize);
    const rows = floor(height / cellSize);
    
    // Create key for current location in memory
    let locationKey = `${gridX},${gridY}`;
    // Mark current location as visited
    this.visitedLocations.set(locationKey, this.moveCount);
    
    // Clean up old memory beyond memory duration
    for (let [key, timestamp] of this.visitedLocations.entries()) {
      if (this.moveCount - timestamp > this.memoryDuration) {
        this.visitedLocations.delete(key);
      }
    }
    
    // Check if we're near a berry bush
    let nearestBerry = getNearestBerryBush(this.x, this.y);
    
    // Use 8 directions (NSEW + diagonals) aligned with grid
    const directions = [
      { dx: 0, dy: -1, name: "N" },   // North
      { dx: 1, dy: -1, name: "NE" },  // Northeast
      { dx: 1, dy: 0, name: "E" },    // East
      { dx: 1, dy: 1, name: "SE" },   // Southeast
      { dx: 0, dy: 1, name: "S" },    // South
      { dx: -1, dy: 1, name: "SW" },  // Southwest
      { dx: -1, dy: 0, name: "W" },   // West
      { dx: -1, dy: -1, name: "NW" }, // Northwest
      { dx: 0, dy: 0, name: "Stay" }  // Stay in place
    ];
    
    // Check neighborhood for potential moves
    let moveWeights = new Array(directions.length).fill(0);
    let validDirections = [];
    
    // Check each potential direction
    for (let i = 0; i < directions.length - 1; i++) { // Skip "stay" option for initial evaluation
      let dir = directions[i];
      let nextX = this.x + dir.dx * cellSize;
      let nextY = this.y + dir.dy * cellSize;
      
      // Handle wrapping for grid coordinates
      let nextGridX = floor(nextX / cellSize);
      let nextGridY = floor(nextY / cellSize);
      nextGridX = (nextGridX + cols) % cols;
      nextGridY = (nextGridY + rows) % rows;
      
      // Skip water cells
      if (getTerrainTypeAt(nextX, nextY) === OCEAN) {
        moveWeights[i] = 0; // Invalid direction
        continue;
      }
      
      // Skip recently visited cells (if in memory)
      let nextLocationKey = `${nextGridX},${nextGridY}`;
      if (this.visitedLocations.has(nextLocationKey)) {
        let visitedAge = this.moveCount - this.visitedLocations.get(nextLocationKey);
        if (visitedAge < this.memoryDuration / 2) { // Recently visited
          moveWeights[i] = 0.2; // Not invalid but discouraged
          continue;
        }
      }
      
      // Valid direction
      validDirections.push(i);
      
      // Base weight is 1
      moveWeights[i] = 1;
      
      // Adjust based on berry direction if we know of one
      if (nearestBerry.bush && nearestBerry.distance > 0) {
        // Direction to berry
        let dx = nearestBerry.bush.x - this.x;
        let dy = nearestBerry.bush.y - this.y;
        let angleToBerry = atan2(dy, dx);
        
        // Direction of this move option
        let moveAngle = atan2(dir.dy, dir.dx);
        
        // Calculate how closely this direction aligns with berry direction
        // (1 = perfect alignment, -1 = opposite direction)
        let angleAlignment = cos(angleToBerry - moveAngle);
        
        // If low on energy, strongly prefer berry direction
        let energyUrgency = map(this.berryEnergy, 0, this.maxBerryEnergy, 5, 1);
        
        // Boost weight if pointing toward berry (more if energy is low)
        if (angleAlignment > 0) {
          moveWeights[i] += angleAlignment * 5 * energyUrgency;
        }
        
        // If very close to a berry, give extra weight to the exact direction
        if (nearestBerry.distance < BERRY_HARVEST_DISTANCE * 1.5) {
          if (angleAlignment > 0.7) { // Fairly direct path
            moveWeights[i] += 5;
          }
        }
      }
      
      // Prefer continuing in the same direction (momentum)
      if (this.lastDirection !== null && i === this.lastDirection) {
        moveWeights[i] *= 1.2; // Bonus for continuing same direction
      }
    }
    
    // Add weight for staying put - higher if near a berry
    moveWeights[8] = 0.2;
    if (nearestBerry.bush && nearestBerry.distance < BERRY_HARVEST_DISTANCE) {
      moveWeights[8] = 2.0; // Strongly prefer staying near berries to harvest them
    }
    
    // Determine if we should have an exploration phase
    let isExploring = random() < 0.15; // 15% chance of exploration mode
    
    let chosenDirectionIndex;
    if (isExploring && validDirections.length > 0) {
      // During exploration, just pick a valid direction randomly
      chosenDirectionIndex = validDirections[floor(random(validDirections.length))];
    } else {
      // Normal mode: Use weighted probability to choose direction
      let totalWeight = moveWeights.reduce((sum, weight) => sum + weight, 0);
      
      // If no valid weights, just stay put
      if (totalWeight <= 0) {
        chosenDirectionIndex = 8; // "Stay" direction
      } else {
        let randomValue = random() * totalWeight;
        let cumulativeWeight = 0;
        
        chosenDirectionIndex = moveWeights.findIndex(weight => {
          cumulativeWeight += weight;
          return randomValue <= cumulativeWeight;
        });
        
        // Fallback in case of numerical errors
        if (chosenDirectionIndex === -1) {
          chosenDirectionIndex = validDirections.length > 0 ? validDirections[0] : 8;
        }
      }
    }
    
    // Apply movement
    let chosenDir = directions[chosenDirectionIndex];
    this.x += chosenDir.dx * cellSize;
    this.y += chosenDir.dy * cellSize;
    
    // Keep track of last direction
    this.lastDirection = chosenDirectionIndex < 8 ? chosenDirectionIndex : this.lastDirection;
    
    // Keep within bounds
    this.x = (this.x + width) % width;
    this.y = (this.y + height) % height;
    
    // Update movement history for visualization
    this.updateHistory();
    
    // Check if we're harvesting berries
    this.harvestNearbyBerries();
  }
  
  // Helper method to update movement history
  updateHistory() {
    this.history.unshift({x: this.x, y: this.y});
    
    // Limit history length
    if (this.history.length > this.maxHistoryLength) {
      this.history.pop();
    }
  }
  
  // Method to harvest berries from nearby bushes
  harvestNearbyBerries() {
    let nearestBerry = getNearestBerryBush(this.x, this.y);
    
    if (nearestBerry.bush && nearestBerry.distance < BERRY_HARVEST_DISTANCE) {
      // We're close to a berry bush with berries
      let harvestAmount = 0.02; // How many berries to collect per frame
      let harvested = nearestBerry.bush.harvest(harvestAmount);
      
      // Add to our energy based on harvested amount
      if (harvested > 0) {
        this.berriesCollected += harvested;
        this.berryEnergy += harvested * 0.5; // Convert berries to energy
        this.berryEnergy = min(this.berryEnergy, this.maxBerryEnergy); // Cap at max
      }
    }
  }
}