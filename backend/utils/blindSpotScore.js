function computeBlindSpotScore(rankedGaps, totalConcepts) {
  if (!rankedGaps || !rankedGaps.length || !totalConcepts) return 0;
  const avgPriority = rankedGaps.reduce((s, g) => s + g.priority, 0) / rankedGaps.length;
  const gapRatio = rankedGaps.length / totalConcepts;
  return Math.round(gapRatio * avgPriority * 10);
}
module.exports = { computeBlindSpotScore };
