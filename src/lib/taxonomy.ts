import type {Taxon,Vendor} from './types';
import {slugify} from './slugs';

export const categoryDefinitions=[
 ['Event Planning & Management',['Wedding planners','Event planners','Corporate event organisers','Concert organisers','Birthday and private party planners','On-site event coordinators'],1],
 ['Venues & Accommodation',['Banquet halls','Outdoor venues','Wedding venues','Auditoriums','Restaurants and cafés','Hotels','Guesthouses','Homestays'],1],
 ['Sound, Lighting & Stage',['Sound rental','Lighting rental','Stage setup','LED screens','Truss rental','Generators','Special effects','Sound installation'],1],
 ['Decoration & Florists',['Wedding decorators','Stage decorators','Floral decorators','Balloon decorators','Venue styling','Prop rentals'],1],
 ['Catering & Food',['Full-service caterers','Bakers and cakes','Food stalls','Beverage services','Live food counters','Bartending'],1],
 ['Photography & Media',['Photographers','Videographers','Wedding films','Drone operators','Photo booths','Live streaming','Social media coverage'],1],
 ['Makeup, Fashion & Styling',['Makeup artists','Hairstylists','Bridal wear','Groom wear','Fashion designers','Jewellery and accessories','Personal stylists'],1],
 ['Artists & Entertainment',['Solo singers','DJs','Dancers','MCs and hosts','Comedians','Instrumentalists','Cultural performers',"Children's entertainers"],1],
 ['Invitations, Printing & Gifts',['Invitation designers','Digital invitations','Printing services','Signage and banners','Personalised gifts','Return gifts'],2],
 ['Transportation & Logistics',['Taxis','Car rental','Auto','Logistics trucks','Two wheelers'],2],
 ['Event Support Services',['Security','Ushers','Event staff','Cleaning','Furniture rental','Tents and canopies','Portable toilets'],2],
 ['Bands',['Wedding bands','Worship bands','Party bands','Acoustic bands','Cultural bands','Tribute bands'],2],
] as const;

// Previous defaults distinguish obsolete seed choices from admin-added choices.
const previousCategories=[
  ['Event Planning & Management',['Wedding planners','Event planners','Corporate event managers','Birthday party planners','Conference organisers','Church and worship-event organisers','Event coordinators'],1],
  ['Venues & Accommodation',['Hotels and resorts','Banquet and wedding halls','Conference halls','Community halls','Guesthouses and homestays','Outdoor venues','Farmhouses and campsites'],1],
  ['Sound, Lighting & Stage',['Sound-system providers','Lighting providers','LED-wall providers','Stage and truss providers','Generator providers','Special-effects providers','DJ equipment providers','Sound and lighting dealers'],1],
  ['Decoration & Florists',['Wedding and event decorators','Florists','Balloon decorators','Theme decorators','Entrance and backdrop designers','Mandap decorators','Church decorators'],1],
  ['Catering & Food',['Caterers','Restaurants','Bakers and cake designers','Snack and dessert vendors','Beverage providers','Live food-stall providers','Bartending services'],1],
  ['Photography & Media',['Photographers','Videographers','Wedding filmmakers','Drone operators','Photo-booth providers','Live-streaming teams','Video editors','Social-media coverage teams'],1],
  ['Makeup, Fashion & Styling',['Makeup artists','Hairstylists','Bridal-wear designers','Groom-wear designers','Fashion designers and boutiques','Jewellery providers','Clothing and accessory rentals','Personal stylists'],1],
  ['Artists & Entertainment',['Singers and bands','DJs and musicians','Dancers','Anchors and emcees','Comedians','Magicians','Cultural performers','Artist-management agencies'],1],
  ['Tent, Furniture & Equipment Rentals',['Tent houses','Table and chair rentals','Sofa and lounge rentals','Canopy providers','Cooling and heating equipment rentals','Carpet and furnishing rentals','Kitchen-equipment rentals','Portable washroom providers'],1],
  ['Invitations, Printing & Gifts',['Invitation-card designers','Printing businesses','Digital invitation designers','Signage and banner printers','Gift and hamper providers','Wedding-favour vendors','Trophy and certificate providers','Personalised merchandise businesses'],2],
  ['Transportation & Logistics',['Wedding-car rentals','Bus and traveller rentals','Taxi services','Luxury-car providers','Logistics providers','Equipment-transport providers','Valet-parking services'],2],
  ['Event Support Services',['Security agencies','Bouncers','Ushers and event staff','Cleaning services','Electricians','Event insurance providers','First-aid and ambulance services','Technical-support teams'],2],
  ['Bands',['Gospel/Worship','Rock','Pop','Indie','Jazz','Blues','Folk/Traditional','Classical','Cover/Party','Other'],2],
  ['Solo Artists',['Singers','Solo performers'],2],
  ['Solo Musicians',['Drummer','Guitarist','Keyboardist','Bassist','Other instruments'],2],
] as const;

export const categoryAliases:Record<string,string>={
 'Venues':'Venues & Accommodation','Photography':'Photography & Media','Catering':'Catering & Food','Decor & Styling':'Decoration & Florists','Event Planners':'Event Planning & Management','Makeup & Beauty':'Makeup, Fashion & Styling','Music & Entertainment':'Artists & Entertainment',
 'Tent, Furniture & Equipment Rentals':'Event Support Services','Solo Artists':'Artists & Entertainment','Solo Musicians':'Artists & Entertainment',
};
export function categoryName(value:string){return (Object.hasOwn(categoryAliases,value)?categoryAliases[value]:undefined)||Object.entries(categoryAliases).find(([name])=>slugify(name)===slugify(value))?.[1]||categoryDefinitions.find(([name])=>slugify(name)===slugify(value))?.[0]||value;}
const serviceAliases:Record<string,Record<string,string>>={
 'Event Planning & Management':{'Corporate event managers':'Corporate event organisers','Birthday party planners':'Birthday and private party planners','Event coordinators':'On-site event coordinators'},
 'Venues & Accommodation':{'Banquet and wedding halls':'Banquet halls'},
 'Sound, Lighting & Stage':{'Sound-system providers':'Sound rental','Lighting providers':'Lighting rental','LED-wall providers':'LED screens','Generator providers':'Generators','Special-effects providers':'Special effects'},
 'Decoration & Florists':{'Wedding and event decorators':'Wedding decorators','Florists':'Floral decorators','Theme decorators':'Venue styling','Entrance and backdrop designers':'Stage decorators','Mandap decorators':'Wedding decorators','Church decorators':'Venue styling'},
 'Catering & Food':{'Caterers':'Full-service caterers','Bakers and cake designers':'Bakers and cakes','Snack and dessert vendors':'Food stalls','Beverage providers':'Beverage services','Live food-stall providers':'Live food counters','Bartending services':'Bartending'},
 'Photography & Media':{'Wedding filmmakers':'Wedding films','Photo-booth providers':'Photo booths','Live-streaming teams':'Live streaming','Social-media coverage teams':'Social media coverage'},
 'Makeup, Fashion & Styling':{'Bridal-wear designers':'Bridal wear','Groom-wear designers':'Groom wear','Fashion designers and boutiques':'Fashion designers','Jewellery providers':'Jewellery and accessories'},
 'Artists & Entertainment':{'Singers':'Solo singers','Anchors and emcees':'MCs and hosts','Drummer':'Instrumentalists','Guitarist':'Instrumentalists','Keyboardist':'Instrumentalists','Bassist':'Instrumentalists','Other instruments':'Instrumentalists'},
 'Invitations, Printing & Gifts':{'Invitation-card designers':'Invitation designers','Printing businesses':'Printing services','Digital invitation designers':'Digital invitations','Signage and banner printers':'Signage and banners','Gift and hamper providers':'Personalised gifts','Wedding-favour vendors':'Return gifts','Personalised merchandise businesses':'Personalised gifts'},
 'Transportation & Logistics':{'Taxi services':'Taxis','Wedding-car rentals':'Car rental','Luxury-car providers':'Car rental'},
 'Event Support Services':{'Security agencies':'Security','Bouncers':'Security','Cleaning services':'Cleaning','Tent houses':'Tents and canopies','Table and chair rentals':'Furniture rental','Sofa and lounge rentals':'Furniture rental','Canopy providers':'Tents and canopies','Carpet and furnishing rentals':'Furniture rental','Portable washroom providers':'Portable toilets'},
 'Bands':{'Gospel/Worship':'Worship bands','Cover/Party':'Party bands','Folk/Traditional':'Cultural bands'},
};
export function serviceName(category:string,value:string){
 if(!category){
  const matches=[...new Set(Object.values(serviceAliases).flatMap(aliases=>Object.entries(aliases).filter(([label])=>slugify(label)===slugify(value)).map(([,target])=>target)))];
  if(matches.length===1)return matches[0];
 }
 const name=categoryName(category);const definitions=categoryDefinitions.find(([label])=>label===name);
 const current=definitions?.[1].find(item=>slugify(item)===slugify(value));
 return current||Object.entries(serviceAliases[name]||{}).find(([label])=>slugify(label)===slugify(value))?.[1]||value;
}
export function normalizeCategories(incoming:Taxon[]):Taxon[]{
 const defaults=categoryDefinitions.map(([name,services,phase],i)=>({name,slug:slugify(name),active:true,services:[...services],phase,position:i+1}));
 const rows:Taxon[]=defaults.map(base=>{
  const sources=incoming.filter(row=>categoryName(row.name)===base.name);
  const saved=sources.find(row=>row.name===base.name)||sources[0];
  const custom=sources.flatMap(row=>{
   const previous=previousCategories.find(([name])=>name===row.name)||previousCategories.find(([name])=>name===categoryName(row.name));
   const oldDefaults=new Set((previous?.[1]||[]).map(slugify));
   return (row.services||[]).filter(service=>!oldDefaults.has(slugify(service))).map(service=>serviceName(base.name,service));
  });
  const services=[...base.services,...custom].filter((service,i,all)=>all.findIndex(item=>slugify(item)===slugify(service))===i);
  return {...base,...saved,name:base.name,slug:base.slug,position:base.position,phase:base.phase,services};
 });
 const known=new Set(rows.map(row=>row.name));
 return [...rows,...incoming.filter(row=>!known.has(categoryName(row.name))).map(row=>({...row,services:row.services?.length?row.services:[row.name],phase:row.phase??2}))];
}
export function normalizeVendorTaxonomy(vendor:Vendor,categories:Taxon[]):Vendor{
 const category=categoryName(vendor.category);
 const service=vendor.service?serviceName(category,vendor.service):categories.find(row=>row.name===category)?.services?.[0]||category;
 return {...vendor,category,service};
}
