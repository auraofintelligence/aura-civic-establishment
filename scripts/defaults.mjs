import {writeFileSync} from 'node:fs';
import {calculateCapacity,calculateRooms,calculateEconomics,calculateLease,calculateCompute} from '../assets/model.mjs';
const inputs={
 capacity:{area:5000,supportPercent:30,areaPerPerson:12,desks:50,openHours:24,openDays:7,availabilityPercent:80,bookingPercent:60,hoursPerMember:10},
 rooms:{rooms:4,openHours:24,openDays:7,availabilityPercent:80,bookingPercent:60,sessionHours:2,turnoverMinutes:15,peoplePerSession:12},
 economics:{premisesMonthly:25000,staffFte:8,loadedAnnualSalary:100000,otherAnnual:180000,capital:300000,renewalYears:5,contractAnnual:600000,memberMonthly:60,feePayingMembers:300},
 lease:{baseAnnual:5800000,increasePercent:4,year:3,term:15},
 compute:{nodes:1,capitalPerNode:6000000,ratedKw:120,utilisationPercent:60,pue:1.2,electricityPerKwh:.25}
};
const functions={capacity:calculateCapacity,rooms:calculateRooms,economics:calculateEconomics,lease:calculateLease,compute:calculateCompute};
const results=Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,functions[k](v)]));
writeFileSync(new URL('../data/default-results.json',import.meta.url),JSON.stringify({version:1,date:'2026-11-07',inputs,results},null,2)+'\n');
console.log('Wrote five reproducible default scenarios');
