#import <Capacitor/Capacitor.h>

CAP_PLUGIN(MindfulSessionPlugin, "MindfulSession",
  CAP_PLUGIN_METHOD(isAvailable, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(logSession, CAPPluginReturnPromise);
)
