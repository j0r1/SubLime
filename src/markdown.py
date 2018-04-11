#!/usr/bin/env python

import subprocess
import sys

if __name__ == "__main__":

    header = '''
'''

    footer = """
"""
    
    sys.stdout.write(header)
    sys.stdout.flush()
    subprocess.call([ "Markdown.pl" ] + sys.argv[1:])
    sys.stdout.write(footer)

