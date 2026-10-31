// Ember: the app's own flame mascot, a layered SVG rig (see ember-rig.js for the drawing and the animations).
//   const ember = createEmber();            // one <svg class="ember-rig"> element (about 130 px wide, CSS sizes it)
//   setEmberMood(ember, 'wait' | 'new' | 'happy' | null)   // the calm face: 'wait' = not solved today,
//                                                           // 'new' = no history yet, 'happy' = daily goal met
//   cheerEmber(ember)   // one-shot celebration (daily goal completed), then the calm happy face
//   waveEmber(ember)    // one-shot wave (app opened)
// Make ONE Ember per screen: the drawing ids must be unique on the page, and the element can be moved into a
// redrawn layout without restarting its animations.
import { svgFromString } from './dom.js';
import { emberRigSvg, emberRigMood, emberRigCheer, emberRigWave } from './ember-rig.js';

let counter = 0;

export function createEmber({ label = 'Ember' } = {}) {
  counter += 1;
  return svgFromString(emberRigSvg(counter, label));
}

export const setEmberMood = emberRigMood;
export const cheerEmber = emberRigCheer;
export const waveEmber = emberRigWave;
