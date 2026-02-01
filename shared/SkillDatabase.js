
import Skill from "./Skill.js";

// Mapeamento de nomes de skills para imagens na pasta assets/menu_ui/skills/
const skillImageMap = {
  "Arranhão": "ArranhaoUi.png",
  "Brasas": "BrasasUi.png",
  "Chicote de Vinha": "chicoteVinhaUi.png",
  "Confusão": "ConfusaoUi.png",
  "Endurecer": "EndurecerUi.png",
  "Ferrão": "FerraoUi.png",
  "Giro Rápido": "GiroRapidoUi.png",
  "Hidro Bomba": "HidroBombaUi.png",
  "Investida": "InvestidaUi.png",
  "Jato de Água": "JatoAguaUi.png",
  "Lança-Chamas": "LancaChamasUi.png",
  "Lança-chamas": "LancaChamasUi.png",
  "Pó do Sono": "poSonoUi.png",
  "Pó Venenoso": "PoVenenosoUi.png",
  "Raio Solar": "RaioSolarUi.png",
  "Voo": "VooUi.png"
};

function getSkillImagePath(skillName) {
  // Remove acentos e espaços, padroniza para buscar no map
  if (skillImageMap[skillName]) {
    return `assets/menu_ui/skills/${skillImageMap[skillName]}`;
  }
  return "assets/menu_ui/skills/ArranhaoUi.png";
}

export const SkillDatabase = {
  "Chicote de Vinha": new Skill({ name: "Chicote de Vinha", type: "damage", element: "grass", power: 1, cowndown: 8, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Chicote de Vinha") }),
  "Pó do Sono": new Skill({ name: "Pó do Sono", type: "status", element: "grass", power: 2, cowndown: 12, spriteSkillList: ["56827","56827"], targetArea: "3x3", imagePath: getSkillImagePath("Pó do Sono") }),
  "Pó Venenoso": new Skill({ name: "Pó Venenoso", type: "status", element: "poison", power: 1, cowndown: 10, spriteSkillList: ["52512","52513","52514","52515","52516","52517","52518"], targetArea: "3x3", imagePath: getSkillImagePath("Pó Venenoso") }),
  "Raio Solar": new Skill({ name: "Raio Solar", type: "damage", element: "grass", power: 5, cowndown: 25, spriteSkillList: ["56827","56827"], targetArea: "5x5", imagePath: getSkillImagePath("Raio Solar") }),
  "Brasas": new Skill({ name: "Brasas", type: "damage", element: "fire", power: 3, cowndown: 8, spriteSkillList: ["56827","56827"], targetArea: "3x3", imagePath: getSkillImagePath("Brasas") }),
  "Arranhão": new Skill({ name: "Arranhão", type: "damage", element: "normal", power: 1, cowndown: 5, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Arranhão") }),
  "Lança-Chamas": new Skill({ name: "Lança-Chamas", type: "damage", element: "fire", power: 4, cowndown: 18, spriteSkillList: ["56827","56827"], targetArea: "5x5", imagePath: getSkillImagePath("Lança-Chamas") }),
  "Voo": new Skill({ name: "Voo", type: "damage", element: "flying", power: 4, cowndown: 15, spriteSkillList: ["56827","56827"], targetArea: "line", imagePath: getSkillImagePath("Voo") }),
  "Jato de Água": new Skill({ name: "Jato de Água", type: "damage", element: "water", power: 1, cowndown: 8, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Jato de Água") }),
  "Giro Rápido": new Skill({ name: "Giro Rápido", type: "damage", element: "normal", power: 3, cowndown: 10, spriteSkillList: ["56827","56827"], targetArea: "3x3", imagePath: getSkillImagePath("Giro Rápido") }),
  "Hidro Bomba": new Skill({ name: "Hidro Bomba", type: "damage", element: "water", power: 5, cowndown: 25, spriteSkillList: ["56827","56827"], targetArea: "5x5", imagePath: getSkillImagePath("Hidro Bomba") }),
  "Investida": new Skill({ name: "Investida", type: "damage", element: "normal", power: 3, cowndown: 5, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Investida") }),
  "Endurecer": new Skill({ name: "Endurecer", type: "buff", element: "normal", power: 2, cowndown: 8, spriteSkillList: ["52981","52982","52983","52984","52985","52986","52987"], targetArea: "self", imagePath: getSkillImagePath("Endurecer") }),
  "Confusão": new Skill({ name: "Confusão", type: "damage", element: "psychic", power: 3, cowndown: 12, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Confusão") }),
  "Ferrão": new Skill({ name: "Ferrão", type: "damage", element: "bug", power: 1, cowndown: 5, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Ferrão") }),
  "Fúria do Ferrão": new Skill({ name: "Fúria do Ferrão", type: "damage", element: "bug", power: 4, cowndown: 15, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Fúria do Ferrão") }),
  "Rajada de Vento": new Skill({ name: "Rajada de Vento", type: "damage", element: "flying", power: 3, cowndown: 8, spriteSkillList: ["56827","56827"], targetArea: "line", imagePath: getSkillImagePath("Rajada de Vento") }),
  "Ataque Aéreo": new Skill({ name: "Ataque Aéreo", type: "damage", element: "flying", power: 3, cowndown: 12, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Ataque Aéreo") }),
  "Furacão": new Skill({ name: "Furacão", type: "damage", element: "flying", power: 4, cowndown: 22, spriteSkillList: ["56827","56827"], targetArea: "5x5", imagePath: getSkillImagePath("Furacão") }),
  "Mordida": new Skill({ name: "Mordida", type: "damage", element: "dark", power: 1, cowndown: 8, spriteSkillList: ["52994","52995","52996","52997"], targetArea: "single", imagePath: getSkillImagePath("Mordida") }),
  "Super Mordida": new Skill({ name: "Super Mordida", type: "damage", element: "dark", power: 4, cowndown: 14, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Super Mordida") }),
  "Terremoto": new Skill({ name: "Terremoto", type: "damage", element: "ground", power: 5, cowndown: 22, spriteSkillList: ["56827","56827"], targetArea: "5x5", imagePath: getSkillImagePath("Terremoto") }),
  "Chifre Duplo": new Skill({ name: "Chifre Duplo", type: "damage", element: "normal", power: 3, cowndown: 10, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Chifre Duplo") }),
  "Canto": new Skill({ name: "Canto", type: "status", element: "fairy", power: 1, cowndown: 18, spriteSkillList: ["56827","56827"], targetArea: "3x3", imagePath: getSkillImagePath("Canto") }),
  "Explosão Lunar": new Skill({ name: "Explosão Lunar", type: "damage", element: "fairy", power: 4, cowndown: 25, spriteSkillList: ["21947","21948","21949","21950","21951","21952","21953","21954"], targetArea: "5x5", imagePath: getSkillImagePath("Explosão Lunar") }),
  "Chama": new Skill({ name: "Chama", type: "damage", element: "fire", power: 3, cowndown: 8, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Chama") }),
  "Lança-chamas": new Skill({ name: "Lança-chamas", type: "damage", element: "fire", power: 4, cowndown: 18, spriteSkillList: ["56827","56827"], targetArea: "5x5", imagePath: getSkillImagePath("Lança-chamas") }),
  "Roda de Fogo": new Skill({ name: "Roda de Fogo", type: "damage", element: "fire", power: 3, cowndown: 12, spriteSkillList: ["56827","56827"], targetArea: "3x3", imagePath: getSkillImagePath("Roda de Fogo") }),
  "Explosão de Fogo": new Skill({ name: "Explosão de Fogo", type: "damage", element: "fire", power: 5, cowndown: 25, spriteSkillList: ["56827","56827"], targetArea: "5x5", imagePath: getSkillImagePath("Explosão de Fogo") }),
  "Dança das Penas": new Skill({ name: "Dança das Penas", type: "status", element: "flying", power: 0, cowndown: 15, spriteSkillList: ["56827","56827"], targetArea: "3x3", imagePath: getSkillImagePath("Dança das Penas") }),
  "Ataque de Asa": new Skill({ name: "Ataque de Asa", type: "damage", element: "flying", power: 3, cowndown: 8, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Ataque de Asa") }),
  "Bug Bite": new Skill({ name: "Bug Bite", type: "damage", element: "bug", power: 3, cowndown: 8, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Bug Bite") }),
  "Tiro de Seda": new Skill({ name: "Tiro de Seda", type: "status", element: "bug", power: 0, cowndown: 10, spriteSkillList: ["56827","56827"], targetArea: "3x3", imagePath: getSkillImagePath("Tiro de Seda") }),
  "Picada": new Skill({ name: "Picada", type: "damage", element: "bug", power: 1, cowndown: 5, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Picada") }),
  "Pó Paralisante": new Skill({ name: "Pó Paralisante", type: "status", element: "bug", power: 0, cowndown: 12, spriteSkillList: ["56827","56827"], targetArea: "3x3", imagePath: getSkillImagePath("Pó Paralisante") }),
  "Aqua Tail": new Skill({ name: "Aqua Tail", type: "damage", element: "water", power: 4, cowndown: 14, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Aqua Tail") }),
  "Dança da Chuva": new Skill({ name: "Dança da Chuva", type: "status", element: "water", power: 0, cowndown: 20, spriteSkillList: ["56827","56827"], targetArea: "self", imagePath: getSkillImagePath("Dança da Chuva") }),
  "Jato d'Água": new Skill({ name: "Jato d'Água", type: "damage", element: "water", power: 1, cowndown: 8, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Jato d'Água") }),
  "Furacão": new Skill({ name: "Furacão", type: "damage", element: "flying", power: 4, cowndown: 22, spriteSkillList: ["56827","56827"], targetArea: "5x5", imagePath: getSkillImagePath("Furacão") }),
  "Ataque Aéreo": new Skill({ name: "Ataque Aéreo", type: "damage", element: "flying", power: 3, cowndown: 12, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Ataque Aéreo") }),
  "Canção": new Skill({ name: "Canção", type: "status", element: "fairy", power: 2, cowndown: 15, spriteSkillList: ["56827","56827"], targetArea: "3x3", imagePath: getSkillImagePath("Canção") }),
  "Canção Mortal": new Skill({ name: "Canção Mortal", type: "status", element: "fairy", power: 3, cowndown: 30, spriteSkillList: ["52998","52999","52300","52301"], targetArea: "5x5", imagePath: getSkillImagePath("Canção Mortal") }),
  "Supersônico": new Skill({ name: "Supersônico", type: "status", element: "normal", power: 1, cowndown: 12, spriteSkillList: ["56827","56827"], targetArea: "3x3", imagePath: getSkillImagePath("Supersônico") }),
  "Absorver": new Skill({ name: "Absorver", type: "damage", element: "grass", power: 3, cowndown: 6, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Absorver") }),
  "Pétala Solar": new Skill({ name: "Pétala Solar", type: "damage", element: "grass", power: 4, cowndown: 18, spriteSkillList: ["56827","56827"], targetArea: "5x5", imagePath: getSkillImagePath("Pétala Solar") }),
  "Escavação": new Skill({ name: "Escavação", type: "damage", element: "ground", power: 3, cowndown: 12, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Escavação") }),
  "Garra Furiosa": new Skill({ name: "Garra Furiosa", type: "damage", element: "normal", power: 4, cowndown: 12, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Garra Furiosa") }),
  "Golpe Karate": new Skill({ name: "Golpe Karate", type: "damage", element: "fighting", power: 3, cowndown: 10, spriteSkillList: ["52506","52507","52508","52509","52510","52511"], targetArea: "single", imagePath: getSkillImagePath("Golpe Karate") }),
  "Fúria": new Skill({ name: "Fúria", type: "damage", element: "fighting", power: 4, cowndown: 15, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Fúria") }),
  "Bolha": new Skill({ name: "Bolha", type: "damage", element: "water", power: 3, cowndown: 8, spriteSkillList: ["56827","56827"], targetArea: "3x3", imagePath: getSkillImagePath("Bolhas") }),
  "Hipnose": new Skill({ name: "Hipnose", type: "status", element: "psychic", power: 1, cowndown: 18, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Hipnose") }),
  "Soco Dinâmico": new Skill({ name: "Soco Dinâmico", type: "damage", element: "fighting", power: 5, cowndown: 22, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Soco Dinâmico") }),
  "Teleporte": new Skill({ name: "Teleporte", type: "utility", element: "psychic", power: 2, cowndown: 20, spriteSkillList: ["56827","56827"], targetArea: "self", imagePath: getSkillImagePath("Teleporte") }),
  "Psíquico": new Skill({ name: "Psíquico", type: "damage", element: "psychic", power: 4, cowndown: 22, spriteSkillList: ["56951","56952"], targetArea: "5x5", imagePath: getSkillImagePath("Psíquico") }),
  "Choque do Trovão": new Skill({ name: "Choque do Trovão", type: "damage", element: "electric", power: 3, cowndown: 10, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Choque do Trovão") }),
  "Cauda de Ferro": new Skill({ name: "Cauda de Ferro", type: "damage", element: "steel", power: 4, cowndown: 14, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Cauda de Ferro") }),
  "Impacto Relâmpago": new Skill({ name: "Impacto Relâmpago", type: "damage", element: "electric", power: 75, cowndown: 20, spriteSkillList: ["22176","22177","22192","22193","22194"], targetArea: "line", imagePath: getSkillImagePath("Impacto Relâmpago") }),
  "Splash": new Skill({ name: "Splash", type: "utility", element: "water", power: 1, cowndown: 1, spriteSkillList: ["56827","56827"], targetArea: "self", imagePath: getSkillImagePath("Splash") }),
  "Cura": new Skill({ name: "Cura", type: "heal", element: "normal", power: 4, cowndown: 20, spriteSkillList: ["56951","56952","56953","56954","56955","56956"], targetArea: "single", imagePath: getSkillImagePath("Cura") }),
  "Transformar": new Skill({ name: "Transformar", type: "utility", element: "normal", power: 1, cowndown: 25, spriteSkillList: ["56827","56827"], targetArea: "single", imagePath: getSkillImagePath("Transformar") })
};
