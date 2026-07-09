"""
Very small, self-contained code execution engine.

For every test case the student's code is executed in a fresh subprocess,
the test case's `input_data` is piped to stdin, and stdout is compared
(after trimming trailing whitespace) against `expected_output`.

Supported languages:
    - python  (runs with the system's `python3` interpreter)
    - cpp     (compiled with `g++`, then executed)

NOTE: This is a lightweight sandbox suitable for a college/coding-club
project. Execution uses a subprocess timeout to stop infinite loops. For a
production system you would want a properly isolated sandbox (Docker,
gVisor, seccomp, resource limits, etc.) - see README for notes on this.
"""
import subprocess
import sys
import tempfile
import os
import uuid

DEFAULT_TIME_LIMIT_SECONDS = 5


def _run_python(code, stdin_data, time_limit):
    with tempfile.TemporaryDirectory() as tmpdir:
        file_path = os.path.join(tmpdir, 'solution.py')
        with open(file_path, 'w') as f:
            f.write(code)
        try:
            result = subprocess.run(
                [sys.executable, file_path],
                input=stdin_data,
                capture_output=True,
                text=True,
                timeout=time_limit,
            )
            if result.returncode != 0:
                return None, result.stderr[-2000:]
            return result.stdout, None
        except subprocess.TimeoutExpired:
            return None, 'Time Limit Exceeded'


def _run_cpp(code, stdin_data, time_limit):
    with tempfile.TemporaryDirectory() as tmpdir:
        src_path = os.path.join(tmpdir, 'solution.cpp')
        bin_path = os.path.join(tmpdir, f'solution_{uuid.uuid4().hex}')
        with open(src_path, 'w') as f:
            f.write(code)
        compile_result = subprocess.run(
            ['g++', src_path, '-O2', '-o', bin_path],
            capture_output=True, text=True, timeout=15,
        )
        if compile_result.returncode != 0:
            return None, f'Compilation Error:\n{compile_result.stderr[-2000:]}'
        try:
            result = subprocess.run(
                [bin_path],
                input=stdin_data,
                capture_output=True,
                text=True,
                timeout=time_limit,
            )
            if result.returncode != 0:
                return None, result.stderr[-2000:]
            return result.stdout, None
        except subprocess.TimeoutExpired:
            return None, 'Time Limit Exceeded'


RUNNERS = {
    'python': _run_python,
    'cpp': _run_cpp,
}


def run_against_test_cases(code, language, test_cases, time_limit=DEFAULT_TIME_LIMIT_SECONDS):
    """
    test_cases: iterable of objects/dicts with `input_data` and `expected_output`
    time_limit: seconds allowed per test case run before it's killed as Time Limit Exceeded
    Returns: (status, detail, passed_count, total_count)
    """
    runner = RUNNERS.get(language)
    total = len(test_cases)

    if runner is None:
        return 'Error', f"Language '{language}' is not supported by the runner.", 0, total

    passed = 0
    details = []

    for i, tc in enumerate(test_cases, start=1):
        input_data = tc['input_data'] if isinstance(tc, dict) else tc.input_data
        expected = tc['expected_output'] if isinstance(tc, dict) else tc.expected_output

        output, error = runner(code, input_data, time_limit)

        if error is not None:
            details.append(f"Test Case {i}: ERROR\n{error}")
            continue

        if output.strip() == expected.strip():
            passed += 1
            details.append(f"Test Case {i}: PASSED")
        else:
            details.append(
                f"Test Case {i}: FAILED\nExpected: {expected.strip()}\nGot: {output.strip()}"
            )

    if passed == total and total > 0:
        status = 'Accepted'
    elif any('ERROR' in d for d in details):
        status = 'Error'
    else:
        status = 'Wrong Answer'

    return status, '\n\n'.join(details), passed, total
