import AppKit

final class SettingsController: NSViewController {
    private let titleLabel = NSTextField(labelWithString: "Account notification preferences")
    private let accountName = NSTextField(string: "")
    private lazy var saveButton = NSButton(image: NSImage(systemSymbolName: "checkmark", accessibilityDescription: nil)!, target: self, action: #selector(save))
    var onSave: (String) -> Void = { _ in }

    override func loadView() {
        view = NSView()
        view.wantsLayer = true
        view.layer?.backgroundColor = NSColor.white.cgColor
        titleLabel.font = .systemFont(ofSize: 18)
        titleLabel.textColor = .black
        titleLabel.lineBreakMode = .byClipping
        [titleLabel, accountName, saveButton].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview($0)
        }
        NSLayoutConstraint.activate([
            titleLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            titleLabel.topAnchor.constraint(equalTo: view.topAnchor, constant: 20),
            titleLabel.widthAnchor.constraint(equalToConstant: 340),
            titleLabel.heightAnchor.constraint(equalToConstant: 20),
            accountName.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),
            accountName.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 12),
            accountName.widthAnchor.constraint(equalToConstant: 340),
            saveButton.topAnchor.constraint(equalTo: accountName.bottomAnchor, constant: 12),
            saveButton.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),
            saveButton.bottomAnchor.constraint(lessThanOrEqualTo: view.bottomAnchor, constant: -20)
        ])
    }

    @objc private func save() { onSave(accountName.stringValue) }
}
