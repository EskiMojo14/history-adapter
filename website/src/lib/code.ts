const stripPatterns = [/^\n/, /\n$/];

const code: typeof String.raw = (template, ...subs) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  let str = String.raw(template, ...subs.filter(Boolean));
  for (const pattern of stripPatterns) {
    str = str.replace(pattern, "");
  }
  return str;
};

export default new Proxy(code as typeof code & Record<string, typeof code>, {
  get(target, p, receiver) {
    if (Reflect.has(target, p)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return Reflect.get(target, p, receiver);
    }
    return code;
  },
});
