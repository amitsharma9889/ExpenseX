export function calculateTripBalances(trip) {
  const members = trip.members.map((member) => ({
    memberId: String(member._id),
    name: member.name,
    paidPaise: 0,
    sharePaise: 0,
    balancePaise: 0
  }));
  const memberById = new Map(members.map((member) => [member.memberId, member]));

  const totalPaise = trip.expenses.reduce((total, expense) => {
    const paidBy = memberById.get(String(expense.paidBy));
    if (!paidBy) {
      throw new Error("A trip expense refers to a person who is not in the trip.");
    }
    paidBy.paidPaise += expense.amountPaise;
    return total + expense.amountPaise;
  }, 0);

  if (members.length === 0 && totalPaise > 0) {
    throw new Error("A trip with expenses must have at least one member.");
  }

  const baseSharePaise = members.length ? Math.floor(totalPaise / members.length) : 0;
  const extraPaiseCount = members.length ? totalPaise % members.length : 0;

  members.forEach((member, index) => {
    member.sharePaise = baseSharePaise + (index < extraPaiseCount ? 1 : 0);
    member.balancePaise = member.paidPaise - member.sharePaise;
  });

  const debtors = members
    .filter((member) => member.balancePaise < 0)
    .map((member) => ({ ...member, remainingPaise: -member.balancePaise }));
  const creditors = members
    .filter((member) => member.balancePaise > 0)
    .map((member) => ({ ...member, remainingPaise: member.balancePaise }));
  const settlements = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountPaise = Math.min(debtor.remainingPaise, creditor.remainingPaise);

    settlements.push({
      from: debtor.name,
      to: creditor.name,
      amountPaise
    });
    debtor.remainingPaise -= amountPaise;
    creditor.remainingPaise -= amountPaise;

    if (debtor.remainingPaise === 0) debtorIndex += 1;
    if (creditor.remainingPaise === 0) creditorIndex += 1;
  }

  return { totalPaise, members, settlements };
}
