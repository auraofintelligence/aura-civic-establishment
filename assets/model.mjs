/**
 * Illustrative planning arithmetic for the Aura civic establishment.
 * These functions do not establish statutory capacity, committed income,
 * operational access rights or measured electrical demand.
 *
 * Numeric strings are accepted for progressive-enhancement form inputs.
 * Invalid, negative and non-finite inputs become zero. Percentages describing
 * shares are clamped to 0–100, and opening hours to a maximum of 24/7.
 * A zero denominator returns zero. Non-finite arithmetic results return zero.
 */

const record = (input) => input !== null && typeof input === 'object' ? input : {};

function nonNegative(value) {
  const number = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== '' ? Number(value) : 0;
  return Number.isFinite(number) && number > 0 ? number : 0;
}

const finite = (value) => Number.isFinite(value) && value > 0 ? value : 0;
const share = (value) => Math.min(100, nonNegative(value)) / 100;
const whole = (value) => Math.floor(nonNegative(value));
const divide = (numerator, denominator) => denominator > 0 ? finite(numerator / denominator) : 0;
const weeklyOpening = (hours, days) => Math.min(24, nonNegative(hours)) * Math.min(7, nonNegative(days));

/**
 * Planning people are an area allowance, not a statutory occupancy limit.
 * Member equivalents describe weekly desk-hours, not unique people.
 */
export function calculateCapacity(input = {}) {
  const {
    area = 5000, supportPercent = 30, areaPerPerson = 12, desks = 50,
    openHours = 24, openDays = 7, availabilityPercent = 80,
    bookingPercent = 60, hoursPerMember = 10,
  } = record(input);
  const programmeArea = finite(nonNegative(area) * (1 - share(supportPercent)));
  const planningPeople = Math.floor(divide(programmeArea, nonNegative(areaPerPerson)));
  const weeklyHours = weeklyOpening(openHours, openDays);
  const grossDeskHours = finite(whole(desks) * weeklyHours);
  const availableDeskHours = finite(grossDeskHours * share(availabilityPercent));
  const usedDeskHours = finite(availableDeskHours * share(bookingPercent));
  const memberEquivalents = divide(usedDeskHours, nonNegative(hoursPerMember));
  return {
    programmeArea, planningPeople, grossDeskHours, availableDeskHours,
    usedDeskHours, memberEquivalents, weeklyHours,
  };
}

/**
 * Sessions include turnover time. Flooring the pooled room-hour result gives
 * an upper planning envelope, not an individually scheduled room timetable.
 * Visits count attendances, so one person may contribute multiple visits.
 */
export function calculateRooms(input = {}) {
  const {
    rooms = 4, openHours = 24, openDays = 7, availabilityPercent = 80,
    bookingPercent = 60, sessionHours = 2, turnoverMinutes = 15,
    peoplePerSession = 12,
  } = record(input);
  const grossRoomHours = finite(whole(rooms) * weeklyOpening(openHours, openDays));
  const availableRoomHours = finite(grossRoomHours * share(availabilityPercent));
  const usedRoomHours = finite(availableRoomHours * share(bookingPercent));
  const hoursPerSession = finite(nonNegative(sessionHours) + nonNegative(turnoverMinutes) / 60);
  const sessionEquivalents = divide(usedRoomHours, hoursPerSession);
  const wholeSessions = Math.floor(sessionEquivalents);
  const weeklyVisits = finite(wholeSessions * whole(peoplePerSession));
  return {
    grossRoomHours, availableRoomHours, usedRoomHours,
    sessionEquivalents, wholeSessions, weeklyVisits,
  };
}

/**
 * All dollar amounts are AUD scenario inputs. Proposed contract revenue and
 * membership revenue are assumptions, not offers or secured commitments.
 * Break-even members means the total paying membership required after the
 * proposed contract contribution, rounded up to a whole member.
 */
export function calculateEconomics(input = {}) {
  const {
    premisesMonthly = 25000, staffFte = 8, loadedAnnualSalary = 100000,
    otherAnnual = 180000, capital = 300000, renewalYears = 5,
    contractAnnual = 600000, memberMonthly = 60, feePayingMembers = 300,
  } = record(input);
  const premisesAnnual = finite(nonNegative(premisesMonthly) * 12);
  const staffAnnual = finite(nonNegative(staffFte) * nonNegative(loadedAnnualSalary));
  const renewalAnnual = divide(nonNegative(capital), nonNegative(renewalYears));
  const operatingAnnual = finite(premisesAnnual + staffAnnual + nonNegative(otherAnnual));
  const totalAnnual = finite(operatingAnnual + renewalAnnual);
  const annualMemberFee = finite(nonNegative(memberMonthly) * 12);
  const memberAnnual = finite(annualMemberFee * whole(feePayingMembers));
  const proposedContractAnnual = nonNegative(contractAnnual);
  const incomeAnnual = finite(proposedContractAnnual + memberAnnual);
  const fundingGapAnnual = finite(totalAnnual - incomeAnnual);
  const surplusAnnual = finite(incomeAnnual - totalAnnual);
  const monthlyGap = fundingGapAnnual / 12;
  const breakEvenMembers = Math.ceil(divide(finite(totalAnnual - proposedContractAnnual), annualMemberFee));
  return {
    premisesAnnual, staffAnnual, renewalAnnual, operatingAnnual, totalAnnual,
    memberAnnual, incomeAnnual,
    fundingGapAnnual, surplusAnnual, monthlyGap, breakEvenMembers,
  };
}

/**
 * Historic lease-reference arithmetic, separate from a candidate hub budget.
 * Year 1 is the base annual amount; cumulativeTerm sums years 1 through term.
 */
export function calculateLease(input = {}) {
  const { baseAnnual = 5800000, increasePercent = 4, year = 3, term = 15 } = record(input);
  const base = nonNegative(baseAnnual);
  const rate = nonNegative(increasePercent) / 100;
  const selectedYear = Math.max(1, whole(year));
  const termYears = whole(term);
  const annual = finite(base * Math.exp((selectedYear - 1) * Math.log1p(rate)));
  const monthly = annual / 12;
  const cumulativeTerm = finite(rate === 0
    ? base * termYears
    : base * Math.expm1(termYears * Math.log1p(rate)) / rate);
  return { annual, monthly, cumulativeTerm };
}

/**
 * A rated-load scenario, not measured power consumption. totalPowerKw is the
 * assumed average facility load after utilisation and PUE; 8,760 hours/year.
 * Capital is a one-off scenario cost, separate from annual electricity.
 */
export function calculateCompute(input = {}) {
  const {
    nodes = 1, capitalPerNode = 6000000, ratedKw = 120,
    utilisationPercent = 60, pue = 1.2, electricityPerKwh = 0.25,
  } = record(input);
  const nodeCount = whole(nodes);
  const capital = finite(nodeCount * nonNegative(capitalPerNode));
  const totalPowerKw = finite(nodeCount * nonNegative(ratedKw) * share(utilisationPercent) * nonNegative(pue));
  const annualKwh = finite(totalPowerKw * 8760);
  const annualElectricity = finite(annualKwh * nonNegative(electricityPerKwh));
  return { capital, totalPowerKw, annualKwh, annualElectricity };
}
