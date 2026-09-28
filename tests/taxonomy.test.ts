import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/lib/seed';
import {normalizeCategories,normalizeVendorTaxonomy,serviceName} from '../src/lib/taxonomy';
import {publicVendors} from '../src/lib/directory';

test('old seeded choices are replaced while custom choices and disabled categories survive',()=>{
 const categories=normalizeCategories([
  {name:'Transportation & Logistics',slug:'transportation-logistics',active:false,services:['Taxi services','Wedding-car rentals','Logistics providers','School bus hire']},
  {name:'Bands',slug:'bands',active:true,services:['Gospel/Worship','Rock','Cover/Party','Other','Brass bands']},
  {name:'Pet Care',slug:'pet-care',active:true,services:['Pet sitters']},
 ]);
 assert.deepEqual(categories.find(x=>x.name==='Transportation & Logistics')?.services,['Taxis','Car rental','Auto','Logistics trucks','Two wheelers','School bus hire']);
 assert.equal(categories.find(x=>x.name==='Transportation & Logistics')?.active,false);
 assert.deepEqual(categories.find(x=>x.name==='Bands')?.services,['Wedding bands','Worship bands','Party bands','Acoustic bands','Cultural bands','Tribute bands','Brass bands']);
 assert.ok(categories.some(x=>x.name==='Pet Care'&&x.services?.includes('Pet sitters')));
 assert.deepEqual(normalizeCategories(categories),categories);
});

test('merged categories do not return as duplicate choices or lose custom subcategories',()=>{
 const categories=normalizeCategories([
  {name:'Artists & Entertainment',slug:'artists-entertainment',active:false,services:['DJs and musicians','Dancers']},
  {name:'Solo Artists',slug:'solo-artists',active:true,services:['Singers','Solo performers','Opera singers']},
  {name:'Solo Musicians',slug:'solo-musicians',active:true,services:['Drummer','Guitarist','Other instruments']},
  {name:'Tent, Furniture & Equipment Rentals',slug:'tent-furniture-equipment-rentals',active:true,services:['Tent houses','Table and chair rentals','Outdoor heaters']},
 ]);
 assert.equal(categories.length,12);
 assert.equal(categories.some(x=>['Solo Artists','Solo Musicians','Tent, Furniture & Equipment Rentals'].includes(x.name)),false);
 assert.equal(categories.find(x=>x.name==='Artists & Entertainment')?.active,false);
 assert.ok(categories.find(x=>x.name==='Artists & Entertainment')?.services?.includes('Opera singers'));
 assert.ok(categories.find(x=>x.name==='Event Support Services')?.services?.includes('Outdoor heaters'));
 assert.equal(categories.find(x=>x.name==='Artists & Entertainment')?.services?.includes('Drummer'),false);
});

test('existing profiles migrate clear matches while ambiguous classifications retain their original detail',()=>{
 const state=initialState();const vendor=state.vendors[0];
 assert.equal(normalizeVendorTaxonomy({...vendor,category:'Transportation & Logistics',service:'Taxi services'},state.categories).service,'Taxis');
 const musician=normalizeVendorTaxonomy({...vendor,category:'Solo Musicians',service:'Guitarist'},state.categories);
 assert.equal(musician.category,'Artists & Entertainment');assert.equal(musician.service,'Instrumentalists');
 const ambiguous=normalizeVendorTaxonomy({...vendor,category:'Venues & Accommodation',service:'Guesthouses and homestays'},state.categories);
 assert.equal(ambiguous.service,'Guesthouses and homestays');
 assert.equal(ambiguous.id,vendor.id);assert.deepEqual(ambiguous.gallery,vendor.gallery);assert.equal(ambiguous.status,vendor.status);
});

test('legacy category and subcategory searches still find migrated listings',()=>{
 const state=initialState();
 const musician=normalizeVendorTaxonomy({...state.vendors[0],category:'Solo Musicians',service:'Guitarist'},state.categories);
 assert.equal(publicVendors([musician],{category:'solo-musicians',service:'guitarist'}).length,1);
 const caterer=state.vendors.find(v=>v.category==='Catering & Food')!;
 assert.equal(publicVendors([caterer],{service:'caterers'}).length,1);
 assert.equal(serviceName('Transportation & Logistics','taxi-services'),'Taxis');
});

test('unknown category filters are harmless, including object prototype names',()=>{
 for(const category of ['constructor','__proto__','toString'])assert.deepEqual(publicVendors(initialState().vendors,{category}),[]);
});
