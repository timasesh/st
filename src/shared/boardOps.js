// Правила применения правок доски Study Task. Используются и сервером (комната), и браузером.
// op = { add?: { o, i }[], del?: number[], upd?: obj[] }. i — позиция в списке (-1 или нет — в конец).

export function applyOps(objs, op) {
  let out = objs;
  if (op.del && op.del.length) {
    const ids = new Set(op.del);
    out = out.filter((o) => !ids.has(o.id));
  }
  if (op.upd && op.upd.length) {
    const byId = new Map(op.upd.map((o) => [o.id, o]));
    out = out.map((o) => byId.get(o.id) || o);
  }
  if (op.add && op.add.length) {
    if (out === objs) out = out.slice();
    const have = new Map(out.map((o, idx) => [o.id, idx]));
    for (const { o, i } of op.add) {
      if (have.has(o.id)) { out[have.get(o.id)] = o; continue; }
      const at = Number.isInteger(i) && i >= 0 && i <= out.length ? i : out.length;
      if (at === out.length) { out.push(o); have.set(o.id, at); }
      else { out.splice(at, 0, o); have.clear(); out.forEach((x, idx) => have.set(x.id, idx)); }
    }
  }
  return out;
}

// Что изменилось между двумя списками (по id и ссылке на объект).
export function diffObjs(oldObjs, newObjs) {
  const oldById = new Map(oldObjs.map((o, i) => [o.id, { o, i }]));
  const newIds = new Set();
  const add = [], upd = [], del = [];
  newObjs.forEach((o, i) => {
    newIds.add(o.id);
    const prev = oldById.get(o.id);
    if (!prev) add.push({ o, i: i === newObjs.length - 1 ? -1 : i });
    else if (prev.o !== o) upd.push({ a: prev.o, b: o });
  });
  oldObjs.forEach((o, i) => { if (!newIds.has(o.id)) del.push({ o, i }); });
  return { add, del, upd };
}

export function isEmptyDiff(d) { return !d.add.length && !d.del.length && !d.upd.length; }

export function invertDiff(d) {
  return {
    add: d.del.map(({ o, i }) => ({ o, i })),
    del: d.add.map(({ o, i }) => ({ o, i })),
    upd: d.upd.map(({ a, b }) => ({ a: b, b: a })),
  };
}

// Правка в сетевом виде (то, что уходит другим участникам).
export function diffToOp(d) {
  return { add: d.add, del: d.del.map(({ o }) => o.id), upd: d.upd.map(({ b }) => b) };
}
