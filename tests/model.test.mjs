import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCapacity, calculateRooms, calculateEconomics,
  calculateLease, calculateCompute,
} from '../assets/model.mjs';

function close(actual, expected, message) {
  const tolerance = Math.max(1, Math.abs(expected)) * 1e-12;
  assert.ok(Math.abs(actual - expected) <= tolerance, message ?? `${actual} should equal ${expected}`);
}

test('capacity keeps area, simultaneous planning people and weekly desk-hours distinct', () => {
  const result = calculateCapacity();
  assert.equal(result.programmeArea, 3500);
  assert.equal(result.planningPeople, 291);
  assert.equal(result.weeklyHours, 168);
  assert.equal(result.grossDeskHours, 8400);
  assert.equal(result.availableDeskHours, 6720);
  assert.equal(result.usedDeskHours, 4032);
  close(result.memberEquivalents, 403.2);
});

test('capacity applies availability before booking and supports numeric form values', () => {
  assert.deepEqual(calculateCapacity({
    area: '120', supportPercent: '25', areaPerPerson: '8', desks: '10',
    openHours: '8', openDays: '5', availabilityPercent: '50',
    bookingPercent: '25', hoursPerMember: '5',
  }), {
    programmeArea: 90, planningPeople: 11, weeklyHours: 40,
    grossDeskHours: 400, availableDeskHours: 200, usedDeskHours: 50,
    memberEquivalents: 10,
  });
});

test('capacity clamps shares and opening periods, floors physical desk counts', () => {
  const result = calculateCapacity({
    area: 100, supportPercent: -5, desks: 1.9, openHours: 100, openDays: 100,
    availabilityPercent: 150, bookingPercent: 200,
  });
  assert.equal(result.programmeArea, 100);
  assert.equal(result.weeklyHours, 168);
  assert.equal(result.grossDeskHours, 168);
  assert.equal(result.usedDeskHours, 168);
  assert.equal(calculateCapacity({ supportPercent: 1000 }).planningPeople, 0);
  assert.equal(calculateCapacity({ bookingPercent: -1 }).usedDeskHours, 0);
});

test('zero divisors and unusable area do not produce occupancy or membership infinities', () => {
  const result = calculateCapacity({ area: -10, areaPerPerson: 0, hoursPerMember: 0 });
  assert.equal(result.programmeArea, 0);
  assert.equal(result.planningPeople, 0);
  assert.equal(result.memberEquivalents, 0);
});

test('room planning converts turnover minutes to hours and rounds only pooled whole sessions', () => {
  const result = calculateRooms();
  assert.equal(result.grossRoomHours, 672);
  close(result.availableRoomHours, 537.6);
  close(result.usedRoomHours, 322.56);
  close(result.sessionEquivalents, 143.36);
  assert.equal(result.wholeSessions, 143);
  assert.equal(result.weeklyVisits, 1716);
});

test('room turnover changes the session denominator, not available room-hours', () => {
  const options = {
    rooms: 2, openHours: 5, openDays: 1, availabilityPercent: 100,
    bookingPercent: 100, sessionHours: 1, peoplePerSession: 3,
  };
  const noTurnover = calculateRooms({ ...options, turnoverMinutes: 0 });
  const turnover = calculateRooms({ ...options, turnoverMinutes: 30 });
  assert.equal(noTurnover.usedRoomHours, 10);
  assert.equal(noTurnover.wholeSessions, 10);
  close(turnover.sessionEquivalents, 10 / 1.5);
  assert.equal(turnover.wholeSessions, 6);
  assert.equal(turnover.weeklyVisits, 18);
});

test('room planning handles empty schedules, share limits and zero session denominators', () => {
  const empty = calculateRooms({ sessionHours: 0, turnoverMinutes: 0 });
  assert.equal(empty.sessionEquivalents, 0);
  assert.equal(empty.wholeSessions, 0);
  assert.equal(empty.weeklyVisits, 0);
  assert.equal(calculateRooms({ rooms: -1 }).grossRoomHours, 0);
  assert.equal(calculateRooms({ openDays: 0 }).weeklyVisits, 0);
  assert.equal(calculateRooms({ bookingPercent: -1 }).weeklyVisits, 0);
  assert.equal(calculateRooms({
    rooms: 1.9, openHours: 30, openDays: 10,
    availabilityPercent: 200, bookingPercent: 200,
  }).usedRoomHours, 168);
});

test('economics annualises monthly amounts and separates operating, renewal and income', () => {
  const result = calculateEconomics();
  assert.equal(result.premisesAnnual, 300000);
  assert.equal(result.staffAnnual, 800000);
  assert.equal(result.renewalAnnual, 60000);
  assert.equal(result.operatingAnnual, 1280000);
  assert.equal(result.totalAnnual, 1340000);
  assert.equal(result.memberAnnual, 216000);
  assert.equal(result.incomeAnnual, 816000);
  assert.equal(result.fundingGapAnnual, 524000);
  assert.equal(result.surplusAnnual, 0);
  close(result.monthlyGap, 524000 / 12);
  assert.equal(result.breakEvenMembers, 1028);
});

test('break-even members is the total required after proposed contracts and rounds upwards', () => {
  const result = calculateEconomics({
    premisesMonthly: 0, staffFte: 0, otherAnnual: 1201,
    capital: 0, contractAnnual: 1, memberMonthly: 9, feePayingMembers: 2,
  });
  assert.equal(result.memberAnnual, 216);
  assert.equal(result.breakEvenMembers, 12);
  assert.equal(result.fundingGapAnnual, 984);
});

test('economics reports surplus separately and accepts fractional staff FTE', () => {
  const result = calculateEconomics({
    premisesMonthly: 0, staffFte: 0.5, loadedAnnualSalary: 100000,
    otherAnnual: 0, capital: 0, contractAnnual: 60000,
    memberMonthly: 10, feePayingMembers: 1,
  });
  assert.equal(result.staffAnnual, 50000);
  assert.equal(result.fundingGapAnnual, 0);
  assert.equal(result.monthlyGap, 0);
  assert.equal(result.surplusAnnual, 10120);
  assert.equal(result.breakEvenMembers, 0);
});

test('economics handles zero renewal periods, zero fees and invalid costs without division errors', () => {
  const result = calculateEconomics({
    premisesMonthly: -1, staffFte: NaN, loadedAnnualSalary: Infinity,
    otherAnnual: 120, capital: 500, renewalYears: 0,
    contractAnnual: -5, memberMonthly: 0, feePayingMembers: 100,
  });
  assert.equal(result.renewalAnnual, 0);
  assert.equal(result.operatingAnnual, 120);
  assert.equal(result.memberAnnual, 0);
  assert.equal(result.fundingGapAnnual, 120);
  assert.equal(result.breakEvenMembers, 0);
});

test('lease year one is the base and annual escalations compound', () => {
  const first = calculateLease({ baseAnnual: 1200, increasePercent: 10, year: 1, term: 3 });
  assert.equal(first.annual, 1200);
  assert.equal(first.monthly, 100);
  close(first.cumulativeTerm, 1200 + 1320 + 1452);
  close(calculateLease({ baseAnnual: 1200, increasePercent: 10, year: 3 }).annual, 1452);
  close(calculateLease().annual, 6273280);
});

test('lease zero rates, zero terms, one-based years and fractional years are explicit', () => {
  assert.deepEqual(calculateLease({ baseAnnual: 1200, increasePercent: 0, year: 0, term: 3 }), {
    annual: 1200, monthly: 100, cumulativeTerm: 3600,
  });
  assert.equal(calculateLease({ term: 0 }).cumulativeTerm, 0);
  const fractional = calculateLease({ baseAnnual: 100, increasePercent: 10, year: 2.9, term: 2.9 });
  close(fractional.annual, 110);
  close(fractional.cumulativeTerm, 210);
  assert.deepEqual(calculateLease({ baseAnnual: -1, increasePercent: Infinity }), {
    annual: 0, monthly: 0, cumulativeTerm: 0,
  });
});

test('compute keeps one-off capital separate and converts kW to annual kWh', () => {
  const result = calculateCompute();
  assert.equal(result.capital, 6000000);
  close(result.totalPowerKw, 86.4);
  close(result.annualKwh, 756864);
  close(result.annualElectricity, 189216);
});

test('compute scales node count, utilisation, PUE and electricity unit price independently', () => {
  assert.deepEqual(calculateCompute({
    nodes: 2, capitalPerNode: 100, ratedKw: 10,
    utilisationPercent: 50, pue: 1.5, electricityPerKwh: 0.2,
  }), {
    capital: 200, totalPowerKw: 15, annualKwh: 131400, annualElectricity: 26280,
  });
  const full = calculateCompute({ nodes: 1.9, ratedKw: 10, utilisationPercent: 200, pue: 1 });
  assert.equal(full.totalPowerKw, 10);
  assert.equal(calculateCompute({ utilisationPercent: 0 }).annualElectricity, 0);
  assert.equal(calculateCompute({ electricityPerKwh: -0.2 }).annualElectricity, 0);
  assert.equal(calculateCompute({ nodes: -2 }).capital, 0);
});

test('all calculators are deterministic, avoid mutation and return finite non-negative numbers', () => {
  for (const calculator of [calculateCapacity, calculateRooms, calculateEconomics, calculateLease, calculateCompute]) {
    const input = Object.freeze({ unrelated: 'unchanged' });
    assert.deepEqual(calculator(input), calculator(input));
    for (const invalid of [null, 0, false, 'invalid', Symbol('invalid')]) {
      for (const value of Object.values(calculator(invalid))) {
        assert.ok(Number.isFinite(value) && value >= 0);
      }
    }
  }
  const invalidInputs = {
    area: Infinity, supportPercent: NaN, areaPerPerson: 0, desks: 'invalid',
    openHours: -1, openDays: null, availabilityPercent: Infinity, bookingPercent: 'invalid',
    hoursPerMember: 0, rooms: -1, sessionHours: 0, turnoverMinutes: 0, peoplePerSession: NaN,
    premisesMonthly: Infinity, staffFte: NaN, loadedAnnualSalary: -1,
    otherAnnual: 'invalid', capital: null, renewalYears: 0, contractAnnual: -1,
    memberMonthly: 0, feePayingMembers: Infinity, baseAnnual: NaN,
    increasePercent: -1, year: -1, term: Infinity, nodes: Infinity,
    capitalPerNode: NaN, ratedKw: -1, utilisationPercent: -1,
    pue: NaN, electricityPerKwh: -1,
  };
  for (const calculator of [calculateCapacity, calculateRooms, calculateEconomics, calculateLease, calculateCompute]) {
    for (const value of Object.values(calculator(invalidInputs))) {
      assert.ok(Number.isFinite(value) && value >= 0);
    }
  }
});
