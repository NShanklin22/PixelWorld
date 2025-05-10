class Citizen {
  constructor(x, y, spritesheet) {
    // Store the image safely (might be null/undefined initially)  
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

    this.spritesheet = spritesheet;
    this.hasValidImage = Boolean(this.spritesheet);
    
    // Create sprite if we have a valid spritesheet
    if (this.hasValidImage) {
      // Here we assume each sprite is 16x16 pixels in the sheet
      this.sprite = new Sprite(this.spritesheet, 0, 0, 16, 16);
      
      // Add frames - we're defining locations of sprites in the spritesheet
      // Assuming your sheet has idle frames in the top row
      let frameHeight = 16
      this.sprite.addFrame(0, frameHeight*4)   // First idle frame at (0,0)
                .addFrame(16, frameHeight*4)   // Second idle frame at (16,0)
                .addFrame(32, frameHeight*4);  // Third idle frame at (32,0)
      
      // Add walking upward frames from the second row
      this.sprite.addFrame(0, frameHeight*1)  // First walking frame at (0,16) 
                .addFrame(16, frameHeight*1)  // Second walking frame at (16,16)
                .addFrame(32, frameHeight*1); // Third walking frame at (32,16)

      // Add walking down frames from
      this.sprite.addFrame(0, 0)  // First walking frame at (0,16) 
                .addFrame(16, 0)  // Second walking frame at (16,16)
                .addFrame(32, 0); // Third walking frame at (32,16)
      
      // Define animations using frame indices
      this.sprite.addAnimation('idle', [0, 1, 2])
                .addAnimation('walkUp', [3, 4, 5])
                .addAnimation('walkDown', [6, 7, 8])
                .playAnimation('idle'); // Start with idle animation
    }
    
    // State management
    this.state = {
      isDead: false,
      isResting: false,
      isSeeking: false,
      isFull: false,
      isExercising: false,
      isCollectingWood: false,  // NEW: Wood collection state
      isConstructing: false     // NEW: House construction state
    };
    
    this.showDeathText = false;
    
    // Stats tracking
    this.stats = {
      birthTime: millis(),
      lifespan: 0,
      foodEaten: 0,
      distanceTraveled: 0,
      causeOfDeath: "",
      woodCollected: 0         // NEW: Track wood collected
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

    this.decisionFrame = 0; // Frame counter for decision making
    
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
      idle: 0,
      collectWood: 0,    // NEW: Wood collection motivation
      buildHouse: 0      // NEW: House building motivation
    };
    
    // NEW: Resource inventory
    this.inventory = {
      wood: 0,
      maxWood: 10        // Maximum wood that can be carried
    };
    
    // NEW: Wood collection properties
    this.woodTarget = null;     // Current wood being targeted
    
    // NEW: House properties
    this.house = null;          // The house this citizen owns
    this.houseTarget = null;    // House being targeted for construction
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
      // Only run decision every N frames to reduce computation
      if (this.decisionFrame++ % 5 !== 0) return;
      
      console.log("Here")

      // Check minimum duration
      if (this.lastBehaviorChangeTime && 
          Date.now() - this.lastBehaviorChangeTime < this.minBehaviorDuration) {
          return;
      }

      
      this.updateMotivationScores(); // With smoothing
      
      // Apply hysteresis and threshold
      const hysteresisBonus = 0.1;
      const changeThreshold = 0.15;
      
      let currentBehavior = this.getCurrentBehavior();
      let currentScore = this.motivationScores[currentBehavior] || 0;
      currentScore += hysteresisBonus;
      
      let highestScore = currentScore;
      let highestMotivation = currentBehavior || "idle";

      console.log(highestMotivation, highestScore);
      
      for (const [motivation, score] of Object.entries(this.motivationScores)) {
          if (score > currentScore + changeThreshold && score > highestScore) {
              highestScore = score;
              highestMotivation = motivation;
          }
      }
      
    // Reset all states except isDead
    this.state.isResting = false;
    this.state.isExercising = false;
    this.state.isSeeking = false;
    this.state.isCollectingWood = false;
    this.state.isConstructing = false;
    
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
      case 'collectWood':
        this.state.isCollectingWood = true;
        this.seekWood();
        break;
      case 'buildHouse':
        this.state.isConstructing = true;
        this.seekHouse();
        break;
      case 'idle':
      default:
        // Idle behavior - slow down
        this.velocity.mult(0.95);
    }
    
    // Update fullness state after decision (doesn't affect behavior directly)
    this.updateFullnessState();
  }

  getCurrentBehavior() {
    if (this.state.isResting) return 'rest';
    if (this.state.isExercising) return 'exercise';
    if (this.state.isSeeking) return 'seekFood';
    if (this.state.isCollectingWood) return 'collectWood';
    if (this.state.isConstructing) return 'buildHouse';
    return 'idle';
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
    
    // Wood collection motivation
    if (this.inventory.wood >= this.inventory.maxWood) {
      this.motivationScores.collectWood = 0; // No need to collect if inventory full
    } else {
      // Base motivation on wood inventory
      let woodScore = map(this.inventory.wood, this.inventory.maxWood, 0, 10, 65);
      
      // Increase motivation if we own a house that needs wood
      if (this.house && !this.house.isComplete) {
        woodScore += 20;
      }
      
      // Decrease motivation if very hungry or tired
      if (this.fullness < 20 || this.energy < 30) {
        woodScore -= 30;
      }
      
      this.motivationScores.collectWood = max(0, woodScore);
    }
    
    // House building motivation
    if (this.house && this.house.isComplete) {
      this.motivationScores.buildHouse = 0; // No need to build if we already have a complete house
    } else {
      // Base house building motivation
      let buildScore = 50; // Default desire to build
      
      // Can't build without wood
      if (this.inventory.wood <= 0) {
        buildScore = 0;
      } else {
        // Higher motivation when carrying more wood
        buildScore += map(this.inventory.wood, 0, this.inventory.maxWood, 0, 30);
      }
      
      // If we already have a house under construction, prioritize finishing it
      if (this.house && !this.house.isComplete) {
        buildScore += 25;
      }
      
      this.motivationScores.buildHouse = max(0, buildScore);
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
    
    // Release any wood being collected
    this.stopCollectingWood();
    
    // Release house ownership if they had a house
    if (this.house) {
      // Only remove ownership if the house is not complete
      if (!this.house.isComplete) {
        this.house.owner = null;
      }
      this.house = null;
    }
  }
  
  eatFood(nutritionValue) {
    this.fullness += nutritionValue;
    this.stats.foodEaten++;
    
    // Cap fullness at 100
    this.fullness = min(this.fullness, 100);
  }
  
  // Method to relieve boredom
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
  
  // NEW: Add method for seeking wood
  seekWood() {
    // If we already have a wood target, continue collecting from it
    if (this.woodTarget && woods.includes(this.woodTarget)) {
      // Check if we're close enough to collect
      let distance = dist(this.x, this.y, this.woodTarget.x, this.woodTarget.y);
      
      if (distance < 25) {
        // We're close enough, start collecting
        if (!this.woodTarget.beingCollected) {
          // Start collection process
          this.woodTarget.startCollection(citizens.indexOf(this));
          this.velocity.mult(0); // Stop moving during collection
        }
      } else {
        // Move toward wood target
        this.moveToTarget(this.woodTarget.x, this.woodTarget.y);
      }
    } else {
      // Find a new wood target
      this.findNewWoodTarget();
    }
  }
  
  // NEW: Add method to find a new wood source
  findNewWoodTarget() {
    // Find nearest wood source with resources left
    let nearestWood = null;
    let minDistance = this.perception * 1.5; // Increased perception for wood
    
    for (let wood of woods) {
      if (!wood.isDepleted() && !wood.beingCollected) {
        let distance = dist(this.x, this.y, wood.x, wood.y);
        if (distance < minDistance) {
          minDistance = distance;
          nearestWood = wood;
        }
      }
    }
    
    if (nearestWood) {
      this.woodTarget = nearestWood;
      // Move toward the target
      this.moveToTarget(nearestWood.x, nearestWood.y);
    } else {
      // No wood found in range, wander randomly
      this.wander();
      this.woodTarget = null;
    }
  }
  
  // NEW: Add method to collect wood
  collectWood(amount) {
    // Add wood to inventory
    this.inventory.wood += amount;
    this.inventory.wood = min(this.inventory.wood, this.inventory.maxWood);
    
    // Update stats
    this.stats.woodCollected += amount;
    
    // Reset wood target
    this.woodTarget = null;
    
    // Energy cost for collecting wood
    this.energy -= 2;
  }
  
  // NEW: Add method to stop collecting wood
  stopCollectingWood() {
    if (this.woodTarget) {
      // Tell the wood resource we've stopped collecting
      this.woodTarget.cancelCollection();
      this.woodTarget = null;
    }
    this.state.isCollectingWood = false;
  }
  
  // NEW: Add method for seeking a house to build
  seekHouse() {
    // If we already have a house target, continue building it
    if (this.houseTarget && houses.includes(this.houseTarget)) {
      if (this.continueConstruction()) {
        // Successfully continuing construction
        return;
      }
    }
    
    // If we have our own house that's not complete, prioritize it
    if (this.house && !this.house.isComplete) {
      this.houseTarget = this.house;
      this.continueConstruction();
      return;
    }
    
    // Look for an unclaimed construction site nearby
    let nearestHouse = null;
    let minDistance = this.perception;
    
    for (let house of houses) {
      // Only consider houses that aren't complete and don't have an owner
      if (!house.isComplete && !house.owner) {
        let distance = dist(this.x, this.y, house.x, house.y);
        if (distance < minDistance) {
          minDistance = distance;
          nearestHouse = house;
        }
      }
    }
    
    if (nearestHouse) {
      // Found an unclaimed house site
      this.houseTarget = nearestHouse;
      this.claimHouse(nearestHouse);
      return;
    }
    
    // If we have wood but no house site, create a new house
    if (this.inventory.wood >= 5 && !this.house) {
      // Create a new house at a suitable location near the citizen
      let houseX = this.x + random(-100, 100);
      let houseY = this.y + random(-100, 100);
      
      // Keep the house within bounds
      houseX = constrain(houseX, width * 0.2, width * 0.8);
      houseY = constrain(houseY, height * 0.2, height * 0.8);
      
      // Create the house and claim it
      let newHouse = createHouse(houseX, houseY);
      this.claimHouse(newHouse);
    } else {
      // No house target found and can't build a new one
      this.wander();
    }
  }
  
  // NEW: Add method to claim a house
  claimHouse(house) {
    // Set this citizen as the house owner
    house.setOwner(this);
    this.house = house;
    this.houseTarget = house;
    
    // Move toward the house
    this.moveToTarget(house.x, house.y);
  }
  
  // NEW: Add method to continue construction on a house
  continueConstruction() {
    if (!this.houseTarget) return false;
    
    // Check if we're close enough to build
    let distance = dist(this.x, this.y, this.houseTarget.x, this.houseTarget.y);
    
    if (distance < 40) {
      // Close enough to build
      if (this.inventory.wood > 0) {
        // Contribute wood to the house
        let woodToAdd = min(this.inventory.wood, 1); // Add 1 wood at a time
        if (this.houseTarget.addWood(woodToAdd)) {
          // Wood successfully added to house
          this.inventory.wood -= woodToAdd;
          
          // Stop moving during construction
          this.velocity.mult(0);
          
          // Drain energy during construction
          this.energy -= 0.05;
          
          return true;
        }
      }
      
      // If house is complete or we're out of wood
      if (this.houseTarget.isComplete || this.inventory.wood <= 0) {
        // Reset house target if it's complete or we can't contribute more
        this.houseTarget = null;
      }
    } else {
      // Move toward the house
      this.moveToTarget(this.houseTarget.x, this.houseTarget.y);
    }
    
    return false;
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
  
  // NEW: Helper function for moving toward a target position
  moveToTarget(targetX, targetY) {
    let target = createVector(targetX, targetY);
    let desired = p5.Vector.sub(target, createVector(this.x, this.y));
    
    // Calculate distance to target
    let distance = desired.mag();
    
    // Only move if we're not already at the target
    if (distance > 5) {
      // The closer we are to the target, the slower we move
      let speed = this.maxSpeed;
      if (distance < 50) {
        speed = map(distance, 0, 50, 0.2, this.maxSpeed);
      }
      
      desired.normalize();
      desired.mult(speed);
      
      let steer = p5.Vector.sub(desired, this.velocity);
      steer.limit(0.2); // Maximum steering force
      
      this.acceleration.add(steer);
    } else {
      // We're at the target, stop moving
      this.velocity.mult(0.8);
    }
  }
  // Update the move method to set direction based on movement
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
    
    // Set direction based on movement vector
    this.updateDirection();
    
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
  
  // New method to determine direction from velocity
  updateDirection() {
    if (this.velocity.mag() < 0.1) return; // Not moving enough to change direction
    
    // Determine the main direction of movement
    // We'll use the larger component (x or y) to decide
    if (Math.abs(this.velocity.x) > Math.abs(this.velocity.y)) {
      // Horizontal movement is dominant
      this.direction = this.velocity.x > 0 ? 'right' : 'left';
    } else {
      // Vertical movement is dominant
      this.direction = this.velocity.y > 0 ? 'down' : 'up';
    }
    
    // If we have a sprite, update its direction
    if (this.hasValidImage && this.sprite) {
      this.sprite.setDirection(this.direction);
    }
  }
  
  displayAlive() {
    // Update animation state based on citizen state
    if (this.hasValidImage && this.sprite) {
      // Set animation based on movement
      if (this.sprite.direction === 'up') {
        this.sprite.playAnimation('walkUp');
      } else if(this.sprite.direction === 'down'){
        this.sprite.playAnimation('walkDown');
      }else {
        this.sprite.playAnimation('idle');
      }
      
      // Draw the sprite
      try {
        // Just draw at the position - the sprite system handles the direction
      this.sprite.draw(this.x, this.y, this.size, this.size);
    } catch (error) {
      console.log("Error displaying sprite:", error);
      this.hasValidImage = false;
    }
    } else {
      // If no valid image or error occurred, draw a circle instead
      fill(this.color);
      noStroke();
      ellipse(this.x, this.y, this.size, this.size);
    }
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

  display() {
    // Draw movement trail
    this.drawHistory();
    
    // Consolidated display logic
    if (this.state.isDead) {
      this.displayDead();
    } else {
      this.displayAlive();
    }
    
    // Draw UI if citizen is alive
    if(!this.state.isDead){
      this.drawUI();
    }
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
    
    // NEW: Display wood inventory
    fill(139, 69, 19); // Brown for wood
    text("Wood: " + this.inventory.wood + "/" + this.inventory.maxWood, 25, 35);
    
    // NEW: Display house status if applicable
    if (this.house) {
      fill(100, 200, 100); // Green for having a house
      let houseStatus = this.house.isComplete ? "Complete" : 
                       (this.house.constructionProgress.toFixed(0) + "% Done");
      text("House: " + houseStatus, 25, 50);
    }
    
    // Display current motivation scores in debug mode
    if (this.showDebug) {
      fill(200, 200, 255);
      text("Motivations:", 25, 65);
      text("  Rest: " + this.motivationScores.rest.toFixed(1), 25, 80);
      text("  Exercise: " + this.motivationScores.exercise.toFixed(1), 25, 95);
      text("  Seek Food: " + this.motivationScores.seekFood.toFixed(1), 25, 110);
      text("  Collect Wood: " + this.motivationScores.collectWood.toFixed(1), 25, 125);
      text("  Build House: " + this.motivationScores.buildHouse.toFixed(1), 25, 140);
      text("  Idle: " + this.motivationScores.idle.toFixed(1), 25, 155);
    }

    pop();
  }
  
  // Helper method to determine the current state text
  getCurrentStateText() {
    if (this.state.isDead) return "Dead";
    if (this.state.isResting) return "Resting";
    if (this.state.isExercising) return "Exercising";
    if (this.state.isSeeking) return "Seeking Food";
    if (this.state.isCollectingWood) return "Collecting Wood";
    if (this.state.isConstructing) return "Building House";
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
        } else if (this.state.isCollectingWood) {
          stroke(139, 69, 19, alpha); // Brown trail for wood collection
        } else if (this.state.isConstructing) {
          stroke(100, 200, 255, alpha); // Blue trail for construction
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