#!/usr/bin/env python3
import json
import sys

path = sys.argv[1]
data = json.load(open(path))
plans = {p["slug"]: p for p in data["plans"]}
free = plans["free"]["features"]
pro = plans["pro"]["features"]
agency = plans["agency"]["features"]
errors = []
if any("Growth roadmap" in f for f in free):
    errors.append("free still has Growth roadmap")
if any("Catch blockers" in f for f in free):
    errors.append("free still has Catch blockers")
if not any("Growth roadmap" in f for f in pro):
    errors.append("pro missing Growth roadmap")
if not any("Catch blockers" in f for f in pro):
    errors.append("pro missing Catch blockers")
if not any("Marketing campaigns" in f for f in agency):
    errors.append("agency missing Marketing campaigns")
if errors:
    print("FAIL:", "; ".join(errors))
    sys.exit(1)
print("OK  pricing checks passed")
