import Foundation
import Capacitor
import HealthKit

// RP-15: writes a Mindful Minutes session to Apple Health when the user finishes
// the daily reflection (opt-in via Settings; write-only — the app reads nothing
// back from HealthKit).
@objc(MindfulSessionPlugin)
public class MindfulSessionPlugin: CAPPlugin {
    private let store = HKHealthStore()

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func logSession(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(),
              let mindful = HKObjectType.categoryType(forIdentifier: .mindfulSession) else {
            call.resolve(["logged": false, "reason": "unavailable"])
            return
        }

        let requested = call.getDouble("durationSeconds") ?? 60
        let duration = min(max(requested, 30), 600)
        let end = Date()
        let start = end.addingTimeInterval(-duration)

        store.requestAuthorization(toShare: [mindful], read: []) { [weak self] granted, _ in
            guard let self = self, granted else {
                call.resolve(["logged": false, "reason": "denied"])
                return
            }
            let sample = HKCategorySample(
                type: mindful,
                value: HKCategoryValue.notApplicable.rawValue,
                start: start,
                end: end
            )
            self.store.save(sample) { ok, _ in
                call.resolve(["logged": ok])
            }
        }
    }
}
