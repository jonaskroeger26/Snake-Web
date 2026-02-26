const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Adds FOREGROUND_SERVICE_MEDIA_PLAYBACK permission and sets
 * foregroundServiceType="mediaPlayback" on ExpoForegroundActionsService
 * so Android treats the service as media playback and allows background audio.
 */
function withForegroundServiceMediaType(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest || config.modResults;
    const applications = manifest.application;
    if (!Array.isArray(applications) || applications.length === 0) return config;
    const application = applications[0];

    // Add permission for media playback foreground service (Android 14+)
    const permissions = manifest["uses-permission"] || [];
    const permArray = Array.isArray(permissions) ? permissions : [permissions];
    const hasMediaPlayback = permArray.some(
      (p) => p?.$?.["android:name"] === "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"
    );
    if (!hasMediaPlayback) {
      manifest["uses-permission"] = [
        ...permArray,
        { $: { "android:name": "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" } },
      ];
    }

    // Set foregroundServiceType on ExpoForegroundActionsService
    const services = application.service || [];
    const serviceArray = Array.isArray(services) ? services : [services];
    for (const svc of serviceArray) {
      const name = svc?.$?.["android:name"];
      if (name && name.includes("ExpoForegroundActionsService")) {
        if (!svc.$) svc.$ = {};
        svc.$["android:foregroundServiceType"] = "mediaPlayback";
        break;
      }
    }

    return config;
  });
}

module.exports = withForegroundServiceMediaType;
