#!/bin/bash

set -e
scriptdir=$(cd $(dirname $0); pwd -P)

if [ $# -ne 1 ]; then
    echo "Will print the # of hours and minutes you worked that day."
    echo
    echo "Usage: $0 <day-in-YYYY-MM-DD-format>"
    exit 1
fi

day=$1
echo "Grepping for day $day..."
echo

sum=`grep "$day" $scriptdir/periods.txt | cut -f 2,3 -d' ' | awk ' { t = $1; $1 = $2; $2 = t; print; } ' | tr ' ' '-' | tr '\n' '+' | sed 's/\+$//'`

#echo -n "Computing sum: $sum"
sum=$(($sum))
#echo " = $sum"

echo "Total seconds: $sum"

mintot=$((sum / 60))
echo "Total minutes: $mintot"

# 3600 seconds in an hour
hours=$(($sum / 3600))
minutes=$(($mintot % 60))

echo "You worked: $hours hr and $minutes min"
echo
