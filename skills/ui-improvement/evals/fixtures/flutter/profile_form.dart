import 'package:flutter/material.dart';

class ProfileForm extends StatelessWidget {
  const ProfileForm({super.key, required this.controller, required this.onSave});
  final TextEditingController controller;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) => Container(
    width: 360, height: 200, color: Colors.white,
    child: Column(children: [
      const SizedBox(height: 24, child: Text('Display name shown to collaborators',
        maxLines: 1, style: TextStyle(fontSize: 20, color: Colors.black))),
      SizedBox(height: 32, child: TextField(controller: controller)),
      const Spacer(),
      IconButton(icon: const Icon(Icons.check), onPressed: onSave),
    ]),
  );
}
