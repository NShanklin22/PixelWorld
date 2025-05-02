class Organism {
  constructor(x, y) {
    // Position
    this.x = x;
    this.y = y;
    
    // Physical attributes
    this.size = 2; // Slightly increased size for visibility
    
    // Memory of visited locations
    this.visitedLocations = new Map(); // Grid coordinates -> timestamp
    this.memoryDuration = 20; // How many moves to remember
    
    // Movement state
    this.moveCount = 0;
    this.lastDirection = null;
    
    // Track movement history for visualization
    this.history = [];
    this.maxHistoryLength = 10;
  }
  
  // Display the organism with improved visualization
  display() {
    // Draw movement history first (so it appears behind the organism)
    noFill(); // No fill for the shape
    stroke(255, 150); // White stroke with some transparency
    strokeWeight(1); // Adjust thickness of the path
    beginShape();
    for (let i = 0; i < this.history.length; i++) {
      let pos = this.history[i];
      vertex(pos.x, pos.y); // Add each point in history as a vertex
    }
    endShape();
    
    // Draw the organism with different appearance based on resource level
    let currentResource = getResourceAt(this.x, this.y);
    
    // Size variation based on resource level
    let sizeVariation = map(currentResource, 0, 1, 0.8, 1.2);
    let displaySize = this.size * sizeVariation;
    
    // Color variation based on resource level
    // Higher resources = brighter red
    fill(255, 40 + currentResource * 160, 40);
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
      
      // let dir = directions[this.lastDirection];
      // stroke(0, 150);
      // line(this.x, this.y, 
      //      this.x + dir.dx * displaySize, 
      //      this.y + dir.dy * displaySize);
    }
  }
  
  // Improved movement with better decision making
  move() {
    // Only move every certain number of frames
    if (frameCount % 30 !== 0) {
      return;
    }
    
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
    
    // Check neighborhood for resource gradient
    let resourceGradients = new Array(directions.length - 1).fill(0); // Skip "stay" direction
    let currentResource = getResourceAt(this.x, this.y);
    let totalResourceDiff = 0;
    let validDirections = [];
    
    // Check each potential direction
    for (let i = 0; i < directions.length - 1; i++) { // Skip "stay" option for gradient calculation
      let dir = directions[i];
      let nextX = this.x + dir.dx * cellSize;
      let nextY = this.y + dir.dy * cellSize;
      
      // Handle wrapping for grid coordinates
      let nextGridX = floor(nextX / cellSize);
      let nextGridY = floor(nextY / cellSize);
      nextGridX = (nextGridX + cols) % cols;
      nextGridY = (nextGridY + rows) % rows;
      
      // Skip water cells
      if (grid[nextGridX][nextGridY] === OCEAN) {
        resourceGradients[i] = -1; // Invalid direction
        continue;
      }
      
      // Skip recently visited cells (if in memory)
      let nextLocationKey = `${nextGridX},${nextGridY}`;
      if (this.visitedLocations.has(nextLocationKey)) {
        let visitedAge = this.moveCount - this.visitedLocations.get(nextLocationKey);
        if (visitedAge < this.memoryDuration / 2) { // Recently visited
          resourceGradients[i] = -0.5; // Not invalid but discouraged
          continue;
        }
      }
      
      // Valid direction
      validDirections.push(i);
      
      // Calculate resource gradient (difference from current position)
      let nextResource = resources[nextGridX][nextGridY];
      let resourceDiff = nextResource - currentResource;
      
      // Apply gradient awareness
      resourceGradients[i] = resourceDiff;
      
      // Keep track of total gradient magnitude for normalization
      totalResourceDiff += Math.abs(resourceDiff);
    }
    
    // If no valid moves, just stay put
    if (validDirections.length === 0) {
      // Update history for visualization
      this.updateHistory();
      return;
    }
    
    // Create weighted probabilities for each direction
    let moveWeights = new Array(directions.length).fill(0);
    
    // Set base weights based on resource gradients and continuity
    for (let i = 0; i < directions.length - 1; i++) {
      if (resourceGradients[i] === -1) continue; // Skip invalid directions
      
      // Base weight is 1
      let weight = 1;
      
      // Adjust weight based on resource gradient
      // - Positive gradients get boosted
      // - Negative gradients are reduced but still possible
      if (resourceGradients[i] > 0) {
        weight += resourceGradients[i] * 10; // Strongly favor better resources
      } else if (resourceGradients[i] === -0.5) {
        weight = 0.2; // Discourage but don't eliminate recently visited cells
      } else {
        weight += resourceGradients[i] * 2; // Less punishment for declining resources
      }
      
      // Prefer continuing in the same direction (momentum)
      if (this.lastDirection !== null && i === this.lastDirection) {
        weight *= 1.5; // Bonus for continuing same direction
      }
      
      // Ensure weight is positive (minimum chance)
      moveWeights[i] = Math.max(0.1, weight);
    }
    
    // Add weight for staying put - reduced if at low resources
    moveWeights[8] = 0.5 * (currentResource < 0.4 ? 0.2 : 1.0);
    
    // Determine if we should have an exploration phase
    let isExploring = random() < 0.2; // 20% chance of exploration mode
    
    let chosenDirectionIndex;
    if (isExploring) {
      // During exploration, just pick a valid direction randomly
      chosenDirectionIndex = validDirections[floor(random(validDirections.length))];
    } else {
      // Normal mode: Use weighted probability to choose direction
      let totalWeight = moveWeights.reduce((sum, weight) => sum + weight, 0);
      let randomValue = random() * totalWeight;
      let cumulativeWeight = 0;
      
      chosenDirectionIndex = moveWeights.findIndex(weight => {
        cumulativeWeight += weight;
        return randomValue <= cumulativeWeight;
      });
      
      // Fallback in case of numerical errors
      if (chosenDirectionIndex === -1) {
        chosenDirectionIndex = validDirections[0];
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
  }
  
  // Helper method to update movement history
  updateHistory() {
    this.history.unshift({x: this.x, y: this.y});
    
    // Limit history length
    if (this.history.length > this.maxHistoryLength) {
      this.history.pop();
    }
  }
}