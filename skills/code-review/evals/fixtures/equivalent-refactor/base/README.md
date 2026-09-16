# Display-name contract

`displayName(firstName, lastName)` receives strings, preserves their contents, joins nonempty parts with one separating space, and returns `Guest` if both are empty. It does not trim or rewrite the strings.

`greeting(profile)` is the caller that converts missing/non-string profile fields to empty strings and trims supplied names. It returns `Hello, DISPLAY_NAME!`. Profiles are ordinary local JSON data. The requested change only extracts the existing join expression into an internal helper; preserve both APIs and their behavior.
