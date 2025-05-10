// sprite.js - Add this to your project
class Sprite {
  constructor(spritesheet, x, y, width, height) {
    this.spritesheet = spritesheet;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.frames = [];
    this.currentFrame = 0;
    this.frameDelay = 5; // Update every 5 frames
    this.frameCounter = 0;
    this.animations = {}; // Store named animations
    this.currentAnimation = null;
    this.direction = 'down'; // Default direction (down, up, left, right)
    this.directionalAnimations = {}; // Store animations for each direction
  }
  
  // Add a frame from the spritesheet (sx, sy are coordinates in the sheet)
  addFrame(sx, sy) {
    this.frames.push({sx: sx, sy: sy});
    return this; // For method chaining
  }
  
  // Define an animation sequence with name and frame indices
  addAnimation(name, frameIndices) {
    this.animations[name] = frameIndices;
    return this; // For method chaining
  }
  
  // Add directional animations (combines animation name with direction)
  addDirectionalAnimation(baseName, direction, frameIndices) {
    const animName = `${baseName}_${direction}`;
    this.animations[animName] = frameIndices;
    
    // Store this in the directional animations map
    if (!this.directionalAnimations[baseName]) {
      this.directionalAnimations[baseName] = {};
    }
    this.directionalAnimations[baseName][direction] = animName;
    
    return this;
  }
  
  // Set the current direction
  setDirection(direction) {
    if (['up', 'down', 'left', 'right'].includes(direction)) {
      this.direction = direction;
      // If we have a current animation, update it to match the new direction
      if (this.currentAnimationBase && 
          this.directionalAnimations[this.currentAnimationBase] &&
          this.directionalAnimations[this.currentAnimationBase][direction]) {
        
        // Get the directional variant of the current animation
        const newAnimation = this.directionalAnimations[this.currentAnimationBase][direction];
        
        // Only switch if it's different from current
        if (newAnimation !== this.currentAnimation) {
          this.currentAnimation = newAnimation;
          // Don't reset the frame to allow smooth transitions between directions
        }
      }
    }
    return this;
  }
  
  // Start playing a named animation
  playAnimation(baseName) {
    this.currentAnimationBase = baseName;
    
    // Check if we have directional versions of this animation
    if (this.directionalAnimations[baseName] && 
        this.directionalAnimations[baseName][this.direction]) {
      
      // Use the direction-specific animation
      const dirAnimation = this.directionalAnimations[baseName][this.direction];
      
      // Only change if it's a new animation
      if (this.currentAnimation !== dirAnimation) {
        this.currentAnimation = dirAnimation;
        this.currentFrame = 0;
        this.frameCounter = 0;
      }
    } 
    // Fallback to basic animation if no directional version exists
    else if (this.animations[baseName] && this.currentAnimation !== baseName) {
      this.currentAnimation = baseName;
      this.currentFrame = 0;
      this.frameCounter = 0;
    }
    
    return this;
  }
  
  // Update the animation frame
  update() {
    this.frameCounter++;
    
    if (this.frameCounter >= this.frameDelay) {
      this.frameCounter = 0;
      
      // If we have a current animation, use its frame sequence
      if (this.currentAnimation && this.animations[this.currentAnimation]) {
        const frameIndices = this.animations[this.currentAnimation];
        const frameIndex = frameIndices[this.currentFrame % frameIndices.length];
        this.currentFrame = (this.currentFrame + 1) % frameIndices.length;
        return this.frames[frameIndex];
      } else {
        // Otherwise just cycle through all frames
        this.currentFrame = (this.currentFrame + 1) % this.frames.length;
        return this.frames[this.currentFrame];
      }
    }
    
    // Return current frame if not yet time to change
    if (this.currentAnimation && this.animations[this.currentAnimation]) {
      const frameIndices = this.animations[this.currentAnimation];
      const frameIndex = frameIndices[this.currentFrame % frameIndices.length];
      return this.frames[frameIndex];
    }
    
    return this.frames[this.currentFrame];
  }
  
  // Draw the current frame at the specified position
  draw(x, y, w, h) {
    const frame = this.update();
    if (frame && this.spritesheet) {
      // Use CENTER image mode to ensure consistent positioning
      imageMode(CENTER);
      image(
        this.spritesheet,
        x, y, w || this.width, h || this.height,
        frame.sx, frame.sy, this.width, this.height
      );
      // Reset to default image mode
      imageMode(CORNER);
    }
  }
}