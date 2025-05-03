class BerryBush {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.berries = 1.0; // Full of berries when created
      this.size = BERRY_SIZE;
    }
    
    display() {
      // Only display if it has berries
      if (this.berries > 0) {
        // Base circle (bush)
        fill(20, 120, 20); // Dark green for the bush
        noStroke();
        ellipse(this.x, this.y, this.size, this.size);
        
        // Berries as small pink circles on top
        fill(255, 20, 147); // Bright pink
        let berryCount = floor(this.berries * 5) + 1; // 1-6 berries based on resource level
        let berrySize = this.size * 0.3; // Smaller than the bush
        
        // Calculate positions for berries in a circular pattern
        for (let i = 0; i < berryCount; i++) {
          let angle = (i / berryCount) * TWO_PI;
          let offsetX = cos(angle) * (this.size * 0.3);
          let offsetY = sin(angle) * (this.size * 0.3);
          ellipse(this.x + offsetX, this.y + offsetY, berrySize, berrySize);
        }
      }
    }
    
    update() {
      // Slowly regrow berries if not fully depleted
      if (this.berries > 0 && this.berries < 1.0) {
        this.berries += BERRY_REGROW_RATE;
        this.berries = min(this.berries, 1.0);
      }
    }
    
    // Method to harvest berries, returns the amount harvested
    harvest(amount) {
      let harvested = min(amount, this.berries);
      this.berries -= harvested;
      return harvested;
    }
    
    // Check if bush is dead (no berries and no chance of regrowing)
    isDead() {
      return this.berries <= 0;
    }
  }