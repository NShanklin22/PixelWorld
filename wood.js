class Wood {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.size = 15;
      this.color = color(139, 69, 19); // Brown for wood
      this.woodAmount = random(5, 15);
      this.collectProgress = 0; // Collection progress (0-100)
      this.beingCollected = false;
      this.collectorId = null; // ID of citizen collecting this wood
    }
    
    display() {
      push();
      translate(this.x, this.y);
      
      // Draw wood pile
      fill(this.color);
      noStroke();
      
      // Draw base log
      push();
      rotate(PI/4);
      rectMode(CENTER);
      rect(0, 0, this.size * 1.5, this.size * 0.6, 3);
      pop();
      
      // Draw second log
      push();
      rotate(-PI/4);
      rectMode(CENTER);
      rect(0, 0, this.size * 1.5, this.size * 0.6, 3);
      pop();
      
      // Display wood amount
      if (showAllUI) {
        fill(255);
        textAlign(CENTER);
        textSize(10);
        text(Math.ceil(this.woodAmount), 0, this.size + 5);
      }
      
      // Display collection progress if being collected
      if (this.beingCollected && this.collectProgress > 0) {
        // Progress bar background
        fill(100);
        rectMode(CENTER);
        rect(0, this.size + 15, 30, 5);
        
        // Progress bar fill
        fill(255, 165, 0);
        rectMode(CORNER);
        rect(-15, this.size + 12.5, map(this.collectProgress, 0, 100, 0, 30), 5);
      }
      
      pop();
    }
    
    startCollection(citizenId) {
      this.beingCollected = true;
      this.collectorId = citizenId;
      this.collectProgress = 0;
    }
    
    updateCollection(progressAmount) {
      if (this.beingCollected) {
        this.collectProgress += progressAmount;
        
        // Return true if collection is complete
        if (this.collectProgress >= 100) {
          // Calculate how much wood was actually collected
          let woodCollected = min(this.woodAmount, 5); // Max 5 wood per collection
          this.woodAmount -= woodCollected;
          
          // Reset collection
          this.beingCollected = false;
          this.collectorId = null;
          this.collectProgress = 0;
          
          // Return the amount collected
          return woodCollected;
        }
      }
      
      return 0; // Nothing collected yet
    }
    
    cancelCollection() {
      this.beingCollected = false;
      this.collectorId = null;
      this.collectProgress = 0;
    }
    
    isDepleted() {
      return this.woodAmount <= 0;
    }
  }