import SwiftUI

struct SettingsView: View {
    @Binding var name: String
    var save: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Account notification preferences")
                .font(.system(size: 20))
                .lineLimit(1)
                .frame(width: 360, height: 24)
            HStack {
                Text("Display name")
                TextField("", text: $name)
                    .frame(width: 240)
            }
            Button(action: save) { Image(systemName: "checkmark") }
        }
        .padding(20)
        .frame(width: 400, height: 160)
        .foregroundColor(.black)
        .background(Color.white)
    }
}
