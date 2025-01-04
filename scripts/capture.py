import sys
import contextlib

@contextlib.contextmanager
def capture():
  """
  Capture stdout and stderr to strings for post processing.

  Usage:
    with capture() as out:
      print("hi")
    stdout, stderr = out
    print(stdout) # prints 'hi\n'
  """
  import sys
  from io import StringIO
  oldout, olderr = sys.stdout, sys.stderr
  try:
    out = [StringIO(), StringIO()]
    sys.stdout, sys.stderr = out
    yield out
  finally:
    sys.stdout, sys.stderr = oldout, olderr
    out[0] = out[0].getvalue()
    out[1] = out[1].getvalue()

