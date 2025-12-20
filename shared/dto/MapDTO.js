export class MapDTO {
    static serialize(map) {
        return {
            width: map.width,
            height: map.height,
            layers: map.layers,
            tiles: map.tiles
        };
    }
    
    static serializeChunk(tiles, x, y, z, size) {
        return {
            x,
            y,
            z,
            size,
            tiles
        };
    }
}
