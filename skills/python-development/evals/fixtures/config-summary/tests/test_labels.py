"""Existing unittest convention; this does not test configuration summaries."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from config_tools.labels import display_label


class DisplayLabelTests(unittest.TestCase):
    def test_report_key(self) -> None:
        self.assertEqual(display_label("  monthly_total  "), "Monthly Total")

    def test_empty_report_key(self) -> None:
        self.assertEqual(display_label("   "), "")


if __name__ == "__main__":
    unittest.main()
