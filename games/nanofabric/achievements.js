/* NanoFactory — achievements.js */

function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (!gameState.achievements.includes(a.id)) {
      try {
        if (a.condition(gameState)) {
          gameState.achievements.push(a.id);
          toast('🏆 ' + a.name + ': ' + a.desc);
        }
      } catch(e) {}
    }
  }
}
