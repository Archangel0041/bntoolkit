// Map boss strike IDs to their background images
const bossStrikeBackgrounds: Record<string, string> = {
  "1": "/boss-strike-images/boss_strike_mad_scientist_1136x640.png",
  "2": "/boss-strike-images/boss_rebel_tanks_1136x640.png",
  "3": "/boss-strike-images/raider_bosses_boss_strike1136x640.png",
  "4": "/boss-strike-images/navy_boss_strike1136x640.png",
  "5": "/boss-strike-images/boss_animal_raider_1136x640.png",
  "6": "/boss-strike-images/boss_rebel_girl_pilot_1136x640.png",
  "7": "/boss-strike-images/boss_strike7.png",
  "8": "/boss-strike-images/infected_boss_strike_illustration_1136x640.png",
  // Variants with IDs
  "10277": "/boss-strike-images/boss_rebel_tanks_1136x640_10277.png",
  "10291": "/boss-strike-images/raider_bosses_boss_strike1136x640_10291.png",
  "10357": "/boss-strike-images/navy_boss_strike1136x640_10357.png",
  "10445": "/boss-strike-images/boss_strike_mad_scientist_1136x640_10445.png",
  "10490": "/boss-strike-images/boss_animal_raider_1136x640_10490.png",
  "10529": "/boss-strike-images/boss_rebel_girl_pilot_1136x640_10529.png",
  "10538": "/boss-strike-images/infected_boss_strike_illustration_1136x640_10538.png",
  "10584": "/boss-strike-images/boss_strike7_10584.png",
};

export function getBossStrikeBackgroundUrl(bossStrikeId: string): string | null {
  // First try exact match
  if (bossStrikeBackgrounds[bossStrikeId]) {
    return bossStrikeBackgrounds[bossStrikeId];
  }
  
  // Try to find a matching image based on ID patterns
  // Boss strikes 1-8 have base images, higher IDs might be variants
  const numId = parseInt(bossStrikeId);
  
  if (numId >= 10000) {
    // This is a variant ID, check if we have it
    return bossStrikeBackgrounds[bossStrikeId] || null;
  }
  
  // For IDs 1-8, return the base image
  if (numId >= 1 && numId <= 8) {
    return bossStrikeBackgrounds[bossStrikeId] || null;
  }
  
  return null;
}
