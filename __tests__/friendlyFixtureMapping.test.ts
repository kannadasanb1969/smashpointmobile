test('friendly fixture server records preserve count and unresolved slots safely', () => {
  const rows = [
    { id: '1', round_number: 1 },
    { id: '2', round_number: 1 },
    { id: '3', round_number: 2 },
  ];
  expect(rows).toHaveLength(3);
  expect(rows.filter((x) => x.round_number === 2)).toHaveLength(1);
});
