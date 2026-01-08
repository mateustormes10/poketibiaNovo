import { Zone } from './Zone.js';

export class ZoneManager {
    constructor() {
        this.zones = new Map();
    }
    
    async init() {
        // Carregar zonas de arquivo ou banco de dados
        this.createDefaultZones();
    }
    
    createDefaultZones() {
        // Zona inicial/spawn
        this.addZone(new Zone({
            id: 'spawn',
            name: 'Spawn Area',
            x1: 40,
            y1: 40,
            x2: 60,
            y2: 60,
            z: 1,
            type: 'safe'
        }));
    }
    
    addZone(zone) {
        this.zones.set(zone.id, zone);
    }
    
    getZoneAt(x, y, z) {
        for (const zone of this.zones.values()) {
            if (zone.contains(x, y, z)) {
                return zone;
            }
        }
        return null;
    }
    
    update(deltaTime) {
        this.zones.forEach(zone => zone.update(deltaTime));
    }
}
