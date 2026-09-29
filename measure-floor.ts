import { hexToOklch, oklchToHex } from './packages/core/src/index.ts';
import { resolveTailwindHex } from './packages/core/src/index.ts';
import { contrastRatio } from './packages/core/src/index.ts';
for (const n of ['slate-50','white','cyan-50','amber-50','stone-50']) {
  const hex = n === 'white' ? '#ffffff' : resolveTailwindHex(n).toLowerCase();
  const o = hexToOklch(hex);
  const outs: string[] = [];
  for (const f of [0.03, 0.05, 0.07]) {
    const h = (((o.h + 90) % 360) + 360) % 360;
    const r = oklchToHex(Math.min(0.99, o.l + 0.1), Math.min(0.32, Math.max(o.c, f)), h);
    outs.push(`f${f}:${r}@${contrastRatio(r, hex).toFixed(2)}`);
  }
  console.log(n.padEnd(9), `l=${o.l.toFixed(3)} c=${o.c.toFixed(4)}`, outs.join(' '));
}
