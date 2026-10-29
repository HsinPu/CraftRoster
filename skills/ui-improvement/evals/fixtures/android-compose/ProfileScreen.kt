package example.profile

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun ProfileScreen(name: String, onNameChanged: (String) -> Unit, onSave: () -> Unit) {
    BackHandler(enabled = true) { }
    Scaffold { _ ->
        Column(Modifier.fillMaxSize().background(Color.White).padding(16.dp)) {
            Text("Display name shown to your team", color = Color.Black,
                fontSize = 20.sp, maxLines = 1, modifier = Modifier.height(24.dp))
            TextField(value = name, onValueChange = onNameChanged,
                label = { Text("Display name") }, modifier = Modifier.height(40.dp))
            Spacer(Modifier.weight(1f))
            Button(onClick = onSave, modifier = Modifier.fillMaxWidth().height(32.dp)) {
                Text("Save")
            }
        }
    }
}
