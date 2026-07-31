# tools

`audit-city.py` scans `public/city.html` for variables that are read or written
before their `var` declaration executes. That single mistake caused three
separate outages: white trees, a NaN colour index, and tree materials being
overwritten with null by a duplicate declaration.

Run it after any edit to city.html:

    python3 tools/audit-city.py

A clean run prints "CLEAN". Anything else is a bug that will not show up in a
syntax check.
