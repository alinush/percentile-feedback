#!/bin/bash

set -e
scriptdir=$(cd $(dirname $0); pwd -P)

time=`tail -n 1 $scriptdir/periods.txt | cut -f 2- -d' '`
day=`tail -n 1 $scriptdir/periods.txt | cut -f 1 -d' '`

$scriptdir/some-day.sh "$day"

starttime=`echo "$time" | tail -n 1 | cut -f 1 -d' '`
starth=$(($starttime / 3600))
startm=$((($starttime / 60) % 60))
startm=`printf %02d $startm`

endtime=`echo "$time" | tail -n 1 | cut -f 2 -d' '`
endh=$(($endtime / 3600))
endm=$((($endtime / 60) % 60))
endm=`printf %02d $endm`

duration=$((($endtime-$starttime)/60))

echo "Last time slot: $starth:$startm to $endh:$endm ($duration minutes)"
