export const MathUtils = {
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },
    
    lerp(start, end, t) {
        return start + (end - start) * t;
    },
    
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },
    
    manhattanDistance(x1, y1, x2, y2) {
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    },
    
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }
};
