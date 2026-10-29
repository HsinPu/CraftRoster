import SwiftUI

struct ProfileView: View {
    @Binding var displayName: String
    var save: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Display name shown to your team")
                .font(.system(size: 20))
                .lineLimit(1)
                .frame(height: 24)
            TextField("Display name", text: $displayName)
                .textFieldStyle(.roundedBorder)
            Spacer()
            Button(action: save) { Image(systemName: "checkmark") }
                .tint(.blue)
        }
        .padding(16)
        .frame(height: 240)
        .foregroundStyle(.black)
        .background(.white)
        .ignoresSafeArea(.keyboard)
    }
}
