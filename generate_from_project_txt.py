#!/usr/bin/env python3
"""Generate project folders & files from a `project.txt` description.

The `project.txt` file must follow the format emitted by the Finance Suite
README dump – i.e. a series of file blocks separated by marker lines of the
form::

    ===== ./relative/path/to/file =====
    <file content>
    ...
    ===== ./another/file =====

The script parses those markers, recreates the directory structure and
writes each file with the captured content. It is idempotent – existing files
are overwritten – and prints a short summary in the end.

Usage
-----
$ python generate_from_project_txt.py [project.txt]
If the argument is omitted, "project.txt" in the current directory is used.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import List

MARKER_RE = re.compile(r"^=====\s+(.+?)\s+=====\s*$")


def parse_blocks(lines: List[str]) -> List[tuple[str, List[str]]]:
    """Return list of *(path, content_lines)* tuples."""

    blocks: List[tuple[str, List[str]]] = []
    current_path: str | None = None
    current_buf: List[str] = []

    for line in lines:
        m = MARKER_RE.match(line)
        if m:
            # flush previous block
            if current_path is not None:
                blocks.append((current_path, current_buf))
            # start new block
            current_path = m.group(1).lstrip("./")  # make path relative
            current_buf = []
        else:
            if current_path is not None:
                current_buf.append(line)
    # flush last block
    if current_path is not None:
        blocks.append((current_path, current_buf))
    return blocks


def write_blocks(blocks: List[tuple[str, List[str]]]) -> None:
    """Create directories and write all files."""

    for rel_path, content_lines in blocks:
        path = Path(rel_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8", newline="") as f:
            f.writelines(content_lines)
        print(f"[+] {path}")


def main() -> None:
    txt_path = Path(sys.argv[1] if len(sys.argv) > 1 else "project.txt")
    if not txt_path.exists():
        sys.exit(f"Error: {txt_path} not found.")

    lines = txt_path.read_text(encoding="utf-8").splitlines(keepends=True)
    blocks = parse_blocks(lines)

    if not blocks:
        sys.exit("No file blocks found – is the input format correct?")

    write_blocks(blocks)
    print(f"Done. {len(blocks)} files written.")


if __name__ == "__main__":
    main()
