class Organism {
  constructor(x, y) {
    // Position
    this.x = x;
    this.y = y;
    
    // Physical attributes
    this.size = 5; // Slightly increased size for visibility
    
    // Track movement history for visualization
    this.history = [];
    this.maxHistoryLength = 10;
  }
  
  // Display the organism as a simple dot with trail
  display() {
    // Draw movement history first (so it appears behind the organism)
    noStroke();
    for (let i = 0; i < this.history.length; i++) {
      // Fade the trail based on age
      let alpha = map(i, 0, this.history.length, 50, 10);
      fill(255, 0, 0, alpha);
      
      let pos = this.history[i];
      ellipse(pos.x, pos.y, 2, 2);
    }
    
    // Draw the organism
    fill(255, 0, 0);  // Bright red for visibility
    ellipse(this.x, this.y, this.size, this.size);
    
    // Update history when organism moves
    if (frameCount % 30 === 0) {
      this.history.unshift({x: this.x, y: this.y});
      
      // Limit history length
      if (this.history.length > this.maxHistoryLength) {
        this.history.pop();
      }
    }
  }
  
  // Movement with fixed intervals and six directions
  move() {
    // Only move every certain number of frames
    if (frameCount % 30 !== 0) {
      return;
    }
    
    // Get current grid position
    let gridX = floor(this.x / cellSize);
    let gridY = floor(this.y / cellSize);
    
    const cols = floor(width / cellSize);
    const rows = floor(height / cellSize);
    
    // Directions: North, Northeast, Southeast, South, Southwest, Northwest + No Movement
    const directions = [
      { dx: 0, dy: -1 },  // North
      { dx: 1, dy: -0.5 },  // Northeast
      { dx: 1, dy: 0.5 },   // Southeast
      { dx: 0, dy: 1 },    // South
      { dx: -1, dy: 0.5 },  // Southwest
      { dx: -1, dy: -0.5 }, // Northwest
      { dx: 0, dy: 0 }     // Stay in place
    ];
    
    // Evaluate each of the 7 options (6 directions + staying put)
    let validOptions = [];
    let bestOption = 6; // Default to staying in place
    let bestResourceValue = getResourceAt(this.x, this.y); // Current resources
    
    for (let i = 0; i < directions.length; i++) {
      let dir = directions[i];
      let nextX = this.x + dir.dx * cellSize;
      let nextY = this.y + dir.dy * cellSize;
      
      // Skip if checking the "stay in place" option
      if (i === 6) {
        validOptions.push(i);
        continue;
      }
      
      // Handle wrapping for grid coordinates
      let nextGridX = floor(nextX / cellSize);
      let nextGridY = floor(nextY / cellSize);
      nextGridX = (nextGridX + cols) % cols;
      nextGridY = (nextGridY + rows) % rows;
      
      // Check if this is land
      if (grid[nextGridX][nextGridY] === GROUND) {
        validOptions.push(i);
        
        // Check resources at this position
        let resourceValue = resources[nextGridX][nextGridY];
        if (resourceValue > bestResourceValue) {
          bestResourceValue = resourceValue;
          bestOption = i;
        }
      }
    }
    
    // If no valid options besides staying put, just stay
    if (validOptions.length <= 1) {
      return;
    }
    
    // Small chance to choose random direction instead of best
    // if (random() < 0.3) {
    //   // Pick a random valid option, excluding "stay put" from random choices
    //   let randomOptions = validOptions.filter(i => i !== 6);
    //   if (randomOptions.length > 0) {
    //     bestOption = randomOptions[floor(random(randomOptions.length))];
    //   }
    // }
    
    // Move in the chosen direction
    let chosenDir = directions[bestOption];
    this.x += chosenDir.dx * cellSize;
    this.y += chosenDir.dy * cellSize;
    
    // Keep within bounds
    this.x = (this.x + width) % width;
    this.y = (this.y + height) % height;
  }
}