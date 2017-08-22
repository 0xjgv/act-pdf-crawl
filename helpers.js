module.exports = {
  // drop = 'true' for dropTill or 'false' for dropWhen
  dropTillOrWhen: (regex, drop = true, init = !drop) => (
    (element) => {
      regex.test(element) && (drop = init);
      return !drop;
    }
  ),
};