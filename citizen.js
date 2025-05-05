class Citizen {
  constructor(x, y, citizenImage) {
    // Store the image safely (might be null/undefined initially)
    this.img = citizenImage;
    this.hasValidImage = Boolean(this.img); // Flag to check if image is valid
    
    this.x = x;
    this.y = y;
    this.velocity = createVector(0, 0);
    this.acceleration = createVector(0, 0);
    this.maxSpeed = 1.5;
    this.size = 20; // Size for image display and hitbox
    this.color = color(255, 100, 100); // Reddish color
    this.movementHistory = [];
    this.maxHistoryLength = 50;
    this.target = null;
    
    // State management
    this.state = {
      isDead: false,
      isResting: false,
      isSeeking: false,
      isFull: false,
      isExercising: false
    };
    
    this.showDeathText = false;
    
    // Stats tracking
    this.stats = {
      birthTime: millis(),
      lifespan: 0,
      foodEaten: 0,
      distanceTraveled: 0,
      causeOfDeath: ""
    };
    
    this.showUI = true; // Toggle for UI display
    
    // Energy system (used for movement)
    this.energy = random(10, 100); // Starting energy
    this.energyDecayRate = 0.01; // Passive energy consumption per frame
    
    // Fullness system (food storage)
    this.fullness = random(10, 100); // Food storage
    
    // Boredom system
    this.boredom = random(10, 100);
    this.maxBoredom = 100;
    this.boredomIncreaseRate = 0.1;
    
    // Rest system
    this.restThreshold = 10; // Rest when energy below this
    this.restRecoveryRate = 0.1; // Energy recovery when resting
    
    // Behavior parameters
    this.perception = 150; // How far the citizen can perceive food
    
    // Animation properties
    this.deathAnimTime = 0;
    this.deathAnimDuration = 120; // frames
    
    // Debug info for motivation
    this.motivationScores = {
      rest: 0,
      exercise: 0,
      seekFood: 0,
      idle: 0
    };
  }
  
  update() {
    // Update lifespan and check death conditions
    this.updateLifespan();
    this.checkDeathConditions();
    
    if (this.state.isDead) {
      this.animateDeath();
      return;
    }
    
    // Track position for distance calculation
    let prevPosition = createVector(this.x, this.y);
    
    // Handle basic needs
    this.handleMetabolism();
    this.handleEnergy();
    this.handleBoredom();
    
    // Determine and execute highest priority action
    this.decideBehavior();
    
    // Apply movement if not resting
    if (!this.state.isResting) {
      this.move();
    }
    
    // Update statistics
    this.stats.distanceTraveled += dist(prevPosition.x, prevPosition.y, this.x, this.y);
    this.addToHistory();
  }
  
  updateLifespan() {
    if (!this.state.isDead) {
      this.stats.lifespan = (millis() - this.stats.birthTime) / 1000; // in seconds
    }
  }
  
  checkDeathConditions() {
    if (!this.state.isDead && (this.energy <= 0 || this.boredom >= 100)) {
      this.die(this.energy <= 0 ? "starvation" : "boredom");
    }
  }
  
  animateDeath() {
    if (this.deathAnimTime < this.deathAnimDuration) {
      this.deathAnimTime++;
    }
  }
  
  handleMetabolism() {
    // Handle energy consumption and food digestion
    this.energy -= this.energyDecayRate;
    
    if (this.fullness > 0) {
      let digestionAmount = 0.02;
      this.fullness -= digestionAmount;
      this.energy += digestionAmount * 0.8;
    }
    
    this.fullness = constrain(this.fullness, 0, 100);
    this.energy = constrain(this.energy, 0, 100);
  }
  
  handleEnergy() {
    // Handle resting state based on energy
    if (this.energy < this.restThreshold) {
      this.state.isResting = true;
      this.velocity.mult(0);
    }
    
    if (this.state.isResting) {
      this.energy += this.restRecoveryRate;
      
      if (this.fullness > 0) {
        let restDigestionBonus = 0.03;
        this.fullness -= restDigestionBonus;
        this.energy += restDigestionBonus * 0.9;
      }
      
      if (this.energy > this.restThreshold * 3) {
        this.state.isResting = false;
      }
    }
  }
  
  handleBoredom() {
    // Update boredom level
    if (this.velocity.mag() < 0.1) {
      this.boredom += this.boredomIncreaseRate;
    } else {
      this.boredom -= this.velocity.mag() * 0.1;
    }
    this.boredom = constrain(this.boredom, 0, this.maxBoredom);
  }
  
  updateFullnessState() {
    if (this.fullness >= 100) {
      this.state.isFull = true;
    } else if (this.fullness < 50) {
      this.state.isFull = false;
    }
  }
  
  decideBehavior() {
    // Calculate motivation scores
    this.updateMotivationScores();
    
    // Find the highest motivation
    let highestScore = 0;
    let highestMotivation = "idle"; // Default behavior
    
    for (const [motivation, score] of Object.entries(this.motivationScores)) {
      if (score > highestScore) {
        highestScore = score;
        highestMotivation = motivation;
      }
    }
    
    // Reset all states except isDead
    this.state.isResting = false;
    this.state.isExercising = false;
    this.state.isSeeking = false;
    
    // Execute the highest priority behavior
    switch(highestMotivation) {
      case 'rest':
        this.state.isResting = true;
        this.velocity.mult(0);
        break;
      case 'exercise':
        this.state.isExercising = true;
        this.exercise();
        break;
      case 'seekFood':
        this.state.isSeeking = true;
        this.seekFood();
        break;
      case 'idle':
      default:
        // Idle behavior - slow down
        this.velocity.mult(0.95);
    }
    
    // Update fullness state after decision (doesn't affect behavior directly)
    this.updateFullnessState();
  }
  
  updateMotivationScores() {
    // Calculate motivation scores for each need
    
    // Rest motivation
    if (this.energy < this.restThreshold) {
      this.motivationScores.rest = 100; // Force rest when below threshold
    } else {
      this.motivationScores.rest = map(this.energy, 100, 0, 0, 80); // Up to 80 priority
    }
    
    // Exercise motivation
    if (this.energy < 20) {
      this.motivationScores.exercise = 0; // Can't exercise without energy
    } else {
      this.motivationScores.exercise = map(this.boredom, 50, 100, 0, 90);
    }
    
    // Food-seeking motivation
    if (this.fullness >= 100) {
      this.motivationScores.seekFood = 0; // No need to seek if full
    } else {
      let hungerScore = map(this.fullness, 100, 0, 0, 85);
      // Boost priority if nearly empty
      if (this.fullness < 20) {
        hungerScore += 10;
      }
      this.motivationScores.seekFood = hungerScore;
    }
    
    // Idle motivation - baseline level
    this.motivationScores.idle = 10;
  }
  
  // Method for death
  die(cause) {
    this.state.isDead = true;
    this.showDeathText = true;
    this.stats.causeOfDeath = cause;
    this.deathAnimTime = 0;
    this.color = color(100, 100, 100); // Change color to gray when dead
  }
  
  eatFood(nutritionValue) {
    this.fullness += nutritionValue;
    this.stats.foodEaten++;
    
    // Cap fullness at 100
    this.fullness = min(this.fullness, 100);
  }
  
  // New method to relieve boredom
  exercise() {
    // Make the citizen run in a circular pattern to relieve boredom
    let circleRadius = 50; // Radius of the circle
    let circleSpeed = 0.1; // Speed of rotation (higher = faster)

    // Calculate the angle based on frameCount to create circular motion
    let angle = frameCount * circleSpeed;

    // Determine the target position on the circle
    let centerX = this.x; // Center of the circle is the citizen's current position
    let centerY = this.y;
    let targetX = centerX + cos(angle) * circleRadius;
    let targetY = centerY + sin(angle) * circleRadius;

    this.target = createVector(targetX, targetY);

    // Apply steering force to move toward the target
    let desired = p5.Vector.sub(this.target, createVector(this.x, this.y));
    desired.normalize();
    desired.mult(this.maxSpeed * 1.2); // Move faster while exercising

    let steer = p5.Vector.sub(desired, this.velocity);
    steer.limit(0.3); // Stronger steering force

    this.acceleration.add(steer);
    
    // Exercise reduces boredom faster
    this.boredom -= 0.2;
    
    // But costs more energy
    this.energy -= 0.015;
  }
  
  seekFood() {
    // If we have no target or are close to current target, find a new one
    if (this.target === null || 
        (this.target && dist(this.x, this.y, this.target.x, this.target.y) < 5)) {
      
      // Find the closest food within perception range
      let closestFood = null;
      let closestDist = this.perception;
      
      for (let food of foods) {
        let distance = dist(this.x, this.y, food.x, food.y);
        if (distance < closestDist) {
          closestDist = distance;
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
    
    // Exercising costs more energy
    if (this.state.isExercising) {
      energyCost *= 1.5; // Exercise is more energy intensive
    }
    
    this.energy -= energyCost;
    
    // Apply physics
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.state.isExercising ? this.maxSpeed * 1.2 : this.maxSpeed); // Faster when exercising
    
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
      this.velocity.limit(this.state.isExercising ? this.maxSpeed * 1.2 : this.maxSpeed);
      
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
    // Draw movement trail
    this.drawHistory();
    
    // Consolidated display logic
    if (this.state.isDead) {
      this.displayDead();
    } else {
      this.displayAlive();
    }
    
    // Always draw UI (whether alive or dead)
    this.drawUI();
  }
  
  displayAlive() {
    push();
    translate(this.x, this.y);
    
    // Draw the citizen image or fallback circle
    if (this.hasValidImage && this.img) {
      try {
        imageMode(CENTER);
        image(this.img, 0, 0, this.size, this.size);
      } catch (error) {
        // If there's any issue with the image, fall back to a circle
        console.log("Error displaying image:", error);
        this.hasValidImage = false;
      }
    }
    
    // If no valid image or error occurred, draw a circle instead
    if (!this.hasValidImage) {
      fill(this.color);
      noStroke();
      ellipse(0, 0, this.size, this.size);
    }
    
    // Draw status indicators around the citizen
    let offset = this.size * 0.6;
    
    pop();
  }
  
  displayDead() {
    // Death display with animation
    push();
    translate(this.x, this.y);
    textAlign(CENTER, CENTER);
    
    // Death animation - fade in and slight pulse
    let animProgress = this.deathAnimTime / this.deathAnimDuration;
    let animAlpha = map(animProgress, 0, 0.5, 0, 255); // Fade in during first half
    let deathSize = this.size * (1 + sin(animProgress * PI * 4) * 0.1); // Slight pulse
    
    // Show death message only for part of the animation
    if (this.deathAnimTime < this.deathAnimDuration * 0.7) {
      let deathText = this.stats.causeOfDeath === "starvation" ? 
          "Dead from starvation" : 
          "Dead from boredom";
      fill(255, 0, 0, animAlpha); 
      textSize(12);
      text(deathText, 0, -this.size * 1.2);
    }
    
    // Skull emoji with animation
    textSize(deathSize * 0.75);
    fill(255, 255, 255, animAlpha);
    text("💀", 0, 0);
    
    pop();
  }
  
  drawUI() {
    if (!this.showUI) return; // Skip if UI is toggled off
    
    // Translate to citizen's position
    let textHeight = 10;
    push();
    translate(this.x, this.y);

    // Display citizen's stats in the upper right of their location
    fill(255);
    textSize(textHeight);
    textAlign(LEFT, TOP);

    // Display energy
    text("Energy: " + this.energy.toFixed(1), 25, -25);

    // Display fullness with color coding
    let fullnessColor;
    if (this.fullness < 20) {
      fullnessColor = color(255, 50, 50); // Red when hungry
    } else if (this.fullness < 60) {
      fullnessColor = color(255, 255, 50); // Yellow when partially full
    } else {
      fullnessColor = color(50, 255, 50); // Green when mostly full
    }
    fill(fullnessColor);
    text("Fullness: " + this.fullness.toFixed(1), 25, -10);

    // Display boredom level
    let boredomColor;
    if (this.boredom > 70) {
      boredomColor = color(255, 0, 0); // Red when very bored
    } else if (this.boredom > 30) {
      boredomColor = color(255, 165, 0); // Orange when moderately bored
    } else {
      boredomColor = color(200, 200, 200); // Gray when not bored
    }
    fill(boredomColor);
    text("Boredom: " + this.boredom.toFixed(1), 25, 5);

    // Display current state
    fill(255);
    let stateText = this.getCurrentStateText();
    text("State: " + stateText, 25, 20);
    
    // Display current motivation scores in debug mode
    if (this.showDebug) {
      fill(200, 200, 255);
      text("Motivations:", 25, 35);
      text("  Rest: " + this.motivationScores.rest.toFixed(1), 25, 50);
      text("  Exercise: " + this.motivationScores.exercise.toFixed(1), 25, 65);
      text("  Seek Food: " + this.motivationScores.seekFood.toFixed(1), 25, 80);
      text("  Idle: " + this.motivationScores.idle.toFixed(1), 25, 95);
    }

    pop();
  }
  
  // Helper method to determine the current state text
  getCurrentStateText() {
    if (this.state.isDead) return "Dead";
    if (this.state.isResting) return "Resting";
    if (this.state.isExercising) return "Exercising";
    if (this.state.isSeeking) return "Seeking Food";
    if (this.state.isFull) return "Full";
    if (this.boredom > 70) return "Bored";
    return "Idle";
  }
  
  // Method to toggle UI visibility - can be called from outside
  toggleUI() {
    this.showUI = !this.showUI;
  }
  
  // Method to toggle debug info
  toggleDebug() {
    this.showDebug = !this.showDebug;
  }

  drawHistory() {
    // Draw the movement history (shorter trail when resting)
    let trailLength = this.state.isResting ? 5 : this.movementHistory.length;
    
    if (this.movementHistory.length > 1) {
      beginShape();
      for (let i = 0; i < trailLength; i++) {
        let pos = this.movementHistory[this.movementHistory.length - 1 - i];
        if(pos === undefined) continue; // Skip if position is undefined
        // Make trail fade with alpha based on recency
        let alpha = map(i, 0, trailLength, 150, 20);
        
        // Different trail color when exercising
        if (this.state.isExercising) {
          stroke(255, 165, 0, alpha); // Orange trail for exercising
        } else {
          stroke(this.color.levels[0], this.color.levels[1], this.color.levels[2], alpha);
        }
        
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