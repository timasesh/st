import test from 'node:test';
import assert from 'node:assert/strict';
import { applyOps, diffObjs, invertDiff, diffToOp, isEmptyDiff } from '../src/shared/boardOps.js';

const o = (id, extra = {}) => ({ id, k: 'pen', ...extra });

test('diffObjs находит добавленные, удалённые и изменённые', () => {
  const a = o(1), b = o(2), b2 = { ...b, c: 'red' }, c = o(3);
  const d = diffObjs([a, b], [b2, c]);
  assert.deepEqual(d.add.map((x) => x.o.id), [3]);
  assert.deepEqual(d.del.map((x) => x.o.id), [1]);
  assert.deepEqual(d.upd.map((x) => x.b.id), [2]);
  assert.equal(isEmptyDiff(diffObjs([a], [a])), true);
});

test('отмена не трогает чужие объекты', () => {
  const mine = o(1), theirs = o(2);
  const d = diffObjs([], [mine]);              // я нарисовал 1
  let objs = applyOps([mine], { add: [{ o: theirs, i: -1 }] }); // пришёл чужой объект 2
  objs = applyOps(objs, diffToOp(invertDiff(d))); // отмена моего действия
  assert.deepEqual(objs.map((x) => x.id), [2]);
});

test('отмена удаления возвращает объект на прежнее место', () => {
  const a = o(1), b = o(2), c = o(3);
  const d = diffObjs([a, b, c], [a, c]);
  const after = applyOps([a, c], diffToOp(invertDiff(d)));
  assert.deepEqual(after.map((x) => x.id), [1, 2, 3]);
});

test('повторное добавление того же id не дублирует объект', () => {
  const a = o(1);
  const out = applyOps([a], { add: [{ o: { ...a, c: 'x' }, i: -1 }] });
  assert.equal(out.length, 1); assert.equal(out[0].c, 'x');
});
