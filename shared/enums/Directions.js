export const Directions = {
    UP: 'up',
    DOWN: 'down',
    LEFT: 'left',
    RIGHT: 'right',
    
    opposite(direction) {
        const opposites = {
            up: 'down',
            down: 'up',
            left: 'right',
            right: 'left'
        };
        return opposites[direction];
    },
    
    toVector(direction) {
        const vectors = {
            up: { x: 0, y: -1 },
            down: { x: 0, y: 1 },
            left: { x: -1, y: 0 },
            right: { x: 1, y: 0 }
        };
        return vectors[direction] || { x: 0, y: 0 };
    }
};
