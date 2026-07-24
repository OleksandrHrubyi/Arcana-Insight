#import <Capacitor/Capacitor.h>

CAP_PLUGIN(WidgetBridgePlugin, "WidgetBridge",
  CAP_PLUGIN_METHOD(syncSnapshot, CAPPluginReturnPromise);
)
