import {slugify} from './slugs';

const stateServiceAreas:Record<string,readonly string[]>={
  meghalaya:['shillong','jowai','tura'],
};

export function isStateServiceArea(name:string){return Object.hasOwn(stateServiceAreas,slugify(name));}

export function servesLocation(coverage:string[],requested:string){
  const area=slugify(requested);
  const covered=new Set(coverage.map(slugify));
  if(covered.has('pan-india')||covered.has(area))return true;
  return Object.entries(stateServiceAreas).some(([state,cities])=>
    area===state?cities.some(city=>covered.has(city)):cities.includes(area)&&covered.has(state)
  );
}
