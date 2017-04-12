#!/bin/bash

set -e
scriptdir=$(cd $(dirname $0); pwd -P)

day=`tail -n 1 $scriptdir/periods.txt | cut -f 1 -d' '`

$scriptdir/some-day.sh "$day"
