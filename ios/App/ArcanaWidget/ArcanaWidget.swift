//
//  ArcanaWidget.swift
//  ArcanaWidget
//
//  RP-16: Arcana home-screen widget — today's sky, the daily question and the
//  ritual progress. Pure renderer: all text arrives pre-localized from the app
//  via the App Group snapshot (see WidgetBridgePlugin in the main target).
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

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> ArcanaEntry {
        ArcanaEntry(
            date: Date(),
            snapshot: WidgetSnapshot(
                v: 1,
                dateKey: localDateKey(),
                skyLine: "Moon in Leo · Waxing Gibbous",
                promptText: "What deserves your patience today?",
                progressDone: 1,
                progressTotal: 4
            ),
            isStale: false
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (ArcanaEntry) -> Void) {
        completion(makeEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ArcanaEntry>) -> Void) {
        // One entry; refresh hourly so the "stale after midnight" state appears
        // without the app being opened.
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
        completion(Timeline(entries: [makeEntry()], policy: .after(next)))
    }

    private func makeEntry() -> ArcanaEntry {
        let snapshot = loadSnapshot()
        let stale = snapshot == nil || snapshot?.dateKey != localDateKey()
        return ArcanaEntry(date: Date(), snapshot: snapshot, isStale: stale)
    }
}

struct ArcanaWidgetEntryView: View {
    var entry: ArcanaEntry
    @Environment(\.widgetFamily) var family

    private var backgroundGradient: LinearGradient {
        LinearGradient(
            stops: [
                .init(color: Color(red: 0.004, green: 0.35, blue: 0.59), location: 0),
                .init(color: Color(red: 0.004, green: 0.21, blue: 0.36), location: 0.35),
                .init(color: Color(red: 0.03, green: 0.07, blue: 0.09), location: 1),
            ],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    private var dots: some View {
        HStack(spacing: 4) {
            let done = entry.snapshot?.progressDone ?? 0
            let total = max(entry.snapshot?.progressTotal ?? 4, 1)
            ForEach(0..<total, id: \.self) { index in
                Circle()
                    .fill(index < done
                        ? Color(red: 0.55, green: 0.75, blue: 0.94)
                        : Color.white.opacity(0.22))
                    .frame(width: 6, height: 6)
            }
        }
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: family == .systemSmall ? 6 : 8) {
            if let snapshot = entry.snapshot, !entry.isStale {
                if !snapshot.skyLine.isEmpty {
                    Text(snapshot.skyLine)
                        .font(.system(size: family == .systemSmall ? 10 : 11, weight: .medium))
                        .foregroundColor(.white.opacity(0.65))
                        .lineLimit(1)
                }
                Text(snapshot.promptText)
                    .font(.system(size: family == .systemSmall ? 13 : 15, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(family == .systemSmall ? 4 : 3)
                    .minimumScaleFactor(0.85)
                Spacer(minLength: 0)
                dots
            } else {
                Text("ARCANA")
                    .font(.system(size: 10, weight: .bold))
                    .tracking(2)
                    .foregroundColor(.white.opacity(0.6))
                Text(staleText)
                    .font(.system(size: family == .systemSmall ? 13 : 15, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(3)
                Spacer(minLength: 0)
                dots
            }
        }
    }

    var body: some View {
        if #available(iOS 17.0, *) {
            content
                .containerBackground(for: .widget) { backgroundGradient }
        } else {
            ZStack(alignment: .leading) {
                backgroundGradient
                content.padding(family == .systemSmall ? 12 : 14)
            }
        }
    }

    // The only widget-side strings: shown before the first app open of the day.
    private var staleText: String {
        Locale.current.identifier.hasPrefix("uk")
            ? "Нове питання дня чекає в застосунку"
            : "Today's question is waiting in the app"
    }
}

struct ArcanaWidget: Widget {
    let kind: String = "ArcanaWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            ArcanaWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Arcana")
        .description("Today's sky, your daily question and ritual progress.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

#Preview(as: .systemSmall) {
    ArcanaWidget()
} timeline: {
    ArcanaEntry(
        date: .now,
        snapshot: WidgetSnapshot(
            v: 1,
            dateKey: localDateKey(),
            skyLine: "Moon in Leo · Waxing Gibbous",
            promptText: "What deserves your patience today?",
            progressDone: 1,
            progressTotal: 4
        ),
        isStale: false
    )
}
