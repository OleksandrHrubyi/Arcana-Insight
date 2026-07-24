import Foundation
import Capacitor
#if canImport(WidgetKit)
import WidgetKit
#endif

// RP-16: the app pushes a small pre-localized snapshot (today's sky line, the
// daily question, ritual progress) into the shared App Group so the home-screen
// widget can render without any logic of its own.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin {
    static let appGroupId = "group.com.hrubyi.arcana"
    static let snapshotKey = "arcana_widget_snapshot_v1"

    @objc func syncSnapshot(_ call: CAPPluginCall) {
        guard let payload = call.getString("payload"),
              let defaults = UserDefaults(suiteName: Self.appGroupId) else {
            call.resolve(["synced": false])
            return
        }
        defaults.set(payload, forKey: Self.snapshotKey)
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve(["synced": true])
    }
}
