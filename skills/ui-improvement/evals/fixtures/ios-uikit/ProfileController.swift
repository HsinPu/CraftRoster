import UIKit

final class ProfileController: UIViewController {
    private let heading = UILabel()
    private let nameField = UITextField()
    private let saveButton = UIButton(type: .system)
    var onSave: (String) -> Void = { _ in }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        heading.text = "Display name shown to your team"
        heading.font = .systemFont(ofSize: 20)
        heading.textColor = .black
        heading.numberOfLines = 1
        nameField.placeholder = "Display name"
        nameField.borderStyle = .roundedRect
        saveButton.setImage(UIImage(systemName: "checkmark"), for: .normal)
        saveButton.addTarget(self, action: #selector(save), for: .touchUpInside)
        [heading, nameField, saveButton].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview($0)
        }
        NSLayoutConstraint.activate([
            heading.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
            heading.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
            heading.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            heading.heightAnchor.constraint(equalToConstant: 24),
            nameField.leadingAnchor.constraint(equalTo: heading.leadingAnchor),
            nameField.trailingAnchor.constraint(equalTo: heading.trailingAnchor),
            nameField.topAnchor.constraint(equalTo: heading.bottomAnchor, constant: 12),
            saveButton.leadingAnchor.constraint(equalTo: heading.leadingAnchor),
            saveButton.trailingAnchor.constraint(equalTo: heading.trailingAnchor),
            saveButton.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -8),
            saveButton.heightAnchor.constraint(equalToConstant: 32)
        ])
    }

    @objc private func save() { onSave(nameField.text ?? "") }
}
