export class Item {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.x = data.x;
        this.y = data.y;
        this.z = data.z;
        this.sprite = data.sprite || 'item';
        this.stackable = data.stackable || false;
        this.count = data.count || 1;
    }
    
    update(data) {
        Object.assign(this, data);
    }
}
