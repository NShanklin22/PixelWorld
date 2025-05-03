class Food {
    constructor(x, y, nutritionValue, size) {
      this.x = x;
      this.y = y;
      this.nutritionValue = nutritionValue;
      this.size = size;
      this.color = color(50, 220, 50); // Green for food
    }
    
    display() {
      fill(this.color);
      noStroke();
      ellipse(this.x, this.y, this.size, this.size);
      
      // Add a little highlight
      fill(100, 255, 100, 150);
      ellipse(this.x - this.size/4, this.y - this.size/4, this.size/3, this.size/3);
    }
  }