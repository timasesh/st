export interface BoardObjLike { id: number }
export interface BoardOp<T extends BoardObjLike = BoardObjLike> { add?: { o: T; i: number }[]; del?: number[]; upd?: T[] }
export interface BoardDiff<T extends BoardObjLike = BoardObjLike> { add: { o: T; i: number }[]; del: { o: T; i: number }[]; upd: { a: T; b: T }[] }
export function applyOps<T extends BoardObjLike>(objs: T[], op: BoardOp<T>): T[];
export function diffObjs<T extends BoardObjLike>(oldObjs: T[], newObjs: T[]): BoardDiff<T>;
export function isEmptyDiff(d: BoardDiff): boolean;
export function invertDiff<T extends BoardObjLike>(d: BoardDiff<T>): BoardDiff<T>;
export function diffToOp<T extends BoardObjLike>(d: BoardDiff<T>): BoardOp<T>;
