import React from 'react';
import {View, Text, TextInput, Pressable, StyleSheet} from 'react-native';

type Props = {name: string; onNameChange: (value: string) => void; onSave: () => void};
export function ProfileScreen({name, onNameChange, onSave}: Props) {
  return <View style={styles.screen}>
    <Text numberOfLines={1} style={styles.heading}>Display name shown to collaborators</Text>
    <TextInput value={name} onChangeText={onNameChange} style={styles.input}/>
    <Pressable onPress={onSave}><Text>✓</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({
  screen: {width: 360, height: 200, padding: 16, backgroundColor: '#fff'},
  heading: {height: 24, fontSize: 20, color: '#000'},
  input: {height: 32, borderWidth: 1},
});
