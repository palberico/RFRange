// Video link presets (radio hardware only — antenna is selected separately)
const videoPresets = {
  walksnail_gtpro_200: {
    name: "Walksnail Avatar GT Pro · 200mW",
    txPowerDbm: 23.0,
    frequencyHz: 5.8e9,
    rxSensitivityDbm: -95
  },
  walksnail_gtpro_700: {
    name: "Walksnail Avatar GT Pro · 700mW",
    txPowerDbm: 28.5,
    frequencyHz: 5.8e9,
    rxSensitivityDbm: -95
  },
  dji_o3_1w: {
    name: "DJI O3 Air Unit · 1000mW",
    txPowerDbm: 30.0,
    frequencyHz: 5.8e9,
    rxSensitivityDbm: -95
  },
  dji_o4_1w: {
    name: "DJI O4 Air Unit · 1000mW",
    txPowerDbm: 30.0,
    frequencyHz: 5.8e9,
    rxSensitivityDbm: -98
  },
  hdzero_race_v3_1w: {
    name: "HDZero Race v3 · 1000mW",
    txPowerDbm: 30.0,
    frequencyHz: 5.8e9,
    rxSensitivityDbm: -101  // lowest data rate, community-validated
  },
  analog_600: {
    name: "Generic Analog · 600mW",
    txPowerDbm: 27.8,
    frequencyHz: 5.8e9,
    rxSensitivityDbm: -90
  }
};

// Control link presets (radio hardware only — antenna is selected separately)
const controlPresets = {
  elrs_gemini_50: {
    name: "ELRS Gemini Dual-band · 250mW @ 50Hz",
    txPowerDbm: 24.0,
    frequencyHz: 915e6,
    rxSensitivityDbm: -122  // ~2 dB effective diversity gain vs. single-antenna 915
  },
  elrs_24_250_50: {
    name: "ELRS 2.4 GHz · 250mW @ 50Hz",
    txPowerDbm: 24.0,
    frequencyHz: 2.4e9,
    rxSensitivityDbm: -115
  },
  elrs_24_250_500: {
    name: "ELRS 2.4 GHz · 250mW @ 500Hz",
    txPowerDbm: 24.0,
    frequencyHz: 2.4e9,
    rxSensitivityDbm: -105
  },
  elrs_915_250_50: {
    name: "ELRS 915 MHz · 250mW @ 50Hz",
    txPowerDbm: 24.0,
    frequencyHz: 915e6,
    rxSensitivityDbm: -120
  },
  elrs_915_1w_50: {
    name: "ELRS 915 MHz · 1000mW @ 50Hz",
    txPowerDbm: 30.0,
    frequencyHz: 915e6,
    rxSensitivityDbm: -120
  },
  // RadioMaster Nomad + XR4 (Gemini Xrossband mode, stock antennas)
  // Modeled at 900 MHz — the band that dominates for long-range
  // Sensitivity figures = ELRS spec + ~2 dB true-diversity gain from XR4
  rm_nomad_xr4_250_50: {
    name: "RadioMaster Nomad + XR4 · 250mW @ 50Hz",
    txPowerDbm: 24.0,
    frequencyHz: 915e6,
    rxSensitivityDbm: -122
  },
  rm_nomad_xr4_500_50: {
    name: "RadioMaster Nomad + XR4 · 500mW @ 50Hz",
    txPowerDbm: 27.0,
    frequencyHz: 915e6,
    rxSensitivityDbm: -122
  },
  rm_nomad_xr4_1w_50: {
    name: "RadioMaster Nomad + XR4 · 1W @ 50Hz",
    txPowerDbm: 30.0,
    frequencyHz: 915e6,
    rxSensitivityDbm: -122
  },
  rm_nomad_xr4_1w_150: {
    name: "RadioMaster Nomad + XR4 · 1W @ 150Hz",
    txPowerDbm: 30.0,
    frequencyHz: 915e6,
    rxSensitivityDbm: -114
  },
  crossfire_1w_50: {
    name: "TBS Crossfire · 1000mW @ 50Hz",
    txPowerDbm: 30.0,
    frequencyHz: 915e6,
    rxSensitivityDbm: -130  // LoRa @ 50Hz, community-validated
  }
};

// Video air antennas (mounted on the aircraft)
const videoAirAntennas = {
  stock_dipole: { name: "Stock Dipole · 2.0 dBi", gainDbi: 2.0 },
  axii_micro: { name: "Lumenier AXII Micro · 1.6 dBi", gainDbi: 1.6 },
  omni_lhcp: { name: "Omni LHCP · 3.5 dBi", gainDbi: 3.5 },
  omni_highgain: { name: "Omni High-Gain · 5.0 dBi", gainDbi: 5.0 }
};

// Control air antennas (mounted on the aircraft)
const controlAirAntennas = {
  stock_dipole: { name: "Stock Dipole · 2.1 dBi", gainDbi: 2.1 },
  immortal_t: { name: "Immortal T · 2.5 dBi", gainDbi: 2.5 },
  omni_lhcp: { name: "Omni LHCP · 3.0 dBi", gainDbi: 3.0 },
  omni_highgain: { name: "Omni High-Gain · 5.0 dBi", gainDbi: 5.0 }
};

// Video ground antennas
const videoAntennas = {
  stock: { name: "Stock Goggle Dipole · 2.0 dBi", gainDbi: 2.0 },
  axii: { name: "Lumenier AXII · 1.6 dBi", gainDbi: 1.6 },
  patch_8: { name: "Patch · 8.0 dBi", gainDbi: 8.0 },
  helical_11: { name: "Helical · 11.0 dBi", gainDbi: 11.0 },
  helical_13: { name: "Helical · 13.0 dBi", gainDbi: 13.0 }
};

// Control ground antennas
const controlAntennas = {
  stock: { name: "Stock Whip · 2.1 dBi", gainDbi: 2.1 },
  moxon_6: { name: "Moxon · 6.0 dBi", gainDbi: 6.0 },
  yagi_10: { name: "Yagi · 10.0 dBi", gainDbi: 10.0 },
  yagi_13: { name: "Yagi · 13.0 dBi", gainDbi: 13.0 }
};
