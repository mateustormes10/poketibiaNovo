export default class Skill {
  constructor({ name, type, element, power, manaCost, targetArea, cowndown }) {
    this.name = name;
    this.type = type;
    this.element = element;
    this.power = power;
    this.manaCost = manaCost;
    this.targetArea = targetArea;
    this.cowndown = cowndown;
  }
}
