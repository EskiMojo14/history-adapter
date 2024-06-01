const stripPatterns = [/^\n/, /\n$/];

const code: typeof String.raw = (template, ...subs) => {
  let str = String.raw(template, ...subs);
  for (const pattern of stripPatterns) {
    str = str.replace(pattern, "");
  }
  return str;
};

export default new Proxy(code as typeof code & Record<string, typeof code>, {
    get(target, p, receiver) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        if (Reflect.has(target, p)) { return Reflect.get(target, p, receiver); }
        return code;
    },
})