#!/usr/bin/env bash
pm2 env 118 2>/dev/null | grep WHMCS || pm2 show valuescan | head -40
