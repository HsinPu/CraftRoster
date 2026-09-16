"""Display labels used by an unrelated existing report."""


def display_label(value: str) -> str:
    """Turn a report key into its existing human-facing label."""
    return value.strip().replace("_", " ").title()
