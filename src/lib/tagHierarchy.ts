// Tag hierarchy for targeting - children tags are valid when parent is targeted
const TAG_HIERARCHY: Record<number, number[]> = {
  51: [39, 24, 15],
  39: [52, 53, 25, 23, 9],
  52: [54, 36],
  24: [41, 38, 48, 50, 55, 11],
  50: [57, 6],
  6: [46],
  55: [18, 58],
  11: [3, 20],
  15: [28, 21, 29, 8],
  29: [17, 37, 47, 56],
  56: [1, 59],
  8: [13],
};

// Get all descendant tags for a given tag (recursive)
function getDescendantTags(tag: number, visited = new Set<number>()): number[] {
  if (visited.has(tag)) return [];
  visited.add(tag);
  
  const children = TAG_HIERARCHY[tag] || [];
  const descendants: number[] = [...children];
  
  for (const child of children) {
    descendants.push(...getDescendantTags(child, visited));
  }
  
  return descendants;
}

// Expand a list of target tags to include all descendant tags
export function expandTargetTags(targetTags: number[]): number[] {
  const expanded = new Set<number>(targetTags);
  
  for (const tag of targetTags) {
    const descendants = getDescendantTags(tag);
    descendants.forEach(d => expanded.add(d));
  }
  
  return Array.from(expanded);
}

// Check if a unit's tags match any of the expanded target tags
export function unitMatchesTargets(unitTags: number[], abilityTargets: number[]): boolean {
  if (abilityTargets.length === 0) return true; // No restrictions
  
  const expandedTargets = expandTargetTags(abilityTargets);
  return unitTags.some(tag => expandedTargets.includes(tag));
}
