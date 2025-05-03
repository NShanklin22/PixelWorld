class Citizen {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.velocity = createVector(0, 0);
      this.acceleration = createVector(0, 0);
      this.maxSpeed = 1.5;
      this.size = 10;
      this.color = color(255, 100, 100); // Reddish color
      this.movementHistory = [];
      this.maxHistoryLength = 50;
      this.target = null;
      
      // Energy system (used for movement)
      this.energy = 50; // Starting energy
      this.energyDecayRate = 0.01; // Passive energy consumption per frame
      
      // Fullness system (food storage)
      this.fullness = 50; // Food storage
      
      // Boredom system
      this.boredom = 0;
      this.maxBoredom = 100;
      this.boredomIncreaseRate = 0.05;
      
      // Rest system
      this.isResting = false;
      this.restThreshold = 10; // Rest when energy below this
      this.restRecoveryRate = 0.1; // Energy recovery when resting
      
      // Behavior states
      this.isSeeking = false; // Whether actively seeking food
      this.perception = 150; // How far the citizen can perceive food
    }
    
    update() {
      // Consume energy over time (baseline metabolism)
      this.energy -= this.energyDecayRate;
      
      // Convert fullness to energy (digestion)
      if (this.fullness > 0) {
        let digestionAmount = 0.02; // How fast food converts to energy
        this.fullness -= digestionAmount;
        this.energy += digestionAmount * 0.8; // 80% efficiency conversion
      }
      
      // Constrain values to valid ranges
      this.fullness = constrain(this.fullness, 0, 100);
      this.energy = constrain(this.energy, 0, 100);
      
      // Update boredom
      if (this.velocity.mag() < 0.1) {
        // Increase boredom when not moving
        this.boredom += this.boredomIncreaseRate;
      } else {
        // Decrease boredom when moving
        this.boredom -= this.velocity.mag() * 0.1;
      }
      this.boredom = constrain(this.boredom, 0, this.maxBoredom);
      
      // Check if need to rest
      if (this.energy < this.restThreshold) {
        this.isResting = true;
      }
      
      // Recover energy while resting
      if (this.isResting) {
        this.energy += this.restRecoveryRate;
        // Convert more fullness to energy when resting (efficient digestion)
        if (this.fullness > 0) {
          let restDigestionBonus = 0.03;
          this.fullness -= restDigestionBonus;
          this.energy += restDigestionBonus * 0.9; // 90% efficiency when resting
        }
        
        // Stop resting once energy is sufficient
        if (this.energy > this.restThreshold * 3) {
          this.isResting = false;
        }
      }
      
      // Only move and seek food if not resting
      if (!this.isResting) {
        // Find food if hungry or seeking or very bored
        if (this.fullness < 20 || (this.isSeeking && this.fullness < 100) || this.boredom > 70) {
          this.isSeeking = true;
          this.seekFood();
        }
        
        // Stop seeking once full (and not bored)
        if (this.fullness >= 100 && this.boredom < 50) {
          this.isSeeking = false;
          this.target = null;
          this.velocity.mult(0.95); // Slow down when full
        }
        
        // Apply forces
        this.move();
      } else {
        // Slow down when resting
        this.velocity.mult(0.8);
      }
      
      // Add current position to history
      this.addToHistory();
    }
    
    seekFood() {
      // If we have no target or are close to current target, find a new one
      if (this.target === null || 
          (this.target && dist(this.x, this.y, this.target.x, this.target.y) < 5)) {
        
        // Find the closest food within perception range
        let closestFood = null;
        let closestDist = this.perception;
        
        for (let food of foods) {
          let d = dist(this.x, this.y, food.x, food.y);
          if (d < closestDist) {
            closestDist = d;
            closestFood = food;
          }
        }
        
        if (closestFood) {
          // Set target to the food position
          this.target = createVector(closestFood.x, closestFood.y);
        } else {
          // No food in perception range, wander randomly
          this.wander();
        }
      }
      
      // Apply force toward target if we have one
      if (this.target) {
        let desired = p5.Vector.sub(this.target, createVector(this.x, this.y));
        
        // The closer we are to the target, the slower we move
        let distance = desired.mag();
        let speed = this.maxSpeed;
        if (distance < 100) {
          speed = map(distance, 0, 100, 0.5, this.maxSpeed);
        }
        
        desired.normalize();
        desired.mult(speed);
        
        let steer = p5.Vector.sub(desired, this.velocity);
        steer.limit(0.2); // Maximum steering force
        
        this.acceleration.add(steer);
      }
    }
    
    wander() {
      // Random wandering behavior when no food is detected
      // Set a random target within a reasonable distance
      let wanderDist = 100;
      let angle = random(TWO_PI);
      let wanderX = this.x + cos(angle) * wanderDist;
      let wanderY = this.y + sin(angle) * wanderDist;
      
      // Keep within boundaries
      wanderX = constrain(wanderX, width * 0.15, width * 0.85);
      wanderY = constrain(wanderY, height * 0.15, height * 0.85);
      
      this.target = createVector(wanderX, wanderY);
    }
    
    move() {
      // Calculate energy cost based on current speed
      let energyCost = this.velocity.mag() * 0.02; // More speed = more energy
      this.energy -= energyCost;
      
      // Apply physics
      this.velocity.add(this.acceleration);
      this.velocity.limit(this.maxSpeed);
      
      // Check if would go out of bounds
      let nextX = this.x + this.velocity.x;
      let nextY = this.y + this.velocity.y;
      
      // Boundary check
      if (nextX < width*0.12 || nextX > width*0.88 || nextY < height*0.12 || nextY > height*0.88) {
        // Avoid edges - steer away from boundaries
        let centerForce = createVector(width/2 - this.x, height/2 - this.y);
        centerForce.normalize();
        centerForce.mult(0.3);
        this.acceleration.add(centerForce);
        
        // Recalculate velocity with new acceleration
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxSpeed);
        
        // Recalculate position
        nextX = this.x + this.velocity.x;
        nextY = this.y + this.velocity.y;
      }
      
      // Update position
      this.x = nextX;
      this.y = nextY;
      
      // Reset acceleration
      this.acceleration.mult(0);
    }
    
    display() {
      // Draw the movement history with transparency based on recency
      this.drawHistory();
      
      // Draw the citizen
      noStroke();
      
      // If resting, show a different appearance
      if (this.isResting) {
        // Draw a sleepy citizen (darker with Z's)
        fill(this.color.levels[0]/2, this.color.levels[1]/2, this.color.levels[2]/2);
        ellipse(this.x, this.y, this.size, this.size);
        
        // Draw Zs for sleeping
        fill(255);
        textSize(8);
        text("z", this.x + this.size/2, this.y - this.size/2);
        textSize(6);
        text("z", this.x + this.size/2 + 5, this.y - this.size/2 - 3);
      } else {
        // Normal citizen appearance
        fill(this.color);
        ellipse(this.x, this.y, this.size, this.size);
      }
      
      // Draw stomach (fullness indicator)
      let stomachSize = map(this.fullness, 0, 100, 0, 6);
      fill(0, 0, 255);
      ellipse(this.x, this.y, stomachSize, stomachSize);
      
      // Draw boredom indicator 
      if (this.boredom > 30) {
        let boredomColor = color(255, 165, 0); // Orange for boredom
        let boredomSize = map(this.boredom, 30, 100, 2, 5);
        fill(boredomColor);
        ellipse(this.x + this.size/2, this.y - this.size/2, boredomSize, boredomSize);
      }
      
      // Draw energy indicator
      let energyColor = color(255, 255, 0); // Yellow for energy
      let energySize = map(this.energy, 0, 100, 0, 5);
      fill(energyColor);
      ellipse(this.x - this.size/2, this.y - this.size/2, energySize, energySize);
    }
    
    drawHistory() {
      // Draw the movement history (shorter trail when resting)
      let trailLength = this.isResting ? 5 : this.movementHistory.length;
      
      if (this.movementHistory.length > 1) {
        beginShape();
        for (let i = 0; i < trailLength; i++) {
          let pos = this.movementHistory[this.movementHistory.length - 1 - i];
          // Make trail fade with alpha based on recency
          let alpha = map(i, 0, trailLength, 150, 20);
          stroke(this.color.levels[0], this.color.levels[1], this.color.levels[2], alpha);
          strokeWeight(map(i, 0, trailLength, 3, 1));
          noFill();
          vertex(pos.x, pos.y);
        }
        endShape();
      }
    }
    
    addToHistory() {
      // Add the current position to the history
      this.movementHistory.push(createVector(this.x, this.y));
      if (this.movementHistory.length > this.maxHistoryLength) {
        this.movementHistory.shift(); // Remove the oldest position
      }
    }
  }
  