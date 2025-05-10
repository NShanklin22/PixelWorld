class House {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.size = 40;
      this.constructionProgress = 0; // 0-100
      this.isComplete = false;
      this.woodRequired = 15; // Wood required to complete the house
      this.woodStored = 0; // Current wood in construction
      this.owner = null; // Citizen who owns this house
      this.constructionColor = color(210, 180, 140, 200); // Tan for under construction
      this.completeColor = color(160, 120, 80); // Darker brown for completed
      this.constructionSite = true; // Initially just a construction site
    }
    
    display() {
      push();
      translate(this.x, this.y);
      
      if (this.constructionSite) {
        this.displayConstructionSite();
      } else if (!this.isComplete) {
        this.displayConstruction();
      } else {
        this.displayComplete();
      }
      
      pop();
    }
    
    displayConstructionSite() {
      // Display just the foundation/outline of where the house will be
      noFill();
      stroke(255, 255, 255, 100);
      strokeWeight(1);
      rectMode(CENTER);
      rect(0, 0, this.size, this.size);
      
      // Display construction site marker
      fill(255, 255, 200);
      noStroke();
      
      // Draw a simple construction sign
      push();
      translate(0, -5);
      rectMode(CENTER);
      rect(0, 0, 20, 15);
      fill(0);
      textSize(8);
      textAlign(CENTER, CENTER);
      text("BUILD", 0, 0);
      pop();
      
      // Display wood needed/stored
      if (showAllUI) {
        fill(255);
        textAlign(CENTER);
        textSize(10);
        text("Wood: " + this.woodStored + "/" + this.woodRequired, 0, this.size/2 + 15);
      }
    }
    
    displayConstruction() {
      // Calculate height based on progress
      let buildHeight = map(this.constructionProgress, 0, 100, 0, this.size);
      
      // Draw foundation
      fill(this.constructionColor);
      stroke(100, 70, 50);
      strokeWeight(1);
      rectMode(CENTER);
      rect(0, 0, this.size, this.size);
      
      // Draw construction progress
      fill(160, 120, 80, 150);
      noStroke();
      rectMode(CORNER);
      rect(-this.size/2, this.size/2 - buildHeight, this.size, buildHeight);
      
      // Draw construction visual elements (scaffolding)
      stroke(150);
      strokeWeight(1);
      line(-this.size/2 - 5, -this.size/2, -this.size/2 - 5, this.size/2);
      line(this.size/2 + 5, -this.size/2, this.size/2 + 5, this.size/2);
      
      // Display progress percentage
      if (showAllUI) {
        fill(255);
        textAlign(CENTER);
        textSize(10);
        text(Math.floor(this.constructionProgress) + "%", 0, -5);
        text("Wood: " + this.woodStored + "/" + this.woodRequired, 0, 10);
      }
    }
    
    displayComplete() {
      // Draw the completed house
      
      // House base
      fill(this.completeColor);
      stroke(100, 70, 50);
      strokeWeight(1);
      rectMode(CENTER);
      rect(0, 0, this.size, this.size);
      
      // Roof
      fill(180, 80, 80); // Reddish brown for roof
      noStroke();
      beginShape();
      vertex(-this.size/2 - 5, -this.size/2);
      vertex(this.size/2 + 5, -this.size/2);
      vertex(this.size/3, -this.size/2 - 15);
      vertex(-this.size/3, -this.size/2 - 15);
      endShape(CLOSE);
      
      // Door
      fill(120, 80, 50); // Dark brown for door
      rectMode(CENTER);
      rect(0, this.size/2 - 10, 15, 20);
      
      // Windows
      fill(200, 230, 255); // Blue-ish for window
      rectMode(CENTER);
      rect(-this.size/3, 0, 10, 10);
      rect(this.size/3, 0, 10, 10);
      
      // Display owner info if UI is on
      if (showAllUI && this.owner) {
        fill(255);
        textAlign(CENTER);
        textSize(10);
        text("Owner: #" + citizens.indexOf(this.owner), 0, this.size/2 + 15);
      }
    }
    
    addWood(amount) {
      this.woodStored += amount;
      
      // Check if we have enough wood to start actual construction
      if (this.constructionSite && this.woodStored >= 5) {
        this.constructionSite = false;
      }
      
      // Cap at required amount
      this.woodStored = min(this.woodStored, this.woodRequired);
      
      // Update construction progress based on wood ratio
      this.updateProgress();
      
      return true; // Wood was successfully added
    }
    
    updateProgress() {
      // Progress is proportional to wood collected
      this.constructionProgress = (this.woodStored / this.woodRequired) * 100;
      
      // Check if construction is complete
      if (this.constructionProgress >= 100 && !this.isComplete) {
        this.completeConstruction();
      }
    }
    
    completeConstruction() {
      this.isComplete = true;
      this.constructionProgress = 100;
    }
    
    setOwner(citizen) {
      this.owner = citizen;
    }
  }