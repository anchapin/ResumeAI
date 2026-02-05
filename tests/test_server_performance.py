import unittest
import time
import sys
import os

# Add parent directory to path to import server
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import MockTemplateGenerator

class TestServerPerformance(unittest.TestCase):
    def setUp(self):
        self.generator = MockTemplateGenerator()
        self.experience_data = []
        # Create a decent sized dataset for correctness check
        for i in range(1000):
            self.experience_data.append({
                "role": f"Role {i}",
                "company": f"Company {i}",
                "startDate": "2020",
                "endDate": "2021",
                "description": "Desc"
            })

    def test_format_experience_correctness(self):
        """Verify the output format is as expected."""
        result = self.generator._format_experience(self.experience_data[:2])
        expected = (
            "\n**Role 0** at Company 0\n2020 - 2021\nDesc\n"
            "\n**Role 1** at Company 1\n2020 - 2021\nDesc\n"
        )
        self.assertEqual(result, expected)

    def test_performance_benchmark(self):
        """Run a simple benchmark to ensure it's not egregiously slow."""
        # Use a larger dataset for benchmark
        large_data = self.experience_data * 100 # 100,000 items

        start_time = time.time()
        result = self.generator._format_experience(large_data)
        duration = time.time() - start_time

        print(f"\nBenchmark (100k items): {duration:.4f}s")

        # We expect it to be reasonably fast (under 1 second for 100k items is a loose upper bound,
        # actual on this machine was ~0.1s for baseline, ~0.08s for optimized)
        self.assertLess(duration, 2.0, "Performance is too slow!")

if __name__ == '__main__':
    unittest.main()
