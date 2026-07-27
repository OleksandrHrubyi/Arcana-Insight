//
//  ArcanaWidget.swift
//  ArcanaWidget
//
//  Arcana home-screen widget — tonight's Moon (phase, illumination, next event)
//  for the user's location. Pure renderer: all text arrives pre-localized from
//  the app via the App Group snapshot (see WidgetBridgePlugin in the main
//  target). The moon glyph is a native SF Symbol chosen from the phase key.
//  Entry point lives in ArcanaWidgetBundle.swift (@main).
//

import WidgetKit
import SwiftUI

private let appGroupId = "group.com.hrubyi.arcana"
private let snapshotKey = "arcana_widget_snapshot_v1"

struct WidgetSnapshot: Codable {
    var v: Int
    var dateKey: String
    var skyLine: String
    var promptText: String
    var progressDone: Int
    var progressTotal: Int
    // Astronomy fields (optional so older snapshots still decode).
    var moonPhaseKey: String?
    var moonPhaseLabel: String?
    var illuminationPct: Int?
    var subLine: String?
    var locationLabel: String?
}

struct ArcanaEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?
    let isStale: Bool
}

private func localDateKey(_ date: Date = Date()) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    formatter.timeZone = .current
    return formatter.string(from: date)
}

private func loadSnapshot() -> WidgetSnapshot? {
    guard let defaults = UserDefaults(suiteName: appGroupId),
          let raw = defaults.string(forKey: snapshotKey),
          let data = raw.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
}

// SF Symbol for each lunar phase (iOS 16+).
private func moonSymbol(_ key: String?) -> String {
    switch key {
    case "new": return "moonphase.new.moon"
    case "waxingCrescent": return "moonphase.waxing.crescent"
    case "firstQuarter": return "moonphase.first.quarter"
    case "waxingGibbous": return "moonphase.waxing.gibbous"
    case "full": return "moonphase.full.moon"
    case "waningGibbous": return "moonphase.waning.gibbous"
    case "lastQuarter": return "moonphase.last.quarter"
    case "waningCrescent": return "moonphase.waning.crescent"
    default: return "moon.stars.fill"
    }
}

struct Provider: TimelineProvider {
    private var sample: WidgetSnapshot {
        WidgetSnapshot(
            v: 1, dateKey: localDateKey(), skyLine: "", promptText: "",
            progressDone: 0, progressTotal: 4,
            moonPhaseKey: "waxingGibbous", moonPhaseLabel: "Waxing Gibbous",
            illuminationPct: 93, subLine: "Full Moon in 2 days", locationLabel: "Kyiv"
        )
    }

    func placeholder(in context: Context) -> ArcanaEntry {
        ArcanaEntry(date: Date(), snapshot: sample, isStale: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (ArcanaEntry) -> Void) {
        completion(makeEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ArcanaEntry>) -> Void) {
        // Refresh a few times a day so illumination / next-event stay current.
        let next = Calendar.current.date(byAdding: .hour, value: 6, to: Date()) ?? Date()
        completion(Timeline(entries: [makeEntry()], policy: .after(next)))
    }

    private func makeEntry() -> ArcanaEntry {
        let snapshot = loadSnapshot()
        let hasMoon = !(snapshot?.moonPhaseLabel ?? "").isEmpty
        // Moon data ages gracefully (phase changes slowly) — only the legacy
        // journal content is date-gated.
        let stale = snapshot == nil || (!hasMoon && snapshot?.dateKey != localDateKey())
        return ArcanaEntry(date: Date(), snapshot: snapshot, isStale: stale)
    }
}

struct ArcanaWidgetEntryView: View {
    var entry: ArcanaEntry
    @Environment(\.widgetFamily) var family

    private var backgroundGradient: LinearGradient {
        LinearGradient(
            stops: [
                .init(color: Color(red: 0.039, green: 0.133, blue: 0.200), location: 0),
                .init(color: Color(red: 0.027, green: 0.075, blue: 0.114), location: 0.4),
                .init(color: Color(red: 0.020, green: 0.051, blue: 0.082), location: 1),
            ],
            startPoint: .top, endPoint: .bottom
        )
    }

    private var isSmall: Bool { family == .systemSmall }

    // Astronomy layout.
    private func moonView(_ s: WidgetSnapshot) -> some View {
        let glyph = Image(systemName: moonSymbol(s.moonPhaseKey))
            .symbolRenderingMode(.hierarchical)
            .resizable()
            .aspectRatio(contentMode: .fit)
            .foregroundStyle(.white)

        let texts = VStack(alignment: isSmall ? .center : .leading, spacing: 3) {
            Text(s.moonPhaseLabel ?? "")
                .font(.system(size: isSmall ? 15 : 18, weight: .semibold))
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            if let pct = s.illuminationPct {
                Text("\(pct)%")
                    .font(.system(size: isSmall ? 11 : 12, weight: .regular))
                    .foregroundColor(.white.opacity(0.7))
            }
            if let sub = s.subLine, !sub.isEmpty {
                Text(sub)
                    .font(.system(size: isSmall ? 10 : 12))
                    .foregroundColor(Color(red: 0.57, green: 0.74, blue: 1.0))
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                    .multilineTextAlignment(isSmall ? .center : .leading)
            }
        }

        return VStack(alignment: .leading, spacing: isSmall ? 8 : 10) {
            HStack {
                Text((s.locationLabel?.isEmpty == false ? s.locationLabel! : "ARCANA").uppercased())
                    .font(.system(size: 9, weight: .bold))
                    .tracking(2)
                    .foregroundColor(.white.opacity(0.5))
                    .lineLimit(1)
                Spacer(minLength: 0)
            }
            if isSmall {
                VStack(spacing: 8) {
                    glyph.frame(width: 52, height: 52)
                    texts
                }
                .frame(maxWidth: .infinity)
            } else {
                HStack(spacing: 16) {
                    glyph.frame(width: 66, height: 66)
                    texts
                    Spacer(minLength: 0)
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // Legacy journal / stale layout.
    private var legacyView: some View {
        VStack(alignment: .leading, spacing: isSmall ? 7 : 9) {
            Text("ARCANA")
                .font(.system(size: 9, weight: .bold)).tracking(2)
                .foregroundColor(.white.opacity(0.5))
            if let s = entry.snapshot, !entry.isStale, !s.promptText.isEmpty {
                if !s.skyLine.isEmpty {
                    Text(s.skyLine)
                        .font(.system(size: isSmall ? 10 : 11, weight: .medium))
                        .foregroundColor(.white.opacity(0.7)).lineLimit(1)
                }
                Text(s.promptText)
                    .font(.system(size: isSmall ? 14 : 16, weight: .semibold))
                    .foregroundColor(.white).lineLimit(isSmall ? 5 : 4)
                    .minimumScaleFactor(0.8).fixedSize(horizontal: false, vertical: true)
            } else {
                Text(staleText)
                    .font(.system(size: isSmall ? 14 : 16, weight: .semibold))
                    .foregroundColor(.white).lineLimit(4)
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var content: some View {
        Group {
            if let s = entry.snapshot, !(s.moonPhaseLabel ?? "").isEmpty {
                moonView(s)
            } else {
                legacyView
            }
        }
    }

    var body: some View {
        if #available(iOS 17.0, *) {
            content.containerBackground(for: .widget) { backgroundGradient }
        } else {
            ZStack(alignment: .leading) {
                backgroundGradient
                content.padding(isSmall ? 12 : 14)
            }
        }
    }

    private var staleText: String {
        Locale.current.identifier.hasPrefix("uk")
            ? "Відкрий застосунок, щоб оновити небо"
            : "Open the app to refresh the sky"
    }
}

struct ArcanaWidget: Widget {
    let kind: String = "ArcanaWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            ArcanaWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Arcana")
        .description("Tonight's Moon — phase, illumination and the next sky event.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

#Preview(as: .systemSmall) {
    ArcanaWidget()
} timeline: {
    ArcanaEntry(
        date: .now,
        snapshot: WidgetSnapshot(
            v: 1, dateKey: localDateKey(), skyLine: "", promptText: "",
            progressDone: 0, progressTotal: 4,
            moonPhaseKey: "waxingGibbous", moonPhaseLabel: "Waxing Gibbous",
            illuminationPct: 93, subLine: "Full Moon in 2 days", locationLabel: "Kyiv"
        ),
        isStale: false
    )
}
