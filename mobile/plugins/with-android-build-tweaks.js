// Expo config plugin: Android build settings that survive `expo prebuild`.
// - Kotlin compiles inside the Gradle daemon (the separate Kotlin daemon fails to start on some Windows machines).
// - Long network timeouts, for networks where HTTPS goes through a scanning proxy or antivirus and downloads are slow.
const fs = require("fs");
const path = require("path");
const { withGradleProperties, withDangerousMod } = require("expo/config-plugins");

const PROPS = {
  "kotlin.compiler.execution.strategy": "in-process",
  "systemProp.org.gradle.internal.http.connectionTimeout": "120000",
  "systemProp.org.gradle.internal.http.socketTimeout": "300000",
};

function withProps(config) {
  return withGradleProperties(config, (c) => {
    for (const [key, value] of Object.entries(PROPS)) {
      c.modResults = c.modResults.filter((item) => !(item.type === "property" && item.key === key));
      c.modResults.push({ type: "property", key, value });
    }
    return c;
  });
}

function withWrapperTimeout(config) {
  return withDangerousMod(config, [
    "android",
    async (c) => {
      const file = path.join(c.modRequest.platformProjectRoot, "gradle", "wrapper", "gradle-wrapper.properties");
      if (fs.existsSync(file)) {
        const text = fs.readFileSync(file, "utf8");
        const next = /networkTimeout=\d+/.test(text)
          ? text.replace(/networkTimeout=\d+/, "networkTimeout=300000")
          : `${text.trimEnd()}\nnetworkTimeout=300000\n`;
        fs.writeFileSync(file, next);
      }
      return c;
    },
  ]);
}

module.exports = (config) => withWrapperTimeout(withProps(config));
