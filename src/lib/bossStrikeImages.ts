// Map mission_icon patterns to background images
const missionIconToBackground: Record<string, string> = {
  "scientist": "/boss-strike-images/boss_strike_mad_scientist_1136x640.png",
  "vogel": "/boss-strike-images/boss_strike_mad_scientist_1136x640.png",
  "animal_raider": "/boss-strike-images/boss_animal_raider_1136x640.png",
  "yuzul": "/boss-strike-images/boss_animal_raider_1136x640.png",
  "rebel_tanks": "/boss-strike-images/boss_rebel_tanks_1136x640.png",
  "ludlow": "/boss-strike-images/boss_rebel_tanks_1136x640.png",
  "navy": "/boss-strike-images/navy_boss_strike1136x640.png",
  "sovereign": "/boss-strike-images/navy_boss_strike1136x640.png",
  "infected": "/boss-strike-images/infected_boss_strike_illustration_1136x640.png",
  "shrow": "/boss-strike-images/boss_strike7.png",
  "rebel_girl_pilot": "/boss-strike-images/boss_rebel_girl_pilot_1136x640.png",
  "evaline": "/boss-strike-images/boss_rebel_girl_pilot_1136x640.png",
  "acehart": "/boss-strike-images/boss_rebel_girl_pilot_1136x640.png",
  "raider_bosses": "/boss-strike-images/raider_bosses_boss_strike1136x640.png",
};

// Fallback names for boss strikes based on mission_icon patterns
const missionIconToName: Record<string, string> = {
  "rebel_girl_pilot": "Rebel Pilot Evaline Acehart",
  "evaline": "Rebel Pilot Evaline Acehart",
  "acehart": "Rebel Pilot Evaline Acehart",
};

export function getBossStrikeBackgroundFromMissionIcon(missionIcon?: string): string | null {
  if (!missionIcon) return null;
  
  const lowerIcon = missionIcon.toLowerCase();
  
  // Check each pattern
  for (const [pattern, imageUrl] of Object.entries(missionIconToBackground)) {
    if (lowerIcon.includes(pattern)) {
      return imageUrl;
    }
  }
  
  return null;
}

export function getBossStrikeFallbackName(missionIcon?: string): string | null {
  if (!missionIcon) return null;
  
  const lowerIcon = missionIcon.toLowerCase();
  
  for (const [pattern, name] of Object.entries(missionIconToName)) {
    if (lowerIcon.includes(pattern)) {
      return name;
    }
  }
  
  return null;
}

// Legacy function for backwards compatibility
export function getBossStrikeBackgroundUrl(bossStrikeId: string): string | null {
  // No longer used - prefer getBossStrikeBackgroundFromMissionIcon
  return null;
}
