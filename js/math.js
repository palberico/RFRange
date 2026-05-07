/**
 * Calculates the maximum theoretical range in meters using the Friis transmission equation.
 * 
 * @param {Object} link - The hardware link configuration
 * @param {number} link.txPowerDbm - Transmit power in dBm
 * @param {number} link.frequencyHz - Operating frequency in Hertz
 * @param {number} link.rxSensitivityDbm - Receiver sensitivity in dBm
 * @param {number} aircraftAntennaGainDbi - Aircraft antenna gain in dBi
 * @param {number} groundAntennaGainDbi - Ground station antenna gain in dBi
 * @param {number} fadeMarginDb - Fade margin to subtract from the total budget
 * @returns {number} Maximum range in meters
 */
function calculateMaxRangeMeters(link, aircraftAntennaGainDbi, groundAntennaGainDbi, fadeMarginDb) {
  // Free-Space Path Loss equation inverted to solve for distance:
  // FSPL_dB = 20 * log10(distance_meters) + 20 * log10(frequency_Hz) - 147.55
  // RX_Power = TX_Power + TX_Gain + RX_Gain - FSPL
  // We want the distance where RX_Power = RX_Sensitivity + Fade_Margin
  
  const maxFspl = link.txPowerDbm 
                + aircraftAntennaGainDbi 
                + groundAntennaGainDbi 
                - link.rxSensitivityDbm 
                - fadeMarginDb;
                
  const exponent = (maxFspl - 20 * Math.log10(link.frequencyHz) + 147.55) / 20;
  return Math.pow(10, exponent);
}

/**
 * Formats a distance in meters into a human-readable string based on the chosen unit system.
 * 
 * @param {number} meters - The distance in meters
 * @param {string} units - 'metric' or 'imperial'
 * @returns {Object} An object containing the formatted { value, unit }
 */
function formatRange(meters, units) {
  if (units === 'metric') {
    return meters >= 1000
      ? { value: (meters / 1000).toFixed(2), unit: 'km' }
      : { value: meters.toFixed(0), unit: 'm' };
  } else {
    const miles = meters / 1609.34;
    return miles >= 0.1
      ? { value: miles.toFixed(2), unit: 'mi' }
      : { value: (meters * 3.281).toFixed(0), unit: 'ft' };
  }
}
