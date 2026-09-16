import Foundation

// Head integration source; no supplied binary or device observation.
func estimateLabel(_ order: FictionalOrder) -> String {
    guard let milliseconds = order.estimatedDeliveryAtMs else {
        return "Estimate unavailable"
    }
    let instant = Date(timeIntervalSince1970: Double(milliseconds) / 1000.0)
    return ISO8601DateFormatter().string(from: instant)
}
