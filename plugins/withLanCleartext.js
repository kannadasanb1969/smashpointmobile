// Test-build helper: permits cleartext HTTP ONLY to the local emulator test backend (10.0.2.2, the emulator-only alias for the host Mac). Base config stays
// cleartext-denied, so production HTTPS and every other host remain secure. Remove this plugin for store builds.
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const XML = `<?xml version="1.0" encoding="utf-8"?>
<!-- TEST BUILD ONLY: plain HTTP is allowed solely for the local LAN test backend. Everything else (all HTTPS, incl. production) stays secure. -->
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">10.0.2.2</domain>
  </domain-config>
</network-security-config>
`;

module.exports = function withLanCleartext(config) {
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'network_security_config.xml'), XML);
      return cfg;
    },
  ]);
  return withAndroidManifest(config, (cfg) => {
    cfg.modResults.manifest.application[0].$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return cfg;
  });
};
