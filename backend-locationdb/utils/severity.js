/**
 * Calculates a severe weather risk score (0-100) from current conditions.
 * This is a simple rule-based heuristic for the prototype — NOT an AI model.
 * It is designed to be swapped out later for the real AI/risk-prediction
 * module described in the project's "Future AI Risk Layer" (see README).
 */
function calculateSeverity(current, alertList = []) {
  const rain = current.precip_mm * 4; // Rainfall intensity factor
  const gust = current.gust_kph * 0.8; // Wind gust factor
  const isThunder = current.condition.text.toLowerCase().includes('thunder');
  const lightning = isThunder ? 60 : 0;
  const alertBonus = alertList.length > 0 ? 30 : 0;

  const score = Math.min(100, Math.round(Math.max(rain, gust, lightning) + alertBonus));
  let zone = 'calm';
  if (score >= 90) zone = 'emergency';
  else if (score >= 78) zone = 'warning';
  else if (score >= 62) zone = 'watch';

  return {
    score,
    zone,
    rainIntensity: Math.min(100, Math.round(rain)),
    windGust: Math.min(100, Math.round(gust)),
    lightningChance: lightning
  };
}

module.exports = { calculateSeverity };
