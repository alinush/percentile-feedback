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

time=`grep "$day" $scriptdir/periods.txt | tail -n 1  | cut -f 2- -d' '`
starttime=`echo "$time" | tail -n 1 | cut -f 1 -d' '`
starth=$(($starttime / 3600))
startm=$((($starttime / 60) % 60))
startm=`printf %02d $startm`

endtime=`echo "$time" | tail -n 1 | cut -f 2 -d' '`
endh=$(($endtime / 3600))
endm=$((($endtime / 60) % 60))
endm=`printf %02d $endm`

duration=$((($endtime-$starttime)/60))

echo "Last logged time slot on $day: $starth:$startm to $endh:$endm ($duration minutes)"
echo
