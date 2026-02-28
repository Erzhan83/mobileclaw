import Foundation

/// Loads context detection prefixes from the shared contextPrefixes.json
/// (single source of truth for both web and native).
struct ContextPrefixes {
    let startsWith: [String]
    let contains: [String]

    func isContext(_ text: String) -> Bool {
        for prefix in startsWith where text.hasPrefix(prefix) { return true }
        for marker in contains where text.contains(marker) { return true }
        return false
    }

    static let shared: ContextPrefixes = {
        guard let url = Bundle.main.url(forResource: "contextPrefixes", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let sw = json["startsWith"] as? [String],
              let ct = json["contains"] as? [String]
        else {
            // Fallback if JSON missing — should never happen in a valid build
            return ContextPrefixes(startsWith: ["System: [", "[System Message]", "[Queued announce"],
                                   contains: ["HEARTBEAT_OK"])
        }
        return ContextPrefixes(startsWith: sw, contains: ct)
    }()
}
