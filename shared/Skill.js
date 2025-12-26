export default class Skill {
  constructor({ name, type, element, power, manaCost, spriteSkillList, targetArea }) {
    this.name = name;
    this.type = type;
    this.element = element;
    this.power = power;
    this.manaCost = manaCost;
    this.spriteSkillList = spriteSkillList;
    this.targetArea = targetArea;
  }
}
